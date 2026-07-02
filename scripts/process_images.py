#!/usr/bin/env python3

"""Download article images and replace their markup with Typst image calls."""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import mimetypes
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = PROJECT_ROOT / "content"
MAX_IMAGE_BYTES = 100 * 1024 * 1024

MARKDOWN_IMAGE_RE = re.compile(
    r"!\[(?P<alt>[^\]]*)\]\(\s*<?(?P<src>[^)\s>]+)>?"
    r"(?:\s+[\"'][^\"']*[\"'])?\s*\)"
)
HTML_IMAGE_RE = re.compile(r"<img\b(?P<attrs>[^>]*)>", flags=re.IGNORECASE)
TYPST_REMOTE_IMAGE_RE = re.compile(
    r'(?P<prefix>#image\(\s*")(?P<src>https?://[^"]+)(?P<suffix>")'
)
FENCED_CODE_RE = re.compile(
    r"(?ms)^[ \t]*(?P<fence>`{3,}|~{3,})[^\n]*\n"
    r".*?^[ \t]*(?P=fence)[ \t]*$"
)

CONTENT_TYPE_EXTENSIONS = {
    "image/avif": ".avif",
    "image/bmp": ".bmp",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/tiff": ".tiff",
    "image/webp": ".webp",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
}
IMAGE_EXTENSIONS = {
    ".avif",
    ".bmp",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".tif",
    ".tiff",
    ".webp",
}


@dataclass
class ProcessResult:
    path: Path
    replacements: int
    downloads: int
    changed: bool


class ImageStore:
    def __init__(self, article_dir: Path):
        self.article_dir = article_dir
        self.assets_dir = article_dir / "assets"
        self.source_to_path: dict[str, str] = {}
        self.filename_to_digest: dict[str, str] = {}
        self.downloads = 0

    def materialize(self, source: str) -> str:
        source = html.unescape(source.strip())
        cached = self.source_to_path.get(source)
        if cached:
            return cached

        data, content_type, suggested_name, downloaded = self._read(source)
        digest = hashlib.sha256(data).hexdigest()
        filename = choose_filename(suggested_name, content_type, data, digest)
        filename = self._avoid_collision(filename, digest)

        self.assets_dir.mkdir(parents=True, exist_ok=True)
        target = self.assets_dir / filename
        if not target.exists() or file_sha256(target) != digest:
            target.write_bytes(data)
            if downloaded:
                self.downloads += 1

        typst_path = f"assets/{filename}"
        self.filename_to_digest[filename] = digest
        self.source_to_path[source] = typst_path
        return typst_path

    def _read(self, source: str) -> tuple[bytes, str, str, bool]:
        if source.startswith("data:"):
            data, content_type = read_data_url(source)
            return data, content_type, "", True

        parsed = urllib.parse.urlparse(source)
        if parsed.scheme in {"http", "https"}:
            request = urllib.request.Request(
                source,
                headers={"User-Agent": "CST-Cat-Typst-Image-Processor/1.0"},
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                content_type = response.headers.get_content_type()
                data = response.read(MAX_IMAGE_BYTES + 1)
                final_url = response.geturl()
            if len(data) > MAX_IMAGE_BYTES:
                raise ValueError(f"图片超过 100MB: {source}")
            if not detect_extension(data, content_type, final_url):
                raise ValueError(f"地址返回的内容不是可识别图片: {source}")
            name = Path(urllib.parse.urlparse(final_url).path).name
            return data, content_type, name, True

        local_path = resolve_local_path(source, self.article_dir)
        if not local_path.is_file():
            raise FileNotFoundError(f"找不到本地图片: {local_path}")
        data = local_path.read_bytes()
        if len(data) > MAX_IMAGE_BYTES:
            raise ValueError(f"图片超过 100MB: {local_path}")
        content_type = mimetypes.guess_type(local_path.name)[0] or ""
        return data, content_type, local_path.name, False

    def _avoid_collision(self, filename: str, digest: str) -> str:
        target = self.assets_dir / filename
        known_digest = self.filename_to_digest.get(filename)
        if known_digest == digest:
            return filename
        if known_digest is None and (not target.exists() or file_sha256(target) == digest):
            return filename

        path = Path(filename)
        candidate = f"{path.stem}-{digest[:8]}{path.suffix}"
        counter = 2
        while True:
            candidate_target = self.assets_dir / candidate
            known_digest = self.filename_to_digest.get(candidate)
            if known_digest == digest:
                return candidate
            if known_digest is None and (
                not candidate_target.exists() or file_sha256(candidate_target) == digest
            ):
                return candidate
            candidate = f"{path.stem}-{digest[:8]}-{counter}{path.suffix}"
            counter += 1


def resolve_local_path(source: str, article_dir: Path) -> Path:
    cleaned = urllib.parse.unquote(source.split("#", 1)[0].split("?", 1)[0])
    if cleaned.startswith("/"):
        return (PROJECT_ROOT / cleaned.lstrip("/")).resolve()
    return (article_dir / cleaned).resolve()


def read_data_url(source: str) -> tuple[bytes, str]:
    header, encoded = source.split(",", 1)
    parts = header[5:].split(";")
    content_type = parts[0] or "application/octet-stream"
    if "base64" in parts[1:]:
        data = base64.b64decode(encoded)
    else:
        data = urllib.parse.unquote_to_bytes(encoded)
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("data URL 图片超过 100MB")
    if not detect_extension(data, content_type, ""):
        raise ValueError("data URL 不是可识别图片")
    return data, content_type


def detect_extension(data: bytes, content_type: str, name: str) -> str:
    normalized_type = content_type.split(";", 1)[0].lower()
    if normalized_type in CONTENT_TYPE_EXTENSIONS:
        return CONTENT_TYPE_EXTENSIONS[normalized_type]

    suffix = Path(urllib.parse.urlparse(name).path).suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return ".jpg" if suffix == ".jpeg" else suffix

    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return ".webp"
    if data.startswith(b"BM"):
        return ".bmp"
    if data.startswith((b"II*\x00", b"MM\x00*")):
        return ".tiff"
    if data.startswith(b"\x00\x00\x01\x00"):
        return ".ico"
    if len(data) >= 12 and data[4:8] == b"ftyp" and b"avif" in data[8:16]:
        return ".avif"
    if data.lstrip().startswith((b"<svg", b"<?xml")) and b"<svg" in data[:1024]:
        return ".svg"
    return ""


def choose_filename(name: str, content_type: str, data: bytes, digest: str) -> str:
    decoded_name = urllib.parse.unquote(Path(name or "").name)
    decoded_name = re.sub(r"[\x00-\x1f\x7f\\/:*?\"<>|]", "-", decoded_name)
    decoded_name = decoded_name.strip(" .")

    detected_extension = detect_extension(data, content_type, decoded_name) or ".img"
    suffix = Path(decoded_name).suffix.lower()
    if suffix not in IMAGE_EXTENSIONS:
        stem = Path(decoded_name).stem if decoded_name else f"image-{digest[:12]}"
        decoded_name = f"{stem}{detected_extension}"
    elif suffix == ".jpeg":
        decoded_name = f"{Path(decoded_name).stem}.jpg"
    return decoded_name


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def escape_typst_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def process_segment(text: str, store: ImageStore) -> tuple[str, int]:
    replacements = 0

    def replace_markdown(match: re.Match[str]) -> str:
        nonlocal replacements
        replacements += 1
        path = store.materialize(match.group("src"))
        return f'#image("{escape_typst_string(path)}")'

    def replace_html(match: re.Match[str]) -> str:
        nonlocal replacements
        src_match = re.search(
            r"\bsrc\s*=\s*[\"'](?P<src>[^\"']+)[\"']",
            match.group("attrs"),
            flags=re.IGNORECASE,
        )
        if not src_match:
            return match.group(0)
        replacements += 1
        path = store.materialize(src_match.group("src"))
        return f'#image("{escape_typst_string(path)}")'

    def replace_typst(match: re.Match[str]) -> str:
        nonlocal replacements
        replacements += 1
        path = store.materialize(match.group("src"))
        return (
            f'{match.group("prefix")}{escape_typst_string(path)}'
            f'{match.group("suffix")}'
        )

    text = MARKDOWN_IMAGE_RE.sub(replace_markdown, text)
    text = HTML_IMAGE_RE.sub(replace_html, text)
    text = TYPST_REMOTE_IMAGE_RE.sub(replace_typst, text)
    return text, replacements


def process_text(text: str, store: ImageStore) -> tuple[str, int]:
    output: list[str] = []
    replacements = 0
    cursor = 0
    for code_block in FENCED_CODE_RE.finditer(text):
        converted, count = process_segment(text[cursor : code_block.start()], store)
        output.extend((converted, code_block.group(0)))
        replacements += count
        cursor = code_block.end()
    converted, count = process_segment(text[cursor:], store)
    output.append(converted)
    return "".join(output), replacements + count


def process_file(path: Path) -> ProcessResult:
    path = path.expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f"文件不存在: {path}")
    if path.suffix.lower() != ".typ":
        raise ValueError(f"只处理 .typ 文件: {path}")

    original = path.read_text(encoding="utf-8")
    store = ImageStore(path.parent)
    converted, replacements = process_text(original, store)
    changed = converted != original
    if changed:
        path.write_text(converted, encoding="utf-8")
    return ProcessResult(path, replacements, store.downloads, changed)


