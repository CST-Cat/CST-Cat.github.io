"""静态资源复制（自 build.py 拆分）。"""

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
from .incremental import get_file_mtime  # noqa: F401

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
