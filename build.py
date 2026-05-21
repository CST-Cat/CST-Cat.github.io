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
    uv run build.py admin       # 启动本地内容管理面板（快速新建文章）
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
from typing import Literal
from urllib.parse import parse_qs, unquote, urlparse

# ============================================================================
# 配置
# ============================================================================

CONTENT_DIR = Path("content")  # 源文件目录
SITE_DIR = Path("_site")  # 输出目录
ASSETS_DIR = Path("assets")  # 静态资源目录
CONFIG_FILE = Path("config.typ")  # 全局配置文件


@dataclass
class BuildStats:
    """构建统计信息"""

    success: int = 0
    skipped: int = 0
    failed: int = 0

    def format_summary(self) -> str:
        """格式化统计摘要"""
        parts = []
        if self.success > 0:
            parts.append(f"编译: {self.success}")
        if self.skipped > 0:
            parts.append(f"跳过: {self.skipped}")
        if self.failed > 0:
            parts.append(f"失败: {self.failed}")
        return ", ".join(parts) if parts else "无文件需要处理"

    @property
    def has_failures(self) -> bool:
        """是否存在失败"""
        return self.failed > 0


class HTMLMetadataParser(HTMLParser):
    """
    从 HTML 文件中提取元数据的解析器。

    解析以下元数据：
    - lang: 从 <html lang="..."> 属性获取
    - title: 从 <title> 标签获取
    - description: 从 <meta name="description" content="..."> 获取
    - link: 从 <link rel="canonical" href="..."> 获取
    - date: 从 <meta name="date" content="..."> 获取
    """

    def __init__(self):
        super().__init__()
        self.metadata = {"title": ""}
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        attrs_dict = {k: v for k, v in attrs if v}

        match tag:
            case "html":
                self.metadata["lang"] = attrs_dict.get("lang", "")
            case "title":
                self._in_title = True
            case "meta":
                name = attrs_dict.get("name", "")
                if name in {"description", "date"}:
                    self.metadata[name] = attrs_dict.get("content", "")
            case "link":
                if attrs_dict.get("rel") == "canonical":
                    self.metadata["link"] = attrs_dict.get("href", "")

    def handle_endtag(self, tag: str):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str):
        if self._in_title:
            self.metadata["title"] += data


# ============================================================================
# 增量编译辅助函数
# ============================================================================


def get_file_mtime(path: Path) -> float:
    """
    获取文件的修改时间戳。

    参数:
        path: 文件路径

    返回:
        float: 修改时间戳，文件不存在返回 0
    """
    try:
        return path.stat().st_mtime
    except (OSError, FileNotFoundError):
        return 0.0


def is_dep_file(path: Path) -> bool:
    """
    判断一个文件是否被追踪为依赖）。

    content/ 下的普通页面文件不被视为模板文件，因为它们是独立的页面，
    不应该相互依赖。

    参数:
        path: 文件路径

    返回:
        bool: 是否是依赖文件
    """
    try:
        resolved_path = path.resolve()
        project_root = Path(__file__).parent.resolve()
        content_dir = (project_root / CONTENT_DIR).resolve()

        # config.typ 是依赖文件
        if resolved_path == (project_root / CONFIG_FILE).resolve():
            return True

        # 检查是否在 content/ 目录下
        try:
            relative_to_content = resolved_path.relative_to(content_dir)
            # content/_* 目录下的文件视为依赖文件
            parts = relative_to_content.parts
            if len(parts) > 0 and parts[0].startswith("_"):
                return True
            # content/ 下的其他文件不是依赖文件
            return False
        except ValueError:
            # 不在 content/ 目录下，视为依赖文件（如 config.typ）
            return True

    except Exception:
        return True


def find_typ_dependencies(typ_file: Path) -> set[Path]:
    """
    解析 .typ 文件中的依赖（通过 #import 和 #include 导入的文件）。

    只追踪 .typ 文件的依赖，忽略 content/ 下的普通页面文件。
    其他资源文件（如 .md, .bib, 图片等）通过 copy_content_assets 处理。

    参数:
        typ_file: .typ 文件路径

    返回:
        set[Path]: 依赖的 .typ 文件路径集合
    """
    dependencies: set[Path] = set()

    try:
        content = typ_file.read_text(encoding="utf-8")
    except Exception:
        return dependencies

    # 获取文件所在目录，用于解析相对路径
    base_dir = typ_file.parent

    patterns = [
        r'#import\s+"([^"]+)"',
        r"#import\s+'([^']+)'",
        r'#include\s+"([^"]+)"',
        r"#include\s+'([^']+)'",
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, content):
            dep_path_str = match.group(1)

            # 跳过包导入（如 @preview/xxx）
            if dep_path_str.startswith("@"):
                continue

            # 解析相对路径
            if dep_path_str.startswith("/"):
                # 相对于项目根目录的路径
                dep_path = Path(dep_path_str.lstrip("/"))
            else:
                # 相对于当前文件的路径
                dep_path = base_dir / dep_path_str

            # 规范化路径，只追踪 .typ 文件
            try:
                dep_path = dep_path.resolve()
                if dep_path.exists() and dep_path.suffix == ".typ" and is_dep_file(dep_path):
                    dependencies.add(dep_path)
            except Exception:
                pass

    return dependencies


def get_all_dependencies(typ_file: Path, visited: set[Path] | None = None) -> set[Path]:
    """
    递归获取 .typ 文件的所有依赖（包括传递依赖）。

    参数:
        typ_file: .typ 文件路径
        visited: 已访问的文件集合（用于避免循环依赖）

    返回:
        set[Path]: 所有依赖文件路径集合
    """
    if visited is None:
        visited = set()

    # 避免循环依赖
    abs_path = typ_file.resolve()
    if abs_path in visited:
        return set()
    visited.add(abs_path)

    all_deps: set[Path] = set()
    direct_deps = find_typ_dependencies(typ_file)

    for dep in direct_deps:
        all_deps.add(dep)
        # 只对 .typ 文件递归查找依赖
        if dep.suffix == ".typ":
            all_deps.update(get_all_dependencies(dep, visited))

    return all_deps


def needs_rebuild(source: Path, target: Path, extra_deps: list[Path] | None = None) -> bool:
    """
    判断是否需要重新构建。

    当以下任一条件满足时需要重建：
    1. 目标文件不存在
    2. 源文件比目标文件新
    3. 任何额外依赖文件比目标文件新
    4. 源文件的任何导入依赖比目标文件新
    5. 源文件同目录下的任何非 .typ 文件比目标文件新（如 .md, .bib, 图片等）

    参数:
        source: 源文件路径
        target: 目标文件路径
        extra_deps: 额外的依赖文件列表（如 config.typ）

    返回:
        bool: 是否需要重新构建
    """
    # 目标不存在，需要构建
    if not target.exists():
        return True

    target_mtime = get_file_mtime(target)

    # 源文件更新了
    if get_file_mtime(source) > target_mtime:
        return True

    # 检查额外依赖
    if extra_deps:
        for dep in extra_deps:
            if dep.exists() and get_file_mtime(dep) > target_mtime:
                return True

    # 检查源文件的导入依赖
    for dep in get_all_dependencies(source):
        if get_file_mtime(dep) > target_mtime:
            return True

    # 检查源文件同目录下的非 .typ 资源文件（如 .md, .bib, 图片等）
    # 只检查同一目录，不递归子目录，避免过度重编译
    source_dir = source.parent
    for item in source_dir.iterdir():
        if item.is_file() and item.suffix != ".typ":
            if get_file_mtime(item) > target_mtime:
                return True

    return False


def find_common_dependencies() -> list[Path]:
    """
    查找所有文件的公共依赖（如 config.typ）。

    返回:
        list[Path]: 公共依赖文件路径列表
    """
    common_deps = []

    # config.typ 是全局配置，修改后所有页面都需要重建
    if CONFIG_FILE.exists():
        common_deps.append(CONFIG_FILE)

    # 可以在这里添加其他公共依赖
    # 例如：查找 content/_* 目录下的模板文件
    if CONTENT_DIR.exists():
        for item in CONTENT_DIR.iterdir():
            if item.is_dir() and item.name.startswith("_"):
                for typ_file in item.rglob("*.typ"):
                    common_deps.append(typ_file)

    return common_deps


# ============================================================================
# 辅助函数
# ============================================================================


def find_typ_files() -> list[Path]:
    """
    查找 content/ 目录下所有 .typ 文件，排除路径中包含以下划线开头的目录的文件。

    返回:
        list[Path]: .typ 文件路径列表
    """
    typ_files = []
    for typ_file in CONTENT_DIR.rglob("*.typ"):
        # 检查路径中是否有以下划线开头的目录
        parts = typ_file.relative_to(CONTENT_DIR).parts
        if not any(part.startswith("_") for part in parts):
            typ_files.append(typ_file)
    return typ_files


def get_file_output_path(typ_file: Path, type: Literal["pdf", "html"]) -> Path:
    """
    获取 .typ 文件的输出路径。

    参数:
        typ_file: .typ 文件路径 (相对于 content/)

    返回:
        Path: 文件输出路径 (在 _site/ 目录下)
    """
    relative_path = typ_file.relative_to(CONTENT_DIR)
    return SITE_DIR / relative_path.with_suffix(f".{type}")


def run_typst_command(args: list[str]) -> bool:
    """
    运行 typst 命令。

    参数:
        args: typst 命令参数列表

    返回:
        bool: 命令是否成功执行
    """
    try:
        # 优先使用项目本地的 typst 二进制
        script_dir = Path(__file__).parent
        local_typst = script_dir / "typst"
        typst_cmd = str(local_typst) if local_typst.exists() else "typst"
        result = subprocess.run([typst_cmd] + args, capture_output=True, text=True, encoding="utf-8")
        if result.returncode != 0:
            print(f"  ❌ Typst 错误: {result.stderr.strip()}")
            return False
        return True
    except FileNotFoundError:
        print("  ❌ 错误: 未找到 typst 命令。请确保已安装 Typst 并添加到 PATH 环境变量中。")
        print("  📝 安装说明: https://typst.app/open-source/#download")
        return False
    except Exception as e:
        print(f"  ❌ 执行 typst 命令时出错: {e}")
        return False


# ============================================================================
# 构建命令
# ============================================================================


def _compile_files(
    files: list[Path],
    force: bool,
    common_deps: list[Path],
    get_output_path_func,
    build_args_func,
) -> BuildStats:
    """
    通用文件编译函数，减少重复代码。

    参数:
        files: 要编译的文件列表
        force: 是否强制重建
        common_deps: 公共依赖列表
        get_output_path_func: 获取输出路径的函数
        build_args_func: 构建编译参数的函数

    返回:
        BuildStats: 构建统计信息
    """
    stats = BuildStats()

    for typ_file in files:
        output_path = get_output_path_func(typ_file)

        # 增量编译检查
        if not force and not needs_rebuild(typ_file, output_path, common_deps):
            stats.skipped += 1
            continue

        output_path.parent.mkdir(parents=True, exist_ok=True)

        # 构建编译参数
        args = build_args_func(typ_file, output_path)

        if run_typst_command(args):
            stats.success += 1
        else:
            print(f"  ❌ {typ_file} 编译失败")
            stats.failed += 1

    return stats


