"""静态资源版本化：为 CSS/JS 引用附加内容哈希查询参数（自 build.py 拆分，用户独有逻辑）。"""

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
