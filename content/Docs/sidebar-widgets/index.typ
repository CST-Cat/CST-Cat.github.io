#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(title: "侧栏小组件开发指南")

= 侧栏小组件开发指南

本文档详细说明如何在 Tufted 主题的侧栏（margin-note）中嵌入交互式小组件。

#html.hr()

== 核心概念：Tufted 侧栏工作原理

=== 什么是 `margin-note`？

`margin-note` 是 Tufted 主题提供的侧边栏功能，用于在页面右侧显示补充信息。

```typst
#tufted.margin-note[
  *标题* \
  内容
]
```

这会在页面右侧创建一个浮动的侧边栏区域。

#tufted.margin-note[
  *提示* \
  侧栏内容会自动跟随正文位置显示。
]

#html.hr()

== 插入动态组件的完整流程

=== 数据流向图

```
Typst 文件 (index.typ)
    ↓ 编译
HTML 文件 (index.html)
    ├─ <span id="vocab-sidebar"></span>
    ├─ <span id="countdown-app"></span>
    └─ <span id="todo-app"></span>
    ↓ 页面加载
JavaScript 执行
    ├─ initVocabSidebar() → 填充 vocab-sidebar
    ├─ initCountdown()    → 填充 countdown-app
    └─ initTodo()         → 填充 todo-app
    ↓
最终页面显示
```

#tufted.margin-note[
  *工作流程* \
  Typst 创建容器 → JavaScript 填充内容 → CSS 定义样式
]

=== 架构概览

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Typst 模板     │ ──▶ │   JavaScript    │ ──▶ │      CSS       │
│  创建 HTML 容器  │     │  动态填充内容    │     │   定义样式      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#table(
  columns: 3,
  [*层级*], [*文件示例*], [*作用*],
  [模板层], [`content/Tools/Vocabulary/index.typ`], [创建带 id 的空 HTML 容器],
  [逻辑层], [`assets/vocabulary.js`], [检测容器并动态生成界面],
  [样式层], [`assets/vocabulary.css`], [定义组件外观],
)

#html.hr()

== 详细实现步骤

=== 步骤 1：在 Typst 中创建容器

==== 1.1 引入 CSS 和 JS 文件

在 `.typ` 文件顶部：

```typst
#import "../../index.typ": template, tufted
#show: template.with(title: "页面标题")

// 引入 CSS
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/your-widget.css"))

// 引入 JavaScript
#html.elem("script", attrs: (src: "/assets/your-widget.js", defer: ""))[]
```

#tufted.margin-note[
  *资源引入* \
  CSS 使用 `html.elem("link")`，JS 使用 `html.elem("script")`。
]

==== 1.2 创建侧栏容器

#tip-box[
  *正确做法：每个功能使用独立的 `margin-note`*
]

```typst
// 第一个侧栏
#tufted.margin-note[
  *单词学习* \
  #html.span(id: "vocab-sidebar")[]
]

// 第二个侧栏
#tufted.margin-note[
  *考研倒计时* \
  #html.span(id: "countdown-app")[]
]

// 第三个侧栏
#tufted.margin-note(class: "todo-margin-note")[
  *待办事项* \
  #html.span(id: "todo-app")[]
]
```

#warning-box[
  *错误做法：把多个组件塞进一个 `margin-note`*
  
  不要这样做：
  ```typst
  #tufted.margin-note[
    *单词学习* \
    #html.span(id: "vocab-sidebar")[]
    // 然后在 JavaScript 中把倒计时和待办清单也塞进 vocab-sidebar
  ]
  ```
]

#important-box[
  *重要说明：*
  - 每个功能使用 *独立的 `margin-note`*
  - 不要把多个组件塞进同一个 `margin-note`
  - 使用 `html.span()` 而非 `html.div()`（保持有效 HTML 嵌套）
  - `id` 属性是 JavaScript 定位容器的关键
]

#html.hr()

=== 步骤 2：JavaScript 填充内容

==== 2.1 基本模板

```javascript
(function () {
    'use strict';

    // 根据 DOM 加载状态决定何时初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initYourWidget();
    }

    function initYourWidget() {
        // 1. 找到容器
        const container = document.getElementById('your-widget-app');
        if (!container) return;  // 容器不存在则跳过

        // 2. 检测是否在侧栏中（可选）
        const isInSidebar = container.closest('.marginnote') !== null;

        // 3. 生成 HTML（使用 span 保持有效嵌套）
        container.innerHTML = `
            <span class="widget-wrapper">
                <span class="widget-header">标题</span>
                <span class="widget-content">内容</span>
            </span>
        `;

        // 4. 添加事件监听
        const button = container.querySelector('.widget-button');
        if (button) {
            button.addEventListener('click', handleClick);
        }
    }

    function handleClick() {
        console.log('按钮被点击');
    }
})();
```

