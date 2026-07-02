# 图床图片下载与 Typst 格式转换

本项目提供了一个轻量图片处理脚本，用于把文章中的图床链接下载到文章自己的
`assets/` 目录，并把图片写法转换为 Typst 的 `#image(...)`。

脚本只处理图片，不会转换文章标题、正文、表格、链接或模板。

## 处理效果

假设文章位于：

```text
content/Docs/example/index.typ
```

文章中粘贴了 PicGo 返回的 Markdown 图片：

```markdown
![](https://example.com/images/photo.jpg)
```

运行脚本后，图片会保存为：

```text
content/Docs/example/
├── index.typ
└── assets/
    └── photo.jpg
```

原来的图片标记会被替换为：

```typst
#image("assets/photo.jpg")
```

这样文章不再依赖图床链接，构建和离线预览都直接使用本地图片。

## 使用方法

### 构建时自动处理

正常构建即可：

```bash
uv run build.py build
```

`build.py` 会先扫描 `content/**/index.typ`，下载和转换图片，然后继续构建
HTML、PDF 和静态资源。

如果图片下载失败，构建会停止并显示具体错误。

### 单独处理全部文章

```bash
uv run build.py images
```

该命令只处理图片，不执行网站构建。

### 只处理一篇文章

```bash
uv run build.py images content/About/index.typ
```

也可以指定一个目录：

```bash
uv run build.py images content/Docs
```

指定目录时，会递归处理该目录下的所有 `.typ` 文件。

### macOS 双击运行

在 Finder 中双击：

```text
process-images.command
```

它等价于：

```bash
uv run build.py images
```

处理完成后，终端窗口会等待按回车再关闭。

也可以在终端中把文章路径传给它：

```bash
./process-images.command content/About/index.typ
```

### 直接运行底层脚本

不经过 `build.py` 时，可以运行：

```bash
python3 scripts/process_images.py --all
```

处理指定文件：

```bash
python3 scripts/process_images.py content/About/index.typ
```

底层脚本只使用 Python 标准库，不需要安装 Pandoc、PyYAML 或其他 Python
依赖。

## 支持的图片写法

### Markdown 图片

输入：

```markdown
![说明文字](https://example.com/photo.jpg)
```

输出：

```typst
#image("assets/photo.jpg")
```

### HTML 图片

输入：

```html
<img src="https://example.com/photo.jpg">
```

输出：

```typst
#image("assets/photo.jpg")
```

### Typst 远程图片

输入：

```typst
#image("https://example.com/photo.jpg", width: 50%)
```

输出：

```typst
#image("assets/photo.jpg", width: 50%)
```

Typst 图片原有的 `width`、`height` 等参数会保留。

### 本地图片

Markdown 或 HTML 中引用本地图片时，脚本会把图片复制到当前文章的
`assets/`：

```markdown
![](./screenshots/result.png)
```

转换为：

```typst
#image("assets/result.png")
```

## 处理规则

- 每篇文章使用自己的 `assets/` 目录。
- 支持 HTTP、HTTPS、本地文件和 `data:` 图片。
- 单张图片最大为 100 MB。
- 支持 JPG、PNG、WebP、GIF、SVG、AVIF、BMP、TIFF 和 ICO。
- 同一篇文章中重复出现的相同地址只处理一次。
- 已经存在且内容相同的文件不会重复写入。
- 文件同名但内容不同时，会添加内容哈希，例如 `photo-a1b2c3d4.jpg`。
- 图片没有可靠文件名时，会生成 `image-内容哈希.扩展名`。
- Markdown 围栏代码块中的图片示例不会被替换。
- 已经转换为本地 `#image("assets/...")` 的图片不会再次处理。
- 只有文章内容发生变化时才会重写 `.typ` 文件。

## 推荐工作流

1. 使用 PicGo 上传图片。
2. 把 PicGo 复制的 Markdown 图片链接粘贴进 `.typ` 文章。
3. 继续编写文章，不需要手动修改图片格式。
4. 发布前运行 `uv run build.py build`。
5. 脚本自动下载图片、替换格式并构建网站。

也可以在写作过程中运行：

```bash
uv run build.py images content/Docs/example/index.typ
```

提前把当前文章中的图片本地化。

## 本次修改内容

### 新增 `scripts/process_images.py`

图片处理的核心脚本，负责：

- 查找文章中的 Markdown、HTML 和远程 Typst 图片。
- 下载远程图片或复制本地图片。
- 检测真实图片格式。
- 处理文件重名和重复图片。
- 将图片标记原地替换为 Typst 格式。
- 跳过围栏代码块，避免修改示例代码。

### 新增 `process-images.command`

macOS 一键运行脚本。双击后处理全部文章，也支持从终端传入指定文件或目录。

### 修改 `build.py`

新增命令：

```bash
uv run build.py images [文件或目录]
```

同时把图片处理加入普通构建流程：

```text
处理文章图片
→ 检查图片路径
→ 构建 HTML 和 PDF
→ 复制文章 assets
→ 完成网站构建
```

## 不会处理的内容

脚本不会：

- 把整篇 Markdown 转换为 Typst。
- 创建新的文章目录或 `index.typ`。
- 修改文章标题、日期和模板。
- 修改栏目索引。
- 上传图片到图床。
- 删除 `assets/` 中不再使用的旧图片。
- 处理 Markdown 引用式图片，例如 `![图片][photo]`。
- 处理代码块中的图片链接。

## 排错

### 图片下载失败

先确认图片地址能够在浏览器中直接打开，然后只处理出错文章：

```bash
uv run build.py images content/栏目/文章/index.typ
```

脚本会打印失败的地址或本地文件路径。

### 文件不是图片

如果服务器返回 HTML 登录页面、403 页面或其他内容，脚本会报告：

```text
地址返回的内容不是可识别图片
```

需要检查图床链接是否公开、是否过期，或者是否启用了防盗链。

### 文件名冲突

当两个图片地址使用相同文件名但内容不同时，脚本会自动添加哈希，不需要手动
改名。

### 想恢复远程链接

脚本是原地修改文章文件，运行前后都可以通过 Git 查看变化：

```bash
git diff -- content/栏目/文章/index.typ
```

需要恢复时，应根据 Git 历史或原始图床地址手动恢复。
