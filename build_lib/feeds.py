"""RSS / sitemap / robots 生成（自 build.py 拆分）。"""

import argparse
import html
import hashlib
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html import escape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Literal
from urllib.parse import parse_qs, unquote, urljoin, urlparse, urlsplit

from .config import *  # noqa: F401,F403

def parse_html_metadata(html_path: Path) -> dict[str, str]:
    """
    解析 HTML 文件并返回元数据解析器实例。

    参数:
        html_path (Path): HTML 文件路径

    返回:
        HTMLMetadataParser: 包含解析结果的解析器实例
    """
    parser = HTMLMetadataParser()
    parser.feed(html_path.read_text(encoding="utf-8"))
    return parser.metadata

def get_site_url() -> str | None:
    """
    从生成的首页 HTML 文件中解析站点 URL。

    功能:
        从 _site/index.html 的 <link rel="canonical" href="..."> 提取 site-url。

    返回:
        str: 站点的根 URL（如 "https://example.com"），末尾不带斜杠。
            如果未配置或解析失败则返回 None。
    """
    index_html = SITE_DIR / "index.html"
    parser = parse_html_metadata(index_html)

    if parser.get("link"):
        return parser["link"].rstrip("/")

    return None

def get_feed_dirs() -> set[str]:
    """
    从 config.typ 配置文件中解析 RSS Feed 订阅源的配置信息。

    功能:
        解析 config.typ 中的 feed 配置块，提取目录列表。

    返回:
        set[str]: 要包含的文章目录列表，默认为空集合
    """
    if not CONFIG_FILE.exists():
        return set()

    try:
        content = CONFIG_FILE.read_text(encoding="utf-8")

        # 移除注释
        content = re.sub(r"//.*", "", content)
        content = re.sub(r"/\*[\s\S]*?\*/", "", content)

        match = re.search(r"feed-dir\s*:\s*\((.*?)\)", content, re.DOTALL)
        if match:
            return {
                c.strip("/")
                for c in re.findall(r'"([^"]*)"', match.group(1))
                if c and c.strip("/")
            }
    except (OSError, UnicodeError) as e:
        print(f"⚠️ 解析 feed-dir 失败: {e}")

    return set()

def extract_post_metadata(index_html: Path) -> tuple[str, str, str, datetime | None]:
    """
    从生成的 HTML 文件中提取文章的元数据信息。

    功能:
        提取文章元数据：
        1. 标题 (title): 从 <title> 标签提取
        2. 描述 (description): 从 <meta name="description"> 提取
        3. 链接 (link): 从 <link rel="canonical" href="..."> 提取
        4. 日期 (date): 依次尝试从以下来源获取：
            - HTML 中的 <meta name="date" content="...">
            - 文件夹名中的 YYYY-MM-DD 格式日期

    参数:
        index_html (Path): 文章的 index.html 文件路径

    返回:
        tuple[str, str, str, datetime | None]: 包含四个元素的元组：
            - str: 文章标题
            - str: 文章描述（可能为空字符串）
            - str: 文章链接（完整 URL）
            - datetime | None: 文章日期（带 UTC 时区），无法获取时为 None
    """
    parser = parse_html_metadata(index_html)

    title = parser["title"].strip()
    description = parser.get("description", "").strip()
    link = parser.get("link", "")
    date_obj = None

    # 尝试从 <meta name="date"> 解析日期
    if parser.get("date"):
        try:
            date_obj = datetime.strptime(parser["date"].split("T")[0], "%Y-%m-%d")
            date_obj = date_obj.replace(tzinfo=timezone.utc)
        except ValueError as e:
            print(f"⚠️ 文章 {index_html} 的日期无效，将尝试目录名日期: {e}")

    # 如果没找到日期，尝试从文件夹名提取 (YYYY-MM-DD)
    if not date_obj:
        date_match = re.search(r"(\d{4}-\d{2}-\d{2})", index_html.parent.name)
        if date_match:
            try:
                date_obj = datetime.strptime(date_match.group(1), "%Y-%m-%d")
                date_obj = date_obj.replace(tzinfo=timezone.utc)
            except ValueError:
                pass

    return title, description, link, date_obj


