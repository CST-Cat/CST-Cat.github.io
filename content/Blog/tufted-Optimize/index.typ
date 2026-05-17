#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(
  title: "tufted博客模板优化",
  description: "对tufted博客模板进行了一些优化，使其加载更快",
  date: datetime(year: 2026, month: 4, day: 6),
  lang: "zh",
)

= tufted博客模板优化

#outline()

== 4.7优化总览

4.7集中做了一轮站点性能和体验优化，这里做一份完整记录，方便后续复盘和回滚。

- 图片链路优化：抽离内联图片、压缩、响应式、多端懒加载
- 字体链路优化：接入国内可用 CDN，移除 STKaiti
- 首屏体验优化：加入 Font Loading API，字体就绪后淡入
- 构建后处理：资源版本号、Sitemap、RSS 保持自动化

=== 抽离图片与图片链路优化

核心做法是把 HTML 里体积大的 base64 图片抽离成静态文件，再统一做压缩、响应式和懒加载。

```python
# build.py: 图片链路处理（按执行顺序）
results.append(extract_inline_images(SITE_DIR))      # data:image -> /assets/inline-images/*
results.append(optimize_inline_images(SITE_DIR))     # JPEG 压缩 + manifest 避免重复处理
results.append(generate_responsive_images(
    SITE_DIR,
    target_widths=(480, 768, 1024, 1366),
    default_sizes="(max-width: 900px) 100vw, 760px",
    prefer_webp=True,
    webp_quality=80,
))
results.append(add_image_lazy_loading(SITE_DIR))     # 注入 loading/decoding/fetchpriority
```

```html
<!-- 处理前：内联 base64，体积大且无法复用缓存 -->
<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..." />

<!-- 处理后：外链文件 + 响应式 + 懒加载 -->
<img
  src="/assets/inline-images/abcd1234ef567890.webp"
  srcset="/assets/inline-images/abcd1234ef567890-w480.webp 480w,
          /assets/inline-images/abcd1234ef567890-w768.webp 768w,
          /assets/inline-images/abcd1234ef567890.webp 1600w"
  sizes="(max-width: 900px) 100vw, 760px"
  loading="lazy"
  decoding="async"
  fetchpriority="low"
/>
```

最近一次全量构建日志（实际结果）里，这部分工作包含：

- 内联图片抽离：替换 64 处，生成 49 个文件
- JPEG 压缩：优化 30 张，节省约 25.20 MB
- 响应式图片：生成/更新 195 个变体，更新 48 个 `<img>`

=== 字体链路优化（CDN + 移除 STKaiti 和本地的朱雀仿宋）

为了减少不可控字体链路和请求负担，这次做了两件事：

1. 中文字体改为国内可直连的 CDN 资源
2. 移除 STKaiti（模板不再注入、产物不再携带）

```typst
// tufted-lib/tufted.typ：统一注入 CSS（节选）
let base-css = (
  "/assets/tufte.min.css",
  "/assets/tufted.css",
  "/assets/theme.css",
  "https://ik.imagekit.io/bavig10763/packages/sypxzs/dist/%E6%80%9D%E6%BA%90%E5%B1%8F%E6%98%BE%E8%87%BB%E5%AE%8B/result.css?t_3=1467",
  "https://ik.imagekit.io/bavig10763/packages/zqfs/dist/ZhuqueFangsong-Regular/result.css?t_3=1467",
)
```

构建阶段也会清理停用字体目录，避免产物里残留无用资源：

```python
def remove_unused_font_assets(site_dir: Path) -> bool:
  stale_font_dirs = [site_dir / "assets" / "fonts" / "STKaiti"]

  for font_dir in stale_font_dirs:
    if font_dir.exists() and font_dir.is_dir():
      shutil.rmtree(font_dir)

  return True
```

标题中文字体也统一为朱雀仿宋：

```css
h1, h2, h3, h4, h5 {
  font-family: "Crimson Pro", "Zhuque Fangsong (technical preview)", serif !important;
}
```

=== 首屏字体体验：Font Loading API + 淡入

为了减少“字体突然切换”的违和感，加入了字体就绪后显示页面的方案。

```javascript
// assets/font-ready.js（完整逻辑）
(function () {
  const REVEAL_CLASS = "font-loaded";
  const FALLBACK_TIMEOUT_MS = 1500;

  function revealBody() {
    if (!document.body) return;
    document.body.classList.add(REVEAL_CLASS);
  }

  function initFontReveal() {
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      revealBody();
    }

    const fallbackTimer = window.setTimeout(finish, FALLBACK_TIMEOUT_MS);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(function () {
          window.clearTimeout(fallbackTimer);
          finish();
        })
        .catch(function () {
          window.clearTimeout(fallbackTimer);
          finish();
        });
      return;
    }

    window.clearTimeout(fallbackTimer);
    finish();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFontReveal, { once: true });
  } else {
    initFontReveal();
  }
})();
```

```css
body {
  opacity: 0;
  transition: opacity 0.08s ease;
}

body.font-loaded {
  opacity: 1;
}
```

实际实现里还加了超时兜底（1500ms），防止极端情况下页面长期不可见。

=== 构建后处理与发布稳定性

除页面内容外，构建流程也保持自动处理：

- 资源版本参数注入（CSS/JS/图片引用自动带 `?v=...`）
- 自动生成 `sitemap.xml`
- 自动生成 `feed.xml`

