"""本地内容管理面板（自 build.py 拆分，用户独有逻辑）。"""

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
from .content import (  # noqa: F401
    build_single_content_page, collect_content_pages,
    collect_content_parent_dirs, create_content_page,
    discard_content_page_preview, get_sections_by_parent_path,
    default_content_parent_path, list_content_groups,
    live_preview_content_page, parse_sections, read_content_page,
    resolve_content_dir_path, sort_content_parents, write_content_page,
)

def admin_panel_html(sections_by_group: dict[str, list[str]], default_date: str) -> str:
    """
    返回本地管理面板 HTML。
    """
    groups = sorted(sections_by_group.keys())
    category_options = []
    for group in groups:
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

def admin_panel_html_v2(sections_by_parent: dict[str, list[str]], default_date: str) -> str:
    """
    返回支持全站 content 页面管理的本地管理面板 HTML。
    """
    parents = sort_content_parents(collect_content_parent_dirs())
    default_parent = default_content_parent_path(parents)
    parent_options = []
    for parent in parents:
        value = html.escape(str(parent.get("path", "")))
        depth = int(parent.get("depth", 0))
        title = str(parent.get("title") or parent.get("label") or "Home")
        label = str(parent.get("label") or "Home")
        prefix = "  " * depth
        selected = " selected" if parent.get("path") == default_parent else ""
        parent_options.append(
            f'<option value="{value}"{selected}>{html.escape(prefix + title)}'
            f' · {html.escape(label if label != "Home" else "/")}</option>'
        )

    sections_json = json.dumps(sections_by_parent, ensure_ascii=False).replace("</", "<\\/")
    parents_json = json.dumps(parents, ensure_ascii=False).replace("</", "<\\/")
    pages_json = json.dumps(collect_content_pages(), ensure_ascii=False).replace("</", "<\\/")

    page = """<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>内容管理面板</title>
  <style>
    :root {
      --canvas: #faf9f5;
      --surface-soft: #f5f0e8;
      --surface-card: #efe9de;
      --surface-strong: #e8e0d2;
      --surface-dark: #181715;
      --surface-dark-elevated: #252320;
      --surface-dark-soft: #1f1e1b;
      --ink: #141413;
      --body: #3d3d3a;
      --muted: #6c6a64;
      --muted-soft: #8e8b82;
      --primary: #cc785c;
      --primary-active: #a9583e;
      --primary-disabled: #e6dfd8;
      --teal: #5db8a6;
      --amber: #e8a55a;
      --ok: #5db872;
      --warning: #d4a017;
      --error: #c64545;
      --hairline: #e6dfd8;
      --hairline-soft: #ebe6df;
      --on-primary: #ffffff;
      --on-dark: #faf9f5;
      --on-dark-soft: #a09d96;
      --shadow: 0 1px 3px rgba(20, 20, 19, 0.08);
      --header-h: 64px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background: var(--canvas);
      font-family: Inter, "Avenir Next", "Segoe UI", "PingFang SC", "Noto Sans CJK SC", sans-serif;
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
      gap: 24px;
      min-height: var(--header-h);
      padding: 0 20px;
      background: var(--canvas);
      border-bottom: 1px solid var(--hairline);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .brand {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-mark {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      display: inline-grid;
      place-items: center;
      background: var(--ink);
      color: var(--canvas);
      font-family: Georgia, serif;
      line-height: 1;
      flex: 0 0 auto;
    }
    h1 {
      margin: 0;
      font-family: "Cormorant Garamond", "EB Garamond", Georgia, serif;
      font-size: 1.6rem;
      font-weight: 500;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .subtle {
      color: var(--muted);
      font-size: 0.875rem;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .summary {
      color: var(--muted);
      font-size: 0.875rem;
      white-space: nowrap;
    }
    .admin-shell {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
    }
    .sidebar {
      min-height: 0;
      padding: 16px 14px;
      border-right: 1px solid var(--hairline);
      background: var(--surface-soft);
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
      border: 1px solid var(--hairline);
      border-radius: 12px;
      background: var(--canvas);
      padding: 11px 12px;
      color: var(--ink);
      display: grid;
      gap: 4px;
      box-shadow: none;
    }
    .page-row:hover,
    .page-row.active {
      border-color: var(--primary);
      background: var(--surface-card);
    }
    .page-row-title {
      font-weight: 500;
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
      min-height: 26px;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--hairline);
      background: var(--surface-card);
      color: var(--ink);
      font-size: 0.8125rem;
      font-weight: 500;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .workspace {
      min-height: 0;
      padding: 16px;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 12px;
      background: var(--canvas);
    }
    .workspace-toolbar {
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
      border-radius: 12px;
      border: 1px solid var(--hairline);
      overflow: hidden;
    }
    .source-pane {
      background: var(--surface-dark);
      border-color: var(--surface-dark);
      color: var(--on-dark);
    }
    .preview-pane {
      background: var(--canvas);
    }
    .pane-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      color: var(--muted);
      font-size: 0.88rem;
      min-height: 40px;
      padding: 10px 12px 0;
    }
    .source-pane .pane-heading {
      color: var(--on-dark-soft);
    }
    .pane-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .preview-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    .toggle-control {
      width: auto;
      min-height: 32px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      padding: 6px 9px;
      border: 1px solid var(--hairline);
      border-radius: 8px;
      background: var(--canvas);
      color: var(--ink);
      font-size: 0.8125rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .toggle-control input {
      width: auto;
      margin: 0;
      padding: 0;
    }
    .empty-state {
      border: 1px dashed var(--hairline);
      border-radius: 12px;
      background: var(--surface-soft);
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
    .create-dialog {
      width: min(820px, calc(100vw - 32px));
      border: 1px solid var(--hairline);
      border-radius: 16px;
      padding: 0;
      background: var(--canvas);
      color: var(--ink);
      box-shadow: 0 24px 80px rgba(20, 20, 19, 0.24);
    }
    .create-dialog::backdrop {
      background: rgba(20, 20, 19, 0.36);
    }
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px;
      border-bottom: 1px solid var(--hairline);
    }
    .dialog-header h2 {
      margin: 0;
      font-family: "Cormorant Garamond", "EB Garamond", Georgia, serif;
      font-size: 1.5rem;
      font-weight: 500;
      letter-spacing: -0.02em;
    }
    .dialog-body {
      padding: 20px;
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      grid-column: span 2;
      flex-wrap: wrap;
    }
    .icon-button {
      width: 36px;
      height: 36px;
      padding: 0;
      display: inline-grid;
      place-items: center;
      border-radius: 999px;
      border: 1px solid var(--hairline);
      background: var(--canvas);
      color: var(--ink);
      font-weight: 500;
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
      border: 1px solid var(--hairline);
      background: var(--canvas);
      color: var(--ink);
      padding: 10px 12px;
      outline: none;
      min-height: 40px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }
    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(204, 120, 92, 0.15);
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
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
      overflow-x: hidden;
      overflow-y: auto;
      border: 0;
      border-radius: 0;
      background: var(--surface-dark-soft);
      color: var(--on-dark);
      padding: 14px 16px;
      box-shadow: none;
    }
    iframe {
      width: 100%;
      height: 100%;
      min-height: 420px;
      border: 0;
      background: #fff;
    }
    .primary,
    .secondary,
    .ghost {
      width: auto;
      min-height: 40px;
      border-radius: 8px;
      padding: 10px 14px;
      border: 1px solid var(--hairline);
      font-size: 0.875rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .primary {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--on-primary);
    }
    .primary:active {
      background: var(--primary-active);
      border-color: var(--primary-active);
    }
    .secondary {
      background: var(--canvas);
      color: var(--ink);
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
      color: #27633a;
      border: 1px solid rgba(93, 184, 114, 0.42);
    }
    .status.error {
      background: #fff1ef;
      color: var(--error);
      border: 1px solid rgba(198, 69, 69, 0.32);
    }
    .hint {
      margin-top: 10px;
      font-size: 0.85rem;
      color: var(--muted);
    }
    code {
      background: var(--surface-card);
      border: 1px solid var(--hairline);
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
        padding: 14px 16px;
      }
      .topbar-actions { align-items: stretch; }
      .summary { white-space: normal; }
      .admin-shell { grid-template-columns: 1fr; }
      .sidebar {
        border-right: 0;
        border-bottom: 1px solid var(--hairline);
        max-height: 46vh;
      }
      .workspace { padding: 12px; }
      form { grid-template-columns: 1fr; }
      .span-2 { grid-column: span 1; }
      .dialog-footer { grid-column: span 1; }
      .actions { justify-content: stretch; }
      .actions button { flex: 1 1 140px; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">*</span>
        <div>
          <h1>Admin</h1>
          <div class="subtle">content 页面编辑与本地预览</div>
        </div>
      </div>
      <div class="topbar-actions">
        <span id="shell-summary" class="summary"></span>
        <button id="create-page" class="primary" type="button">新建页面</button>
      </div>
    </header>

    <main class="admin-shell">
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

      <section class="workspace">
        <div class="workspace-toolbar">
          <div class="page-title">
            <strong id="selected-title">未选择页面</strong>
            <span id="selected-path" class="subtle"></span>
          </div>
          <div class="actions">
            <button id="save-page" class="primary" type="button" disabled>保存</button>
            <button id="discard-page" class="ghost" type="button" disabled>放弃修改</button>
            <button id="save-build-page" class="secondary" type="button" disabled>保存并构建</button>
            <button id="build-page" class="secondary" type="button" disabled>构建预览</button>
          </div>
        </div>

        <div id="editor-grid" class="editor-grid" hidden>
          <div class="source-pane">
            <div class="pane-heading">
              <span>源码</span>
              <span id="page-meta"></span>
            </div>
            <textarea id="page-content" class="source-editor" spellcheck="false" wrap="soft"></textarea>
          </div>
          <div class="preview-pane">
            <div class="pane-heading">
              <span>预览</span>
              <div class="pane-actions">
                <label class="toggle-control" for="auto-preview">
                  <input id="auto-preview" type="checkbox" checked />
                  <span>自动预览</span>
                </label>
                <a id="preview-link" class="preview-link" href="#" target="_blank" rel="noopener">新窗口</a>
              </div>
            </div>
            <iframe id="preview-frame" title="页面预览"></iframe>
          </div>
        </div>
        <div id="empty-editor" class="empty-state">从左侧选择一个页面开始管理。</div>
        <div id="page-status" class="status" hidden></div>
      </section>
    </main>

    <dialog id="create-dialog" class="create-dialog">
      <div class="dialog-header">
        <div>
          <h2>新建页面</h2>
        </div>
        <button id="close-create" class="icon-button" type="button" aria-label="关闭">×</button>
      </div>
      <div class="dialog-body">
        <form id="post-form">
          <div class="span-2">
            <label for="title">标题</label>
            <input id="title" name="title" required placeholder="例如：Typst 实战笔记" />
          </div>
          <div>
            <label for="parent-path">父级页面</label>
            <select id="parent-path" name="parent_path">
              __PARENT_OPTIONS__
            </select>
          </div>
          <div>
            <label for="slug">目录名 Slug</label>
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
            <label for="link_text">目录文案</label>
            <input id="link_text" name="link_text" placeholder="例如：Typst 实战笔记" />
          </div>
          <div class="span-2">
            <label for="section">目录分组</label>
            <select id="section" name="section">
              <option value="">(不指定分组，追加到末尾)</option>
            </select>
          </div>
          <div class="dialog-footer">
            <button id="cancel-create" class="ghost" type="button">取消</button>
            <button id="submit-create" class="primary" type="submit">创建页面</button>
          </div>
        </form>
        <div id="create-status" class="status" hidden></div>
      </div>
    </dialog>
  </div>
  <script>
    let sectionsByParent = __SECTIONS_JSON__;
    let parentDirs = __PARENTS_JSON__;
    const defaultParentPath = __DEFAULT_PARENT_JSON__;
    let pages = __PAGES_JSON__;
    let currentPage = null;
    let isDirty = false;

    const form = document.getElementById("post-form");
    const createStatus = document.getElementById("create-status");
    const pageStatus = document.getElementById("page-status");
    const titleInput = document.getElementById("title");
    const slugInput = document.getElementById("slug");
    const parentSelect = document.getElementById("parent-path");
    const sectionSelect = document.getElementById("section");
    const shellSummary = document.getElementById("shell-summary");
    const createPageButton = document.getElementById("create-page");
    const createDialog = document.getElementById("create-dialog");
    const closeCreateButton = document.getElementById("close-create");
    const cancelCreateButton = document.getElementById("cancel-create");
    const submitCreateButton = document.getElementById("submit-create");
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
    const discardPageButton = document.getElementById("discard-page");
    const saveBuildPageButton = document.getElementById("save-build-page");
    const buildPageButton = document.getElementById("build-page");
    const autoPreviewToggle = document.getElementById("auto-preview");
    let livePreviewTimer = null;
    let livePreviewSeq = 0;

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
      if (page.is_pdf) {
        return "PDF 源";
      }
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
      const wasDisabled = button.disabled;
      button.textContent = label;
      button.disabled = true;
      return () => {
        button.textContent = original;
        button.disabled = wasDisabled;
        updatePageButtons();
      };
    }

    function clearLivePreviewTimer() {
      if (livePreviewTimer) {
        clearTimeout(livePreviewTimer);
        livePreviewTimer = null;
      }
    }

    async function requestJson(url, options = {}) {
      const response = await fetch(url, options);
      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        return {
          ok: false,
          message: `响应不是有效 JSON (${response.status})。`,
        };
      }
      if (!response.ok && payload && payload.ok !== false) {
        return {
          ...payload,
          ok: false,
          message: payload.message || `请求失败 (${response.status})。`,
        };
      }
      return payload;
    }

    function openCreateDialog() {
      clearStatus(createStatus);
      if (typeof createDialog.showModal === "function") {
        createDialog.showModal();
      } else {
        createDialog.hidden = false;
      }
      titleInput.focus();
    }

    function closeCreateDialog() {
      if (typeof createDialog.close === "function" && createDialog.open) {
        createDialog.close();
      } else {
        createDialog.hidden = true;
      }
    }

    function updateShellSummary() {
      shellSummary.textContent = `${pages.length} 页 · ${parentDirs.length} 个父级`;
    }

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

      updateShellSummary();
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
        currentPage.is_pdf ? "PDF 源" : "",
        isDirty ? "未保存" : "",
      ].filter(Boolean).join(" · ");

      const url = previewUrl(currentPage.url, currentPage.mtime || Date.now());
      previewLink.href = currentPage.is_pdf ? "#" : url;
      editorGrid.hidden = false;
      emptyEditor.hidden = true;
    }

    function updatePageButtons() {
      const enabled = Boolean(currentPage);
      const canPreview = enabled && !currentPage.is_pdf;
      savePageButton.disabled = !enabled || !isDirty;
      discardPageButton.disabled = !enabled || !isDirty;
      saveBuildPageButton.disabled = !canPreview;
      buildPageButton.disabled = !canPreview;
    }

    async function refreshPages() {
      try {
        const payload = await requestJson("/api/pages");
        if (!payload.ok) {
          showStatus(pageStatus, false, payload.message || "页面列表刷新失败。");
          return;
        }
        pages = payload.pages || [];
        parentDirs = payload.parents || parentDirs;
        sectionsByParent = payload.sections || sectionsByParent;
        renderGroupOptions();
        renderParentOptions();
        renderPages();
      } catch (error) {
        showStatus(pageStatus, false, "页面列表刷新失败，请查看终端日志。");
      }
    }

    async function loadPage(path) {
      if (isDirty && currentPage && !confirm("当前页面有未保存修改，继续切换会丢失这些修改。")) {
        return;
      }

      clearLivePreviewTimer();
      livePreviewSeq += 1;
      clearStatus(pageStatus);
      let payload;
      try {
        payload = await requestJson(`/api/page?path=${encodeURIComponent(path)}`);
        if (!payload.ok) {
          showStatus(pageStatus, false, payload.message || "页面读取失败。");
          return;
        }
      } catch (error) {
        showStatus(pageStatus, false, "页面读取失败，请查看终端日志。");
        return;
      }

      currentPage = payload;
      pageContent.value = payload.content || "";
      isDirty = false;
      const url = previewUrl(payload.url, payload.mtime || Date.now());
      if (payload.is_pdf) {
        previewFrame.removeAttribute("src");
        previewLink.href = "#";
      } else {
        previewFrame.src = url;
        previewLink.href = url;
      }
      updateSelectedSummary();
      updatePageButtons();
      renderPages();
    }

    async function saveCurrentPage(showMessage = true) {
      if (!currentPage) {
        return false;
      }
      if (!isDirty) {
        if (showMessage) {
          showStatus(pageStatus, true, "没有需要保存的修改。");
        }
        return true;
      }

      const done = setWorking(savePageButton, "保存中");
      clearStatus(pageStatus);
      try {
        const payload = await requestJson("/api/page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: currentPage.path,
            content: pageContent.value,
            expected_mtime: currentPage.mtime,
          }),
        });
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
      if (currentPage.is_pdf) {
        showStatus(pageStatus, false, "PDF 源暂不支持 HTML 构建预览。");
        return false;
      }

      const done = setWorking(buildPageButton, "构建中");
      clearStatus(pageStatus);
      try {
        const payload = await requestJson("/api/build-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: currentPage.path }),
        });
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

    async function discardCurrentChanges() {
      if (!currentPage || !isDirty) {
        return false;
      }
      if (!confirm("放弃当前未保存修改，并恢复为磁盘上的源文件？")) {
        return false;
      }

      const pagePath = currentPage.path;
      clearLivePreviewTimer();
      livePreviewSeq += 1;

      const done = setWorking(discardPageButton, "放弃中");
      clearStatus(pageStatus);
      try {
        let cleanupOk = true;
        let cleanupMessage = "";
        try {
          const cleanupPayload = await requestJson("/api/discard-preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: pagePath }),
          });
          cleanupOk = Boolean(cleanupPayload.ok);
          cleanupMessage = cleanupPayload.message || "";
        } catch (error) {
          cleanupOk = false;
          cleanupMessage = "临时预览清理请求失败。";
        }

        const payload = await requestJson(`/api/page?path=${encodeURIComponent(pagePath)}`);
        if (!payload.ok) {
          showStatus(pageStatus, false, payload.message || "页面读取失败。");
          return false;
        }

        currentPage = payload;
        pageContent.value = payload.content || "";
        isDirty = false;
        const url = previewUrl(payload.url, payload.mtime || Date.now());
        if (payload.is_pdf) {
          previewFrame.removeAttribute("src");
          previewLink.href = "#";
        } else {
          previewFrame.src = url;
          previewLink.href = url;
        }
        updateSelectedSummary();
        updatePageButtons();
        renderPages();
        showStatus(
          pageStatus,
          cleanupOk,
          cleanupOk ? (cleanupMessage || "已放弃修改。") : `已恢复源文件，但${cleanupMessage}`
        );
        return true;
      } catch (error) {
        showStatus(pageStatus, false, "放弃修改失败，请查看终端日志。");
        return false;
      } finally {
        done();
      }
    }

    function scheduleLivePreview() {
      clearLivePreviewTimer();
      if (!currentPage || currentPage.is_pdf || !autoPreviewToggle.checked) {
        return;
      }
      livePreviewTimer = setTimeout(runLivePreview, 600);
    }

    async function runLivePreview() {
      if (!currentPage || currentPage.is_pdf || !autoPreviewToggle.checked) {
        return false;
      }

      const seq = ++livePreviewSeq;
      const pagePath = currentPage.path;
      const content = pageContent.value;
      clearStatus(pageStatus);
      pageMeta.textContent = [
        formatBytes(byteLength(content)),
        currentPage.mtime ? `修改于 ${formatTime(currentPage.mtime)}` : "",
        "预览中",
        isDirty ? "未保存" : "",
      ].filter(Boolean).join(" · ");

      try {
        const payload = await requestJson("/api/live-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pagePath,
            content,
          }),
        });
        if (seq !== livePreviewSeq || !currentPage || currentPage.path !== pagePath) {
          return false;
        }
        if (!payload.ok) {
          showStatus(pageStatus, false, payload.message || "实时预览失败。");
          updateSelectedSummary();
          return false;
        }

        const url = previewUrl(payload.url, Date.now());
        previewFrame.src = url;
        previewLink.href = url;
        updateSelectedSummary();
        return true;
      } catch (error) {
        if (seq === livePreviewSeq) {
          showStatus(pageStatus, false, "实时预览请求失败，请查看终端日志。");
          updateSelectedSummary();
        }
        return false;
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
      scheduleLivePreview();
    });

    autoPreviewToggle.addEventListener("change", () => {
      if (autoPreviewToggle.checked) {
        scheduleLivePreview();
      } else {
        clearLivePreviewTimer();
      }
    });

    createPageButton.addEventListener("click", openCreateDialog);
    closeCreateButton.addEventListener("click", closeCreateDialog);
    cancelCreateButton.addEventListener("click", closeCreateDialog);
    createDialog.addEventListener("click", (event) => {
      if (event.target === createDialog) {
        closeCreateDialog();
      }
    });

    savePageButton.addEventListener("click", () => saveCurrentPage(true));
    discardPageButton.addEventListener("click", discardCurrentChanges);
    buildPageButton.addEventListener("click", buildCurrentPage);
    saveBuildPageButton.addEventListener("click", async () => {
      const saved = await saveCurrentPage(false);
      if (saved) {
        await buildCurrentPage();
      }
    });
    function renderParentOptions() {
      const previous = parentSelect.selectedIndex >= 0 ? parentSelect.value : defaultParentPath;
      const orderedParents = [...parentDirs];
      const options = orderedParents.map((parent) => {
        const value = escapeHtml(parent.path || "");
        const title = parent.title || parent.label || "Home";
        const label = parent.label === "Home" ? "/" : parent.label;
        const prefix = "  ".repeat(Number(parent.depth) || 0);
        return `<option value="${value}">${escapeHtml(prefix + title)} · ${escapeHtml(label)}</option>`;
      });

      parentSelect.innerHTML = options.join("");
      if (orderedParents.some((parent) => parent.path === previous)) {
        parentSelect.value = previous;
      } else if (orderedParents.some((parent) => parent.path === defaultParentPath)) {
        parentSelect.value = defaultParentPath;
      }
      refreshSections();
    }

    function refreshSections() {
      const parentPath = parentSelect.value || "";
      const sections = sectionsByParent[parentPath] || [];

      const options = ['<option value="">(不指定分组，追加到末尾)</option>'];
      for (const section of sections) {
        const escaped = escapeHtml(section);
        options.push(`<option value="${escaped}">${escaped}</option>`);
      }
      sectionSelect.innerHTML = options.join("");
    }

    parentSelect.addEventListener("change", refreshSections);

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
      const done = setWorking(submitCreateButton, "创建中");
      clearStatus(createStatus);

      try {
        const payload = await requestJson("/api/create-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        showStatus(createStatus, Boolean(payload.ok), payload.message || "未知响应");
        if (payload.ok && payload.slug) {
          slugInput.value = payload.slug;
        }
        if (payload.ok) {
          await refreshPages();
          closeCreateDialog();
          if (payload.page_path) {
            await loadPage(payload.page_path);
          }
          form.reset();
          slugInput.dataset.userEdited = "";
          renderParentOptions();
        }
      } catch (error) {
        showStatus(createStatus, false, "请求失败，请查看终端日志。");
      } finally {
        done();
      }
    });

    renderGroupOptions();
    renderParentOptions();
    renderPages();
    updateSelectedSummary();
    updatePageButtons();
  </script>
</body>
</html>
"""

    return (
        page.replace("__PARENT_OPTIONS__", "\n              ".join(parent_options))
        .replace("__DEFAULT_DATE__", html.escape(default_date))
        .replace("__DEFAULT_PARENT_JSON__", json.dumps(default_parent, ensure_ascii=False))
        .replace("__SECTIONS_JSON__", sections_json)
        .replace("__PARENTS_JSON__", parents_json)
        .replace("__PAGES_JSON__", pages_json)
    )

