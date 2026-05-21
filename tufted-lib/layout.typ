// TODO: figures and figures with captions inside margin notes

#let margin-note(content) = {
  html.span(class: "marginnote", content)
}

// 原始 HTML img 标签，用于图床/外部图片
// 不会将图片嵌入 HTML，保持远程链接
// 
// 用法：
// #html.img(src: "https://xxx.com/image.jpg", alt: "描述")
// #html.img(src: "https://xxx.com/image.jpg", style: "width: 100%; height: auto;")
#let html-img(
  src,
  alt: none,
  style: none,
) = {
  html.img(src: src, alt: alt, style: style)
}

// 首屏关键图可显式使用 eager/fetchpriority。
#let priority-image(
  src,
  alt: "",
  width: none,
  height: none,
  style: none,
) = {
  let attrs = (
    src: src,
    alt: alt,
    loading: "eager",
    decoding: "async",
    fetchpriority: "high",
  )
  if width != none {
    attrs.insert("width", width)
  }
  if height != none {
    attrs.insert("height", height)
  }
  if style != none {
    attrs.insert("style", style)
  }

  html.img(..attrs)
}

// TODO: implement <figure class="fullwidth">
// possible requires introspection or `set html.figure(class: "fullwidth")` support

#let full-width(content) = {
  html.div(class: "fullwidth", content)
}