```python
# build.py: 后处理链路（节选）
results.append(copy_assets())
results.append(copy_content_assets(force))
results.append(remove_unused_font_assets(SITE_DIR))

results.append(normalize_font_display(SITE_DIR))
results.append(extract_inline_images(SITE_DIR))
results.append(optimize_inline_images(SITE_DIR))
results.append(generate_responsive_images(SITE_DIR))
results.append(add_image_lazy_loading(SITE_DIR))

results.append(add_asset_versioning(SITE_DIR))
if site_url := get_site_url():
  results.append(generate_sitemap(site_url))
  results.append(generate_robots_txt(site_url))
  results.append(generate_rss(site_url))
```

== 4.8 优化记录

- 修复图片压缩问题：通过调整 Typst 文件中的 `#image` 调用，添加 `height: auto` 属性，确保图片比例正常。
- 修复 CSS 问题：覆盖全局 `max-height: 80vh` 规则，避免图片被垂直压缩。

```css
/* assets/tufted.css: 修复图片比例问题 */
img {
  height: auto;
  max-height: none; /* 覆盖全局规则 */
}
```

== 2026-05-17 优化记录（12:13 CST）

这次优化主要围绕“合并上游模板后的功能边界”做整理：保留上游带来的 Typst 原生能力，同时把本地构建脚本里已经重复或容易冲突的后处理拆开。

=== 合并上游分支后的同步整理

当前仓库保留了两个远端：

- `origin`: `https://github.com/CST-Cat/CST-Cat.github.io.git`
- `upstream`: `https://github.com/Yousa-Mirage/Tufted-Blog-Template.git`

本次同步后，主分支处在 `main`，并与 `origin/main` 对齐。上游模板带来的结构更新主要体现在 `tufted-lib`、前端资源和构建链路上，因此后续整理重点放在避免新旧逻辑同时处理同一类 HTML 属性。

=== 图片懒加载职责归位

合并上游后，`tufted-lib/figures.typ` 已经在 Typst HTML 输出阶段为图片写入：

```typst
html.img(
  src: it.source,
  alt: alt,
  loading: "lazy",
  decoding: "async",
  width: img-w,
  height: img-h,
)
```

因此 `build.py` 里旧的 `add_image_lazy_loading()` 后处理被删除，构建流程不再二次扫描 HTML 注入 `loading`、`decoding`、`fetchpriority`。这样懒加载成为模板默认能力，也避免 Python 后处理覆盖 Typst 已经确定好的图片语义。

=== 多尺寸图片脚本独立

响应式图片生成仍然保留，但从 `build.py` 中抽成独立脚本：

```text
scripts/generate_responsive_images.py
```

`build.py` 现在只负责调用脚本：

```python
results.append(generate_responsive_images(SITE_DIR))
```

这样构建主流程更清晰：Typst 负责原始 HTML 和图片基础属性，独立脚本负责生成 WebP 与 `srcset`/`sizes`，资源版本化仍然在最后统一处理。

=== width/height 保护

旧逻辑会无条件用原图尺寸覆盖 `<img>` 上已有的 `width` 和 `height`。这在合并上游后会和 Typst 原生输出冲突，尤其是模板已经根据 `#image(width: ...)` 推导出尺寸时。

新脚本改成只在下面两种情况下补齐尺寸：

- `width` 或 `height` 缺失
- `width` 或 `height` 明显是 `0`

如果只缺一边，则按原图比例推导另一边；如果 Typst 已经写好了有效尺寸，就保持不动。

=== 相对路径 bug 修复

旧版 `generate_responsive_images()` 在处理无目录相对路径时，会把：

```html
<img src="miku.png">
```

错误拼成类似：

```html
srcset="miku.png/miku-w480.webp 480w, ..."
```

这次抽脚本时顺手修复为同级文件路径：

```html
src="miku.webp"
srcset="miku-w480.webp 480w, miku-w768.webp 768w, ..."
```

同时也验证了根路径形式（如 `/miku.png`）会生成 `/miku-w480.webp`，不会把文件名当成目录。

=== 验证记录

本次修改后做了三类验证：

- `python -m py_compile build.py scripts/generate_responsive_images.py`：语法检查通过
- `uv run build.py build --force`：全量构建通过
- `uv run build.py build`：增量构建通过

强制构建后 `_site` 里不再因为旧增量产物残留而保留 Python 注入的 `fetchpriority="low"`；如果以后模板级图片逻辑有大改，建议优先跑一次 `uv run build.py build --force`，避免本地预览混入旧 HTML。

== 2026-05-17 优化补充记录（未构建）

本轮在不触发构建脚本的前提下，完成了以下收尾：

- `CarModels` 图片路径由 `/content/Vault/CarModels/imgs/...` 统一改为 `imgs/...`。
- 首屏第一张图改为 `#tufted.priority-image(...)`，输出 `loading="eager"` 与 `fetchpriority="high"`。
- 新增 `tufted.priority-image` helper，用于首屏高优先级图片声明。
- `scripts/generate_responsive_images.py` 增加跳过规则：小图、过矮图、超长条图不生成响应式 WebP 变体。
- `build.py` 新增 `check` 命令与 `check_image_paths()`，用于拦截 `#image("/content/...")` 路径。
- 完整构建入口接入图片路径检查，检查失败即中断流程。

已完成轻量验证：

- `python -m py_compile build.py scripts/generate_responsive_images.py` 通过。
- `python build.py check` 通过。
- `rg` 复查未发现 `#image("/content/...")`。

未执行项：

- 按约束未运行 `build.py build/html/preview`，因此“真实构建验证”仍待后续确认。