def build_html(force: bool = False) -> bool:
    """
    编译所有 .typ 文件为 HTML（文件名中包含 PDF 的除外）。

    参数:
        force: 是否强制重建所有文件
    """
    SITE_DIR.mkdir(parents=True, exist_ok=True)

    typ_files = find_typ_files()

    # 排除标记为 PDF 的文件
    html_files = [f for f in typ_files if "pdf" not in f.stem.lower()]

    if not html_files:
        print("  ⚠️ 未找到任何 HTML 文件。")
        return True

    print("正在构建 HTML 文件...")

    # 获取公共依赖
    common_deps = find_common_dependencies()

    def build_html_args(typ_file: Path, output_path: Path) -> list[str]:
        """构建 HTML 编译参数"""
        try:
            rel_path = typ_file.relative_to(CONTENT_DIR)

            if rel_path.name == "index.typ":
                # index.typ uses the parent directory name as the path
                # content/Blog/index.typ -> "Blog"
                # content/index.typ -> "" (Homepage)
                page_path = rel_path.parent.as_posix()
                if page_path == ".":
                    page_path = ""
            else:
                # Common files use the filename as the path
                # content/about.typ -> "about"
                page_path = rel_path.with_suffix("").as_posix()
        except ValueError:
            page_path = ""

        return [
            "compile",
            "--root",
            ".",
            "--font-path",
            str(ASSETS_DIR),
            "--features",
            "html",
            "--format",
            "html",
            "--input",
            f"page-path={page_path}",
            str(typ_file),
            str(output_path),
        ]

    stats = _compile_files(
        html_files,
        force,
        common_deps,
        lambda typ_file: get_file_output_path(typ_file, "html"),
        build_html_args,
    )

    print(f"✅ HTML 构建完成。{stats.format_summary()}")
    return not stats.has_failures


def build_pdf(force: bool = False) -> bool:
    """
    编译文件名包含 "PDF" 的 .typ 文件为 PDF。

    参数:
        force: 是否强制重建所有文件
    """
    SITE_DIR.mkdir(parents=True, exist_ok=True)

    typ_files = find_typ_files()
    pdf_files = [f for f in typ_files if "pdf" in f.stem.lower()]

    if not pdf_files:
        return True

    print("正在构建 PDF 文件...")

    # 获取公共依赖
    common_deps = find_common_dependencies()

    def build_pdf_args(typ_file: Path, output_path: Path) -> list[str]:
        """构建 PDF 编译参数"""
        return [
            "compile",
            "--root",
            ".",
            "--font-path",
            str(ASSETS_DIR),
            str(typ_file),
            str(output_path),
        ]

    stats = _compile_files(
        pdf_files,
        force,
        common_deps,
        lambda typ_file: get_file_output_path(typ_file, "pdf"),
        build_pdf_args,
    )

    print(f"✅ PDF 构建完成。{stats.format_summary()}")
    return not stats.has_failures


def copy_assets() -> bool:
    """复制静态资源到输出目录。"""
    if not ASSETS_DIR.exists():
        print(f"  ⚠ 静态资源目录 {ASSETS_DIR} 不存在。")
        return True

    SITE_DIR.mkdir(parents=True, exist_ok=True)
    target_dir = SITE_DIR / "assets"

    def _is_generated_responsive_asset(path: Path) -> bool:
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            return False

        stem = path.stem
        width_variant = re.search(r"-w\d+$", stem)
        if not width_variant:
            return False

        original_stem = stem[: width_variant.start()]
        original_path = path.with_name(original_stem)
        return any(
            (ASSETS_DIR / original_path.with_suffix(ext)).exists()
            for ext in (".jpg", ".jpeg", ".png", ".webp")
        )

    try:
        target_dir.mkdir(parents=True, exist_ok=True)

        copied_count = 0
        removed_count = 0

        for item in ASSETS_DIR.rglob("*"):
            relative_path = item.relative_to(ASSETS_DIR)
            target_path = target_dir / relative_path

            if item.is_dir():
                target_path.mkdir(parents=True, exist_ok=True)
                continue

            if target_path.exists() and get_file_mtime(item) <= get_file_mtime(target_path):
                continue

            target_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target_path)
            copied_count += 1

        source_paths = {item.relative_to(ASSETS_DIR) for item in ASSETS_DIR.rglob("*") if item.is_file()}
        for target_path in sorted((p for p in target_dir.rglob("*") if p.is_file()), reverse=True):
            relative_path = target_path.relative_to(target_dir)
            if relative_path in source_paths or _is_generated_responsive_asset(relative_path):
                continue
            target_path.unlink()
            removed_count += 1

        for directory in sorted((p for p in target_dir.rglob("*") if p.is_dir()), reverse=True):
            try:
                directory.rmdir()
            except OSError:
                pass

        if copied_count > 0 or removed_count > 0:
            print(f"✅ 静态资源同步完成: 复制 {copied_count} 个，删除 {removed_count} 个过期文件")

        return True
    except Exception as e:
        print(f"  ❌ 复制静态资源失败: {e}")
        return False


def copy_content_assets(force: bool = False) -> bool:
    """
    复制 content 目录下的非 .typ 文件（如图片）到输出目录。
    支持增量复制：只复制修改过的文件。

    参数:
        force: 是否强制复制所有文件
    """
    SITE_DIR.mkdir(parents=True, exist_ok=True)

    if not CONTENT_DIR.exists():
        print(f"  ⚠ 内容目录 {CONTENT_DIR} 不存在，跳过。")
        return True

    try:
        copy_count = 0
        skip_count = 0

        for item in CONTENT_DIR.rglob("*"):
            # 跳过目录和 .typ 文件
            if item.is_dir() or item.suffix == ".typ":
                continue

            # 跳过以下划线开头的路径
            relative_path = item.relative_to(CONTENT_DIR)
            if any(part.startswith("_") for part in relative_path.parts):
                continue

            # 计算目标路径
            target_path = SITE_DIR / relative_path

            # 增量复制检查
            if not force and target_path.exists():
                if get_file_mtime(item) <= get_file_mtime(target_path):
                    skip_count += 1
                    continue

            # 创建目标目录
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # 复制文件
            shutil.copy2(item, target_path)
            copy_count += 1

        return True
    except Exception as e:
        print(f"  ❌ 复制内容资源文件失败: {e}")
        return False


def remove_unused_font_assets(site_dir: Path) -> bool:
    """
    删除站点产物中已停用的字体资源目录。

    当前会移除：
    - _site/assets/fonts/STKaiti
    """

    stale_font_dirs = [
        site_dir / "assets" / "fonts" / "STKaiti",
    ]

    try:
        removed_count = 0

        for font_dir in stale_font_dirs:
            if font_dir.exists() and font_dir.is_dir():
                shutil.rmtree(font_dir)
                removed_count += 1

        if removed_count > 0:
            print(f"✅ 已删除停用字体目录: {removed_count} 个")

        return True
    except Exception as e:
        print(f"❌ 删除停用字体目录失败: {e}")
        return False


def normalize_font_display(site_dir: Path, target_display: str = "optional") -> bool:
    """
    将站点 CSS 中的 font-display: swap 统一替换为目标策略。

    主要用于减少首屏字体闪切（FOUT）。
    当前处理文件：
    - _site/assets/custom.css
    """

    target_files = [
        site_dir / "assets" / "custom.css",
    ]

    pattern = re.compile(r"font-display\s*:\s*swap\s*;", re.IGNORECASE)

    try:
        updated_files = 0
        updated_rules = 0

        for css_file in target_files:
            if not css_file.exists():
                continue

            content = css_file.read_text(encoding="utf-8")
            new_content, count = pattern.subn(f"font-display: {target_display};", content)

            if count > 0 and new_content != content:
                css_file.write_text(new_content, encoding="utf-8")
                updated_files += 1
                updated_rules += count

        if updated_files > 0:
            print(
                "✅ 字体显示策略调整完成: "
                f"更新 {updated_files} 个 CSS 文件，共 {updated_rules} 处 font-display"
            )

        return True
    except Exception as e:
        print(f"❌ 字体显示策略调整失败: {e}")
        return False


def add_asset_versioning(site_dir: Path) -> bool:
    """
    为生成的 HTML 中的 /assets/* 资源引用追加基于内容哈希的版本参数。

    示例:
        /assets/custom.css -> /assets/custom.css?v=1a2b3c4d
    """
    assets_dir = site_dir / "assets"
    if not assets_dir.exists():
        return True

    versionable_exts = {
        ".css",
        ".js",
        ".woff2",
        ".woff",
        ".ttf",
        ".otf",
        ".eot",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".svg",
        ".ico",
        ".avif",
    }

    try:
        version_map: dict[str, str] = {}

        # 计算资源文件哈希
        for file in assets_dir.rglob("*"):
            if not file.is_file() or file.suffix.lower() not in versionable_exts:
                continue

            rel_path = file.relative_to(site_dir)
            asset_url = f"/{rel_path.as_posix()}"

            digest = hashlib.md5(file.read_bytes()).hexdigest()[:8]
            version_map[asset_url] = digest

        if not version_map:
            return True

        ref_pattern = re.compile(
            r"(?P<prefix>\b(?:href|src|xlink:href)=['\"])(?P<path>/assets/[^'\"]+)(?P<suffix>['\"])",
            re.IGNORECASE,
        )
        srcset_pattern = re.compile(
            r"(?P<prefix>\bsrcset=['\"])(?P<value>[^'\"]+)(?P<suffix>['\"])",
            re.IGNORECASE,
        )

        def _append_version(path: str) -> str:
            # 分离 fragment 与 query
            path_no_frag, frag_sep, fragment = path.partition("#")
            base, query_sep, query = path_no_frag.partition("?")

            if base not in version_map:
                return path

            query_parts = []
            if query:
                query_parts = [part for part in query.split("&") if part and not part.startswith("v=")]
            query_parts.append(f"v={version_map[base]}")

            new_path = f"{base}?{'&'.join(query_parts)}"
            if frag_sep:
                new_path = f"{new_path}#{fragment}"

            return new_path

        updated_files = 0

        for html_file in site_dir.rglob("*.html"):
            content = html_file.read_text(encoding="utf-8")

            def _replace(match: re.Match[str]) -> str:
                original_path = match.group("path")
                new_path = _append_version(original_path)
                if new_path == original_path:
                    return match.group(0)
                return f"{match.group('prefix')}{new_path}{match.group('suffix')}"

            def _replace_srcset(match: re.Match[str]) -> str:
                value = match.group("value")
                parts = [part.strip() for part in value.split(",") if part.strip()]
                if not parts:
                    return match.group(0)

                changed = False
                new_parts: list[str] = []

                for part in parts:
                    tokens = part.split()
                    if not tokens:
                        continue

                    url = tokens[0]
                    descriptor = " ".join(tokens[1:])

                    new_url = _append_version(url)
                    if new_url != url:
                        changed = True

                    new_parts.append(f"{new_url} {descriptor}".strip())

                if not changed:
                    return match.group(0)

                return f"{match.group('prefix')}{', '.join(new_parts)}{match.group('suffix')}"

            new_content = ref_pattern.sub(_replace, content)
            new_content = srcset_pattern.sub(_replace_srcset, new_content)

            if new_content != content:
                html_file.write_text(new_content, encoding="utf-8")
                updated_files += 1

        if updated_files > 0:
            print(f"✅ 资源版本参数注入完成: 更新 {updated_files} 个 HTML 文件")

        return True
    except Exception as e:
        print(f"❌ 资源版本参数注入失败: {e}")
        return False


