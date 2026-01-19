// TODO: figures and figures with captions inside margin notes

#let margin-note(content, class: none) = {
  let classes = "marginnote"
  if class != none {
    classes = classes + " " + class
  }
  html.span(class: classes, content)
}

// TODO: implement <figure class="fullwidth">
// possible requires introspection or `set html.figure(class: "fullwidth")` support

#let full-width(content) = {
  html.div(class: "fullwidth", content)
}

// 图文并排布局
// position: "left" 表示图片在左，文字在右（默认）
// position: "right" 表示图片在右，文字在左
// ratio: 图片占比，可选 "small"(30%), "medium"(40%), "large"(50%), "half"(50%)
#let side-by-side(
  image-content,
  text-content,
  position: "left",
  ratio: "medium",
) = {
  // 根据 position 和 ratio 组合 class
  let base-class = "side-by-side"
  let pos-class = if position == "left" { "img-left" } else { "img-right" }
  let ratio-class = "ratio-" + ratio
  let combined-class = base-class + " " + pos-class + " " + ratio-class

  html.div(
    class: combined-class,
    {
      html.div(class: "side-by-side-img", image-content)
      html.div(class: "side-by-side-text", text-content)
    },
  )
}
