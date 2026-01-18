#import "../../index.typ": template, tufted
#show: template.with(title: "番茄钟")

#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/pomodoro.css"))
#html.elem("script", attrs: (src: "/assets/pomodoro.js", defer: "true"))[]

= Pomodoro

#tufted.margin-note[
  *考研倒计时* \
  #html.span(id: "countdown-app")[]
]

#tufted.margin-note[
  *快捷键*\
  空格：开始/暂停\
  R：重置
]

#html.div(id: "pomodoro-app")[]