def generate_responsive_images(
    site_dir: Path,
    target_widths: tuple[int, ...] = (480, 768, 1024, 1366),
    default_sizes: str = "(max-width: 900px) 100vw, 760px",
    prefer_webp: bool = True,
    webp_quality: int = 80,
    webp_method: int = 2,
    min_responsive_width: int = 480,
    min_responsive_height: int = 180,
    max_responsive_ratio: float = 8.0,
) -> bool:
    """
    为 HTML 中本地 <img> 自动生成多尺寸文件并注入 srcset/sizes。
    """
    try:
        from PIL import Image
        from PIL import ImageOps
    except ImportError:
        print("⚠ Pillow 未安装，跳过多尺寸图片生成（可安装: pip install pillow）")
        return True

    raster_exts = {".jpg", ".jpeg", ".png", ".webp"}
    img_tag_pattern = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
    width_variant_pattern = re.compile(r"-w\d+$")
    dim_attr_pattern_template = r"\b{attr}\s*=\s*(?P<quote>['\"])(?P<value>[^'\"]*)(?P=quote)"
    numeric_dim_pattern = re.compile(r"^\s*([+-]?\d+(?:\.\d+)?)\s*([a-z%]*)\s*$", re.IGNORECASE)

    def _set_or_replace_attr(tag: str, name: str, value: str) -> str:
        attr_pattern = re.compile(
            rf"(?<![\w:-]){re.escape(name)}\s*=\s*(['\"]).*?\1",
            re.IGNORECASE,
        )
        replacement = f'{name}="{value}"'

        if attr_pattern.search(tag):
            return attr_pattern.sub(replacement, tag, count=1)

        close_pos = tag.rfind(">")
        if close_pos == -1:
            return tag
        return f"{tag[:close_pos]} {replacement}{tag[close_pos:]}"

    def _get_attr_value(tag: str, name: str) -> str | None:
        pattern = re.compile(
            dim_attr_pattern_template.format(attr=rf"(?<![\w:-]){re.escape(name)}"),
            re.IGNORECASE,
        )
        match = pattern.search(tag)
        if not match:
            return None
        return match.group("value")

    def _parse_dim(value: str | None) -> tuple[float | None, bool]:
        if value is None:
            return None, False

        cleaned = value.strip()
        if cleaned == "":
            return None, False

        match = numeric_dim_pattern.match(cleaned)
        if not match:
            return None, False

        number = float(match.group(1))
        unit = match.group(2).lower()

        is_zero_or_negative = number <= 0
        if is_zero_or_negative:
            return number, True

        # 仅把无单位/px 视为可换算的像素值，其它单位不覆盖。
        if unit not in {"", "px"}:
            return None, True

        return number, True

    def _is_missing_or_obvious_zero(value: str | None) -> bool:
        numeric, is_numeric_like = _parse_dim(value)
        if value is None or (value.strip() if value else "") == "":
            return True
        return is_numeric_like and numeric is not None and numeric <= 0

    def _apply_dimension_attrs(
        tag: str,
        src_w: int,
        src_h: int,
        raw_w: int | None = None,
        raw_h: int | None = None,
    ) -> str:
        width_raw = _get_attr_value(tag, "width")
        height_raw = _get_attr_value(tag, "height")
        width_missing = _is_missing_or_obvious_zero(width_raw)
        height_missing = _is_missing_or_obvious_zero(height_raw)

        width_num, width_numeric_like = _parse_dim(width_raw)
        height_num, height_numeric_like = _parse_dim(height_raw)

        has_exif_rotation = (
            raw_w is not None
            and raw_h is not None
            and raw_w > 0
            and raw_h > 0
            and (raw_w, raw_h) != (src_w, src_h)
        )

        if (
            has_exif_rotation
            and width_numeric_like
            and height_numeric_like
            and width_num is not None
            and height_num is not None
            and round(width_num) == raw_w
            and round(height_num) == raw_h
        ):
            new_tag = _set_or_replace_attr(tag, "width", str(src_w))
            return _set_or_replace_attr(new_tag, "height", str(src_h))

        if not width_missing and not height_missing:
            return tag

        new_tag = tag

        if width_missing and height_missing:
            new_tag = _set_or_replace_attr(new_tag, "width", str(src_w))
            new_tag = _set_or_replace_attr(new_tag, "height", str(src_h))
            return new_tag

        if width_missing and (height_num is not None) and height_num > 0 and height_numeric_like:
            inferred_w = max(1, round(src_w * (height_num / src_h)))
            new_tag = _set_or_replace_attr(new_tag, "width", str(inferred_w))

        if height_missing and (width_num is not None) and width_num > 0 and width_numeric_like:
            inferred_h = max(1, round(src_h * (width_num / src_w)))
            new_tag = _set_or_replace_attr(new_tag, "height", str(inferred_h))

        return new_tag

    def _split_url(url: str) -> tuple[str, str, str]:
        no_frag, _, frag = url.partition("#")
        base, _, query = no_frag.partition("?")
        return base, query, frag

    def _resolve_local_file(base_url: str, html_file: Path) -> Path | None:
        if base_url.startswith(("http://", "https://", "//", "data:")):
            return None

        base_url = unquote(base_url)
        if base_url.startswith("/"):
            candidate = site_dir / base_url.lstrip("/")
        else:
            candidate = (html_file.parent / base_url).resolve()

        try:
            candidate.resolve().relative_to(site_dir.resolve())
        except Exception:
            return None

        return candidate

    def _sibling_url(base_url: str, sibling_name: str) -> str:
        if "/" not in base_url:
            return sibling_name

        parent = base_url.rsplit("/", 1)[0]
        if parent == "":
            return f"/{sibling_name}"
        return f"{parent}/{sibling_name}"

    def _strip_version_param(url: str) -> str:
        no_frag, frag_sep, fragment = url.partition("#")
        base, query_sep, query = no_frag.partition("?")
        if not query_sep:
            return url

        query_parts = [part for part in query.split("&") if part and not part.startswith("v=")]
        normalized = base
        if query_parts:
            normalized = f"{normalized}?{'&'.join(query_parts)}"
        if frag_sep:
            normalized = f"{normalized}#{fragment}"
        return normalized

    def _normalize_srcset_value(value: str) -> str:
        parts = [part.strip() for part in value.split(",") if part.strip()]
        normalized_parts: list[str] = []

        for part in parts:
            tokens = part.split()
            if not tokens:
                continue

            url = _strip_version_param(tokens[0])
            descriptor = " ".join(tokens[1:])
            normalized_parts.append(f"{url} {descriptor}".strip())

        return ", ".join(normalized_parts)

    def _set_url_attr(tag: str, name: str, value: str) -> str:
        current = _get_attr_value(tag, name)
        if current is not None and _strip_version_param(current) == value:
            return tag
        return _set_or_replace_attr(tag, name, value)

    def _set_srcset_attr(tag: str, value: str) -> str:
        current = _get_attr_value(tag, "srcset")
        if current is not None and _normalize_srcset_value(current) == _normalize_srcset_value(value):
            return tag
        return _set_or_replace_attr(tag, "srcset", value)

    def _open_normalized_image(path: Path):
        img = Image.open(path)
        try:
            return ImageOps.exif_transpose(img)
        finally:
            img.close()

    def _get_image_size(path: Path) -> tuple[int, int] | None:
        try:
            with Image.open(path) as img:
                return img.size
        except Exception:
            return None

    def _normalize_mode(img, output_ext: str):
        if output_ext in {".jpg", ".jpeg"} and img.mode not in {"RGB", "L"}:
            return img.convert("RGB")

        if output_ext == ".webp" and img.mode not in {"RGB", "RGBA", "L", "LA"}:
            return img.convert("RGBA" if "A" in img.getbands() else "RGB")

        return img

    def _save_resized_image(img, output_path: Path, output_ext: str) -> None:
        if output_ext in {".jpg", ".jpeg"}:
            img.save(
                output_path,
                format="JPEG",
                quality=78,
                optimize=True,
                progressive=True,
            )
        elif output_ext == ".png":
            img.save(output_path, format="PNG", optimize=True)
        elif output_ext == ".webp":
            img.save(output_path, format="WEBP", quality=webp_quality, method=webp_method)

    def _should_skip_responsive(src_w: int, src_h: int) -> bool:
        if src_w < min_responsive_width or src_h < min_responsive_height:
            return True

        ratio = max(src_w / src_h, src_h / src_w)
        return ratio > max_responsive_ratio

    def _needs_variant_refresh(
        variant_path: Path,
        source_mtime: float,
        expected_w: int,
        expected_h: int,
    ) -> bool:
        if not variant_path.exists() or variant_path.stat().st_mtime < source_mtime:
            return True

        return _get_image_size(variant_path) != (expected_w, expected_h)

    def _source_candidate_for_generated(path: Path) -> Path | None:
        stem = path.stem
        width_variant = width_variant_pattern.search(stem)
        if not width_variant and path.suffix.lower() != ".webp":
            return None

        original_stem = stem[: width_variant.start()] if width_variant else stem
        source_exts = (".jpg", ".jpeg", ".png", ".webp") if width_variant else (".jpg", ".jpeg", ".png")

        for ext in source_exts:
            candidate = path.with_name(f"{original_stem}{ext}")
            if candidate.exists() and candidate != path:
                return candidate

        return None

    def _canonical_image_source(local_file: Path) -> Path:
        candidate = _source_candidate_for_generated(local_file)
        if candidate is not None:
            return candidate
        return local_file

    def _url_for_file(base_url: str, file_path: Path) -> str:
        return _sibling_url(base_url, file_path.name)

    def _remove_stale_variants(local_file: Path, keep_paths: set[Path]) -> int:
        removed_count = 0
        pattern = f"{local_file.stem}-w*.*"

        for path in local_file.parent.glob(pattern):
            if path in keep_paths or not path.is_file():
                continue
            if not width_variant_pattern.search(path.stem):
                continue
            if path.suffix.lower() not in raster_exts:
                continue

            try:
                path.unlink()
                removed_count += 1
            except OSError:
                pass

        return removed_count

    try:
        resample = Image.Resampling.LANCZOS
    except Exception:
        resample = Image.LANCZOS

    generated_variants = 0
    removed_stale_variants = 0
    updated_img_tags = 0
    updated_html_files = 0
    image_dim_cache: dict[str, tuple[int, int, int, int]] = {}

    try:
        for html_file in site_dir.rglob("*.html"):
            content = html_file.read_text(encoding="utf-8")

            def _replace_img(match: re.Match[str]) -> str:
                nonlocal generated_variants, removed_stale_variants, updated_img_tags

                original_tag = match.group(0)
                src_url = _get_attr_value(original_tag, "src")
                if not src_url:
                    return original_tag

                base_url, _, _ = _split_url(src_url)
                local_file = _resolve_local_file(base_url, html_file)
                if local_file is None or not local_file.exists():
                    return original_tag

                local_file = _canonical_image_source(local_file)
                ext = local_file.suffix.lower()
                if ext not in raster_exts:
                    return original_tag

                output_ext = ".webp" if prefer_webp else ext

                cache_key = str(local_file)
                if cache_key in image_dim_cache:
                    src_w, src_h, raw_w, raw_h = image_dim_cache[cache_key]
                else:
                    try:
                        raw_size = _get_image_size(local_file)
                        with _open_normalized_image(local_file) as src_img:
                            src_w, src_h = src_img.size
                    except Exception:
                        return original_tag
                    raw_w, raw_h = raw_size or (src_w, src_h)
                    image_dim_cache[cache_key] = (src_w, src_h, raw_w, raw_h)

                new_tag = _apply_dimension_attrs(original_tag, src_w, src_h, raw_w, raw_h)
                source_url = _url_for_file(base_url, local_file)
                new_tag = _set_url_attr(new_tag, "src", source_url)

                if _should_skip_responsive(src_w, src_h):
                    if new_tag != original_tag:
                        updated_img_tags += 1
                    return new_tag

                widths = [w for w in target_widths if 0 < w < src_w]
                if not widths:
                    if new_tag != original_tag:
                        updated_img_tags += 1
                    return new_tag

                variant_entries: list[tuple[str, int]] = []

                try:
                    source_mtime = local_file.stat().st_mtime
                    keep_paths: set[Path] = set()
                    with _open_normalized_image(local_file) as src_img:
                        working = _normalize_mode(src_img, output_ext)
                        for w in widths:
                            variant_name = f"{local_file.stem}-w{w}{output_ext}"
                            variant_path = local_file.with_name(variant_name)
                            keep_paths.add(variant_path)
                            new_h = max(1, round(src_h * (w / src_w)))

                            if _needs_variant_refresh(variant_path, source_mtime, w, new_h):
                                resized = working.resize((w, new_h), resample=resample)

                                _save_resized_image(resized, variant_path, output_ext)

                                generated_variants += 1

                            variant_url = _url_for_file(source_url, variant_path)
                            variant_entries.append((variant_url, w))

                    removed_stale_variants += _remove_stale_variants(local_file, keep_paths)

                    largest_variant_width = variant_entries[-1][1] if variant_entries else 0
                    include_original_in_srcset = src_w <= (largest_variant_width * 1.5)
                    if include_original_in_srcset:
                        variant_entries.append((source_url, src_w))
                except Exception:
                    return original_tag

                variant_entries.sort(key=lambda item: item[1])
                srcset_value = ", ".join(f"{url} {w}w" for url, w in variant_entries)

                new_tag = _set_srcset_attr(new_tag, srcset_value)

                sizes_match = re.search(
                    r"\bsizes\s*=\s*(['\"])(?P<value>.*?)\1", new_tag, re.IGNORECASE
                )
                if sizes_match is None or sizes_match.group("value").strip().lower() in {
                    "100vw",
                    "auto",
                }:
                    new_tag = _set_or_replace_attr(new_tag, "sizes", default_sizes)

                if new_tag != original_tag:
                    updated_img_tags += 1

                return new_tag

            new_content = img_tag_pattern.sub(_replace_img, content)

            if new_content != content:
                html_file.write_text(new_content, encoding="utf-8")
                updated_html_files += 1

        if updated_img_tags > 0:
            print(
                "✅ 多尺寸图片生成完成: "
                f"新增/更新 {generated_variants} 个尺寸变体、清理 {removed_stale_variants} 个过期变体，"
                f"更新 {updated_img_tags} 个 <img>，涉及 {updated_html_files} 个 HTML"
            )

        return True
    except Exception as e:
        print(f"❌ 多尺寸图片生成失败: {e}")
        return False


