"""内容结构清单与页面管理：manifest 维护、页面读写、新建页面与单页构建（自 build.py 拆分，用户独有逻辑）。"""

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
from .compile import _compile_files, find_common_dependencies, get_file_output_path, run_typst_command  # noqa: F401
from .assets import copy_assets, copy_content_assets  # noqa: F401
from .versioning import add_asset_versioning  # noqa: F401
from .fonts import normalize_font_display  # noqa: F401
from .images import generate_responsive_images  # noqa: F401

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

def resolve_content_dir_path(rel_dir: str) -> Path | None:
    """
    将前端传入的 content 相对目录解析为安全目录路径。
    """
    normalized = rel_dir.strip().replace("\\", "/").strip("/")
    content_root = CONTENT_DIR.resolve()
    candidate = CONTENT_DIR.resolve() if not normalized else (CONTENT_DIR / normalized).resolve()

    try:
        content_rel_path = candidate.relative_to(content_root)
    except ValueError:
        return None

    if any(part.startswith("_") for part in content_rel_path.parts):
        return None

    return CONTENT_DIR if content_rel_path == Path(".") else CONTENT_DIR / content_rel_path

def content_dir_to_url(content_dir: Path) -> str:
    """
    将 content 下的目录路径转换为站点 URL。
    """
    rel_path = content_dir.relative_to(CONTENT_DIR)
    if rel_path == Path("."):
        return "/"
    return f"/{rel_path.as_posix().strip('/')}/"

def content_dir_to_label(content_dir: Path) -> str:
    """
    生成人类可读的内容目录标签。
    """
    rel_path = content_dir.relative_to(CONTENT_DIR)
    if rel_path == Path("."):
        return "Home"
    return rel_path.as_posix()

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

def read_content_page_title(index_path: Path) -> tuple[str, str]:
    """
    读取页面标题和描述，用于 admin 列表与父级选择器。
    """
    try:
        source = index_path.read_text(encoding="utf-8")
    except Exception:
        source = ""

    title = _extract_template_string(source, "title") or _extract_first_heading(source)
    description = _extract_template_string(source, "description")
    return title, description

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
        return json.loads(f'"{value}"')
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
    从 content manifest 中读取所有可管理的 Typst 页面。
    """
    manifest = get_content_manifest(update_file_metadata=True)
    return [dict(page) for page in manifest.get("pages", []) if isinstance(page, dict)]

def collect_content_parent_dirs() -> list[dict[str, str | int]]:
    """
    从 content manifest 中读取可作为新页面父级的 content 页面目录。
    """
    manifest = get_content_manifest(update_file_metadata=True)
    return [dict(parent) for parent in manifest.get("parents", []) if isinstance(parent, dict)]

def _content_rel_label(path: Path) -> str:
    """
    将 content 下路径规范化为 manifest 使用的相对字符串。
    """
    return "" if path == Path(".") else path.as_posix()

def _content_path_from_label(rel_path: str) -> Path:
    """
    从 manifest 相对字符串还原 content 下路径。
    """
    cleaned = rel_path.strip().replace("\\", "/").strip("/")
    return CONTENT_DIR if not cleaned else CONTENT_DIR / cleaned

def _path_mtime_ns(path: Path) -> int:
    try:
        return int(path.stat().st_mtime_ns)
    except OSError:
        return 0

def get_nav_parent_order() -> list[str]:
    """
    从 config.typ 的 nav-items 中提取顶层页面顺序。
    """
    if not CONFIG_FILE.exists():
        return []

    try:
        source = CONFIG_FILE.read_text(encoding="utf-8")
    except Exception:
        return []

    source = "\n".join(
        line for line in source.splitlines() if not line.lstrip().startswith("//")
    )

    order: list[str] = []
    for match in re.finditer(r'"(/[^"]*/)"\s*:', source):
        nav_path = match.group(1).strip("/")
        if not nav_path or "/" in nav_path:
            continue
        if nav_path not in order:
            order.append(nav_path)

    return order

def sort_content_parents(parents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    按导航顺序排列父级页面；模板没有 nav-items 时退回通用路径排序。
    """
    nav_order = get_nav_parent_order()
    nav_rank = {path: index for index, path in enumerate(nav_order)}

    def _sort_key(parent: dict[str, Any]) -> tuple[int, int, int, str]:
        parent_path = str(parent.get("path", ""))
        label = str(parent.get("label", parent_path or "Home")).lower()
        depth = int(parent.get("depth", 0))
        top_level = parent_path.split("/", 1)[0] if parent_path else ""
        rank = nav_rank.get(top_level, len(nav_rank))

        if depth == 1 and parent_path in nav_rank:
            return (0, rank, depth, label)
        if parent_path == "":
            return (1, len(nav_rank), depth, label)
        if top_level in nav_rank:
            return (2, rank, depth, label)
        if depth == 1:
            return (3, rank, depth, label)
        return (4, rank, depth, label)

    return sorted(parents, key=_sort_key)