#tufted.margin-note[
  *关键点* \
  使用 IIFE 包裹代码，避免全局变量污染。
]

==== 2.2 关键点说明

#tip-box[
  *正确做法：每个函数管理自己的容器*
]

```javascript
function initVocabSidebar() {
    const container = document.getElementById('vocab-sidebar');
    if (!container) return;
    container.innerHTML = `<span>单词学习内容</span>`;
}

function initCountdown() {
    const container = document.getElementById('countdown-app');
    if (!container) return;
    container.innerHTML = `<span>倒计时内容</span>`;
}

function initTodo() {
    const container = document.getElementById('todo-app');
    if (!container) return;
    container.innerHTML = `<span>待办清单内容</span>`;
}

// 在 init() 中调用
function init() {
    initVocabSidebar();
    initCountdown();
    initTodo();
}
```

#warning-box[
  *错误做法：把所有内容塞进一个容器*
  
  ```javascript
  function initVocabSidebar() {
      const container = document.getElementById('vocab-sidebar');
      container.innerHTML = `
          <span>单词学习内容</span>
          <span id="countdown-app">倒计时内容</span>  // 破坏布局
          <span id="todo-app">待办清单内容</span>     // 破坏布局
      `;
  }
  ```
  
  *为什么错误？*
  - 破坏了 Tufted 的侧栏布局系统
  - 倒计时和待办清单被塞进"单词学习"这个侧栏里
  - 导致排版混乱，无法独立控制
]

#html.hr()

=== 步骤 3：CSS 样式

==== 3.1 让 `span` 表现为块级元素

```css
/* 使用主题变量 */
:root {
    --fg: var(--theme-text);
    --bg: var(--theme-bg);
    --fg-muted: var(--theme-copy-btn-text);
    --bg-offset: var(--theme-code-bg);
}

/* 容器样式 */
.widget-wrapper {
    display: block;          /* span 表现为 block */
    text-align: left;
    margin-top: 0.6rem;
    width: 100%;
    font-family: 'AnthropicSans', 'NotoSansSC', sans-serif;
    color: var(--theme-margin-text);
}

/* 子元素也使用 block */
.widget-header {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.widget-content {
    display: block;
    font-size: 0.85rem;
}
```

#tufted.margin-note[
  *主题变量* \
  使用 CSS 变量确保深色/浅色主题兼容。
]

==== 3.2 侧栏特定样式

```css
/* 在侧栏中的特殊样式 */
.marginnote .widget-wrapper {
    /* 侧栏中的紧凑布局 */
}

/* 为不同侧栏添加间距 */
.todo-margin-note {
    margin-top: 1.5rem !important;
}
```

#html.hr()

== 完整示例：Vocabulary 页面

=== 文件结构

```
content/Tools/Vocabulary/
  └── index.typ          # Typst 模板

assets/
  ├── vocabulary.js      # 单词学习逻辑
  ├── vocabulary.css     # 单词学习样式
  ├── pomodoro-todo.js   # 倒计时和待办清单逻辑
  └── pomodoro-todo.css  # 倒计时和待办清单样式
```

#tufted.margin-note[
  *目录结构* \
  模板文件在 `content/`，资源文件在 `assets/`。
]

=== index.typ

```typst
#import "../../index.typ": template, tufted
#show: template.with(title: "Vocabulary Drill")

// CSS 文件
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/vocabulary.css"))
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/pomodoro-todo.css"))

// JavaScript 文件
#html.elem("script", attrs: (src: "/assets/pomodoro-todo.js", defer: ""))[]
#html.elem("script", attrs: (src: "/assets/vocabulary.js", defer: ""))[]

= Vocabulary Drill

// 侧栏 1：单词学习统计
#tufted.margin-note[
  *单词学习* \
  #html.span(id: "vocab-sidebar")[]
]

// 侧栏 2：考研倒计时
#tufted.margin-note[
  *考研倒计时* \
  #html.span(id: "countdown-app")[]
]

// 侧栏 3：待办事项
#tufted.margin-note(class: "todo-margin-note")[
  *待办事项* \
  #html.span(id: "todo-app")[]
]

// 主内容区域
#html.div(id: "vocab-app")[]
```

=== vocabulary.js（简化版）