def check_image_paths() -> bool:
    """
    检查 Typst 源文件中容易绕过资源复制和响应式图片处理的图片路径。
    """
    if not CONTENT_DIR.exists():
        return True

    bad_refs: list[tuple[Path, int, str]] = []
    bad_pattern = re.compile(r"#image\(\s*([\"'])/content/")
    inline_code_pattern = re.compile(r"`[^`]*`")

    try:
        for typ_file in CONTENT_DIR.rglob("*.typ"):
            in_code_block = False
            for line_no, line in enumerate(typ_file.read_text(encoding="utf-8").splitlines(), 1):
                if line.lstrip().startswith("```"):
                    in_code_block = not in_code_block
                    continue
                if in_code_block:
                    continue

                active_line = inline_code_pattern.sub("", line)
                if bad_pattern.search(active_line):
                    bad_refs.append((typ_file, line_no, line.strip()))

        if bad_refs:
            print("❌ 图片路径检查失败: 不要在 #image() 里使用 /content/... 绝对路径")
            print("   请改成相对当前页面的路径，例如 imgs/example.jpg。")
            for typ_file, line_no, line in bad_refs[:20]:
                print(f"  - {typ_file}:{line_no}: {line}")
            if len(bad_refs) > 20:
                print(f"  ... 另有 {len(bad_refs) - 20} 处")
            return False

        print("✅ 图片路径检查通过")
        return True
    except Exception as e:
        print(f"❌ 图片路径检查失败: {e}")
        return False


def check() -> bool:
    """运行不触发构建的静态检查。"""
    return check_image_paths()


def clean() -> bool:
    """
    清理生成的文件。
    """
    print("正在清理生成的文件...")

    if not SITE_DIR.exists():
        print(f"  输出目录 {SITE_DIR} 不存在，无需清理。")
        return True

    try:
        # 删除 _site 目录下的所有内容
        for item in SITE_DIR.iterdir():
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()

        print(f"  ✅ 已清理 {SITE_DIR}/ 目录。")
        return True
    except Exception as e:
        print(f"  ❌ 清理失败: {e}")
        return False


def preview(port: int = 8000, open_browser_flag: bool = True) -> bool:
    """
    启动本地预览服务器。

    首先尝试使用 uvx livereload（支持实时刷新），
    如果失败则回退到 Python 内置的 http.server。

    参数:
        port: 服务器端口号，默认为 8000
        open_browser_flag: 是否自动打开浏览器，默认为 True
    """
    import webbrowser

    if not SITE_DIR.exists():
        print(f"  ⚠ 输出目录 {SITE_DIR} 不存在，请先运行 build 命令。")
        return False

    print("正在启动本地预览服务器（按 Ctrl+C 停止）...")
    print()

    if open_browser_flag:

        def open_browser():
            time.sleep(1.5)  # 等待服务器启动
            url = f"http://localhost:{port}"
            print(f"  🚀 正在打开浏览器: {url}")
            webbrowser.open(url)

        # 在后台线程中打开浏览器
        threading.Thread(target=open_browser, daemon=True).start()

    # 首先尝试 uvx livereload
    try:
        result = subprocess.run(
            ["uvx", "livereload", str(SITE_DIR), "-p", str(port)],
            check=False,
        )
        return result.returncode == 0
    except FileNotFoundError:
        print("  未找到 uv，尝试 Python http.server...")
    except KeyboardInterrupt:
        print("\n服务器已停止。")
        return True

    # 回退到 Python http.server
    try:
        print("使用 Python 内置 http.server...")
        result = subprocess.run(
            [sys.executable, "-m", "http.server", str(port), "--directory", str(SITE_DIR)],
            check=False,
        )
        return result.returncode == 0
    except KeyboardInterrupt:
        print("\n服务器已停止。")
        return True
    except Exception as e:
        print(f"  ❌ 启动服务器失败: {e}")
        return False


def slugify(value: str) -> str:
    """
    将输入文本转换为 URL 友好的 slug（小写、连字符）。
    """
    text = value.strip().lower()
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"[^a-z0-9\-]+", "-", text)
    text = re.sub(r"-{2,}", "-", text)
    return text.strip("-")


def list_content_groups() -> list[str]:
    """
    列出内容目录下可用于新增文章的一级分组目录。
    """
    if not CONTENT_DIR.exists():
        return []

    groups: list[str] = []
    for item in sorted(CONTENT_DIR.iterdir(), key=lambda p: p.name.lower()):
        if item.is_dir() and not item.name.startswith("_"):
            groups.append(item.name)
    return groups


def content_path_to_url(typ_file: Path) -> str:
    """
    将 content 下的 Typst 文件路径转换为站点 URL。
    """
    rel_path = typ_file.relative_to(CONTENT_DIR)

    if rel_path == Path("index.typ"):
        return "/"

    if rel_path.name == "index.typ":
        return f"/{rel_path.parent.as_posix().strip('/')}/"

    return f"/{rel_path.with_suffix('').as_posix().strip('/')}/"


def content_path_to_label(typ_file: Path) -> str:
    """
    生成人类可读的内容页标签。
    """
    rel_path = typ_file.relative_to(CONTENT_DIR)

    if rel_path == Path("index.typ"):
        return "Home"

    if rel_path.name == "index.typ":
        return rel_path.parent.as_posix()

    return rel_path.with_suffix("").as_posix()


def _extract_template_string(source: str, field: str) -> str:
    """
    从 template.with(...) 参数中提取简单字符串字段。
    """
    pattern = re.compile(rf"\b{re.escape(field)}\s*:\s*\"((?:\\.|[^\"])*)\"", re.MULTILINE)
    match = pattern.search(source)
    if not match:
        return ""

    value = match.group(1)
    try:
        return bytes(value, "utf-8").decode("unicode_escape")
    except Exception:
        return value.replace(r"\"", '"').replace(r"\\", "\\")


def _extract_first_heading(source: str) -> str:
    """
    从 Typst 内容中提取首个一级标题作为备用标题。
    """
    for line in source.splitlines():
        match = re.match(r"^\s*=\s+(.+?)\s*$", line)
        if match:
            return match.group(1).strip()

    return ""


def collect_content_pages() -> list[dict[str, str | int | bool]]:
    """
    扫描 content 下所有可管理的 Typst 页面。
    """
    if not CONTENT_DIR.exists():
        return []

    pages: list[dict[str, str | int | bool]] = []
    for typ_file in sorted(find_typ_files(), key=lambda p: content_path_to_label(p).lower()):
        rel_path = typ_file.relative_to(CONTENT_DIR)

        try:
            source = typ_file.read_text(encoding="utf-8")
        except Exception:
            source = ""

        parts = rel_path.parts
        group = parts[0] if len(parts) > 1 else "Root"
        is_section_index = len(parts) == 2 and rel_path.name == "index.typ"
        is_home = rel_path == Path("index.typ")

        title = _extract_template_string(source, "title") or _extract_first_heading(source)
        description = _extract_template_string(source, "description")

        pages.append(
            {
                "path": rel_path.as_posix(),
                "label": content_path_to_label(typ_file),
                "title": title or content_path_to_label(typ_file),
                "description": description,
                "group": group,
                "url": content_path_to_url(typ_file),
                "bytes": len(source.encode("utf-8")),
                "mtime": int(typ_file.stat().st_mtime) if typ_file.exists() else 0,
                "is_home": is_home,
                "is_section_index": is_section_index,
            }
        )

    return pages


def resolve_content_typ_path(rel_path: str) -> Path | None:
    """
    将前端传入的 content 相对路径解析为安全的 .typ 文件路径。
    """
    normalized = rel_path.strip().replace("\\", "/")
    if not normalized:
        return None

    content_root = CONTENT_DIR.resolve()
    candidate = (CONTENT_DIR / normalized).resolve()
    try:
        content_rel_path = candidate.relative_to(content_root)
    except ValueError:
        return None

    if candidate.suffix != ".typ":
        return None
    if any(part.startswith("_") for part in content_rel_path.parts):
        return None

    return CONTENT_DIR / content_rel_path


def read_content_page(rel_path: str) -> dict:
    """
    读取一个 Typst 内容页源码。
    """
    typ_file = resolve_content_typ_path(rel_path)
    if typ_file is None:
        return {"ok": False, "message": "无效的页面路径。"}
    if not typ_file.exists():
        return {"ok": False, "message": f"页面不存在: {rel_path}"}

    try:
        content = typ_file.read_text(encoding="utf-8")
    except Exception as e:
        return {"ok": False, "message": f"读取页面失败: {e}"}

    rel = typ_file.relative_to(CONTENT_DIR)
    return {
        "ok": True,
        "path": rel.as_posix(),
        "label": content_path_to_label(typ_file),
        "url": content_path_to_url(typ_file),
        "content": content,
        "mtime": int(typ_file.stat().st_mtime),
    }


def write_content_page(rel_path: str, content: str, expected_mtime: int | None = None) -> dict:
    """
    保存一个 Typst 内容页源码。
    """
    typ_file = resolve_content_typ_path(rel_path)
    if typ_file is None:
        return {"ok": False, "message": "无效的页面路径。"}
    if not typ_file.exists():
        return {"ok": False, "message": f"页面不存在: {rel_path}"}

    try:
        current_mtime = int(typ_file.stat().st_mtime)
        if expected_mtime is not None and expected_mtime > 0 and current_mtime != expected_mtime:
            return {
                "ok": False,
                "message": "文件已在磁盘上变化。请重新载入页面后再保存。",
            }

        typ_file.write_text(content, encoding="utf-8")
    except Exception as e:
        return {"ok": False, "message": f"保存页面失败: {e}"}

    return {
        "ok": True,
        "message": "页面已保存。",
        "path": typ_file.relative_to(CONTENT_DIR).as_posix(),
        "url": content_path_to_url(typ_file),
        "mtime": int(typ_file.stat().st_mtime),
    }


