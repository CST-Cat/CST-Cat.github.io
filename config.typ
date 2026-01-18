#import "tufted-lib/tufted.typ" as tufted

#let template = tufted.tufted-web.with(
  // 你可以在 header-links 中修改网站上方的导航栏都包含哪些页面
  // 例如，如果你想添加一个 Entry 页，你需要添加 `"/Entry/": "Entry"`
  // 然后在 `content/` 路径中新建 `Entry/`路径，在其中添加 `index.typ` 作为 Entry 页的内容
  header-links: (
    "/": "Home",
    "/Notes/": "Notes",
    "/Weekly/": "Weekly",
    "/Projects/": "Projects",
    "/Tools/": "Tools",
    "/Docs/": "Docs",
  ),
  lang: "zh",
  title: "小猫の小窝", // 你的网站在浏览器中显示的标题

  // 自定义样式
  css: (
    "/assets/fonts.css",
    "https://cdnjs.cloudflare.com/ajax/libs/tufte-css/1.8.0/tufte.min.css",
    "/assets/tufted.css",
    "/assets/theme.css",
    "/assets/custom.css",
  ),

  // 自定义脚本
  js-scripts: (
    "/assets/code-blocks.js",
    "/assets/format-headings.js",
    "/assets/theme-toggle.js",
  ),

  // 自定义 header 和 footer 元素
  // 数组格式，可以添加任意数量的内容，内容之间使用换行分隔
  header-elements: (
    [Ciallo～(∠・ω< )⌒☆],
  ),
  footer-elements: (
    "© 2026 CST-Cat",
    [Powered by #link("https://github.com/Yousa-Mirage/Tufted-Blog-Template")[Tufted-Blog-Template]],
  ),
)
