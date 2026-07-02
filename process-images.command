#!/bin/zsh

set -e

ROOT_DIR="${0:A:h}"
cd "$ROOT_DIR"

if [[ $# -gt 0 ]]; then
  uv run build.py images "$@"
else
  uv run build.py images
fi

echo
read "?图片处理完成，按回车关闭窗口..."
