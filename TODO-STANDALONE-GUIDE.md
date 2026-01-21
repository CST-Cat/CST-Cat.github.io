# 待办清单独立功能说明

## 概述

已成功将待办清单（Todo List）功能从 `pomodoro-todo.js` 和 `pomodoro-todo.css` 中独立出来，创建了独立的模块文件。

## 文件结构

### 新创建的文件

1. **assets/todo.js** - 待办清单 JavaScript 功能
   - 完整的待办清单逻辑
   - 分组管理
   - 拖拽排序
   - 截止时间管理
   - 右键菜单
   - 数据持久化

2. **assets/todo.css** - 待办清单样式
   - 待办清单 UI 样式
   - 分组管理样式
   - 右键菜单样式
   - 截止时间选择器样式
   - 模态窗口样式

3. **test-todo-standalone.html** - 独立测试页面
   - 用于测试独立的待办清单功能
   - 包含功能说明和使用提示

4. **extract_todo.py** - 提取脚本
   - 用于从原文件中提取 todo 功能的 Python 脚本

### 原有文件

- **assets/pomodoro-todo.js** - 保持不变，包含番茄钟、倒计时和待办清单
- **assets/pomodoro-todo.css** - 保持不变，包含所有样式

## 功能特性

### 核心功能

1. **待办管理**
   - ✓ 添加新待办
   - ✓ 编辑待办（双击文字）
   - ✓ 删除待办
   - ✓ 完成/取消完成
   - ✓ 已完成区域（可折叠）

2. **子待办（嵌套任务）**
   - ✓ 为待办添加子任务
   - ✓ 子任务独立管理
   - ✓ 子任务可提升为父任务
   - ✓ 父任务完成时同步子任务状态

3. **分组管理**
   - ✓ 创建多个分组
   - ✓ 重命名分组
   - ✓ 删除分组
   - ✓ 待办在分组间移动
   - ✓ 分组过滤显示
   - ✓ 显示每个分组的待办数量

4. **拖拽排序**
   - ✓ 拖拽手柄（⋮⋮）
   - ✓ 拖拽指示器
   - ✓ 平滑的拖拽体验

5. **截止时间**
   - ✓ 自定义日期时间选择器
   - ✓ 快捷时间选项（今天、明天、3天后、一周后）
   - ✓ 倒计时显示
   - ✓ 颜色编码（正常/即将到期/紧急/已过期）
   - ✓ 子待办截止时间不能晚于父待办

6. **右键菜单**
   - ✓ 添加/修改截止时间
   - ✓ 移除截止时间
   - ✓ 添加子任务
   - ✓ 删除待办
   - ✓ 移动到分组（子菜单）
   - ✓ 取消缩进（子待办）

7. **数据持久化**
   - ✓ localStorage 存储
   - ✓ 自动保存
   - ✓ 页面刷新后恢复数据

## 使用方法

### 在网页中使用

```html
<!DOCTYPE html>
<html>
<head>
    <!-- 引入主题样式 -->
    <link rel="stylesheet" href="assets/theme.css">
    <link rel="stylesheet" href="assets/fonts.css">
    
    <!-- 引入待办清单样式 -->
    <link rel="stylesheet" href="assets/todo.css">
</head>
<body>
    <!-- 待办清单容器 -->
    <div id="todo-app"></div>
    
    <!-- 引入定时器管理器（可选，用于优化性能） -->
    <script src="assets/timer-manager.js"></script>
    
    <!-- 引入待办清单脚本 -->
    <script src="assets/todo.js"></script>
</body>
</html>
```

### 动态初始化

如果容器是动态创建的，可以触发重新初始化事件：

```javascript
// 创建容器后触发重新初始化
window.dispatchEvent(new Event('reinit-todo'));
```

### 数据存储

待办清单数据存储在 localStorage 中：

- `pomodoro_todos` - 待办列表数据
- `pomodoro_groups` - 分组数据

## 测试

打开 `test-todo-standalone.html` 文件即可测试独立的待办清单功能。

## 与原有功能的关系

### 独立使用

- 可以单独使用 `todo.js` 和 `todo.css`
- 不依赖番茄钟和倒计时功能
- 适合只需要待办清单功能的场景

### 集成使用

- 原有的 `pomodoro-todo.js` 和 `pomodoro-todo.css` 保持不变
- 可以继续使用完整的番茄钟+倒计时+待办清单组合
- 两种方式可以共存（但不建议在同一页面同时使用）

## 依赖项

### 必需

- `assets/theme.css` - 主题变量
- `assets/fonts.css` - 字体样式

### 可选

- `assets/timer-manager.js` - 定时器管理器（用于优化截止时间更新）
  - 如果不引入，会自动降级使用 `setInterval`

## 样式定制

待办清单使用 CSS 变量，可以通过覆盖这些变量来定制样式：

```css
:root {
    --fg: var(--theme-text);              /* 前景色 */
    --bg: var(--theme-bg);                /* 背景色 */
    --fg-muted: var(--theme-copy-btn-text);  /* 弱化的前景色 */
    --bg-offset: var(--theme-code-bg);    /* 偏移背景色 */
}
```

## 注意事项

1. **容器 ID**：待办清单需要一个 ID 为 `todo-app` 的容器元素
2. **数据兼容**：使用与原 `pomodoro-todo.js` 相同的 localStorage 键名，数据可以互通
3. **主题依赖**：依赖 Tufted 主题的 CSS 变量，确保先引入主题样式
4. **浏览器兼容**：使用现代 JavaScript 特性，建议使用最新版本的浏览器

## 未来改进

可能的改进方向：

- [ ] 支持标签系统
- [ ] 支持优先级设置
- [ ] 支持搜索和过滤
- [ ] 支持导入/导出数据
- [ ] 支持云同步
- [ ] 支持重复任务
- [ ] 支持任务统计和可视化

## 维护

如果需要更新待办清单功能：

1. 修改 `assets/pomodoro-todo.js` 中的 `initTodo` 函数
2. 修改 `assets/pomodoro-todo.css` 中的待办清单样式
3. 运行 `python extract_todo.py` 重新提取到独立文件

或者直接修改 `assets/todo.js` 和 `assets/todo.css`。