@dataclass
class FeedHTMLNode:
    tag: str
    attrs: list[tuple[str, str | None]] = field(default_factory=list)
    children: list["FeedHTMLNode | str"] = field(default_factory=list)


class FeedHTMLParser(HTMLParser):
    """Parse compiler-generated, explicitly closed HTML without browser execution."""

    VOID_TAGS = frozenset(
        {
            "area",
            "base",
            "br",
            "col",
            "embed",
            "hr",
            "img",
            "input",
            "link",
            "meta",
            "param",
            "source",
            "track",
            "wbr",
        }
    )
    OMIT_TAGS = frozenset({"script", "button", "iframe", "object", "embed"})
    OMIT_ATTRS = frozenset(
        {"hidden", "inert", "loading", "decoding", "srcset", "sizes"}
    )
    TEXT_STYLES = frozenset({"color", "font-weight", "font-style", "text-decoration"})

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = FeedHTMLNode("")
        self.stack = [self.root]
        self.article_section = None

    def handle_starttag(self, tag, attrs):
        # Preserve SVG's case-sensitive element and attribute names.
        source = self.get_starttag_text() or ""
        match = re.match(r"<([^\s/>]+)", source)
        original_tag = match.group(1) if match else tag
        names = re.findall(r"([^\s=/>]+)\s*=", source)
        spelling = {name.lower(): name for name in names}
        node = FeedHTMLNode(
            original_tag, [(spelling.get(name, name), value) for name, value in attrs]
        )
        self.stack[-1].children.append(node)
        if tag == "section" and self.stack[-1].tag == "article":
            self.article_section = self.article_section or node
        if tag not in self.VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag.lower() == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def extract_post_content(index_html: Path, article_url: str) -> str:
    """Extract article HTML for readers without site CSS/JS; append margin notes.

    Input is trusted Typst output, not arbitrary untrusted HTML. MathML and SVG
    remain inline: rendering support depends on the reader. Fragment links point
    back to the original article, avoiding ID collisions between feed entries.
    """
    parser = FeedHTMLParser()
    parser.feed(index_html.read_text(encoding="utf-8"))
    notes = []
    manual_note_number = 0

    def standalone_manual_note(node):
        if not isinstance(node, FeedHTMLNode) or node.tag != "p":
            return None
        note = None
        for child in node.children:
            if isinstance(child, str) and not child.strip():
                continue
            if not isinstance(child, FeedHTMLNode):
                return None
            classes = dict(child.attrs).get("class", "").split()
            if "sidenote-anchor" in classes:
                continue
            if "sidenote-manual" in classes and note is None:
                note = child
                continue
            return None
        return note

    def render(node, in_note=False, in_svg=False):
        nonlocal manual_note_number
        if isinstance(node, str):
            return escape(node, quote=False)
        if note := standalone_manual_note(node):
            return (
                "<blockquote>"
                + "".join(render(child, True) for child in note.children)
                + "</blockquote>"
            )
        in_svg = in_svg or node.tag == "svg"
        attrs = dict(node.attrs)
        classes = attrs.get("class", "").split()
        if (
            node.tag in parser.OMIT_TAGS
            or (node.tag == "style" and not in_svg)
            or ("sidenote-anchor" in classes)
        ):
            return ""
        if (
            "marginnote" in classes
            and "sidenote-caption" not in classes
            and not in_note
        ):
            is_footnote = "sidenote-footnote" in classes
            if is_footnote:
                notes.append(f"<div>{render(node, True)}</div>")
                # Its existing numbered reference is already in the paragraph.
                return ""
            manual_note_number += 1
            number = manual_note_number
            notes.append(
                f'<div id="rss-note-{number}"><strong>[*{number}]</strong> '
                f"{render(node, True)}</div>"
            )
            return f'<sup><a href="#rss-note-{number}">[*{number}]</a></sup>'
        tag = "figcaption" if "sidenote-caption" in classes else node.tag
        output_attrs = []
        for name, value in node.attrs:
            if (
                name.lower().startswith("on")
                or (name == "class" and not in_svg)
                or name in parser.OMIT_ATTRS
            ):
                continue
            if name == "style" and not in_svg:
                # Preserve text emphasis and syntax colors, not website positioning.
                value = ";".join(
                    declaration
                    for declaration in (value or "").split(";")
                    if declaration.partition(":")[0].strip().lower()
                    in parser.TEXT_STYLES
                )
                if not value:
                    continue
            if name in {"href", "src", "poster", "xlink:href"} and value:
                # SVG fragment references must remain local to the inline graphic.
                if not (
                    in_svg and name in {"href", "xlink:href"} and value.startswith("#")
                ):
                    value = urljoin(article_url, value)
                embedded_image = name == "src" and value.startswith(
                    (
                        "data:image/png;",
                        "data:image/jpeg;",
                        "data:image/webp;",
                        "data:image/gif;",
                    )
                )
                if not embedded_image and urlsplit(value).scheme.lower() not in {
                    "",
                    "http",
                    "https",
                    "mailto",
                    "tel",
                }:
                    continue
            output_attrs.append(
                name if value is None else f'{name}="{escape(value, quote=True)}"'
            )
        opening = (
            "<" + tag + (" " + " ".join(output_attrs) if output_attrs else "") + ">"
        )
        if tag in parser.VOID_TAGS:
            return opening
        children = node.children
        if tag == "figure":
            children = []
            for child in node.children:
                if isinstance(child, FeedHTMLNode) and child.tag == "p":
                    content = [
                        part
                        for part in child.children
                        if not isinstance(part, str) or part.strip()
                    ]
                    if (
                        len(content) == 1
                        and isinstance(content[0], FeedHTMLNode)
                        and "sidenote-caption"
                        in dict(content[0].attrs).get("class", "").split()
                    ):
                        child = content[0]
                children.append(child)
        return (
            opening
            + "".join(render(child, in_note, in_svg) for child in children)
            + f"</{tag}>"
        )

    section = parser.article_section
    if section is None:
        return ""
    body = "".join(render(child) for child in section.children)
    return body + ("<hr>" + "".join(notes) if notes else "")

