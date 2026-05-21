#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pillow>=10.0.0",
# ]
# ///

"""
兼容入口：实际响应式图片生成逻辑已合并回 build.py。
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


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
    project_root = Path(__file__).resolve().parents[1]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from build import generate_responsive_images

    args = parse_args()
    ok = generate_responsive_images(
        site_dir=Path(args.site_dir),
        prefer_webp=not args.no_webp,
    )
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
