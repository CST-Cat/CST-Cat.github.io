#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pillow>=10.0.0",
# ]
# ///

"""
为 HTML 中本地 <img> 自动生成多尺寸文件并注入 srcset/sizes。

规则:
- 仅处理本地栅格图片: .jpg/.jpeg/.png/.webp
- 生成规则: <name>-w{width}.<ext>
- 默认优先输出 WebP（可关闭）
- width/height 仅在缺失或明显为 0 时补齐，避免覆盖 Typst 已写尺寸
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def generate_responsive_images(
    site_dir: Path,
    target_widths: tuple[int, ...] = (480, 768, 1024, 1366),
    default_sizes: str = "(max-width: 900px) 100vw, 760px",
    prefer_webp: bool = True,
    webp_quality: int = 80,
    min_responsive_width: int = 480,
    min_responsive_height: int = 180,
    max_responsive_ratio: float = 8.0,
) -> bool:
    try:
        from PIL import Image
    except ImportError:
        print("⚠ Pillow 未安装，跳过多尺寸图片生成（可安装: pip install pillow）")
        return True

    raster_exts = {".jpg", ".jpeg", ".png", ".webp"}
    img_tag_pattern = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
    src_pattern = re.compile(r"\bsrc=(?P<quote>['\"])(?P<src>[^'\"]+)(?P=quote)", re.IGNORECASE)
    dim_attr_pattern_template = r"\b{attr}\s*=\s*(?P<quote>['\"])(?P<value>[^'\"]*)(?P=quote)"
    numeric_dim_pattern = re.compile(r"^\s*([+-]?\d+(?:\.\d+)?)\s*([a-z%]*)\s*$", re.IGNORECASE)

    def _set_or_replace_attr(tag: str, name: str, value: str) -> str:
        attr_pattern = re.compile(rf"\b{name}\s*=\s*(['\"]).*?\1", re.IGNORECASE)
        replacement = f'{name}="{value}"'

        if attr_pattern.search(tag):
            return attr_pattern.sub(replacement, tag, count=1)

        close_pos = tag.rfind(">")
        if close_pos == -1:
            return tag
        return f"{tag[:close_pos]} {replacement}{tag[close_pos:]}"

    def _get_attr_value(tag: str, name: str) -> str | None:
        pattern = re.compile(dim_attr_pattern_template.format(attr=re.escape(name)), re.IGNORECASE)
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

    def _apply_dimension_attrs(tag: str, src_w: int, src_h: int) -> str:
        width_raw = _get_attr_value(tag, "width")
        height_raw = _get_attr_value(tag, "height")
        width_missing = _is_missing_or_obvious_zero(width_raw)
        height_missing = _is_missing_or_obvious_zero(height_raw)

        if not width_missing and not height_missing:
            return tag

        new_tag = tag
        width_num, width_numeric_like = _parse_dim(width_raw)
        height_num, height_numeric_like = _parse_dim(height_raw)

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

        if base_url.startswith("/"):
            candidate = site_dir / base_url.lstrip("/")
        else:
            candidate = (html_file.parent / base_url).resolve()

        try:
            candidate.resolve().relative_to(site_dir.resolve())
        except Exception:
            return None

        return candidate

    def _replace_url_ext(url: str, new_ext: str) -> str:
        slash_idx = url.rfind("/")
        dot_idx = url.rfind(".")
        if dot_idx > slash_idx:
            return f"{url[:dot_idx]}{new_ext}"
        return f"{url}{new_ext}"

    def _sibling_url(base_url: str, sibling_name: str) -> str:
        if "/" not in base_url:
            return sibling_name

        parent = base_url.rsplit("/", 1)[0]
        if parent == "":
            return f"/{sibling_name}"
        return f"{parent}/{sibling_name}"

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
            img.save(output_path, format="WEBP", quality=webp_quality, method=6)

    def _should_skip_responsive(src_w: int, src_h: int) -> bool:
        if src_w < min_responsive_width or src_h < min_responsive_height:
            return True

        ratio = max(src_w / src_h, src_h / src_w)
        return ratio > max_responsive_ratio

    try:
        resample = Image.Resampling.LANCZOS
    except Exception:
        resample = Image.LANCZOS

    generated_variants = 0
    updated_img_tags = 0
    updated_html_files = 0
    image_dim_cache: dict[str, tuple[int, int]] = {}

    try:
        for html_file in site_dir.rglob("*.html"):
            content = html_file.read_text(encoding="utf-8")

            def _replace_img(match: re.Match[str]) -> str:
                nonlocal generated_variants, updated_img_tags

                original_tag = match.group(0)
                src_match = src_pattern.search(original_tag)
                if not src_match:
                    return original_tag

                src_url = src_match.group("src")
                base_url, _, _ = _split_url(src_url)
                local_file = _resolve_local_file(base_url, html_file)
                if local_file is None or not local_file.exists():
                    return original_tag

                ext = local_file.suffix.lower()
                if ext not in raster_exts:
                    return original_tag

                output_ext = ".webp" if prefer_webp else ext
                output_base_file = local_file.with_suffix(output_ext)
                output_base_url = _replace_url_ext(base_url, output_ext)

                cache_key = str(local_file)
                if cache_key in image_dim_cache:
                    src_w, src_h = image_dim_cache[cache_key]
                else:
                    try:
                        with Image.open(local_file) as src_img:
                            src_w, src_h = src_img.size
                    except Exception:
                        return original_tag
                    image_dim_cache[cache_key] = (src_w, src_h)

                new_tag = _apply_dimension_attrs(original_tag, src_w, src_h)

                if _should_skip_responsive(src_w, src_h):
                    if new_tag != original_tag:
                        updated_img_tags += 1
                    return new_tag

                try:
                    source_mtime = local_file.stat().st_mtime
                    if (
                        output_base_file != local_file
                        and (
                            (not output_base_file.exists())
                            or (output_base_file.stat().st_mtime < source_mtime)
                        )
                    ):
                        with Image.open(local_file) as src_img:
                            working = _normalize_mode(src_img, output_ext)
                            _save_resized_image(working, output_base_file, output_ext)
                            generated_variants += 1
                except Exception:
                    return original_tag

                new_tag = _set_or_replace_attr(new_tag, "src", output_base_url)

                widths = [w for w in target_widths if 0 < w < src_w]
                if not widths:
                    if new_tag != original_tag:
                        updated_img_tags += 1
                    return new_tag

                variant_entries: list[tuple[str, int]] = []

                try:
                    with Image.open(local_file) as src_img:
                        for w in widths:
                            variant_name = f"{local_file.stem}-w{w}{output_ext}"
                            variant_path = local_file.with_name(variant_name)

                            if (not variant_path.exists()) or (
                                variant_path.stat().st_mtime < local_file.stat().st_mtime
                            ):
                                working = _normalize_mode(src_img, output_ext)

                                new_h = max(1, round(src_h * (w / src_w)))
                                resized = working.resize((w, new_h), resample=resample)

                                _save_resized_image(resized, variant_path, output_ext)

                                generated_variants += 1

                            variant_url = _sibling_url(base_url, variant_name)
                            variant_entries.append((variant_url, w))
                except Exception:
                    return original_tag

                variant_entries.append((output_base_url, src_w))
                variant_entries.sort(key=lambda item: item[1])
                srcset_value = ", ".join(f"{url} {w}w" for url, w in variant_entries)

                new_tag = _set_or_replace_attr(new_tag, "srcset", srcset_value)

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
                f"新增/更新 {generated_variants} 个变体文件，更新 {updated_img_tags} 个 <img>，涉及 {updated_html_files} 个 HTML"
            )

        return True
    except Exception as e:
        print(f"❌ 多尺寸图片生成失败: {e}")
        return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="为站点 HTML 注入响应式图片 srcset/sizes。")
    parser.add_argument(
        "--site-dir",
        default="_site",
        help="站点输出目录，默认为 _site",
    )
    parser.add_argument(
        "--no-webp",
        action="store_true",
        help="禁用 WebP 输出，保持源格式",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    ok = generate_responsive_images(
        site_dir=Path(args.site_dir),
        prefer_webp=not args.no_webp,
    )
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
