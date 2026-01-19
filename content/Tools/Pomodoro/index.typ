#import "../../index.typ": template, tufted
#show: template.with(title: "番茄钟")

#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/pomodoro-todo.css"))
#html.elem("script", attrs: (src: "/assets/pomodoro-todo.js", defer: "true"))[]

= Pomodoro-Todo

#tufted.margin-note[
  *考研倒计时* \
  #html.span(id: "countdown-app")[]
]

#tufted.margin-note(class: "todo-margin-note")[
  *待办事项* \
  #html.span(id: "todo-app")[]
]

#html.div(id: "pomodoro-app")[]




