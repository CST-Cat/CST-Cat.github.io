#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pillow>=10.0.0",
# ]
# ///

"""
Tufted Blog Template 构建脚本

这是一个跨平台的构建脚本，用于将 Typst (.typ) 文件编译为 HTML 和 PDF，
并复制静态资源到输出目录。

支持增量编译：只重新编译修改后的文件，加快构建速度。

用法:
    uv run build.py build       # 完整构建 (HTML + PDF + 资源)
    uv run build.py check       # 仅运行静态检查
    uv run build.py html        # 仅构建 HTML 文件
    uv run build.py pdf         # 仅构建 PDF 文件
    uv run build.py assets      # 仅复制静态资源
    uv run build.py clean       # 清理生成的文件
    uv run build.py preview     # 启动本地预览服务器（默认端口 8000）
    uv run build.py admin       # 启动本地内容管理面板（编辑和新建页面）
    uv run build.py images      # 下载文章图片并转换为 Typst 图片格式
    uv run build.py preview -p 3000  # 使用自定义端口
    uv run build.py --help      # 显示帮助信息

增量编译选项:
    --force, -f                 # 强制完整重建，忽略增量检查

预览服务器选项:
    --port, -p PORT             # 指定服务器端口号（默认: 8000）

也可以直接使用 Python 运行:
    python build.py build
    python build.py build --force
    python build.py preview -p 3000
"""

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

# Windows UTF-8 and line-buffered build logs.
try:
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
    else:
        sys.stdout.reconfigure(line_buffering=True)
        sys.stderr.reconfigure(line_buffering=True)
except AttributeError:
    pass
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Literal
from urllib.parse import parse_qs, unquote, urlparse


# ============================================================================
# 拆分后的模块（原 build.py 单文件已拆入 build_lib 包，命令行接口保持不变）
# ============================================================================

from build_lib.config import *  # noqa: F401,F403
from build_lib.compile import build_html, build_pdf  # noqa: F401
from build_lib.assets import copy_assets, copy_content_assets  # noqa: F401
from build_lib.fonts import normalize_font_display, remove_unused_font_assets  # noqa: F401
from build_lib.versioning import add_asset_versioning  # noqa: F401
from build_lib.images import check_image_paths, generate_responsive_images, process_article_images  # noqa: F401
from build_lib.feeds import generate_robots_txt, generate_rss, generate_sitemap, get_site_url  # noqa: F401
from build_lib.commands import check, clean, preview  # noqa: F401
from build_lib.admin import admin  # noqa: F401


def build(force: bool = False) -> bool:
    """
    完整构建：HTML + PDF + 资源。

    参数:
        force: 是否强制重建所有文件
    """
    if not process_article_images(all_content=True):
        return False

    print("-" * 60)
    if force:
        clean()
        print("🛠️ 开始完整构建...")
    else:
        print("🚀 开始增量构建...")
    print("-" * 60)

    # 确保输出目录存在
    SITE_DIR.mkdir(parents=True, exist_ok=True)

    results = []
    if not check_image_paths():
        return False

    print()
    results.append(build_html(force))
    results.append(build_pdf(force))
    print()

    results.append(copy_assets())
    results.append(copy_content_assets(force))
    results.append(remove_unused_font_assets(SITE_DIR))
    results.append(normalize_font_display(SITE_DIR))
    results.append(generate_responsive_images(SITE_DIR))
    results.append(add_asset_versioning(SITE_DIR))

    if site_url := get_site_url():
        results.append(generate_sitemap(site_url))
        results.append(generate_robots_txt(site_url))
        results.append(generate_rss(site_url))

    print("-" * 60)
    if all(results):
        print("✅ 所有构建任务完成！")
        print(f"  📂 输出目录: {SITE_DIR.absolute()}")
    else:
        print("⚠ 构建完成，但有部分任务失败。")
    print("-" * 60)

    return all(results)


