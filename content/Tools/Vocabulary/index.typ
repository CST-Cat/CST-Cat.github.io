#import "../../index.typ": template, tufted
#show: template.with(title: "Vocabulary Drill")

// CSS 文件
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/vocabulary.css"))
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/todo.css"))
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/data-manager.css"))

// 必需脚本
#html.elem("script", attrs: (src: "/assets/indexeddb-helper.js"))[]
#html.elem("script", attrs: (src: "/assets/timer-manager.js"))[]
#html.elem("script", attrs: (src: "/assets/todo.js", defer: ""))[]
#html.elem("script", attrs: (src: "/assets/vocabulary.js", defer: ""))[]
#html.elem("script", attrs: (src: "/assets/data-manager.js", defer: ""))[]

= Vocabulary Drill

#tufted.margin-note[
  *单词学习* \
  #html.span(id: "vocab-sidebar")[]
]

#tufted.margin-note(class: "todo-margin-note")[
  *待办事项* \
  #html.span(id: "todo-app")[]
]

#tufted.margin-note(class: "data-management-margin-note")[
  *数据管理* \
  #html.span(id: "data-management-app")[]
]

// 主学习区域
#html.div(id: "vocab-app")[]