def collect_posts(dirs: set[str], site_url: str) -> list[dict]:
    """
    从指定的目录中收集所有文章的元数据。

    功能:
        遍历 _site 目录下指定目录中的所有子目录，提取每个文章的元数据信息。
        只处理目录（每个目录代表一篇文章），跳过普通文件。
        如果无法确定文章日期，则跳过该文章并输出警告。

    参数:
        dirs (set[str]): 要扫描的目录名称集合（如 {"Blog", "Docs"}）
        site_url (str): 站点的根 URL（如 "https://example.com"）

    返回:
        list[dict]: 文章数据字典列表，每个字典包含以下键：
            - title (str): 文章标题
            - description (str): 文章描述
            - dir (str): 文章所属分类（即目录名）
            - link (str): 文章的完整 URL
            - date (datetime): 文章日期对象（带时区）
            - content (str): 适合订阅阅读的正文 HTML
    """
    posts = []

    for d in dirs:
        dir_path = SITE_DIR / d

        for item in dir_path.iterdir():
            if not item.is_dir():
                continue

            index_html = item / "index.html"
            if not index_html.exists():
                continue

            title, description, link, date_obj = extract_post_metadata(index_html)
            link = link or urljoin(
                site_url.rstrip("/") + "/", item.relative_to(SITE_DIR).as_posix() + "/"
            )

            if not date_obj:
                print(f"⚠️ 无法确定文章 '{item.name}' 的日期，已跳过。")
                continue

            posts.append(
                {
                    "title": title,
                    "description": description,
                    "dir": d,
                    "link": link,
                    "date": date_obj,
                    "content": extract_post_content(index_html, link),
                }
            )

    return posts