def build_single_content_page(rel_path: str) -> dict:
    """
    构建单个内容页，方便 admin 保存后快速刷新预览。
    """
    typ_file = resolve_content_typ_path(rel_path)
    if typ_file is None:
        return {"ok": False, "message": "无效的页面路径。"}
    if not typ_file.exists():
        return {"ok": False, "message": f"页面不存在: {rel_path}"}
    if "pdf" in typ_file.stem.lower():
        return {"ok": False, "message": "PDF 类型页面暂不支持 HTML 预览构建。"}

    output_path = get_file_output_path(typ_file, "html")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    common_deps = find_common_dependencies()

    def _build_args(page_file: Path, target_path: Path) -> list[str]:
        try:
            rel = page_file.relative_to(CONTENT_DIR)
            if rel.name == "index.typ":
                page_path = rel.parent.as_posix()
                if page_path == ".":
                    page_path = ""
            else:
                page_path = rel.with_suffix("").as_posix()
        except ValueError:
            page_path = ""

        return [
            "compile",
            "--root",
            ".",
            "--font-path",
            str(ASSETS_DIR),
            "--features",
            "html",
            "--format",
            "html",
            "--input",
            f"page-path={page_path}",
            str(page_file),
            str(target_path),
        ]

    stats = _compile_files([typ_file], True, common_deps, lambda _: output_path, _build_args)
    if stats.has_failures:
        return {"ok": False, "message": "页面构建失败，请查看终端 Typst 错误。"}

    copy_assets()
    copy_content_assets()
    normalize_font_display(SITE_DIR)
    generate_responsive_images(SITE_DIR)
    add_asset_versioning(SITE_DIR)

    return {
        "ok": True,
        "message": "页面已构建。",
        "url": content_path_to_url(typ_file),
        "output": str(output_path),
    }


def escape_typst_string(value: str) -> str:
    """
    对 Typst 字符串中的特殊字符进行转义。
    """
    escaped = value.replace("\\", "\\\\")
    escaped = escaped.replace('"', '\\"')
    return escaped


def format_typst_date(date_str: str) -> str:
    """
    将 YYYY-MM-DD 字符串转换为 Typst datetime(...) 片段。
    """
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    return f"datetime(year: {date_obj.year}, month: {date_obj.month}, day: {date_obj.day})"


def parse_sections(index_path: Path) -> list[str]:
    """
    解析栏目首页中的二级及以上标题（==/===/...）作为可选分组。
    """
    if not index_path.exists():
        return []

    sections: list[str] = []

    for line in index_path.read_text(encoding="utf-8").splitlines():
        heading = _parse_typst_section_heading(line)
        if heading is None:
            continue
        _, section = heading
        if section and section not in sections:
            sections.append(section)

    return sections


def _parse_typst_section_heading(line: str) -> tuple[int, str] | None:
    """
    解析 Typst 二级及以上标题，返回标题层级和标题文本。
    """
    match = re.match(r"^\s*(=+)\s+(.+?)\s*$", line)
    if not match:
        return None

    level = len(match.group(1))
    if level < 2:
        return None

    return level, match.group(2).strip()


def build_content_post_typ_content(
    title: str,
    description: str,
    date_str: str,
    lang: str,
) -> str:
    """
    生成新文章的 Typst 文件内容。
    """
    title_escaped = escape_typst_string(title)
    desc_escaped = escape_typst_string(description)
    lang_escaped = escape_typst_string(lang)
    typst_date = format_typst_date(date_str)

    return (
        '#import "../index.typ": template, tufted\n'
        '#import "@preview/theorion:0.4.1": *\n'
        "#show: template.with(\n"
        f'  title: "{title_escaped}",\n'
        f'  description: "{desc_escaped}",\n'
        f"  date: {typst_date},\n"
        f'  lang: "{lang_escaped}",\n'
        ")\n\n"
        f"= {title}\n\n"
    )


def _find_insert_anchor(lines: list[str], section: str | None) -> int:
    """
    计算栏目列表链接的插入位置：
    - 指定分组时，插入到该分组末尾（下一个同级或更高级标题前）
    - 未指定时，默认插入到文件末尾并确保有空行隔开
    """
    if not lines:
        return 0

    if section:
        start_idx: int | None = None
        section_level: int | None = None
        for idx, line in enumerate(lines):
            heading = _parse_typst_section_heading(line)
            if heading is None:
                continue
            level, title = heading
            if title == section:
                start_idx = idx
                section_level = level
                break

        if start_idx is not None and section_level is not None:
            end_idx = len(lines)
            for idx in range(start_idx + 1, len(lines)):
                heading = _parse_typst_section_heading(lines[idx])
                if heading is not None and heading[0] <= section_level:
                    end_idx = idx
                    break

            insert_idx = end_idx
            while insert_idx > start_idx + 1 and lines[insert_idx - 1].strip() == "":
                insert_idx -= 1
            return insert_idx

    insert_idx = len(lines)
    while insert_idx > 0 and lines[insert_idx - 1].strip() == "":
        insert_idx -= 1
    return insert_idx


def _infer_index_link_prefix(lines: list[str]) -> str:
    """
    根据栏目首页里已有链接格式推断新链接是否应使用列表项前缀。
    """
    bullet_links = 0
    bare_links = 0

    for line in lines:
        stripped = line.strip()
        if re.match(r"^-\s+#link\(", stripped):
            bullet_links += 1
        elif re.match(r"^#link\(", stripped):
            bare_links += 1

    return "- " if bullet_links > bare_links else ""


def upsert_index_link(
    index_path: Path,
    slug: str,
    link_text: str,
    section: str | None,
) -> tuple[bool, str]:
    """
    在栏目首页中插入新文章链接；若链接已存在则跳过。
    """
    if not index_path.exists():
        return False, f"栏目首页不存在: {index_path}"

    original = index_path.read_text(encoding="utf-8")
    lines = original.splitlines()

    link_prefix = _infer_index_link_prefix(lines)
    target_line = f'{link_prefix}#link("{slug}/")[{link_text}]'
    slug_marker = f'#link("{slug}/")'

    if any(slug_marker in line for line in lines):
        return True, "栏目首页已有同 slug 链接，已跳过插入。"

    insert_idx = _find_insert_anchor(lines, section)

    # 在链接前后各保留一个空行，提升可读性
    payload = [""]
    payload.append(target_line)
    payload.append("")

    new_lines = lines[:insert_idx] + payload + lines[insert_idx:]
    new_content = "\n".join(new_lines).rstrip() + "\n"

    index_path.write_text(new_content, encoding="utf-8")
    return True, "已更新栏目首页链接。"


def create_content_post(
    category: str,
    title: str,
    slug: str,
    description: str,
    date_str: str,
    lang: str,
    link_text: str,
    section: str | None = None,
) -> dict:
    """
    创建指定栏目文章并自动登记到对应栏目首页。
    """
    groups = set(list_content_groups())
    if category not in groups:
        return {"ok": False, "message": f"不支持的分类: {category}"}

    category_dir = CONTENT_DIR / category
    category_index = category_dir / "index.typ"

    if not category_dir.exists():
        return {"ok": False, "message": f"栏目目录不存在: {category_dir}"}

    cleaned_slug = slugify(slug or title)
    if not cleaned_slug:
        return {"ok": False, "message": "slug 为空。请提供标题或可用 slug。"}
    if cleaned_slug.startswith("_"):
        return {"ok": False, "message": "slug 不能以下划线开头。"}
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", cleaned_slug):
        return {"ok": False, "message": "slug 只允许小写字母、数字和连字符。"}

    post_dir = category_dir / cleaned_slug
    post_file = post_dir / "index.typ"
    if post_dir.exists() or post_file.exists():
        return {"ok": False, "message": f"目标文章目录已存在: {post_dir}"}

    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return {"ok": False, "message": "日期格式错误，请使用 YYYY-MM-DD。"}

    try:
        post_dir.mkdir(parents=True, exist_ok=False)
        post_content = build_content_post_typ_content(
            title.strip(),
            description.strip(),
            date_str,
            lang.strip(),
        )
        post_file.write_text(post_content, encoding="utf-8")
    except Exception as e:
        return {"ok": False, "message": f"创建文章文件失败: {e}"}

    if category_index.exists():
        inserted, msg = upsert_index_link(
            index_path=category_index,
            slug=cleaned_slug,
            link_text=link_text.strip() or title.strip(),
            section=(section.strip() if section else None),
        )
        if not inserted:
            try:
                if post_file.exists():
                    post_file.unlink()
                if post_dir.exists():
                    post_dir.rmdir()
            except Exception:
                pass
            return {"ok": False, "message": msg}
    else:
        msg = "当前栏目无 index.typ，已仅创建文章文件。"

    return {
        "ok": True,
        "message": (
            "文章已创建，并已更新栏目首页。"
            if category_index.exists()
            else "文章已创建，未更新栏目首页（index.typ 不存在）。"
        ),
        "slug": cleaned_slug,
        "category": category,
        "page_path": post_file.relative_to(CONTENT_DIR).as_posix(),
        "post_file": str(post_file),
        "post_url": f"/{category}/{cleaned_slug}/",
        "index_update": msg,
    }


def get_sections_by_group(groups: list[str]) -> dict[str, list[str]]:
    """
    获取每个栏目首页的可选分组。
    """
    result: dict[str, list[str]] = {}
    for group in groups:
        index_path = CONTENT_DIR / group / "index.typ"
        result[group] = parse_sections(index_path)
    return result


