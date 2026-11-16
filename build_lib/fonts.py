"""字体资源处理：未用字体剔除与 font-display 归一（自 build.py 拆分，用户独有逻辑）。"""

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
