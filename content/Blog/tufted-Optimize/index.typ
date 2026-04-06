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

今天集中做了一轮站点性能和体验优化，这里做一份完整记录，方便后续复盘和回滚。

== 今日优化总览

- 图片链路优化：抽离内联图片、压缩、响应式、多端懒加载
- 字体链路优化：接入国内可用 CDN，移除 STKaiti
- 首屏体验优化：加入 Font Loading API，字体就绪后淡入
- 构建后处理：资源版本号、Sitemap、RSS 保持自动化

== 1) 抽离图片与图片链路优化

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

== 2) 字体链路优化（CDN + 移除 STKaiti）

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

== 3) 首屏字体体验：Font Loading API + 淡入

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

== 4) 构建后处理与发布稳定性

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



