# 侧栏小组件开发指南

本文档说明如何在 Tufted 主题的侧栏（margin-note）中嵌入交互式小组件，如倒计时、待办事项等。

## 架构概览

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Typst 模板     │ ──▶ │   JavaScript    │ ──▶ │      CSS       │
│  创建 HTML 容器  │     │  动态填充内容    │     │   定义样式      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

| 层级 | 文件示例 | 作用 |
|------|----------|------|
| 模板层 | `content/Tools/Pomodoro/index.typ` | 创建带 id 的空 HTML 容器 |
| 逻辑层 | `assets/pomodoro.js` | 检测容器并动态生成界面 |
| 样式层 | `assets/pomodoro.css` | 定义组件外观 |

---

## 实现步骤

### 第一步：在 Typst 中创建占位符

在 `.typ` 文件顶部引入 CSS 和 JS：

```typst
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/your-widget.css"))
#html.elem("script", attrs: (src: "/assets/your-widget.js", defer: "true"))[]
```

在侧栏中创建空容器：

```typst
#tufted.margin-note[
  *小组件标题* \
  #html.span(id: "your-widget-app")[]
]
```

**重要说明：**
- 使用 `html.span()` 而非 `html.div()`，因为 `margin-note` 内部是 `<span>`，需保持有效 HTML 嵌套
- `id` 属性是 JavaScript 定位容器的关键

---

### 第二步：JavaScript 动态填充

基本模板：

```javascript
(function () {
    'use strict';

    // 页面加载后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initYourWidget();
    }

    function initYourWidget() {
        const container = document.getElementById('your-widget-app');
        if (!container) return;  // 容器不存在则跳过

        // 检测是否在侧栏中（可选，用于自适应布局）
        const isInSidebar = container.closest('.marginnote') !== null;

        // 动态生成 HTML
        // 注意：使用 span 代替 div/li 保持有效嵌套
        container.innerHTML = `
            <span class="widget-wrapper">
                <span class="widget-content">你的内容</span>
            </span>
        `;

        // 添加事件监听、定时器等交互逻辑
    }
})();
```

---

### 第三步：CSS 样式

关键技巧 —— 让 `span` 表现为块级元素：

```css
.widget-wrapper {
    display: block;          /* span 表现为 block */
    text-align: left;
    margin-top: 0.5rem;
    width: 100%;
}

/* 使用主题变量保持风格一致 */
:root {
    --fg: var(--theme-text);
    --bg: var(--theme-bg);
    --fg-muted: var(--theme-copy-btn-text);
}
```

---

## 现有组件参考

### 1. 考研倒计时 (`countdown-app`)

**位置：** `assets/pomodoro.js` 第 203-275 行

**功能：**
- 显示距离目标日期的 天/时/分/秒
- 每秒自动更新
- 侧栏内使用紧凑布局

**Typst 用法：**
```typst
#tufted.margin-note[
  *考研倒计时* \
  #html.span(id: "countdown-app")[]
]
```

**修改目标日期：**
在 `pomodoro.js` 中找到：
```javascript
const examDate = new Date('2026-12-19T08:30:00');
```

---

### 2. 待办事项 (`todo-app`)

**位置：** `assets/pomodoro.js` 第 278-362 行

**功能：**
- 输入框 + 添加按钮
- 点击复选框切换完成状态
- 悬停显示删除按钮
- 使用 `localStorage` 持久化数据（key: `pomodoro_todos`）

**Typst 用法：**
```typst
#tufted.margin-note[
  *待办事项* \
  #html.span(id: "todo-app")[]
]
```

---

### 3. 番茄钟 (`pomodoro-app`)

**位置：** `assets/pomodoro.js` 第 21-199 行

**功能：**
- 25/5/15 分钟模式切换
- 开始/暂停/重置
- 完成时播放提示音
- 统计今日番茄数和总专注分钟（localStorage 持久化）
- 快捷键：空格=开始/暂停，R=重置

**Typst 用法（主区域，非侧栏）：**
```typst
#html.div(id: "pomodoro-app")[]
```

---

## 数据持久化

所有组件使用 `localStorage` 存储数据：

| Key | 用途 |
|-----|------|
| `pomodoro_todos` | 待办事项列表 (JSON 数组) |
| `pomodoro_todayCount` | 今日完成的番茄数 |
| `pomodoro_totalMinutes` | 累计专注分钟数 |
| `pomodoro_lastDate` | 上次使用日期（用于重置每日计数） |

---

## 添加新组件的快速模板

### 1. 创建文件

如果是独立功能，创建新的 JS/CSS 文件：
- `assets/your-widget.js`
- `assets/your-widget.css`

如果功能相关，可以直接添加到 `pomodoro.js` 和 `pomodoro.css`。

### 2. JS 初始化函数

在 `init()` 中添加调用：

```javascript
function init() {
    initPomodoro();
    initCountdown();
    initTodo();
    initYourWidget();  // 添加这行
}
```

### 3. Typst 中使用

```typst
// 引入资源（如果是新文件）
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/your-widget.css"))
#html.elem("script", attrs: (src: "/assets/your-widget.js", defer: "true"))[]

// 侧栏组件
#tufted.margin-note[
  *组件标题* \
  #html.span(id: "your-widget-app")[]
]

// 或主区域组件
#html.div(id: "your-widget-app")[]
```

---

## 注意事项

1. **HTML 嵌套有效性**
   - `margin-note` 内部是 `<span>`，子元素必须是行内元素
   - 使用 `span` + `display: block` CSS 模拟块级元素

2. **自适应布局**
   - 使用 `container.closest('.marginnote')` 检测是否在侧栏
   - 侧栏内使用紧凑布局，主区域使用完整布局

3. **主题兼容**
   - 使用 CSS 变量 `--theme-text`, `--theme-bg` 等
   - 支持深色/浅色主题自动切换

4. **构建流程**
   - 修改后运行 `build.bat` 重新构建
   - 或使用 `dev.bat` 开发模式实时预览