def collect_files(sources: list[str], all_content: bool) -> list[Path]:
    if all_content:
        return sorted(CONTENT_DIR.rglob("index.typ"))

    files: list[Path] = []
    for source in sources:
        path = Path(source).expanduser().resolve()
        if path.is_dir():
            files.extend(sorted(path.rglob("*.typ")))
        else:
            files.append(path)
    return list(dict.fromkeys(files))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="下载 Typst 文章中的图片，并把图片标记改为 #image(...).",
    )
    parser.add_argument("sources", nargs="*", help="要处理的 .typ 文件或目录")
    parser.add_argument(
        "--all",
        action="store_true",
        help="处理 content 下所有文章 index.typ",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if not args.sources and not args.all:
        print("请提供 .typ 文件/目录，或使用 --all。", file=sys.stderr)
        return 2

    try:
        files = collect_files(args.sources, args.all)
        total_replacements = 0
        total_downloads = 0
        changed_files = 0
        for path in files:
            result = process_file(path)
            total_replacements += result.replacements
            total_downloads += result.downloads
            changed_files += int(result.changed)
            if result.changed:
                try:
                    display_path = path.relative_to(PROJECT_ROOT)
                except ValueError:
                    display_path = path
                print(
                    f"已处理 {display_path}: 替换 {result.replacements} 处，"
                    f"下载 {result.downloads} 张"
                )
        print(
            f"图片处理完成：扫描 {len(files)} 个文件，修改 {changed_files} 个，"
            f"下载 {total_downloads} 张。"
        )
        return 0
    except Exception as error:
        print(f"图片处理失败: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