def default_content_parent_path(parents: list[dict[str, Any]]) -> str:
    """
    选择新建页面的默认父级。优先使用第一个顶层栏目，避免模板硬编码 Blog。
    """
    sorted_parents = sort_content_parents(parents)
    for parent in sorted_parents:
        if int(parent.get("depth", 0)) == 1:
            return str(parent.get("path", ""))
    if sorted_parents:
        return str(sorted_parents[0].get("path", ""))
    return ""

def _scan_content_structure() -> dict[str, Any]:
    """
    扫描 content 目录结构，只记录目录 mtime 和 .typ 路径，不读取页面内容。
    """
    dirs: dict[str, int] = {}
    typ_paths: list[str] = []

    if not CONTENT_DIR.exists():
        return {"dirs": dirs, "typ_paths": typ_paths}

    for dirpath_str, dirnames, filenames in os.walk(CONTENT_DIR):
        dir_path = Path(dirpath_str)
        rel_dir = dir_path.relative_to(CONTENT_DIR)
        rel_parts = () if rel_dir == Path(".") else rel_dir.parts

        if any(part.startswith("_") for part in rel_parts):
            dirnames[:] = []
            continue

        dirnames[:] = sorted(
            [dirname for dirname in dirnames if not dirname.startswith("_")],
            key=str.lower,
        )
        dirs[_content_rel_label(rel_dir)] = _path_mtime_ns(dir_path)

        for filename in sorted(filenames, key=str.lower):
            if Path(filename).suffix != ".typ":
                continue
            typ_file = dir_path / filename
            rel_file = typ_file.relative_to(CONTENT_DIR)
            if not any(part.startswith("_") for part in rel_file.parts):
                typ_paths.append(rel_file.as_posix())

    return {
        "dirs": dirs,
        "typ_paths": sorted(set(typ_paths), key=str.lower),
    }

def _make_content_page_entry(typ_file: Path) -> dict[str, Any]:
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

    return {
        "path": rel_path.as_posix(),
        "label": content_path_to_label(typ_file),
        "title": title or content_path_to_label(typ_file),
        "description": description,
        "group": group,
        "url": content_path_to_url(typ_file),
        "bytes": len(source.encode("utf-8")),
        "mtime": int(typ_file.stat().st_mtime) if typ_file.exists() else 0,
        "mtime_ns": _path_mtime_ns(typ_file),
        "is_home": is_home,
        "is_section_index": is_section_index,
        "is_pdf": "pdf" in typ_file.stem.lower(),
    }

