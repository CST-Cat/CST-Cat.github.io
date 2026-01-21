# 待办清单独立模块

> 从 pomodoro-todo.js 中独立出来的待办清单功能

## 🎯 项目简介

将原本集成在 `pomodoro-todo.js` 中的待办清单功能独立出来，创建可单独使用的模块。

**优势：**
- ✓ 代码量减少约 30%
- ✓ 加载速度更快
- ✓ 模块化更清晰
- ✓ 易于集成到其他项目
- ✓ 保持所有原有功能

## 📦 核心文件

```
assets/
├── todo.js      (52.7 KB) - 待办清单功能
└── todo.css     (27.0 KB) - 待办清单样式
```

## ⚡ 快速开始

### 1. 最简单的使用

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

### 2. 测试功能

打开 `test-todo-standalone.html` 即可测试所有功能。

## ✨ 功能特性

### 核心功能
- ✓ 添加、编辑、删除、完成待办
- ✓ 子待办（嵌套任务）
- ✓ 分组管理
- ✓ 拖拽排序
- ✓ 截止时间设置
- ✓ 右键菜单快捷操作
- ✓ 数据持久化（localStorage）

### 高级特性
- ✓ 自定义日期时间选择器
- ✓ 截止时间倒计时显示
- ✓ 颜色编码（正常/即将到期/紧急/已过期）
- ✓ 父子待办时间约束
- ✓ 已完成区域折叠
- ✓ 分组过滤和计数

## 📚 文档

| 文档 | 说明 | 推荐度 |
|------|------|--------|
| [TODO-QUICK-START.md](TODO-QUICK-START.md) | 5分钟快速开始 | ⭐⭐⭐⭐⭐ |
| [TODO-STANDALONE-GUIDE.md](TODO-STANDALONE-GUIDE.md) | 详细功能说明 | ⭐⭐⭐⭐ |
| [TODO-USAGE-EXAMPLES.md](TODO-USAGE-EXAMPLES.md) | 使用示例 | ⭐⭐⭐⭐ |
| [TODO-EXTRACTION-SUMMARY.md](TODO-EXTRACTION-SUMMARY.md) | 完整总结 | ⭐⭐⭐ |
| [TODO-FILES-INDEX.md](TODO-FILES-INDEX.md) | 文件索引 | ⭐⭐⭐ |

## 🎨 使用场景

### 场景 1：仅需要待办功能
```html
<!-- 使用独立版 -->
<link rel="stylesheet" href="assets/todo.css">
<script src="assets/todo.js"></script>
```
**节省约 30% 代码量**

### 场景 2：需要完整功能（番茄钟+倒计时+待办）
```html
<!-- 使用完整版 -->
<link rel="stylesheet" href="assets/pomodoro-todo.css">
<script src="assets/pomodoro-todo.js"></script>
```
**功能完整，一次性加载**

## 🔧 依赖

### 必需
- `assets/theme.css` - 主题变量
- `assets/fonts.css` - 字体样式

### 可选（推荐）
- `assets/timer-manager.js` - 定时器优化

## 📊 对比

| 特性 | 独立版 | 完整版 |
|------|--------|--------|
| 待办清单 | ✓ | ✓ |
| 番茄钟 | ✗ | ✓ |
| 倒计时 | ✗ | ✓ |
| 文件大小 | ~80KB | ~110KB |
| 加载速度 | 快 | 中等 |

## 🛠️ 工具

### 提取脚本
```bash
python extract_todo.py
```
从原文件中重新提取 todo 功能。

## 🧪 测试

```bash
# 打开测试页面
test-todo-standalone.html
```

**测试项目：** ✓ 所有功能测试通过

## 💾 数据存储

数据存储在 localStorage：
- `pomodoro_todos` - 待办列表
- `pomodoro_groups` - 分组列表

**注意：** 与原版数据完全兼容，可以无缝切换。

## 🎯 快速操作

### 基础操作
- **添加**：输入后按回车
- **完成**：点击复选框
- **编辑**：双击文字
- **删除**：点击 × 或右键删除

### 高级操作
- **子待办**：点击 + 按钮
- **分组**：点击分组旁的 +
- **拖拽**：拖动 ⋮⋮ 图标
- **截止时间**：右键选择

## 🌟 特色功能

### 1. 智能截止时间
- 快捷选项（今天、明天、3天后、一周后）
- 自定义日期时间选择器
- 倒计时显示
- 颜色编码提醒

### 2. 灵活的分组管理
- 创建多个分组
- 分组过滤显示
- 待办在分组间移动
- 显示每个分组的待办数量

### 3. 强大的子待办
- 无限层级嵌套
- 独立管理
- 可提升为父待办
- 父子状态同步

### 4. 流畅的拖拽排序
- 拖拽手柄
- 实时指示器
- 平滑动画

## 🔮 未来计划

- [ ] 支持标签系统
- [ ] 支持优先级
- [ ] 支持搜索过滤
- [ ] 支持导入导出
- [ ] 支持云同步
- [ ] 支持重复任务
- [ ] 支持任务统计

## 📝 更新日志

### v1.0.0 (2026-01-21)
- ✓ 从 pomodoro-todo.js 中独立出来
- ✓ 保持所有原有功能
- ✓ 创建完整文档
- ✓ 提供测试页面
- ✓ 提供提取工具

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

与主项目保持一致。

## 🎉 开始使用

1. **快速体验**：打开 `test-todo-standalone.html`
2. **快速上手**：阅读 `TODO-QUICK-START.md`
3. **深入学习**：阅读 `TODO-STANDALONE-GUIDE.md`

---

**提示：** 如果你只需要待办清单功能，使用独立版可以减少约 30% 的代码量！

**兼容性：** 与原版数据完全兼容，可以随时切换。

**推荐：** 先打开 `test-todo-standalone.html` 体验所有功能！
