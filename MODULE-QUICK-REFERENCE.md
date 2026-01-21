# 模块快速参考卡

## 📦 可用模块列表

| 模块 | JS 文件 | CSS 文件 | 大小 | 用途 |
|------|---------|----------|------|------|
| **待办清单** | todo.js | todo.css | 79.7 KB | 任务管理 |
| **番茄钟** | pomodoro.js | pomodoro.css | 28.8 KB | 时间管理 |
| **倒计时** | countdown.js | countdown.css | 7.8 KB | 考试倒计时 |
| **单词学习** | vocabulary.js | vocabulary.css | - | 单词记忆 |
| **数据管理** | data-manager.js | data-manager.css | - | 数据操作 |
| **定时器管理** | timer-manager.js | - | - | 定时器优化 |
| **数据库助手** | indexeddb-helper.js | - | - | 数据存储 |

---

## 🎯 常用组合

### 组合 1：番茄钟完整版
**用途：** 时间管理 + 任务管理 + 考试倒计时

```typst
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/pomodoro.css"))
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/countdown.css"))
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/todo.css"))
#html.elem("script", attrs: (src: "/assets/timer-manager.js"))[]
#html.elem("script", attrs: (src: "/assets/pomodoro.js", defer: "true"))[]
#html.elem("script", attrs: (src: "/assets/countdown.js", defer: "true"))[]
#html.elem("script", attrs: (src: "/assets/todo.js", defer: "true"))[]
```

**容器：**
```typst
#html.div(id: "pomodoro-app")[]
#html.span(id: "countdown-app")[]
#html.span(id: "todo-app")[]
```

---

### 组合 2：单词学习完整版
**用途：** 单词学习 + 任务管理 + 数据管理

```typst
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/vocabulary.css"))
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/todo.css"))
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/data-manager.css"))
#html.elem("script", attrs: (src: "/assets/indexeddb-helper.js"))[]
#html.elem("script", attrs: (src: "/assets/timer-manager.js"))[]
#html.elem("script", attrs: (src: "/assets/todo.js", defer: ""))[]
#html.elem("script", attrs: (src: "/assets/vocabulary.js", defer: ""))[]
#html.elem("script", attrs: (src: "/assets/data-manager.js", defer: ""))[]
```

**容器：**
```typst
#html.div(id: "vocab-app")[]
#html.span(id: "todo-app")[]
#html.span(id: "data-management-app")[]
```

---

### 组合 3：纯待办清单
**用途：** 只需要任务管理

```typst
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/todo.css"))
#html.elem("script", attrs: (src: "/assets/todo.js", defer: "true"))[]
```

**容器：**
```typst
#html.div(id: "todo-app")[]
```

---

### 组合 4：纯番茄钟
**用途：** 只需要时间管理

```typst
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/pomodoro.css"))
#html.elem("script", attrs: (src: "/assets/timer-manager.js"))[]
#html.elem("script", attrs: (src: "/assets/pomodoro.js", defer: "true"))[]
```

**容器：**
```typst
#html.div(id: "pomodoro-app")[]
```

---

### 组合 5：纯倒计时
**用途：** 只需要考试倒计时

```typst
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/countdown.css"))
#html.elem("script", attrs: (src: "/assets/timer-manager.js"))[]
#html.elem("script", attrs: (src: "/assets/countdown.js", defer: "true"))[]
```

**容器：**
```typst
#html.span(id: "countdown-app", attrs: (data-target: "2026-12-19T08:30:00"))[]
```

---

## 🔧 模块依赖

```
必需依赖：
├── pomodoro.js → timer-manager.js
├── countdown.js → timer-manager.js
├── vocabulary.js → timer-manager.js + indexeddb-helper.js
└── todo.js → 无依赖 ✨

可选依赖：
└── data-manager.js → 无依赖 ✨
```

---

## 📝 容器 ID 对照表

| 模块 | 容器 ID | 必需 | 位置建议 |
|------|---------|------|----------|
| 番茄钟 | `pomodoro-app` | ✅ | 主体区域 |
| 倒计时 | `countdown-app` | ✅ | 边栏或主体 |
| 待办清单 | `todo-app` | ✅ | 边栏或主体 |
| 单词学习 | `vocab-app` | ✅ | 主体区域 |
| 单词边栏 | `vocab-sidebar` | ❌ | 边栏 |
| 数据管理 | `data-management-app` | ✅ | 边栏 |

---

## 🎨 边栏布局示例

### 番茄钟页面边栏

```typst
#tufted.margin-note[
  *考研倒计时* \
  #html.span(id: "countdown-app")[]
]

#tufted.margin-note(class: "todo-margin-note")[
  *待办事项* \
  #html.span(id: "todo-app")[]
]
```

### 单词学习页面边栏

```typst
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
```

---

## ⚙️ 自定义配置

### 倒计时目标日期

```typst
#html.span(id: "countdown-app", attrs: (data-target: "2027-06-07T09:00:00"))[]
```

### 边栏样式类

```typst
#tufted.margin-note(class: "todo-margin-note")[...]
#tufted.margin-note(class: "data-management-margin-note")[...]
```

---

## 🚀 快速开始

### 1. 创建新页面

```typst
#import "../../index.typ": template, tufted
#show: template.with(title: "我的页面")

// 引入需要的模块
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/todo.css"))
#html.elem("script", attrs: (src: "/assets/todo.js", defer: "true"))[]

= 我的页面

#html.div(id: "todo-app")[]
```

### 2. 构建网站

```bash
python build.py build
```

### 3. 预览网站

```bash
python build.py preview
```

---

## 📚 详细文档

- [待办清单模块](TODO-README.md)
- [倒计时模块](COUNTDOWN-EXTRACTION-SUMMARY.md)
- [模块化完整总结](MODULARIZATION-COMPLETE.md)
- [重构总结](REFACTORING-COMPLETE.md)

---

**最后更新：** 2026-01-21