def admin_panel_html(sections_by_group: dict[str, list[str]], default_date: str) -> str:
    """
    返回本地管理面板 HTML。
    """
    groups = sorted(sections_by_group.keys())
    category_options = []
    if "Blog" in sections_by_group:
        category_options.append('<option value="Blog">Blog</option>')
    for group in groups:
        if group == "Blog":
            continue
        escaped = html.escape(group)
        category_options.append(f'<option value="{escaped}">{escaped}</option>')
    category_options_html = "\n          ".join(category_options)

    sections_json = json.dumps(sections_by_group, ensure_ascii=False)

    return f"""<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>内容管理面板</title>
  <style>
    :root {{
      --bg: #f3efe7;
      --surface: #fffdf8;
      --ink: #28221a;
      --muted: #6d6458;
      --accent: #0e6e53;
      --accent-strong: #095a43;
      --error: #9b1c2f;
      --ok: #0f6a3b;
      --border: #d9cfbe;
    }}
    * {{
      box-sizing: border-box;
    }}
    body {{
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(circle at 0% 0%, #efe3cf 0, transparent 44%),
        radial-gradient(circle at 100% 100%, #dcecdf 0, transparent 43%),
        var(--bg);
      font-family: "Avenir Next", "Segoe UI", "PingFang SC", "Noto Sans CJK SC", sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }}
    .panel {{
      width: min(760px, 100%);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(31, 22, 10, 0.1);
      animation: rise 360ms ease-out;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: clamp(1.5rem, 2vw, 2rem);
      line-height: 1.2;
      letter-spacing: 0.01em;
    }}
    p {{
      margin: 0 0 18px;
      color: var(--muted);
      line-height: 1.5;
    }}
    form {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px 16px;
    }}
    .span-2 {{
      grid-column: span 2;
    }}
    label {{
      display: block;
      font-size: 0.92rem;
      margin-bottom: 6px;
      color: var(--muted);
    }}
    input,
    select,
    textarea,
    button {{
      width: 100%;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--ink);
      font: inherit;
      padding: 10px 12px;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }}
    input:focus,
    select:focus,
    textarea:focus {{
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(14, 110, 83, 0.14);
    }}
    textarea {{
      min-height: 84px;
      resize: vertical;
    }}
    button {{
      border: none;
      background: linear-gradient(120deg, var(--accent), var(--accent-strong));
      color: #f7fbf9;
      font-weight: 600;
      cursor: pointer;
    }}
    button:active {{
      transform: translateY(1px);
    }}
    .status {{
      margin-top: 16px;
      border-radius: 12px;
      padding: 12px;
      display: none;
      font-size: 0.95rem;
      line-height: 1.45;
    }}
    .status.ok {{
      display: block;
      background: #edf9f2;
      color: var(--ok);
      border: 1px solid #b6e7c9;
    }}
    .status.error {{
      display: block;
      background: #fff1f3;
      color: var(--error);
      border: 1px solid #efb3bc;
    }}
    .hint {{
      margin-top: 10px;
      font-size: 0.85rem;
      color: var(--muted);
    }}
    code {{
      background: #f7f2ea;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 2px 6px;
      font-family: "JetBrains Mono", "Cascadia Code", monospace;
      font-size: 0.84em;
    }}
    @media (max-width: 720px) {{
      form {{
        grid-template-columns: 1fr;
      }}
      .span-2 {{
        grid-column: span 1;
      }}
    }}
    @keyframes rise {{
      from {{
        opacity: 0;
        transform: translateY(10px);
      }}
      to {{
        opacity: 1;
        transform: translateY(0);
      }}
    }}
  </style>
</head>
<body>
  <main class="panel">
    <h1>内容管理面板</h1>
    <p>用于快速新建 <code>content/&lt;分类&gt;/&lt;slug&gt;/index.typ</code>，并自动更新对应分类的 <code>index.typ</code> 链接。</p>
    <form id="post-form">
      <div class="span-2">
        <label for="title">标题</label>
        <input id="title" name="title" required placeholder="例如：Typst 实战笔记" />
      </div>
      <div>
        <label for="category">目标分类</label>
        <select id="category" name="category" required>
          {category_options_html}
        </select>
      </div>
      <div>
        <label for="slug">Slug（可留空自动生成）</label>
        <input id="slug" name="slug" placeholder="例如：typst-notes" />
      </div>
      <div>
        <label for="date">日期</label>
        <input id="date" name="date" type="date" required value="{html.escape(default_date)}" />
      </div>
      <div class="span-2">
        <label for="description">描述</label>
        <textarea id="description" name="description" required placeholder="用于页面 description 元信息"></textarea>
      </div>
      <div>
        <label for="lang">语言</label>
        <input id="lang" name="lang" required value="zh" />
      </div>
      <div>
        <label for="link_text">目录页显示文案（默认同标题）</label>
        <input id="link_text" name="link_text" placeholder="例如：Typst 实战笔记" />
      </div>
      <div class="span-2">
        <label for="section">目录页分组（来自该分类的 <code>==/===</code> 小节）</label>
        <select id="section" name="section">
          <option value="">(不指定分组，追加到末尾)</option>
        </select>
      </div>
      <div class="span-2">
        <button type="submit">创建文章并更新目录</button>
      </div>
    </form>
    <div id="status" class="status"></div>
    <p class="hint">提示：面板默认只监听 <code>127.0.0.1</code>，更安全。停止服务直接在终端按 <code>Ctrl+C</code>。</p>
  </main>
  <script>
    const sectionsByGroup = {sections_json};
    const form = document.getElementById("post-form");
    const status = document.getElementById("status");
    const titleInput = document.getElementById("title");
    const slugInput = document.getElementById("slug");
    const categorySelect = document.getElementById("category");
    const sectionSelect = document.getElementById("section");

    function escapeHtml(value) {{
      return String(value).replace(/[&<>"']/g, function (char) {{
        return {{
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }}[char];
      }});
    }}

    function refreshSections() {{
      const category = categorySelect.value;
      const sections = sectionsByGroup[category] || [];

      const options = ['<option value="">(不指定分组，追加到末尾)</option>'];
      for (const section of sections) {{
        const escaped = escapeHtml(section);
        options.push(`<option value="${{escaped}}">${{escaped}}</option>`);
      }}
      sectionSelect.innerHTML = options.join("");
    }}

    categorySelect.addEventListener("change", refreshSections);
    refreshSections();

    function toSlug(value) {{
      return value
        .trim()
        .toLowerCase()
        .replace(/[\\s_]+/g, "-")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-{{2,}}/g, "-")
        .replace(/^-+|-+$/g, "");
    }}

    titleInput.addEventListener("input", () => {{
      if (!slugInput.dataset.userEdited) {{
        slugInput.value = toSlug(titleInput.value);
      }}
    }});

    slugInput.addEventListener("input", () => {{
      slugInput.dataset.userEdited = slugInput.value ? "1" : "";
    }});

    function showStatus(ok, message) {{
      status.className = "status " + (ok ? "ok" : "error");
      status.textContent = message;
    }}

    form.addEventListener("submit", async (event) => {{
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());

      try {{
        const response = await fetch("/api/create-post", {{
          method: "POST",
          headers: {{ "Content-Type": "application/json" }},
          body: JSON.stringify(data),
        }});
        const payload = await response.json();
        showStatus(Boolean(payload.ok), payload.message || "未知响应");
        if (payload.ok && payload.slug) {{
          slugInput.value = payload.slug;
        }}
      }} catch (error) {{
        showStatus(false, "请求失败，请查看终端日志。");
      }}
    }});
  </script>
</body>
</html>
"""


