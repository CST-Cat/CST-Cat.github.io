"""Typst 编译：HTML / PDF 构建（自 build.py 拆分）。"""

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
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Literal
from urllib.parse import parse_qs, unquote, urlparse

from .config import *  # noqa: F401,F403
from .incremental import get_all_dependencies, get_file_mtime, needs_rebuild, find_common_dependencies  # noqa: F401

def find_typ_files() -> list[Path]:
    from .content import get_content_manifest  # 延迟导入，避免与 content 模块循环依赖
    """
    从 content manifest 中读取所有 .typ 文件。

    manifest 会在首次运行、页面增删/移动时自动重建；普通内容或标题修改
    不需要再次扫描目录树。

    返回:
        list[Path]: .typ 文件路径列表
    """
    manifest = get_content_manifest(update_file_metadata=False)
    paths: list[Path] = []
    for rel_path in manifest.get("typ_paths", []):
        if isinstance(rel_path, str):
            paths.append(CONTENT_DIR / rel_path)
    return paths

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

def get_typst_version() -> tuple[int, ...] | None:
    """
    获取当前 Typst CLI 的语义化版本号。

    返回:
        tuple[int, int, int] | None: 版本号，获取失败时返回 None
    """
    script_dir = Path(__file__).parent.parent
    local_typst = script_dir / "typst"
    typst_cmd = str(local_typst) if local_typst.exists() else "typst"
    try:
        result = subprocess.run(
            [typst_cmd, "--version"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            check=False,
        )
    except (FileNotFoundError, OSError):
        return None

    if result.returncode != 0:
        return None

    match = re.search(r"typst (\d+)\.(\d+)\.(\d+)", result.stdout)
    if match is None:
        return None

    return tuple(int(component) for component in match.groups())


def warn_if_typst_version_is_outdated() -> None:
    """
    对低于 MathML 支持基线的 Typst 版本输出提示。
    """
    version = get_typst_version()
    if version is None or version >= MATHML_MIN_TYPST_VERSION:
        return

    current = ".".join(str(component) for component in version)
    required = ".".join(str(component) for component in MATHML_MIN_TYPST_VERSION)
    print(
        f"  ⚠️ 检测到 Typst {current}。HTML 导出的原生 MathML 公式支持需要 Typst {required}+，建议升级 Typst 版本。"
    )


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
        script_dir = Path(__file__).parent.parent
        local_typst = script_dir / "typst"
        typst_cmd = str(local_typst) if local_typst.exists() else "typst"

        env = os.environ.copy()
        proxy_keys = ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy")
        unsupported_proxy_keys = [
            key
            for key in proxy_keys
            if env.get(key, "").lower().startswith(("socks://", "socks4://", "socks5://"))
        ]
        for key in unsupported_proxy_keys:
            env.pop(key, None)

        if unsupported_proxy_keys and not getattr(run_typst_command, "_proxy_warning_shown", False):
            print(
                "  ⚠ Typst 当前下载器不支持 SOCKS 代理，已仅为 Typst 子进程临时移除: "
                + ", ".join(unsupported_proxy_keys)
            )
            setattr(run_typst_command, "_proxy_warning_shown", True)

        result = subprocess.run(
            [typst_cmd] + args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            env=env,
        )
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