```javascript
(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initVocabSidebar();
    }

    function initVocabSidebar() {
        const container = document.getElementById('vocab-sidebar');
        if (!container) return;

        container.innerHTML = `
            <span class="vocab-sidebar-wrapper">
                <span class="vocab-progress-section">
                    <span class="vocab-progress-label">今日进度</span>
                    <span class="vocab-progress-bar">
                        <span class="vocab-progress-fill" style="width: 35%"></span>
                    </span>
                    <span class="vocab-progress-text">7/20 词</span>
                </span>
            </span>
        `;
    }
})();
```

=== pomodoro-todo.js（简化版）

```javascript
(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initCountdown();
        initTodo();
    }

    function initCountdown() {
        const container = document.getElementById('countdown-app');
        if (!container) return;

        container.innerHTML = `
            <span class="countdown-compact">
                <span class="countdown-value">331</span>
                <span class="countdown-unit">天</span>
                <span class="countdown-value">14</span>
                <span class="countdown-unit">时</span>
            </span>
        `;
    }

    function initTodo() {
        const container = document.getElementById('todo-app');
        if (!container) return;

        container.innerHTML = `
            <span class="todo-wrapper">
                <span class="todo-input-group">
                    <input type="text" id="new-todo" placeholder="To-do...">
                    <button id="add-todo-btn">+</button>
                </span>
                <span id="todo-list"></span>
            </span>
        `;
    }
})();
```

#html.hr()

== 常见问题

=== Q1: 为什么要用 `span` 而不是 `div`？

*A:* `margin-note` 内部是 `<span>` 元素，HTML 规范要求 `<span>` 内只能包含行内元素（phrasing content）。使用 `<div>` 会导致无效的 HTML 嵌套。

*解决方案：* 使用 `<span>` + CSS `display: block` 模拟块级元素。

```css
.widget-wrapper {
    display: block;  /* span 表现为 block */
}
```

#tufted.margin-note[
  *HTML 规范* \
  行内元素不能包含块级元素。
]

#html.hr()

=== Q2: 为什么不能把多个组件放在一个 `margin-note` 里？

*A:* 每个 `margin-note` 是一个独立的浮动块，Tufted 会自动处理它们的垂直排列。如果把多个组件塞进一个 `margin-note`，会破坏布局系统。

#caution-box[
  *错误示例：*
  ```typst
  #tufted.margin-note[
    *单词学习* \
    #html.span(id: "vocab-sidebar")[]
  ]
  ```
  
  然后在 JavaScript 中：
  ```javascript
  container.innerHTML = `
      <span>单词学习...</span>
      <span id="countdown-app">倒计时...</span>  // 破坏布局
      <span id="todo-app">待办...</span>         // 破坏布局
  `;
  ```
]

#tip-box[
  *正确做法：* 每个功能使用独立的 `margin-note`。
  
  ```typst
  #tufted.margin-note[*单词学习* \ #html.span(id: "vocab-sidebar")[]]
  #tufted.margin-note[*考研倒计时* \ #html.span(id: "countdown-app")[]]
  #tufted.margin-note[*待办事项* \ #html.span(id: "todo-app")[]]
  ```
]

#html.hr()

=== Q3: 如何让组件在不同页面共享？

*A:* 
+ 将 JavaScript 和 CSS 放在 `assets/` 目录
+ 在每个需要的页面的 `.typ` 文件中引入
+ 确保每个页面都有对应的 HTML 容器（`#html.span(id: "...")`）

*示例：*

在 `content/Tools/Vocabulary/index.typ` 中：
```typst
#html.elem("script", attrs: (src: "/assets/pomodoro-todo.js", defer: ""))[]
#tufted.margin-note[*考研倒计时* \ #html.span(id: "countdown-app")[]]
```

在 `content/Tools/Pomodoro/index.typ` 中：
```typst
#html.elem("script", attrs: (src: "/assets/pomodoro-todo.js", defer: ""))[]
#tufted.margin-note[*考研倒计时* \ #html.span(id: "countdown-app")[]]
```

两个页面共享同一个 JavaScript 文件，数据也会同步（通过 `localStorage`）。

#tufted.margin-note[
  *数据同步* \
  使用 `localStorage` 实现跨页面数据共享。
]

#html.hr()

=== Q4: 数据如何在页面间同步？

*A:* 使用 `localStorage` 存储数据：

```javascript
// 保存数据
localStorage.setItem('my_data', JSON.stringify(data));

// 读取数据
const data = JSON.parse(localStorage.getItem('my_data') || '[]');
```

所有页面共享同一个 `localStorage`，数据自动同步。

*示例：待办清单数据同步*

```javascript
// 在页面 A 添加待办
const todos = [{ text: '学习单词', completed: false }];
localStorage.setItem('pomodoro_todos', JSON.stringify(todos));

// 在页面 B 读取待办
const todos = JSON.parse(localStorage.getItem('pomodoro_todos') || '[]');
console.log(todos);  // [{ text: '学习单词', completed: false }]
```