def admin_panel_html_v2(sections_by_group: dict[str, list[str]], default_date: str) -> str:
    """
    返回支持全站 content 页面管理的本地管理面板 HTML。
    """
    groups = sorted(sections_by_group.keys())
    category_options = []
    if "Blog" in sections_by_group:
        category_options.append('<option value="Blog">Blog</option>')
    for group in groups:
        if group == "Blog":
            continue
        escaped = html.escape(group)
        category_options.append(f'<option value="{escaped}">{escaped}</option>')

    sections_json = json.dumps(sections_by_group, ensure_ascii=False).replace("</", "<\\/")
    pages_json = json.dumps(collect_content_pages(), ensure_ascii=False).replace("</", "<\\/")

    page = """<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>内容管理面板</title>
  <style>
    :root {
      --bg: #f6f7f4;
      --surface: #ffffff;
      --surface-alt: #f0f4f6;
      --ink: #1f2933;
      --muted: #637083;
      --accent: #176b87;
      --accent-strong: #0f4f67;
      --accent-soft: #e4f2f6;
      --error: #9f1d35;
      --ok: #146c43;
      --border: #d7dee6;
      --shadow: 0 12px 28px rgba(31, 41, 51, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--bg);
      font-family: "Avenir Next", "Segoe UI", "PingFang SC", "Noto Sans CJK SC", sans-serif;
      min-height: 100vh;
    }
    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; }
    button:disabled { cursor: not-allowed; opacity: 0.55; }
    .app {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    h1 {
      margin: 0;
      font-size: 1.35rem;
      line-height: 1.2;
      letter-spacing: 0;
    }
    .subtle {
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .tabbar {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: 8px;
      flex: 0 0 auto;
    }
    .tabbar button {
      width: auto;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--muted);
      padding: 8px 12px;
      font-weight: 650;
    }
    .tabbar button.active {
      background: var(--surface);
      color: var(--ink);
      box-shadow: 0 1px 4px rgba(31, 41, 51, 0.12);
    }
    .tab-panel { display: none; min-height: 0; }
    .tab-panel.active { display: grid; }
    .pages-layout {
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      min-height: 0;
    }
    .sidebar {
      min-height: 0;
      padding: 16px;
      border-right: 1px solid var(--border);
      background: #fbfcfd;
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      gap: 12px;
    }
    .filters { display: grid; gap: 10px; }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .page-count {
      color: var(--muted);
      font-size: 0.86rem;
      margin-left: auto;
    }
    .page-list {
      min-height: 0;
      overflow: auto;
      display: grid;
      align-content: start;
      gap: 8px;
      padding-right: 2px;
    }
    .page-row {
      width: 100%;
      text-align: left;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      padding: 10px;
      color: var(--ink);
      display: grid;
      gap: 4px;
    }
    .page-row:hover,
    .page-row.active {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .page-row-title {
      font-weight: 700;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }
    .page-row-path,
    .page-row-meta {
      color: var(--muted);
      font-size: 0.82rem;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      min-height: 24px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface-alt);
      color: var(--muted);
      font-size: 0.78rem;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .editor {
      min-height: 0;
      padding: 16px;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 12px;
    }
    .editor-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .page-title {
      min-width: 0;
      display: grid;
      gap: 4px;
    }
    .page-title strong { overflow-wrap: anywhere; }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .editor-grid {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
    }
    .source-pane,
    .preview-pane {
      min-height: 0;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 8px;
    }
    .pane-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      color: var(--muted);
      font-size: 0.88rem;
      min-height: 28px;
    }
    .preview-link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 650;
    }
    .preview-link:hover { text-decoration: underline; }
    .empty-state {
      border: 1px dashed var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--muted);
      display: grid;
      place-items: center;
      min-height: 360px;
      padding: 24px;
      text-align: center;
    }
    form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px 16px;
    }
    .create-layout {
      place-items: start center;
      padding: 24px;
    }
    .create-panel {
      width: min(860px, 100%);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      box-shadow: var(--shadow);
    }
    .create-panel h2 {
      margin: 0 0 14px;
      font-size: 1.15rem;
      letter-spacing: 0;
    }
    .span-2 { grid-column: span 2; }
    label {
      display: block;
      font-size: 0.92rem;
      margin-bottom: 6px;
      color: var(--muted);
    }
    input,
    select,
    textarea {
      width: 100%;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--ink);
      padding: 10px 12px;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }
    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(23, 107, 135, 0.14);
    }
    textarea {
      min-height: 84px;
      resize: vertical;
    }
    .source-editor {
      min-height: 420px;
      height: 100%;
      resize: none;
      font-family: "JetBrains Mono", "Cascadia Code", "SFMono-Regular", monospace;
      font-size: 0.9rem;
      line-height: 1.55;
      tab-size: 2;
      white-space: pre;
      overflow: auto;
    }
    iframe {
      width: 100%;
      height: 100%;
      min-height: 420px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: #fff;
    }
    .primary,
    .secondary,
    .ghost {
      width: auto;
      min-height: 38px;
      border-radius: 8px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      font-weight: 650;
      white-space: nowrap;
    }
    .primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #f7fbf9;
    }
    .primary:hover {
      background: var(--accent-strong);
      border-color: var(--accent-strong);
    }
    .secondary {
      background: var(--surface);
      color: var(--ink);
    }
    .secondary:hover,
    .ghost:hover {
      border-color: var(--accent);
      color: var(--accent-strong);
    }
    .ghost {
      background: transparent;
      color: var(--muted);
    }
    button:active { transform: translateY(1px); }
    .status {
      border-radius: 8px;
      padding: 12px;
      font-size: 0.95rem;
      line-height: 1.45;
    }
    .status[hidden] { display: none; }
    .status.ok {
      background: #edf9f2;
      color: var(--ok);
      border: 1px solid #b6e7c9;
    }
    .status.error {
      background: #fff1f3;
      color: var(--error);
      border: 1px solid #efb3bc;
    }
    .hint {
      margin-top: 10px;
      font-size: 0.85rem;
      color: var(--muted);
    }
    code {
      background: #f7f2ea;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 2px 6px;
      font-family: "JetBrains Mono", "Cascadia Code", monospace;
      font-size: 0.84em;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    @media (max-width: 1080px) {
      .editor-grid { grid-template-columns: 1fr; }
      .source-editor, iframe { min-height: 360px; }
    }
    @media (max-width: 760px) {
      .topbar {
        align-items: stretch;
        flex-direction: column;
      }
      .tabbar { width: 100%; }
      .tabbar button { flex: 1 1 0; }
      .pages-layout { grid-template-columns: 1fr; }
      .sidebar {
        border-right: 0;
        border-bottom: 1px solid var(--border);
        max-height: 46vh;
      }
      form { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
      .actions { justify-content: stretch; }
      .actions button { flex: 1 1 140px; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div>
        <h1>内容管理面板</h1>
        <div class="subtle">content/ 页面编辑与本地预览</div>
      </div>
      <nav class="tabbar" aria-label="管理区域">
        <button type="button" class="active" data-tab="pages">页面管理</button>
        <button type="button" data-tab="create">新建文章</button>
      </nav>
    </header>

    <main id="pages-panel" class="tab-panel pages-layout active">
      <aside class="sidebar">
        <div class="filters">
          <label class="sr-only" for="page-search">搜索页面</label>
          <input id="page-search" type="search" placeholder="搜索标题、路径或描述" />
          <div class="row">
            <select id="page-group" aria-label="按分类筛选">
              <option value="">全部分类</option>
            </select>
            <button id="refresh-pages" class="secondary" type="button">刷新</button>
          </div>
        </div>
        <div class="row">
          <span class="badge">Typst 页面</span>
          <span id="page-count" class="page-count"></span>
        </div>
        <div id="page-list" class="page-list"></div>
      </aside>

      <section class="editor">
        <div class="editor-toolbar">
          <div class="page-title">
            <strong id="selected-title">未选择页面</strong>
            <span id="selected-path" class="subtle"></span>
          </div>
          <div class="actions">
            <button id="save-page" class="primary" type="button" disabled>保存</button>
            <button id="save-build-page" class="secondary" type="button" disabled>保存并构建</button>
            <button id="build-page" class="secondary" type="button" disabled>构建预览</button>
            <button id="open-preview" class="ghost" type="button" disabled>打开预览</button>
          </div>
        </div>

        <div id="editor-grid" class="editor-grid" hidden>
          <div class="source-pane">
            <div class="pane-heading">
              <span>源码</span>
              <span id="page-meta"></span>
            </div>
            <textarea id="page-content" class="source-editor" spellcheck="false"></textarea>
          </div>
          <div class="preview-pane">
            <div class="pane-heading">
              <span>预览</span>
              <a id="preview-link" class="preview-link" href="#" target="_blank" rel="noopener">新窗口</a>
            </div>
            <iframe id="preview-frame" title="页面预览"></iframe>
          </div>
        </div>
        <div id="empty-editor" class="empty-state">从左侧选择一个页面开始管理。</div>
        <div id="page-status" class="status" hidden></div>
      </section>
    </main>

    <main id="create-panel" class="tab-panel create-layout">
      <section class="create-panel">
        <h2>新建文章</h2>
        <form id="post-form">
          <div class="span-2">
            <label for="title">标题</label>
            <input id="title" name="title" required placeholder="例如：Typst 实战笔记" />
          </div>
          <div>
            <label for="category">目标分类</label>
            <select id="category" name="category" required>
              __CATEGORY_OPTIONS__
            </select>
          </div>
          <div>
            <label for="slug">Slug（可留空自动生成）</label>
            <input id="slug" name="slug" placeholder="例如：typst-notes" />
          </div>
          <div>
            <label for="date">日期</label>
            <input id="date" name="date" type="date" required value="__DEFAULT_DATE__" />
          </div>
          <div class="span-2">
            <label for="description">描述</label>
            <textarea id="description" name="description" required placeholder="用于页面 description 元信息"></textarea>
          </div>
          <div>
            <label for="lang">语言</label>
            <input id="lang" name="lang" required value="zh" />
          </div>
          <div>
            <label for="link_text">目录页显示文案（默认同标题）</label>
            <input id="link_text" name="link_text" placeholder="例如：Typst 实战笔记" />
          </div>
          <div class="span-2">
            <label for="section">目录页分组（来自该分类的 <code>==/===</code> 小节）</label>
            <select id="section" name="section">
              <option value="">(不指定分组，追加到末尾)</option>
            </select>
          </div>
          <div class="span-2">
            <button class="primary" type="submit">创建文章并更新目录</button>
          </div>
        </form>
        <div id="create-status" class="status" hidden></div>
        <p class="hint">面板默认只监听 <code>127.0.0.1</code>。停止服务直接在终端按 <code>Ctrl+C</code>。</p>
      </section>
    </main>
  </div>
  <script>
    const sectionsByGroup = __SECTIONS_JSON__;
    let pages = __PAGES_JSON__;
    let currentPage = null;
    let isDirty = false;

    const form = document.getElementById("post-form");
    const createStatus = document.getElementById("create-status");
    const pageStatus = document.getElementById("page-status");
    const titleInput = document.getElementById("title");
    const slugInput = document.getElementById("slug");
    const categorySelect = document.getElementById("category");
    const sectionSelect = document.getElementById("section");
    const tabButtons = document.querySelectorAll("[data-tab]");
    const pagesPanel = document.getElementById("pages-panel");
    const createPanel = document.getElementById("create-panel");
    const pageSearch = document.getElementById("page-search");
    const pageGroup = document.getElementById("page-group");
    const pageList = document.getElementById("page-list");
    const pageCount = document.getElementById("page-count");
    const refreshPagesButton = document.getElementById("refresh-pages");
    const selectedTitle = document.getElementById("selected-title");
    const selectedPath = document.getElementById("selected-path");
    const pageMeta = document.getElementById("page-meta");
    const pageContent = document.getElementById("page-content");
    const editorGrid = document.getElementById("editor-grid");
    const emptyEditor = document.getElementById("empty-editor");
    const previewFrame = document.getElementById("preview-frame");
    const previewLink = document.getElementById("preview-link");
    const savePageButton = document.getElementById("save-page");
    const saveBuildPageButton = document.getElementById("save-build-page");
    const buildPageButton = document.getElementById("build-page");
    const openPreviewButton = document.getElementById("open-preview");

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, function (char) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[char];
      });
    }

    function byteLength(value) {
      return new TextEncoder().encode(value).length;
    }

    function formatBytes(value) {
      if (!Number.isFinite(value)) {
        return "";
      }
      if (value < 1024) {
        return `${value} B`;
      }
      return `${(value / 1024).toFixed(1)} KB`;
    }

    function formatTime(seconds) {
      if (!seconds) {
        return "";
      }
      return new Date(seconds * 1000).toLocaleString();
    }

    function pageKind(page) {
      if (page.is_home) {
        return "首页";
      }
      if (page.is_section_index) {
        return "栏目页";
      }
      return "内容页";
    }

    function showStatus(target, ok, message) {
      target.hidden = false;
      target.className = "status " + (ok ? "ok" : "error");
      target.textContent = message;
    }

    function clearStatus(target) {
      target.hidden = true;
      target.textContent = "";
      target.className = "status";
    }

    function previewUrl(url, stamp) {
      const normalized = url && url.startsWith("/") ? url : `/${url || ""}`;
      const suffix = stamp ? `?t=${encodeURIComponent(stamp)}` : "";
      return `/preview${normalized}${suffix}`;
    }

    function setWorking(button, label) {
      const original = button.textContent;
      button.textContent = label;
      button.disabled = true;
      return () => {
        button.textContent = original;
        updatePageButtons();
      };
    }

    function switchTab(tab) {
      for (const button of tabButtons) {
        button.classList.toggle("active", button.dataset.tab === tab);
      }
      pagesPanel.classList.toggle("active", tab === "pages");
      createPanel.classList.toggle("active", tab === "create");
    }

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    function renderGroupOptions() {
      const selected = pageGroup.value;
      const groups = Array.from(new Set(pages.map((page) => page.group))).sort((a, b) => a.localeCompare(b));
      const options = ['<option value="">全部分类</option>'];
      for (const group of groups) {
        const escaped = escapeHtml(group);
        options.push(`<option value="${escaped}">${escaped}</option>`);
      }
      pageGroup.innerHTML = options.join("");
      if (groups.includes(selected)) {
        pageGroup.value = selected;
      }
    }

    function matchesPage(page, query) {
      if (!query) {
        return true;
      }
      const haystack = `${page.label} ${page.title} ${page.description} ${page.path} ${page.url}`.toLowerCase();
      return haystack.includes(query);
    }

    function renderPages() {
      const query = pageSearch.value.trim().toLowerCase();
      const group = pageGroup.value;
      const visiblePages = pages.filter((page) => {
        return (!group || page.group === group) && matchesPage(page, query);
      });

      pageCount.textContent = `${visiblePages.length} / ${pages.length}`;

      if (visiblePages.length === 0) {
        pageList.innerHTML = '<div class="empty-state">没有匹配的页面。</div>';
        return;
      }

      pageList.innerHTML = visiblePages.map((page) => {
        const active = currentPage && currentPage.path === page.path ? " active" : "";
        const title = page.title || page.label;
        const meta = [page.group, pageKind(page), formatBytes(Number(page.bytes))].filter(Boolean).join(" · ");
        return `
          <button type="button" class="page-row${active}" data-path="${escapeHtml(page.path)}">
            <span class="page-row-title">${escapeHtml(title)}</span>
            <span class="page-row-path">${escapeHtml(page.path)}</span>
            <span class="page-row-meta">${escapeHtml(meta)}</span>
          </button>
        `;
      }).join("");
    }

    function updateSelectedSummary() {
      if (!currentPage) {
        selectedTitle.textContent = "未选择页面";
        selectedPath.textContent = "";
        pageMeta.textContent = "";
        previewLink.href = "#";
        previewFrame.removeAttribute("src");
        editorGrid.hidden = true;
        emptyEditor.hidden = false;
        return;
      }

      selectedTitle.textContent = currentPage.label;
      selectedPath.textContent = currentPage.path;
      pageMeta.textContent = [
        formatBytes(byteLength(pageContent.value)),
        currentPage.mtime ? `修改于 ${formatTime(currentPage.mtime)}` : "",
        isDirty ? "未保存" : "",
      ].filter(Boolean).join(" · ");

      const url = previewUrl(currentPage.url, currentPage.mtime || Date.now());
      previewLink.href = url;
      editorGrid.hidden = false;
      emptyEditor.hidden = true;
    }

    function updatePageButtons() {
      const enabled = Boolean(currentPage);
      savePageButton.disabled = !enabled || !isDirty;
      saveBuildPageButton.disabled = !enabled;
      buildPageButton.disabled = !enabled;
      openPreviewButton.disabled = !enabled;
    }

    async function refreshPages() {
      const response = await fetch("/api/pages");
      const payload = await response.json();
      if (!payload.ok) {
        showStatus(pageStatus, false, payload.message || "页面列表刷新失败。");
        return;
      }
      pages = payload.pages || [];
      renderGroupOptions();
      renderPages();
    }

    async function loadPage(path) {
      if (isDirty && currentPage && !confirm("当前页面有未保存修改，继续切换会丢失这些修改。")) {
        return;
      }

      clearStatus(pageStatus);
      const response = await fetch(`/api/page?path=${encodeURIComponent(path)}`);
      const payload = await response.json();
      if (!payload.ok) {
        showStatus(pageStatus, false, payload.message || "页面读取失败。");
        return;
      }

      currentPage = payload;
      pageContent.value = payload.content || "";
      isDirty = false;
      const url = previewUrl(payload.url, payload.mtime || Date.now());
      previewFrame.src = url;
      previewLink.href = url;
      updateSelectedSummary();
      updatePageButtons();
      renderPages();
    }

    async function saveCurrentPage(showMessage = true) {
      if (!currentPage) {
        return false;
      }

      const done = setWorking(savePageButton, "保存中");
      clearStatus(pageStatus);
      try {
        const response = await fetch("/api/page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: currentPage.path,
            content: pageContent.value,
            expected_mtime: currentPage.mtime,
          }),
        });
        const payload = await response.json();
        if (!payload.ok) {
          showStatus(pageStatus, false, payload.message || "保存失败。");
          return false;
        }

        currentPage.mtime = payload.mtime;
        isDirty = false;
        const summary = pages.find((page) => page.path === currentPage.path);
        if (summary) {
          summary.bytes = byteLength(pageContent.value);
          summary.mtime = payload.mtime;
        }
        updateSelectedSummary();
        updatePageButtons();
        renderPages();
        if (showMessage) {
          showStatus(pageStatus, true, payload.message || "页面已保存。");
        }
        return true;
      } catch (error) {
        showStatus(pageStatus, false, "请求失败，请查看终端日志。");
        return false;
      } finally {
        done();
      }
    }

    async function buildCurrentPage() {
      if (!currentPage) {
        return false;
      }

      const done = setWorking(buildPageButton, "构建中");
      clearStatus(pageStatus);
      try {
        const response = await fetch("/api/build-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: currentPage.path }),
        });
        const payload = await response.json();
        if (!payload.ok) {
          showStatus(pageStatus, false, payload.message || "构建失败。");
          return false;
        }

        currentPage.url = payload.url || currentPage.url;
        const url = previewUrl(currentPage.url, Date.now());
        previewFrame.src = url;
        previewLink.href = url;
        showStatus(pageStatus, true, payload.message || "页面已构建。");
        return true;
      } catch (error) {
        showStatus(pageStatus, false, "请求失败，请查看终端日志。");
        return false;
      } finally {
        done();
      }
    }

    pageSearch.addEventListener("input", renderPages);
    pageGroup.addEventListener("change", renderPages);
    refreshPagesButton.addEventListener("click", refreshPages);

    pageList.addEventListener("click", (event) => {
      const row = event.target.closest(".page-row");
      if (!row) {
        return;
      }
      loadPage(row.dataset.path);
    });

    pageContent.addEventListener("input", () => {
      if (!currentPage) {
        return;
      }
      isDirty = true;
      updateSelectedSummary();
      updatePageButtons();
    });

    savePageButton.addEventListener("click", () => saveCurrentPage(true));
    buildPageButton.addEventListener("click", buildCurrentPage);
    saveBuildPageButton.addEventListener("click", async () => {
      const saved = await saveCurrentPage(false);
      if (saved) {
        await buildCurrentPage();
      }
    });
    openPreviewButton.addEventListener("click", () => {
      if (!currentPage) {
        return;
      }
      window.open(previewUrl(currentPage.url, currentPage.mtime || Date.now()), "_blank", "noopener");
    });

    function refreshSections() {
      const category = categorySelect.value;
      const sections = sectionsByGroup[category] || [];

      const options = ['<option value="">(不指定分组，追加到末尾)</option>'];
      for (const section of sections) {
        const escaped = escapeHtml(section);
        options.push(`<option value="${escaped}">${escaped}</option>`);
      }
      sectionSelect.innerHTML = options.join("");
    }

    categorySelect.addEventListener("change", refreshSections);
    refreshSections();

    function toSlug(value) {
      return value
        .trim()
        .toLowerCase()
        .replace(/[\\s_]+/g, "-")
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    titleInput.addEventListener("input", () => {
      if (!slugInput.dataset.userEdited) {
        slugInput.value = toSlug(titleInput.value);
      }
    });

    slugInput.addEventListener("input", () => {
      slugInput.dataset.userEdited = slugInput.value ? "1" : "";
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());

      try {
        const response = await fetch("/api/create-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const payload = await response.json();
        showStatus(createStatus, Boolean(payload.ok), payload.message || "未知响应");
        if (payload.ok && payload.slug) {
          slugInput.value = payload.slug;
        }
        if (payload.ok) {
          await refreshPages();
          if (payload.page_path) {
            switchTab("pages");
            await loadPage(payload.page_path);
          }
        }
      } catch (error) {
        showStatus(createStatus, false, "请求失败，请查看终端日志。");
      }
    });

    renderGroupOptions();
    renderPages();
    updateSelectedSummary();
    updatePageButtons();
  </script>
</body>
</html>
"""

    return (
        page.replace("__CATEGORY_OPTIONS__", "\n              ".join(category_options))
        .replace("__DEFAULT_DATE__", html.escape(default_date))
        .replace("__SECTIONS_JSON__", sections_json)
        .replace("__PAGES_JSON__", pages_json)
    )


