#!/bin/bash
# 安装 typst 编译器到项目目录
curl -fsSL https://github.com/typst/typst/releases/download/v0.13.1/typst-x86_64-unknown-linux-musl.tar.xz | tar -xJ
mv typst-x86_64-unknown-linux-musl/typst ./typst
rm -rf typst-x86_64-unknown-linux-musl
chmod +x typst
# 构建
uv run build.py build