def build_rss_xml(posts: list[dict], config: dict) -> str:
    """
    构建符合 RSS 2.0 规范的 XML 内容字符串。

    功能:
        使用 Python 标准库 xml.etree.ElementTree 根据文章数据和站点配置生成完整的 RSS Feed XML。
        保留 description 摘要，并用 content:encoded 输出正文 HTML。

    参数:
        posts (list[dict]): 文章数据列表，每个字典应包含:
            - title: 标题
            - description: 描述（可选）
            - link: 文章链接
            - date: datetime 对象
            - dir: 分类名称 (即路径名)
        config (dict): 站点配置字典，应包含:
            - site_url: 站点根 URL
            - site_title: 站点标题
            - site_description: 站点描述
            - lang: 语言代码（如 "zh", "en"）

    返回:
        str: 完整的 RSS 2.0 XML 字符串，包含 XML 声明和所有必要的命名空间。
    """
    import xml.etree.ElementTree as ET
    from email.utils import format_datetime

    # 注册 atom 命名空间前缀
    ATOM_NS = "http://www.w3.org/2005/Atom"
    ET.register_namespace("atom", ATOM_NS)
    CONTENT_NS = "http://purl.org/rss/1.0/modules/content/"
    ET.register_namespace("content", CONTENT_NS)

    # 创建 RSS 根元素（命名空间声明由 register_namespace 自动处理）
    rss = ET.Element("rss", version="2.0")

    # Channel 元数据
    channel = ET.SubElement(rss, "channel")
    ET.SubElement(channel, "title").text = config["site_title"]
    ET.SubElement(channel, "link").text = config["site_url"]
    ET.SubElement(channel, "description").text = config["site_description"]
    ET.SubElement(channel, "language").text = config["lang"]
    ET.SubElement(channel, "lastBuildDate").text = format_datetime(
        datetime.now(timezone.utc)
    )

    # 添加 atom:link 自链接
    atom_link = ET.SubElement(channel, f"{{{ATOM_NS}}}link")
    atom_link.set("href", f"{config['site_url']}/feed.xml")
    atom_link.set("rel", "self")
    atom_link.set("type", "application/rss+xml")

    # 添加文章条目
    for post in posts:
        item = ET.SubElement(channel, "item")

        ET.SubElement(item, "title").text = post["title"]
        ET.SubElement(item, "link").text = post["link"]
        ET.SubElement(item, "guid", isPermaLink="true").text = post["link"]
        ET.SubElement(item, "pubDate").text = format_datetime(post["date"])
        ET.SubElement(item, "category").text = post["dir"]

        # 仅在有描述时添加
        if des := post["description"]:
            ET.SubElement(item, "description").text = des
        if content := post.get("content"):
            ET.SubElement(item, f"{{{CONTENT_NS}}}encoded").text = content

    # 生成 XML 字符串
    ET.indent(rss, space="  ")
    xml_str = ET.tostring(rss, encoding="unicode", xml_declaration=False)

    return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_str}'