def admin(port: int = 8765, open_browser_flag: bool = True, host: str = "127.0.0.1") -> bool:
    """
    启动本地内容管理面板，用于管理 content 页面和快速新建各栏目文章。
    """
    groups = list_content_groups()
    sections_by_group = get_sections_by_group(groups)
    default_date = datetime.now().strftime("%Y-%m-%d")
    page_html = admin_panel_html_v2(sections_by_group, default_date).encode("utf-8")

    class AdminHandler(BaseHTTPRequestHandler):
        def _send_json(self, payload: dict, status: int = 200):
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def _send_html(self, data: bytes, status: int = 200):
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def _send_static_file(self, file_path: Path):
            try:
                data = file_path.read_bytes()
            except FileNotFoundError:
                self.send_error(404, "Not Found")
                return
            except OSError:
                self.send_error(500, "Failed to read file")
                return

            content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
            if file_path.suffix == ".html":
                content_type = "text/html; charset=utf-8"
            elif file_path.suffix in {".css", ".js"}:
                content_type = f"{content_type}; charset=utf-8"

            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def _send_preview(self):
            parsed = urlparse(self.path)
            preview_path = parsed.path.removeprefix("/preview")
            self._send_site_path(preview_path)

        def _send_site_path(self, site_path: str):
            preview_path = unquote(site_path).strip("/")

            if not preview_path:
                candidate = SITE_DIR / "index.html"
            else:
                candidate = SITE_DIR / preview_path
                if candidate.is_dir():
                    candidate = candidate / "index.html"
                elif candidate.suffix == "":
                    candidate = candidate / "index.html"

            try:
                resolved = candidate.resolve()
                resolved.relative_to(SITE_DIR.resolve())
            except ValueError:
                self.send_error(403, "Forbidden")
                return

            if not resolved.exists() or not resolved.is_file():
                self.send_error(404, "Not Found")
                return

            self._send_static_file(resolved)

        def do_GET(self):  # noqa: N802
            parsed = urlparse(self.path)
            path = parsed.path
            if path == "/admin":
                self._send_html(page_html)
                return
            if path == "/api/pages":
                self._send_json({"ok": True, "pages": collect_content_pages()})
                return
            if path == "/api/page":
                query = parse_qs(parsed.query)
                rel_path = query.get("path", [""])[0]
                result = read_content_page(rel_path)
                self._send_json(result, 200 if result.get("ok") else 400)
                return
            if path == "/preview" or path.startswith("/preview/"):
                self._send_preview()
                return
            if not path.startswith("/api/"):
                self._send_site_path(path)
                return
            self.send_error(404, "Not Found")

        def do_POST(self):  # noqa: N802
            path = urlparse(self.path).path
            if path not in {"/api/create-post", "/api/page", "/api/build-page"}:
                self.send_error(404, "Not Found")
                return

            try:
                content_length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self._send_json({"ok": False, "message": "无效的 Content-Length"}, 400)
                return

            raw = self.rfile.read(content_length)
            try:
                payload = json.loads(raw.decode("utf-8"))
            except Exception:
                self._send_json({"ok": False, "message": "请求体必须是 JSON。"}, 400)
                return

            if path == "/api/page":
                rel_path = str(payload.get("path", "")).strip()
                content = str(payload.get("content", ""))
                expected_raw = payload.get("expected_mtime")
                try:
                    expected_mtime = int(expected_raw) if expected_raw is not None else None
                except (TypeError, ValueError):
                    expected_mtime = None

                result = write_content_page(rel_path, content, expected_mtime)
                self._send_json(result, 200 if result.get("ok") else 400)
                return

            if path == "/api/build-page":
                rel_path = str(payload.get("path", "")).strip()
                result = build_single_content_page(rel_path)
                self._send_json(result, 200 if result.get("ok") else 400)
                return

            title = str(payload.get("title", "")).strip()
            description = str(payload.get("description", "")).strip()
            date_str = str(payload.get("date", "")).strip()
            lang = str(payload.get("lang", "zh")).strip() or "zh"
            category = str(payload.get("category", "")).strip()
            slug = str(payload.get("slug", "")).strip()
            section = str(payload.get("section", "")).strip()
            link_text = str(payload.get("link_text", "")).strip() or title

            current_groups = set(list_content_groups())

            if not title:
                self._send_json({"ok": False, "message": "标题不能为空。"}, 400)
                return
            if not category:
                self._send_json({"ok": False, "message": "目标分类不能为空。"}, 400)
                return
            if category not in current_groups:
                self._send_json(
                    {"ok": False, "message": f"不支持的分类: {category}。请刷新面板后重试。"},
                    400,
                )
                return
            if not description:
                self._send_json({"ok": False, "message": "描述不能为空。"}, 400)
                return
            if not date_str:
                self._send_json({"ok": False, "message": "日期不能为空。"}, 400)
                return

            current_sections = parse_sections(CONTENT_DIR / category / "index.typ")
            if section and section not in current_sections:
                self._send_json(
                    {
                        "ok": False,
                        "message": f"无效分组: {category} / {section}。请刷新面板后重试。",
                    },
                    400,
                )
                return

            result = create_content_post(
                category=category,
                title=title,
                slug=slug,
                description=description,
                date_str=date_str,
                lang=lang,
                link_text=link_text,
                section=section or None,
            )
            self._send_json(result, 200 if result.get("ok") else 400)

        def log_message(self, fmt: str, *args):
            # 控制台输出更简洁
            print(f"[admin] {self.address_string()} - {fmt % args}")

    print("正在启动本地内容管理面板（按 Ctrl+C 停止）...")
    print(f"  管理面板: http://{host}:{port}/admin")
    print(f"  站点预览: http://{host}:{port}/")
    print(f"  可用分类: {', '.join(groups) if groups else '无'}")

    if open_browser_flag:
        import webbrowser

        def open_browser():
            time.sleep(1.0)
            webbrowser.open(f"http://{host}:{port}/admin")

        threading.Thread(target=open_browser, daemon=True).start()

    try:
        with ThreadingHTTPServer((host, port), AdminHandler) as server:
            server.serve_forever()
        return True
    except KeyboardInterrupt:
        print("\n管理面板已停止。")
        return True
    except OSError as e:
        print(f"❌ 启动管理面板失败: {e}")
        return False


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
            return set(
                c.strip("/") for c in re.findall(r'"([^"]*)"', match.group(1)) if c and c.strip("/")
            )
    except Exception as e:
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
        except Exception:
            pass

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
                }
            )

    return posts


def build_rss_xml(posts: list[dict], config: dict) -> str:
    """
    构建符合 RSS 2.0 规范的 XML 内容字符串。

    功能:
        使用 Python 标准库 xml.etree.ElementTree 根据文章数据和站点配置生成完整的 RSS Feed XML。
        支持条件输出 description 标签（仅在有描述时输出）。

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

    # 创建 RSS 根元素（命名空间声明由 register_namespace 自动处理）
    rss = ET.Element("rss", version="2.0")

    # Channel 元数据
    channel = ET.SubElement(rss, "channel")
    ET.SubElement(channel, "title").text = config["site_title"]
    ET.SubElement(channel, "link").text = config["site_url"]
    ET.SubElement(channel, "description").text = config["site_description"]
    ET.SubElement(channel, "language").text = config["lang"]
    ET.SubElement(channel, "lastBuildDate").text = format_datetime(datetime.now(timezone.utc))

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
            - 未找到任何分类目录（跳过生成）
            - 未找到任何文章（生成空 Feed）
        仅在发生异常时返回 False。
    """
    rss_file = SITE_DIR / "feed.xml"
    dirs = get_feed_dirs()

    if not dirs:
        print("⚠️ 跳过 RSS 订阅源生成: 未配置任何目录。")
        return True

    # 检查是否至少有一个目录存在
    existing = {d for d in dirs if (SITE_DIR / d).exists()}
    missing = dirs - existing

    for d in missing:
        print(f"⚠️ 警告: 配置的目录 '{d}' 不存在。")

    if not existing:
        print("⚠️ 跳过 RSS 订阅源生成: 配置的目录都不存在。")
        return True

    # 收集文章
    posts = collect_posts(existing, site_url)

    if not posts:
        print("⚠️ 未找到任何文章，RSS 订阅源为空。")
        return True

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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
        print(f"❌ 生成 robots.txt 失败: {e}")
        return False


def build(force: bool = False) -> bool:
    """
    完整构建：HTML + PDF + 资源。

    参数:
        force: 是否强制重建所有文件
    """
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

    admin_parser = subparsers.add_parser("admin", help="启动本地内容管理面板（快速新建文章）")
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
        case _:
            print(f"❌ 未知命令: {args.command}")
            success = False

    sys.exit(0 if success else 1)
