# 待办清单使用示例

## 场景 1：仅使用待办清单

如果你只需要待办清单功能，不需要番茄钟和倒计时：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>我的待办清单</title>
    
    <!-- 基础样式 -->
    <link rel="stylesheet" href="assets/theme.css">
    <link rel="stylesheet" href="assets/fonts.css">
    
    <!-- 仅引入待办清单样式 -->
    <link rel="stylesheet" href="assets/todo.css">
</head>
<body>
    <h1>我的待办清单</h1>
    
    <!-- 待办清单容器 -->
    <div id="todo-app"></div>
    
    <!-- 仅引入待办清单脚本 -->
    <script src="assets/timer-manager.js"></script>
    <script src="assets/todo.js"></script>
</body>
</html>
```

**文件大小对比：**
- 使用完整版：`pomodoro-todo.js` (1709 行) + `pomodoro-todo.css` (1290 行)
- 使用独立版：`todo.js` (~1200 行) + `todo.css` (~800 行)
- **节省约 30% 的代码量**

---

## 场景 2：使用完整功能（番茄钟 + 倒计时 + 待办清单）

如果你需要所有功能：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>番茄钟工作站</title>
    
    <!-- 基础样式 -->
    <link rel="stylesheet" href="assets/theme.css">
    <link rel="stylesheet" href="assets/fonts.css">
    
    <!-- 引入完整样式 -->
    <link rel="stylesheet" href="assets/pomodoro-todo.css">
</head>
<body>
    <h1>番茄钟工作站</h1>
    
    <!-- 番茄钟 -->
    <div id="pomodoro-app"></div>
    
    <!-- 考研倒计时 -->
    <div id="countdown-app" data-target="2026-12-19T08:30:00"></div>
    
    <!-- 待办清单 -->
    <div id="todo-app"></div>
    
    <!-- 引入完整脚本 -->
    <script src="assets/timer-manager.js"></script>
    <script src="assets/pomodoro-todo.js"></script>
</body>
</html>
```

---

## 场景 3：在边栏中使用待办清单

在 Typst 文档的边栏（marginnote）中使用：

```typst
#import "@preview/tufted:0.1.0": *

#show: tufted.with(
  title: "我的笔记",
  // ... 其他配置
)

= 今日任务

#margin-note[
  #raw(lang: "html", block: true, ```
  <div id="todo-app"></div>
  <script src="/assets/timer-manager.js"></script>
  <script src="/assets/todo.js"></script>
  ```)
]

这是正文内容...
```

---

## 场景 4：多个独立的待办清单

