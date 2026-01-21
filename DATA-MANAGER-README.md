# 数据管理模块 (Data Manager)

## ✨ 特性

- 📦 **统一管理**：集中管理所有学习数据（单词、番茄钟、待办）
- 💾 **导入导出**：一键备份和恢复所有数据
- 🔒 **完全独立**：不影响现有 `vocabulary.js` 和 `pomodoro-todo.js`
- 🎨 **美观UI**：提供现代化的数据管理界面
- 🌙 **暗色主题**：自动适配系统主题

## 🚀 快速开始

### 1. 引入文件

```html
<!-- CSS -->
<link rel="stylesheet" href="/assets/data-manager.css">

<!-- JavaScript -->
<script src="/assets/data-manager.js"></script>
```

### 2. 添加容器（可选）

```html
<div id="data-management-app"></div>
```

### 3. 使用API

```javascript
// 导出数据
window.dataManager.exportAllData();

// 获取统计
const stats = window.dataManager.getDataStats();
console.log(stats);
```

## 📚 文档

- [完整使用指南](DATA-MANAGER-GUIDE.md) - 详细的API文档和使用示例
- [测试页面](test-data-manager.html) - 功能测试和演示
- [兼容性测试](test-compatibility.html) - 验证与现有模块的兼容性

## 🧪 测试

```bash
# 功能测试
open test-data-manager.html

# 兼容性测试
open test-compatibility.html
```

## 🔧 开发者工具

在浏览器控制台中：

```javascript
// 查看帮助
dataManagerDevTools.help()

// 查看统计
dataManagerDevTools.stats()

// 导出数据
dataManagerDevTools.export()
```

## ⚠️ 重要说明

### 与现有模块的关系

✅ **完全兼容**：
- `vocabulary.js` 保留所有原有功能
- `pomodoro-todo.js` 保留所有原有功能
- 可以选择性使用数据管理模块

✅ **独立运行**：
- 可以单独使用数据管理模块
- 也可以与现有模块共存
- 不会产生任何冲突

### 数据安全

- 导出的数据包含所有学习记录
- 建议定期备份
- 导入时会智能合并，保留最新记录

## 📊 数据格式

导出的JSON文件包含：

```json
{
  "version": "1.0.0",
  "exportDate": "2026-01-21T10:30:00.000Z",
  "vocabulary": { ... },
  "pomodoro": { ... },
  "todos": { ... }
}
```

## 🎯 使用场景

1. **定期备份**：导出数据作为备份
2. **设备迁移**：在不同设备间同步数据
3. **数据恢复**：意外清除后恢复数据
4. **数据分析**：导出数据进行分析

## 📝 版本

- **当前版本**: 1.0.0
- **发布日期**: 2026-01-21

## 🤝 贡献

欢迎提交问题和改进建议！

---

**注意**：此模块作为可选增强功能，不会影响现有系统的任何功能。