# ============================================================================
# 命令行接口
# ============================================================================


def create_parser() -> argparse.ArgumentParser:
    """
    创建命令行参数解析器。
    """
    parser = argparse.ArgumentParser(
        prog="build.py",
        description="Tufted Blog Template 构建脚本 - 将 content 中的 Typst 文件编译为 HTML 和 PDF",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
构建脚本默认只重新编译修改过的文件，可使用 -f/--force 选项强制完整重建：
    uv run build.py build --force
    或 python build.py build -f

使用 preview 命令启动本地预览服务器：
    uv run build.py preview
    或 python build.py preview -p 3000  # 使用自定义端口

使用 admin 命令启动本地内容管理面板：
    uv run build.py admin
    或 python build.py admin --port 8765

更多信息请参阅 README.md
""",
    )

    subparsers = parser.add_subparsers(dest="command", title="可用命令", metavar="<command>")

    build_parser = subparsers.add_parser("build", help="完整构建 (HTML + PDF + 资源)")
    build_parser.add_argument("-f", "--force", action="store_true", help="强制完整重建")

    subparsers.add_parser("check", help="仅运行静态检查")

    html_parser = subparsers.add_parser("html", help="仅构建 HTML 文件")
    html_parser.add_argument("-f", "--force", action="store_true", help="强制完整重建")

    pdf_parser = subparsers.add_parser("pdf", help="仅构建 PDF 文件")
    pdf_parser.add_argument("-f", "--force", action="store_true", help="强制完整重建")

    subparsers.add_parser("assets", help="仅复制静态资源")
    subparsers.add_parser("clean", help="清理生成的文件")

    preview_parser = subparsers.add_parser("preview", help="启动本地预览服务器")
    preview_parser.add_argument(
        "-p", "--port", type=int, default=8000, help="服务器端口号（默认: 8000）"
    )
    preview_parser.add_argument(
        "--no-open", action="store_false", dest="open_browser", help="不自动打开浏览器"
    )
    preview_parser.set_defaults(open_browser=True)

    admin_parser = subparsers.add_parser("admin", help="启动本地内容管理面板（编辑和新建页面）")
    admin_parser.add_argument(
        "-p", "--port", type=int, default=8765, help="管理面板端口号（默认: 8765）"
    )
    admin_parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="绑定地址（默认: 127.0.0.1，仅本机访问）",
    )
    admin_parser.add_argument(
        "--no-open", action="store_false", dest="open_browser", help="不自动打开浏览器"
    )
    admin_parser.set_defaults(open_browser=True)

    images_parser = subparsers.add_parser(
        "images",
        help="下载文章图片，并转换为 Typst 的 #image(...) 格式",
    )
    images_parser.add_argument(
        "sources",
        nargs="*",
        help="指定 .typ 文件或目录；留空则处理全部文章",
    )

    return parser


if __name__ == "__main__":
    parser = create_parser()
    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    # 确保在项目根目录运行
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)

    # 获取 force 参数
    force = getattr(args, "force", False)

    # 使用 match-case 执行对应的命令
    match args.command:
        case "build":
            success = build(force)
        case "check":
            success = check()
        case "html":
            success = build_html(force)
        case "pdf":
            success = build_pdf(force)
        case "assets":
            success = copy_assets()
        case "clean":
            success = clean()
        case "preview":
            success = preview(getattr(args, "port", 8000), getattr(args, "open_browser", True))
        case "admin":
            success = admin(
                port=getattr(args, "port", 8765),
                open_browser_flag=getattr(args, "open_browser", True),
                host=getattr(args, "host", "127.0.0.1"),
            )
        case "images":
            image_sources = getattr(args, "sources", [])
            success = process_article_images(
                sources=image_sources,
                all_content=not image_sources,
            )
        case _:
            print(f"❌ 未知命令: {args.command}")
            success = False

    sys.exit(0 if success else 1)