def _build_parent_entries_from_pages(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    page_by_path = {str(page.get("path", "")): page for page in pages}
    parent_paths: set[str] = set()

    if "index.typ" in page_by_path:
        parent_paths.add("")

    for page in pages:
        rel_path = Path(str(page.get("path", "")))
        if rel_path.name != "index.typ":
            continue
        parent_dir = rel_path.parent
        if parent_dir != Path("."):
            parent_paths.add(parent_dir.as_posix())

    parents: list[dict[str, Any]] = []
    for parent_path in sorted(parent_paths, key=str.lower):
        content_dir = _content_path_from_label(parent_path)
        rel_dir = content_dir.relative_to(CONTENT_DIR)
        parts = rel_dir.parts if rel_dir != Path(".") else ()
        index_rel_path = "index.typ" if parent_path == "" else f"{parent_path}/index.typ"
        page = page_by_path.get(index_rel_path, {})
        label = content_dir_to_label(content_dir)
        parents.append(
            {
                "path": parent_path,
                "label": label,
                "title": str(page.get("title") or label),
                "description": str(page.get("description", "")),
                "url": content_dir_to_url(content_dir),
                "depth": len(parts),
                "group": parts[0] if parts else "Root",
            }
        )

    return sort_content_parents(parents)

def _new_content_manifest(structure: dict[str, Any], reason: str) -> dict[str, Any]:
    pages: list[dict[str, Any]] = []
    for rel_path in structure.get("typ_paths", []):
        if not isinstance(rel_path, str):
            continue
        typ_file = CONTENT_DIR / rel_path
        if typ_file.exists():
            pages.append(_make_content_page_entry(typ_file))

    pages.sort(key=lambda page: str(page.get("label", "")).lower())

    return {
        "version": CONTENT_MANIFEST_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "reason": reason,
        "content_dir": str(CONTENT_DIR),
        "typ_paths": sorted((str(page["path"]) for page in pages), key=str.lower),
        "structure": {
            "dirs": structure.get("dirs", {}),
        },
        "pages": pages,
        "parents": _build_parent_entries_from_pages(pages),
    }

def _load_content_manifest() -> dict[str, Any] | None:
    try:
        payload = json.loads(CONTENT_MANIFEST_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None

    if not isinstance(payload, dict):
        return None
    if payload.get("version") != CONTENT_MANIFEST_VERSION:
        return None
    if payload.get("content_dir") != str(CONTENT_DIR):
        return None
    if not isinstance(payload.get("typ_paths"), list):
        return None
    if not isinstance(payload.get("pages"), list):
        return None

    return payload

def _write_content_manifest(manifest: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    temp_path = CONTENT_MANIFEST_FILE.with_suffix(".tmp")
    temp_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temp_path.replace(CONTENT_MANIFEST_FILE)

def _needs_content_structure_probe(manifest: dict[str, Any]) -> bool:
    dirs = manifest.get("structure", {}).get("dirs", {})
    if not isinstance(dirs, dict):
        return True

    for rel_dir, old_mtime in dirs.items():
        if not isinstance(rel_dir, str):
            return True
        dir_path = _content_path_from_label(rel_dir)
        if not dir_path.exists() or not dir_path.is_dir():
            return True
        if _path_mtime_ns(dir_path) != old_mtime:
            return True

    return False

def _refresh_content_manifest_metadata(manifest: dict[str, Any]) -> bool | None:
    """
    刷新已知页面的标题、描述、mtime 等元数据。

    返回 None 表示已知页面文件消失，需要重新扫描结构。
    """
    pages = manifest.get("pages", [])
    if not isinstance(pages, list):
        return None

    changed = False
    refreshed_pages: list[dict[str, Any]] = []

    for page in pages:
        if not isinstance(page, dict):
            changed = True
            continue

        rel_path = str(page.get("path", ""))
        typ_file = CONTENT_DIR / rel_path
        if not typ_file.exists():
            return None

        current_mtime_ns = _path_mtime_ns(typ_file)
        current_size = typ_file.stat().st_size
        if page.get("mtime_ns") != current_mtime_ns or page.get("bytes") != current_size:
            page = _make_content_page_entry(typ_file)
            changed = True

        refreshed_pages.append(page)

    if changed:
        refreshed_pages.sort(key=lambda page: str(page.get("label", "")).lower())
        manifest["pages"] = refreshed_pages
        manifest["parents"] = _build_parent_entries_from_pages(refreshed_pages)
        manifest["typ_paths"] = sorted((str(page["path"]) for page in refreshed_pages), key=str.lower)
        manifest["generated_at"] = datetime.now(timezone.utc).isoformat()
        manifest["reason"] = "metadata-refresh"

    return changed

def get_content_manifest(
    force_rescan: bool = False,
    update_file_metadata: bool = True,
) -> dict[str, Any]:
    """
    返回 content 页面清单。

    - 首次运行或 .typ 页面增删/移动时重建清单。
    - 普通内容、标题、描述变化只刷新对应文件元数据。
    - 目录结构未变化时，构建命令不再递归扫描 content 页面。
    """
    manifest = None if force_rescan else _load_content_manifest()
    changed = False

    if manifest is None:
        structure = _scan_content_structure()
        manifest = _new_content_manifest(structure, "initial-scan")
        changed = True
    elif _needs_content_structure_probe(manifest):
        structure = _scan_content_structure()
        new_typ_paths = structure.get("typ_paths", [])
        old_typ_paths = manifest.get("typ_paths", [])

        if new_typ_paths != old_typ_paths:
            manifest = _new_content_manifest(structure, "structure-changed")
        else:
            manifest["structure"] = {"dirs": structure.get("dirs", {})}
            manifest["generated_at"] = datetime.now(timezone.utc).isoformat()
            manifest["reason"] = "structure-verified"
        changed = True

    if update_file_metadata:
        metadata_changed = _refresh_content_manifest_metadata(manifest)
        if metadata_changed is None:
            structure = _scan_content_structure()
            manifest = _new_content_manifest(structure, "metadata-missing-file")
            changed = True
        elif metadata_changed:
            changed = True

    if changed:
        _write_content_manifest(manifest)

    return manifest

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
        "is_pdf": "pdf" in typ_file.stem.lower(),
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

def live_preview_content_page(rel_path: str, content: str) -> dict:
    """
    编译未保存的页面内容到临时 HTML，供 admin 实时预览。
    """
    typ_file = resolve_content_typ_path(rel_path)
    if typ_file is None:
        return {"ok": False, "message": "无效的页面路径。"}
    if not typ_file.exists():
        return {"ok": False, "message": f"页面不存在: {rel_path}"}
    if "pdf" in typ_file.stem.lower():
        return {"ok": False, "message": "PDF 类型页面暂不支持 HTML 实时预览。"}

    page_path, output_path, preview_url = _admin_preview_target_for_content_page(typ_file)

    temp_source = typ_file.parent / f"_admin-preview-{time.time_ns()}.typ"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        temp_source.write_text(content, encoding="utf-8")
        args = [
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
            str(temp_source),
            str(output_path),
        ]

        if not run_typst_command(args):
            return {"ok": False, "message": "实时预览编译失败，请查看终端 Typst 错误。"}
    except Exception as e:
        return {"ok": False, "message": f"实时预览失败: {e}"}
    finally:
        try:
            temp_source.unlink()
        except OSError:
            pass

    return {
        "ok": True,
        "message": "实时预览已更新。",
        "url": preview_url,
        "output": str(output_path),
    }

def _admin_preview_target_for_content_page(typ_file: Path) -> tuple[str, Path, str]:
    """
    返回 admin 实时预览所需的 Typst page-path、输出 HTML 和预览 URL。
    """
    rel = typ_file.relative_to(CONTENT_DIR)
    if rel.name == "index.typ":
        page_path = rel.parent.as_posix()
        if page_path == ".":
            page_path = ""
        output_path = SITE_DIR / rel.parent / "_admin-preview.html"
        preview_url = f"{content_path_to_url(typ_file).rstrip('/')}/_admin-preview.html"
    else:
        page_path = rel.with_suffix("").as_posix()
        output_path = SITE_DIR / rel.with_name(f"{rel.stem}.admin-preview.html")
        preview_url = "/" + output_path.relative_to(SITE_DIR).as_posix()

    return page_path, output_path, preview_url

def discard_content_page_preview(rel_path: str) -> dict:
    """
    清理当前页面的 admin 临时预览产物。
    """
    typ_file = resolve_content_typ_path(rel_path)
    if typ_file is None:
        return {"ok": False, "message": "无效的页面路径。"}
    if not typ_file.exists():
        return {"ok": False, "message": f"页面不存在: {rel_path}"}

    deleted_files: list[str] = []

    try:
        if "pdf" not in typ_file.stem.lower():
            _, output_path, _ = _admin_preview_target_for_content_page(typ_file)
            if output_path.exists():
                output_path.unlink()
                deleted_files.append(str(output_path))

        for temp_source in typ_file.parent.glob("_admin-preview-*.typ"):
            if temp_source.is_file():
                temp_source.unlink()
                deleted_files.append(str(temp_source))
    except Exception as e:
        return {"ok": False, "message": f"清理临时预览失败: {e}"}

    return {
        "ok": True,
        "message": "已放弃修改并清理临时预览。" if deleted_files else "已放弃修改。",
        "deleted": deleted_files,
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
        if section.startswith("#link("):
            continue
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

def build_content_page_typ_content(
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

def build_content_post_typ_content(
    title: str,
    description: str,
    date_str: str,
    lang: str,
) -> str:
    """
    兼容旧的 admin 调用名称。
    """
    return build_content_page_typ_content(title, description, date_str, lang)

def _section_line_range(lines: list[str], section: str | None) -> tuple[int, int]:
    """
    返回指定分组正文范围。未指定分组时返回全文范围。
    """
    if not section:
        return 0, len(lines)

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

    if start_idx is None or section_level is None:
        return 0, len(lines)

    end_idx = len(lines)
    for idx in range(start_idx + 1, len(lines)):
        heading = _parse_typst_section_heading(lines[idx])
        if heading is not None and heading[0] <= section_level:
            end_idx = idx
            break

    return start_idx + 1, end_idx

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

def _infer_index_link_style(lines: list[str], section: str | None) -> tuple[str, int | None]:
    """
    根据父级页面里已有链接格式推断新链接样式。
    """
    bullet_links = 0
    bare_links = 0
    heading_links: dict[int, int] = {}

    start_idx, end_idx = _section_line_range(lines, section)
    scoped_lines = lines[start_idx:end_idx] or lines

    for line in scoped_lines:
        stripped = line.strip()
        if re.match(r"^-\s+#link\(", stripped):
            bullet_links += 1
            continue
        heading_match = re.match(r"^(=+)\s+#link\(", stripped)
        if heading_match:
            level = len(heading_match.group(1))
            heading_links[level] = heading_links.get(level, 0) + 1
            continue
        if re.match(r"^#link\(", stripped):
            bare_links += 1

    if heading_links:
        best_level, best_count = sorted(
            heading_links.items(),
            key=lambda item: (-item[1], item[0]),
        )[0]
        if best_count >= max(bullet_links, bare_links):
            return "heading", best_level

    if bullet_links > bare_links:
        return "bullet", None

    return "bare", None

def _format_index_link_line(lines: list[str], link_target: str, link_text: str, section: str | None) -> str:
    """
    按父级页面当前风格生成目录链接行。
    """
    style, heading_level = _infer_index_link_style(lines, section)
    link_markup = f'#link("{link_target}")[{link_text}]'

    if style == "bullet":
        return f"- {link_markup}"
    if style == "heading" and heading_level:
        return f"{'=' * heading_level} {link_markup}"

    return link_markup

def _link_target_for_parent(parent_path: str, slug: str) -> str:
    """
    根据父级路径生成适合写入该父级 index.typ 的链接目标。
    """
    if parent_path.strip().strip("/") == "":
        return f"/{slug}/"

    return f"{slug}/"

def _page_url_for_parent(parent_path: str, slug: str) -> str:
    """
    根据父级路径生成新页面 URL。
    """
    clean_parent = parent_path.strip().strip("/")
    if not clean_parent:
        return f"/{slug}/"

    return f"/{clean_parent}/{slug}/"

def upsert_index_link(
    index_path: Path,
    slug: str,
    link_text: str,
    section: str | None,
    parent_path: str = "",
) -> tuple[bool, str]:
    """
    在父级页面中插入新页面链接；若链接已存在则跳过。
    """
    if not index_path.exists():
        return False, f"父级页面不存在: {index_path}"

    original = index_path.read_text(encoding="utf-8")
    lines = original.splitlines()

    link_target = _link_target_for_parent(parent_path, slug)
    target_line = _format_index_link_line(lines, link_target, link_text, section)
    slug_marker = f'#link("{link_target}")'

    if any(slug_marker in line for line in lines):
        return True, "父级目录已有同 slug 链接，已跳过插入。"

    insert_idx = _find_insert_anchor(lines, section)

    # 在链接前后各保留一个空行，提升可读性
    payload = [""]
    payload.append(target_line)
    payload.append("")

    new_lines = lines[:insert_idx] + payload + lines[insert_idx:]
    new_content = "\n".join(new_lines).rstrip() + "\n"

    index_path.write_text(new_content, encoding="utf-8")
    return True, "已更新父级目录链接。"

def create_content_page(
    parent_path: str,
    title: str,
    slug: str,
    description: str,
    date_str: str,
    lang: str,
    link_text: str,
    section: str | None = None,
) -> dict:
    """
    创建指定父级下的新页面并自动登记到父级 index.typ。
    """
    parent_dir = resolve_content_dir_path(parent_path)
    if parent_dir is None:
        return {"ok": False, "message": "无效的父级页面。"}
    if not parent_dir.exists() or not parent_dir.is_dir():
        return {"ok": False, "message": f"父级目录不存在: {parent_dir}"}

    parent_index = parent_dir / "index.typ"
    if not parent_index.exists():
        return {"ok": False, "message": f"父级页面不存在: {parent_index}"}

    parent_rel = parent_dir.relative_to(CONTENT_DIR)
    parent_rel_path = "" if parent_rel == Path(".") else parent_rel.as_posix()

    cleaned_slug = slugify(slug or title)
    if not cleaned_slug:
        return {"ok": False, "message": "slug 为空。请提供标题或可用 slug。"}
    if cleaned_slug.startswith("_"):
        return {"ok": False, "message": "slug 不能以下划线开头。"}
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", cleaned_slug):
        return {"ok": False, "message": "slug 只允许小写字母、数字和连字符。"}

    post_dir = parent_dir / cleaned_slug
    post_file = post_dir / "index.typ"
    if post_dir.exists() or post_file.exists():
        return {"ok": False, "message": f"目标页面目录已存在: {post_dir}"}

    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return {"ok": False, "message": "日期格式错误，请使用 YYYY-MM-DD。"}

    try:
        post_dir.mkdir(parents=True, exist_ok=False)
        post_content = build_content_page_typ_content(
            title.strip(),
            description.strip(),
            date_str,
            lang.strip(),
        )
        post_file.write_text(post_content, encoding="utf-8")
    except Exception as e:
        return {"ok": False, "message": f"创建页面文件失败: {e}"}

    if parent_index.exists():
        inserted, msg = upsert_index_link(
            index_path=parent_index,
            slug=cleaned_slug,
            link_text=link_text.strip() or title.strip(),
            section=(section.strip() if section else None),
            parent_path=parent_rel_path,
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
        msg = "当前父级无 index.typ，已仅创建页面文件。"

    return {
        "ok": True,
        "message": (
            "页面已创建，并已更新父级目录。"
            if parent_index.exists()
            else "页面已创建，未更新父级目录（index.typ 不存在）。"
        ),
        "slug": cleaned_slug,
        "parent_path": parent_rel_path,
        "page_path": post_file.relative_to(CONTENT_DIR).as_posix(),
        "post_file": str(post_file),
        "post_url": _page_url_for_parent(parent_rel_path, cleaned_slug),
        "index_update": msg,
    }

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
    兼容旧接口：一级 category 等同于父级页面路径。
    """
    return create_content_page(
        parent_path=category,
        title=title,
        slug=slug,
        description=description,
        date_str=date_str,
        lang=lang,
        link_text=link_text,
        section=section,
    )

def get_sections_by_group(groups: list[str]) -> dict[str, list[str]]:
    """
    获取每个栏目首页的可选分组。
    """
    result: dict[str, list[str]] = {}
    for group in groups:
        index_path = CONTENT_DIR / group / "index.typ"
        result[group] = parse_sections(index_path)
    return result

def get_sections_by_parent_path(parents: list[dict[str, str | int]] | None = None) -> dict[str, list[str]]:
    """
    获取每个可作为父级的页面目录分组。
    """
    result: dict[str, list[str]] = {}
    for parent in parents or collect_content_parent_dirs():
        parent_path = str(parent.get("path", ""))
        parent_dir = resolve_content_dir_path(parent_path)
        if parent_dir is None:
            continue
        result[parent_path] = parse_sections(parent_dir / "index.typ")
    return result