如果需要在同一页面创建多个独立的待办清单：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>多待办清单</title>
    
    <link rel="stylesheet" href="assets/theme.css">
    <link rel="stylesheet" href="assets/fonts.css">
    <link rel="stylesheet" href="assets/todo.css">
    
    <style>
        .todo-section {
            margin-bottom: 3rem;
            padding: 1.5rem;
            border: 1px solid var(--theme-copy-btn-text);
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <h1>项目管理</h1>
    
    <div class="todo-section">
        <h2>工作任务</h2>
        <div id="todo-app-work"></div>
    </div>
    
    <div class="todo-section">
        <h2>个人事项</h2>
        <div id="todo-app-personal"></div>
    </div>
    
    <script src="assets/timer-manager.js"></script>
    <script>
        // 修改 todo.js 以支持多实例
        // 或者使用不同的 localStorage 键名
    </script>
    <script src="assets/todo.js"></script>
</body>
</html>
```

**注意：** 当前版本的 `todo.js` 只支持单个实例。如需多实例支持，需要修改代码以接受配置参数。

---

## 场景 5：自定义样式

覆盖默认样式以匹配你的设计：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>自定义待办清单</title>
    
    <link rel="stylesheet" href="assets/theme.css">
    <link rel="stylesheet" href="assets/fonts.css">
    <link rel="stylesheet" href="assets/todo.css">
    
    <style>
        /* 自定义颜色 */
        :root {
            --fg: #2c3e50;
            --bg: #ecf0f1;
            --fg-muted: #7f8c8d;
            --bg-offset: #d5dbdb;
        }
        
        /* 自定义待办项样式 */
        .todo-item {
            background: white;
            padding: 0.8rem;
            margin-bottom: 0.8rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        /* 自定义复选框 */
        .todo-checkbox {
            border-radius: 50%;
            border-width: 2px;
        }
        
        .todo-checkbox.checked {
            background: #27ae60;
            border-color: #27ae60;
        }
        
        /* 自定义分组样式 */
        .todo-group-item {
            background: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
    </style>
</head>
<body>
    <div id="todo-app"></div>
    
    <script src="assets/timer-manager.js"></script>
    <script src="assets/todo.js"></script>
</body>
</html>
```

---

## 场景 6：与其他框架集成

### React 示例

```jsx
import React, { useEffect } from 'react';

function TodoWidget() {
    useEffect(() => {
        // 动态加载样式
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/todo.css';
        document.head.appendChild(link);
        
        // 动态加载脚本
        const script = document.createElement('script');
        script.src = '/assets/todo.js';
        document.body.appendChild(script);
        
        return () => {
            // 清理
            document.head.removeChild(link);
            document.body.removeChild(script);
        };
    }, []);
    
    return <div id="todo-app"></div>;
}

export default TodoWidget;
```

### Vue 示例

```vue
<template>
    <div id="todo-app"></div>
</template>

<script>
export default {
    name: 'TodoWidget',
    mounted() {
        // 加载样式
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/assets/todo.css';
        document.head.appendChild(link);
        
        // 加载脚本
        const script = document.createElement('script');
        script.src = '/assets/todo.js';
        document.body.appendChild(script);
    }
}
</script>
```

---

## 数据操作示例

### 编程方式访问待办数据

```javascript
// 获取所有待办
const todos = JSON.parse(localStorage.getItem('pomodoro_todos') || '[]');
console.log('所有待办:', todos);

// 获取所有分组
const groups = JSON.parse(localStorage.getItem('pomodoro_groups') || '[]');
console.log('所有分组:', groups);

// 添加新待办（编程方式）
todos.push({
    text: '新任务',
    completed: false,
    children: [],
    groupId: 'default',
    dueDate: null
});
localStorage.setItem('pomodoro_todos', JSON.stringify(todos));

// 触发重新渲染
window.dispatchEvent(new Event('reinit-todo'));
```

### 导出数据

```javascript
function exportTodoData() {
    const data = {
        todos: JSON.parse(localStorage.getItem('pomodoro_todos') || '[]'),
        groups: JSON.parse(localStorage.getItem('pomodoro_groups') || '[]'),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}
```

### 导入数据

```javascript
function importTodoData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            localStorage.setItem('pomodoro_todos', JSON.stringify(data.todos));
            localStorage.setItem('pomodoro_groups', JSON.stringify(data.groups));
            window.dispatchEvent(new Event('reinit-todo'));
            alert('导入成功！');
        } catch (err) {
            alert('导入失败：' + err.message);
        }
    };
    reader.readAsText(file);
}
```

---

## 性能优化建议

1. **使用定时器管理器**
   ```html
   <script src="assets/timer-manager.js"></script>
   ```
   这会合并多个定时器，减少性能开销。

2. **延迟加载**
   ```javascript
   // 只在需要时加载待办清单
   document.getElementById('show-todo-btn').addEventListener('click', () => {
       const script = document.createElement('script');
       script.src = '/assets/todo.js';
       document.body.appendChild(script);
   });
   ```

3. **减少重渲染**
   - 待办清单已经使用 DocumentFragment 批量更新 DOM
   - 避免频繁调用 `renderTodos()`

---

## 常见问题

### Q: 如何更改 localStorage 键名？

A: 修改 `todo.js` 中的以下行：
```javascript
localStorage.getItem('pomodoro_todos')  // 改为你的键名
localStorage.getItem('pomodoro_groups') // 改为你的键名
```

### Q: 如何禁用某些功能？

A: 在 `todo.js` 中注释掉相应的代码，例如禁用拖拽：
```javascript
// 注释掉这些行
// li.draggable = true;
// li.ondragstart = ...
```

### Q: 如何支持多语言？

A: 将所有文本提取为变量：
```javascript
const i18n = {
    addTodo: 'Add Todo',
    editTodo: 'Edit',
    deleteTodo: 'Delete',
    // ...
};
```

---

## 总结

独立的待办清单模块提供了灵活的使用方式：

- ✓ 可以单独使用，减少代码量
- ✓ 可以与原有功能共存
- ✓ 易于集成到其他项目
- ✓ 支持自定义样式
- ✓ 数据可编程访问

根据你的需求选择合适的使用方式！
