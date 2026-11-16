"""图片处理：响应式图片生成、图片路径检查、文章图片下载转换（自 build.py 拆分，用户独有逻辑）。"""

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
from .compile import find_typ_files  # noqa: F401

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
        for typ_file in find_typ_files():
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

def process_article_images(
    sources: list[str] | None = None,
    *,
    all_content: bool = False,
) -> bool:
    """下载文章图片，并把图片标记转换为 Typst 格式。"""
    if not IMAGE_PROCESSOR_SCRIPT.exists():
        print(f"❌ 图片处理脚本不存在: {IMAGE_PROCESSOR_SCRIPT}")
        return False

    command = [sys.executable, str(IMAGE_PROCESSOR_SCRIPT)]
    if all_content:
        command.append("--all")
    command.extend(sources or [])

    print("🖼️ 检查文章图片...")
    result = subprocess.run(command)
    return result.returncode == 0