def generate_rss(site_url: str) -> bool:
    """
    生成网站的 RSS 订阅源文件。

    功能:
        完整的 RSS Feed 生成流程：
        1. 从 config.typ 读取目标目录（分类）
        2. 收集指定目录下的所有文章元数据
        3. 按日期排序
        4. 构建 RSS XML 并写入文件

    返回:
        bool: 生成是否成功。在以下情况返回 True：
            - 成功生成 RSS 文件
            - 未配置分类目录（删除旧 Feed）
            - 未找到任何文章（生成空 Feed）
        仅在发生异常时返回 False。
    """
    rss_file = SITE_DIR / "feed.xml"
    dirs = get_feed_dirs()

    if not dirs:
        rss_file.unlink(missing_ok=True)
        print("⚠️ 跳过 RSS 订阅源生成: 未配置任何目录。")
        return True

    # 检查是否至少有一个目录存在
    existing = {d for d in dirs if (SITE_DIR / d).is_dir()}
    missing = dirs - existing

    for d in missing:
        print(f"⚠️ 警告: 配置的目录 '{d}' 不存在。")

    # 收集文章
    posts = collect_posts(existing, site_url)

    if not posts:
        print("⚠️ 未找到任何文章，RSS 订阅源为空。")

    # 按日期降序排序
    posts = sorted(posts, key=lambda x: x["date"], reverse=True)

    # 获取配置信息
    index_html = SITE_DIR / "index.html"
    parser = parse_html_metadata(index_html)

    lang = parser["lang"]
    site_title = parser["title"].strip()
    site_description = parser.get("description", "").strip()

    config = {
        "site_url": site_url,
        "site_title": site_title,
        "site_description": site_description,
        "lang": lang,
    }

    # 构建 RSS XML
    try:
        rss_content = build_rss_xml(posts, config)
        rss_file.write_text(rss_content, encoding="utf-8")
        print(f"✅ RSS 订阅源生成成功: {rss_file} ({len(posts)} 篇文章)")
        return True
    except ValueError as e:
        print("❌ 错误: RSS 订阅源生成失败")
        print(f"   原因: feedgen 库报错 - {e}")
        print("   解决: 请检查 config.typ 中的必需配置字段（title 和 description）")
        return False
    except OSError as e:
        print("❌ 错误: 生成 RSS 订阅源时出错")
        print(f"   异常: {type(e).__name__}: {e}")
        return False

def generate_sitemap(site_url: str) -> bool:
    """
    使用 Python 标准库 xml.etree.ElementTree 生成 sitemap.xml。
    """
    import xml.etree.ElementTree as ET

    sitemap_path = SITE_DIR / "sitemap.xml"
    sitemap_ns = "http://www.sitemaps.org/schemas/sitemap/0.9"

    # 注册默认命名空间
    ET.register_namespace("", sitemap_ns)

    # 创建根元素
    urlset = ET.Element("urlset", xmlns=sitemap_ns)

    # 遍历 _site 目录
    for file_path in sorted(SITE_DIR.rglob("*.html")):
        rel_path = file_path.relative_to(SITE_DIR).as_posix()

        # 确定 URL 路径
        if rel_path == "index.html":
            url_path = ""
        elif rel_path.endswith("/index.html"):
            url_path = rel_path.removesuffix("index.html")
        elif rel_path.endswith(".html"):
            url_path = rel_path.removesuffix(".html") + "/"
        else:
            url_path = rel_path

        full_url = f"{site_url}/{url_path}"

        # 获取最后修改时间
        mtime = file_path.stat().st_mtime
        lastmod = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")

        # 创建 url 元素
        url_elem = ET.SubElement(urlset, "url")
        ET.SubElement(url_elem, "loc").text = full_url
        ET.SubElement(url_elem, "lastmod").text = lastmod

    # 生成 XML 字符串
    ET.indent(urlset, space="  ")
    xml_str = ET.tostring(urlset, encoding="unicode", xml_declaration=False)
    sitemap_content = f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_str}'

    try:
        sitemap_path.write_text(sitemap_content, encoding="utf-8")
        print(f"✅ Sitemap 构建完成: 包含 {len(urlset)} 个页面")
        return True
    except (OSError, UnicodeError) as e:
        print(f"❌ Sitemap 构建失败: {e}")
        return False

def generate_robots_txt(site_url: str) -> bool:
    """
    Generate robots.txt pointing to the sitemap.
    """
    robots_content = f"""User-agent: *
Allow: /

Sitemap: {site_url}/sitemap.xml
"""

    try:
        (SITE_DIR / "robots.txt").write_text(robots_content, encoding="utf-8")
        return True
    except (OSError, UnicodeError) as e:
        print(f"❌ 生成 robots.txt 失败: {e}")
        return False
