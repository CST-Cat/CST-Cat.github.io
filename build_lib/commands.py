"""辅助命令：check / clean / preview（自 build.py 拆分）。"""

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
from .images import check_image_paths  # noqa: F401

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