#html.hr()

== 现有组件参考

=== 1. 考研倒计时 (`countdown-app`)

*位置：* `assets/pomodoro-todo.js`

*功能：*
- 显示距离目标日期的 天/时/分/秒
- 每秒自动更新
- 侧栏内使用紧凑布局

*Typst 用法：*
```typst
#tufted.margin-note[
  *考研倒计时* \
  #html.span(id: "countdown-app")[]
]
```

*修改目标日期：*
在 JavaScript 中找到：
```javascript
const examDate = new Date('2026-12-19T08:30:00');
```

#tufted.margin-note[
  ⏰ *倒计时组件* \
  可自定义目标日期和显示格式。
]

#html.hr()

=== 2. 待办事项 (`todo-app`)

*位置：* `assets/pomodoro-todo.js`

*功能：*
- 输入框 + 添加按钮
- 点击复选框切换完成状态
- 支持子待办、分组、拖拽排序
- 使用 `localStorage` 持久化数据

*Typst 用法：*
```typst
#tufted.margin-note(class: "todo-margin-note")[
  *待办事项* \
  #html.span(id: "todo-app")[]
]
```

*数据存储：*
- `pomodoro_todos` - 待办列表
- `pomodoro_groups` - 分组信息

#html.hr()

=== 3. 单词学习统计 (`vocab-sidebar`)

*位置：* `assets/vocabulary.js`

*功能：*
- 显示今日进度、本周统计
- 数据导出/导入
- 与词库学习联动

*Typst 用法：*
```typst
#tufted.margin-note[
  *单词学习* \
  #html.span(id: "vocab-sidebar")[]
]
```

#html.hr()

== 添加新组件的快速模板

=== 1. 创建 JavaScript 文件

`assets/my-widget.js`:

```javascript
(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initMyWidget();
    }

    function initMyWidget() {
        const container = document.getElementById('my-widget-app');
        if (!container) return;

        container.innerHTML = `
            <span class="my-widget-wrapper">
                <span class="my-widget-content">Hello World!</span>
            </span>
        `;
    }
})();
```

=== 2. 创建 CSS 文件

`assets/my-widget.css`:

```css
:root {
    --fg: var(--theme-text);
    --bg: var(--theme-bg);
}

.my-widget-wrapper {
    display: block;
    text-align: left;
    margin-top: 0.6rem;
    width: 100%;
}

.my-widget-content {
    display: block;
    font-size: 0.9rem;
    color: var(--fg);
}
```

=== 3. 在 Typst 中使用

`content/YourPage/index.typ`:

```typst
#import "../../index.typ": template, tufted
#show: template.with(title: "Your Page")

// 引入资源
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/my-widget.css"))
#html.elem("script", attrs: (src: "/assets/my-widget.js", defer: ""))[]

= Your Page

// 侧栏组件
#tufted.margin-note[
  *My Widget* \
  #html.span(id: "my-widget-app")[]
]

// 主内容
#html.div(id: "main-content")[]
```

=== 4. 构建并预览

```bash
python build.py build
python build.py preview
```

#tufted.margin-note[
  *开发流程* \
  修改后重新构建，使用 preview 模式实时查看效果。
]

#html.hr()

== 注意事项

=== 1. HTML 嵌套有效性
- `margin-note` 内部是 `<span>`，子元素必须是行内元素
- 使用 `span` + `display: block` CSS 模拟块级元素

=== 2. 独立的 margin-note
- 每个功能使用独立的 `margin-note`
- 不要把多个组件塞进同一个 `margin-note`

=== 3. JavaScript 初始化顺序
- 确保 DOM 加载完成后再初始化
- 使用 `DOMContentLoaded` 事件或检查 `document.readyState`

=== 4. 主题兼容
- 使用 CSS 变量 `--theme-text`, `--theme-bg` 等
- 支持深色/浅色主题自动切换

=== 5. 数据持久化
- 使用 `localStorage` 存储数据
- 所有页面共享同一个 `localStorage`

=== 6. 构建流程
- 修改后运行 `python build.py build` 重新构建
- 或使用 `python build.py preview` 开发模式实时预览

#html.hr()

== 相关文档

- #link("../side-by-side/")[图文并排布局指南]
- #link("../typst-syntax-demo/")[Typst 语法演示模板]
- #link("../website-config/")[网站配置]

#html.hr()

_本文档最后更新：2026-01-22_ \
_版本：2.0.0_ \
_作者：Kiro AI Assistant_
