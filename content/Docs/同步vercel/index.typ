
#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *

#show: template.with(
  title: "同步博客到 Vercel",
  description: "将 Typst 博客同步到 Vercel 的实用指南：GitHub 自动触发、Vercel 构建配置与项目的 build.py 实现原理。",
  date: datetime(year: 2025, month: 12, day: 23),
  lang: "zh",
)

= 同步博客到 Vercel

为什么要同步到vercel？主要是vercel 其实有国内cdn，如果绑上自己的域名，可以在国内直接访问，github pages不太行。

#outline()

#html.hr()

== 1. GitHub 仓库同步

同步流程很简单：将代码 push 到 GitHub，Vercel 在检测到仓库更新后会自动拉取并触发部署。

- **推送代码到 GitHub**：使用 `git push` 将本地变更推送到远端仓库。
- **Vercel 自动监听**：在项目关联后，Vercel 会对指定分支的 push 触发构建与部署。

#tip-box[
  在 Vercel 控制台使用 "Import Git Repository" 并授权 GitHub，可以快速完成仓库关联与初始部署配置。
]

#html.hr()

== 2. Vercel 编译流程

Vercel 的构建与部署由两个关键文件驱动：项目配置 `vercel.json` 和构建脚本 `vercel-build.sh`。

#table(
  columns: 2,
  [*文件*], [*作用*],
  [vercel.json], [项目配置（构建命令、输出目录、缓存策略）],
  [vercel-build.sh], [构建脚本（下载编译器、执行构建）],
)

=== 2.1 vercel.json 配置

#figure(caption: [vercel.json 核心配置])[
```json
{
  "buildCommand": "bash vercel-build.sh",
  "outputDirectory": "_site",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*\\.(?:woff2|woff|ttf|otf|eot))",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=2592000, immutable" }
      ]
    }
  ]
}
```
]

关键配置说明：

- `buildCommand`：指定构建命令，通常调用 `vercel-build.sh` 执行构建流程。
- `outputDirectory`：构建产物输出目录，本项目使用 `_site` 作为站点根目录。
- `headers`：按路径设置缓存策略：
  - HTML 页面：`max-age=0`（不缓存），确保用户获取最新内容。
  - 字体文件：`max-age=2592000`（30 天）并设置 `immutable`，减少重复下载。
  - 资源文件（CSS/JS/图片）：根据需要灵活设置缓存时长。

==== vercel-build.sh（构建脚本）

#figure(caption: [vercel-build.sh 构建脚本])[
```bash
#!/bin/bash
# 安装 typst 编译器到项目目录
curl -fsSL https://github.com/typst/typst/releases/download/v0.14.2/typst-x86_64-unknown-linux-musl.tar.xz | tar -xJ
mv typst-x86_64-unknown-linux-musl/typst ./typst
rm -rf typst-x86_64-unknown-linux-musl
chmod +x typst

# 执行构建（项目使用 uv 脚本管理）
uv run build.py build
```
]

构建脚本流程概览：

1. 下载并解压 Typst 二进制到项目目录，设置可执行权限。
2. 使用 `uv run build.py build` 调用项目的构建脚本完成站点生成。

=== 2.2 build.py 构建脚本

`build.py` 是站点构建的核心，负责：解析依赖、增量编译、处理资源并输出 `_site`。

#figure(caption: [build.py 核心配置])[
```python
#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "pillow>=10.0.0",
# ]
# ///

CONTENT_DIR = Path("content")  # 源文件目录
SITE_DIR = Path("_site")       # 输出目录
ASSETS_DIR = Path("assets")    # 静态资源目录
CONFIG_FILE = Path("config.typ") # 全局配置文件
```
]

==== 增量编译机制

`build.py` 实现增量编译以加速构建：

1. 解析 `#import` / `#include` 追踪文件依赖关系。
2. 比较源文件与目标文件的修改时间，仅在必要时重新编译。
3. 监测全局配置（如 `config.typ`）或同目录资源（图片、`.bib`、`.md`）的变化。

以下任一条件会触发重新编译：目标文件不存在、源文件或任一依赖文件较新、或资源文件发生变化。

==== 构建产物结构（示意）

```text
content/                    源文件目录
├── Blog/
│   └── index.typ          博客首页
├── Docs/
│   └── 同步vercel/
│       └── index.typ      本页面
└── ...

    ↓ typst compile

_site/                      输出目录
├── Blog/
│   └── index.html         生成的 HTML
├── Docs/
│   └── 同步vercel/
│       └── index.html     生成的 HTML
├── assets/                静态资源
└── ...
```

=== 完整部署流程（示意）

#figure(caption: [完整部署流程])[
```text
┌─────────────────┐
│   本地编写内容   │
│  (.typ 文件)    │
└────────┬────────┘
         │ git push
         ▼
┌─────────────────┐
│   GitHub 仓库   │
└────────┬────────┘
         │ Webhook 触发
         ▼
┌─────────────────┐
│    Vercel       │
│  ┌───────────┐  │
│  │ 拉取代码  │  │
│  └─────┬─────┘  │
│        ▼        │
│  ┌───────────┐  │
│  │ 下载 typst│  │
│  └─────┬─────┘  │
│        ▼        │
│  ┌───────────┐  │
│  │ 执行构建  │  │
│  │ build.py  │  │
│  └─────┬─────┘  │
│        ▼        │
│  ┌───────────┐  │
│  │ 部署 _site│  │
│  └───────────┘  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   用户访问      │
│ your-domain.com │
└─────────────────┘
```
]

#html.hr()

_本页最后更新：2025-12-23_


