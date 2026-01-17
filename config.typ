#import "tufted-lib/tufted.typ" as tufted

#let template = tufted.tufted-web.with(
  // 你可以在 header-links 中修改网站上方的导航栏都包含哪些页面
  // 例如，如果你想添加一个 Entry 页，你需要添加 `"/Entry/": "Entry"`
  // 然后在 `content/` 路径中新建 `Entry/`路径，在其中添加 `index.typ` 作为 Entry 页的内容
  header-links: (
    "/": "Home",
    "/Politics/": "Politics",
    "/English/": "English",
    "/Math/": "Math",
    "/408/": "408",
  ),
  lang: "zh",
  title: "小猫の小窝", // 你的网站在浏览器中显示的标题

  // 自定义 header 和 footer 元素
  // 数组格式，可以添加任意数量的内容，内容之间使用换行分隔
  header-elements: (
    [你好Ciallo～(∠・ω< )⌒☆],
    [我是工仔小猫],
  ),
  footer-elements: (
    "© 2026 CST-Cat",
    [Powered by #link("https://github.com/Yousa-Mirage/Tufted-Blog-Template")[Tufted-Blog-Template]],
  ),
)
