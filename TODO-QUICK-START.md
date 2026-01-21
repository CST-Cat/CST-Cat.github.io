# 待办清单快速开始

## 🚀 5 分钟上手

### 最简单的使用方式

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="assets/theme.css">
    <link rel="stylesheet" href="assets/fonts.css">
    <link rel="stylesheet" href="assets/todo.css">
</head>
<body>
    <div id="todo-app"></div>
    <script src="assets/timer-manager.js"></script>
    <script src="assets/todo.js"></script>
</body>
</html>
```

就这么简单！打开页面即可使用。

---

## 📁 文件清单

### 新创建的文件

| 文件 | 用途 | 必需？ |
|------|------|--------|
| `assets/todo.js` | 待办清单功能 | ✓ 是 |
| `assets/todo.css` | 待办清单样式 | ✓ 是 |
| `test-todo-standalone.html` | 测试页面 | ✗ 否 |
| `extract_todo.py` | 提取脚本 | ✗ 否 |

### 依赖文件

| 文件 | 用途 | 必需？ |
|------|------|--------|
| `assets/theme.css` | 主题变量 | ✓ 是 |
| `assets/fonts.css` | 字体样式 | ✓ 是 |
| `assets/timer-manager.js` | 定时器优化 | ✗ 否（推荐） |

---

## ⚡ 快速测试

1. 打开 `test-todo-standalone.html`
2. 开始使用！

---

## 🎯 核心功能

### 基础操作
- **添加待办**：在输入框输入后按回车或点击 + 按钮
- **完成待办**：点击复选框
- **编辑待办**：双击待办文字
- **删除待办**：点击 × 按钮或右键选择删除

### 高级功能
- **子待办**：点击待办右侧的 + 按钮
- **分组**：点击"分组"旁的 + 按钮创建新分组
- **拖拽排序**：拖动待办左侧的 ⋮⋮ 图标
- **截止时间**：右键点击待办，选择"添加截止时间"
- **右键菜单**：右键点击待办查看更多操作

---

## 📊 数据存储

数据自动保存在浏览器的 localStorage 中：

- `pomodoro_todos` - 待办列表
- `pomodoro_groups` - 分组列表

**注意：** 清除浏览器数据会删除待办清单！

---

## 🔄 与原版的关系

### 独立版 vs 完整版

| 特性 | 独立版 (todo.js) | 完整版 (pomodoro-todo.js) |
|------|-----------------|--------------------------|
| 待办清单 | ✓ | ✓ |
| 番茄钟 | ✗ | ✓ |
| 倒计时 | ✗ | ✓ |
| 文件大小 | 较小 (~80KB) | 较大 (~110KB) |
| 适用场景 | 只需要待办功能 | 需要完整功能 |

### 数据兼容

✓ 两个版本使用相同的数据格式  
✓ 可以随时切换而不丢失数据  
✗ 不要在同一页面同时使用两个版本

---

## 🎨 自定义样式

### 修改颜色

```css
:root {
    --fg: #your-color;              /* 文字颜色 */
    --bg: #your-color;              /* 背景色 */
    --fg-muted: #your-color;        /* 弱化文字 */
    --bg-offset: #your-color;       /* 悬停背景 */
}
```

### 修改字体

```css
.todo-wrapper {
    font-family: 'Your Font', sans-serif;
}
```

---

## 🐛 常见问题

### Q: 待办清单不显示？
A: 检查是否有 `id="todo-app"` 的容器元素。

### Q: 样式不正常？
A: 确保先引入 `theme.css` 和 `fonts.css`。

### Q: 数据丢失了？
A: 检查是否清除了浏览器数据或使用了隐私模式。

### Q: 如何备份数据？
A: 打开浏览器开发者工具，在控制台运行：
```javascript
console.log(localStorage.getItem('pomodoro_todos'));
console.log(localStorage.getItem('pomodoro_groups'));
```
复制输出的内容保存。

---

## 📚 更多文档

- **详细指南**：`TODO-STANDALONE-GUIDE.md`
- **使用示例**：`TODO-USAGE-EXAMPLES.md`
- **完整总结**：`TODO-EXTRACTION-SUMMARY.md`

---

## 💡 提示

1. **定期备份数据**：待办数据存储在浏览器本地
2. **使用分组**：将待办按项目或类别分组管理
3. **设置截止时间**：重要任务设置截止时间提醒
4. **善用子待办**：将大任务分解为小步骤
5. **拖拽排序**：按优先级排列待办

---

## ✨ 快捷键

- **回车**：添加新待办
- **双击**：编辑待办
- **右键**：打开菜单
- **拖拽**：排序待办

---

## 🎉 开始使用

打开 `test-todo-standalone.html` 立即体验！

或者将代码复制到你的项目中开始使用。

祝你高效完成任务！📝✅