def admin(port: int = 8765, open_browser_flag: bool = True, host: str = "127.0.0.1") -> bool:
    """
    启动本地内容管理面板，用于管理 content 页面和快速新建页面。
    """
    groups = list_content_groups()
    parents = collect_content_parent_dirs()
    sections_by_parent = get_sections_by_parent_path(parents)
    default_date = datetime.now().strftime("%Y-%m-%d")
    page_html = admin_panel_html_v2(sections_by_parent, default_date).encode("utf-8")

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
                current_parents = collect_content_parent_dirs()
                self._send_json(
                    {
                        "ok": True,
                        "pages": collect_content_pages(),
                        "parents": current_parents,
                        "sections": get_sections_by_parent_path(current_parents),
                    }
                )
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
            if path not in {
                "/api/create-post",
                "/api/page",
                "/api/build-page",
                "/api/live-preview",
                "/api/discard-preview",
            }:
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

            if path == "/api/live-preview":
                rel_path = str(payload.get("path", "")).strip()
                content = str(payload.get("content", ""))
                result = live_preview_content_page(rel_path, content)
                self._send_json(result, 200 if result.get("ok") else 400)
                return

            if path == "/api/discard-preview":
                rel_path = str(payload.get("path", "")).strip()
                result = discard_content_page_preview(rel_path)
                self._send_json(result, 200 if result.get("ok") else 400)
                return

            title = str(payload.get("title", "")).strip()
            description = str(payload.get("description", "")).strip()
            date_str = str(payload.get("date", "")).strip()
            lang = str(payload.get("lang", "zh")).strip() or "zh"
            parent_raw = payload.get("parent_path")
            if parent_raw is None:
                parent_raw = payload.get("category", "")
            parent_path = str(parent_raw).strip()
            slug = str(payload.get("slug", "")).strip()
            section = str(payload.get("section", "")).strip()
            link_text = str(payload.get("link_text", "")).strip() or title

            if not title:
                self._send_json({"ok": False, "message": "标题不能为空。"}, 400)
                return
            parent_dir = resolve_content_dir_path(parent_path)
            if parent_dir is None or not parent_dir.exists() or not parent_dir.is_dir():
                self._send_json(
                    {"ok": False, "message": f"无效父级页面: {parent_path or '/'}。请刷新面板后重试。"},
                    400,
                )
                return
            parent_index = parent_dir / "index.typ"
            if not parent_index.exists():
                self._send_json({"ok": False, "message": f"父级页面不存在: {parent_index}"}, 400)
                return
            if not description:
                self._send_json({"ok": False, "message": "描述不能为空。"}, 400)
                return
            if not date_str:
                self._send_json({"ok": False, "message": "日期不能为空。"}, 400)
                return

            current_sections = parse_sections(parent_index)
            if section and section not in current_sections:
                self._send_json(
                    {
                        "ok": False,
                        "message": f"无效分组: {parent_path or '/'} / {section}。请刷新面板后重试。",
                    },
                    400,
                )
                return

            result = create_content_page(
                parent_path=parent_path,
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
    print(f"  可作为父级的页面: {len(parents)} 个")

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
