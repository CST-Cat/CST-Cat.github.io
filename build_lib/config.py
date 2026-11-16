"""构建配置与共享基础类（自 build.py 拆分）。"""

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

CONTENT_DIR = Path("content")  # 源文件目录
SITE_DIR = Path("_site")  # 输出目录
ASSETS_DIR = Path("assets")  # 静态资源目录
CONFIG_FILE = Path("config.typ")  # 全局配置文件
CACHE_DIR = Path(".tufted-cache")  # 本地缓存目录（不提交）
CONTENT_MANIFEST_FILE = CACHE_DIR / "content-manifest.json"  # content 页面结构清单
CONTENT_MANIFEST_VERSION = 1
IMAGE_PROCESSOR_SCRIPT = Path("scripts/process_images.py")

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
