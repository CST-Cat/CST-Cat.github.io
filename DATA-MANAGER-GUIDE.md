# 数据管理模块使用指南

## 📦 概述

数据管理模块（Data Manager）是一个独立的、可选的增强模块，用于统一管理所有学习数据的导入、导出和备份。

### 核心特性

- ✅ **完全独立**：不影响现有 `vocabulary.js` 和 `pomodoro-todo.js` 的功能
- ✅ **向后兼容**：数据格式完全兼容现有系统
- ✅ **可选增强**：可以与现有模块共存，也可以单独使用
- ✅ **统一接口**：提供统一的数据管理 API

## 📁 文件结构

```
assets/
├── data-manager.js       # 数据管理核心逻辑
├── data-manager.css      # 数据管理UI样式
├── vocabulary.js         # 单词学习模块（不受影响）
├── pomodoro-todo.js      # 番茄钟和待办模块（不受影响）
└── indexeddb-helper.js   # IndexedDB 辅助工具
```

## 🚀 快速开始

### 1. 引入模块

在 HTML 页面中引入数据管理模块：

```html
<!-- 引入样式 -->
<link rel="stylesheet" href="/assets/data-manager.css">

<!-- 引入脚本 -->
<script src="/assets/data-manager.js"></script>
```

### 2. 添加UI容器（可选）

如果需要显示数据管理UI，添加容器：

```html
<div id="data-management-app"></div>
```

模块会自动在容器中生成导入/导出/清除按钮。

### 3. 使用 API

数据管理模块会创建全局对象 `window.dataManager`，可以通过它访问所有功能：

```javascript
// 导出所有数据
window.dataManager.exportAllData();

// 导入数据
window.dataManager.importData(jsonData);

// 获取数据统计
const stats = window.dataManager.getDataStats();

// 显示通知
window.dataManager.showNotification('操作成功', 'success');
```

## 🔧 API 文档

### 核心方法

#### `exportAllData()`
导出所有学习数据为 JSON 文件。

```javascript
window.dataManager.exportAllData();
```

#### `importData(jsonData)`
导入学习数据（智能合并，保留最新记录）。

```javascript
// 从文件读取
const file = event.target.files[0];
const reader = new FileReader();
reader.onload = (e) => {
    window.dataManager.importData(e.target.result);
};
reader.readAsText(file);
```

#### `clearAllData()`
清除所有学习数据（需要二次确认）。

```javascript
window.dataManager.clearAllData();
```

#### `getDataStats()`
获取数据统计信息。

```javascript
const stats = window.dataManager.getDataStats();
console.log(stats);
// {
//   vocabulary: { progressCount: 150, currentBank: 'kaoyan' },
//   pomodoro: { todayCount: 3, totalMinutes: 75 },
//   todos: { todoCount: 10, groupCount: 3 }
// }
```

#### `showNotification(message, type)`
显示通知消息。

```javascript
window.dataManager.showNotification('操作成功', 'success');
// type: 'success' | 'error' | 'info' | 'warning'
```

### 工具方法

#### `getLocalStorageItem(key, defaultValue)`
安全获取 localStorage 项（自动 JSON 解析）。

```javascript
const progress = window.dataManager.getLocalStorageItem('vocab_progress', {});
```

#### `setLocalStorageItem(key, value)`
安全设置 localStorage 项（自动 JSON 序列化）。

```javascript
window.dataManager.setLocalStorageItem('vocab_progress', progressData);
```

## 🎮 开发者工具

在浏览器控制台中可以使用开发者工具：

```javascript
// 查看帮助
dataManagerDevTools.help();

// 查看数据统计
dataManagerDevTools.stats();

// 导出数据
dataManagerDevTools.export();

// 查看原始数据
dataManagerDevTools.raw();

// 清除所有数据
dataManagerDevTools.clear();
```

## 📊 数据格式

### 导出的数据格式

```json
{
  "version": "1.0.0",
  "exportDate": "2026-01-21T10:30:00.000Z",
  "vocabulary": {
    "progress": {
      "kaoyan_word_1": {
        "status": "learning",
        "reviewCount": 2,
        "lastReview": "Mon Jan 20 2026",
        "nextReview": "Tue Jan 21 2026",
        "lastResult": "learning"
      }
    },
    "todayStats": {
      "date": "Mon Jan 20 2026",
      "learned": 15,
      "reviewed": 10,
      "target": 20
    },
    "currentBank": "kaoyan"
  },
  "pomodoro": {
    "todayCount": "3",
    "totalMinutes": "75",
    "lastDate": "Mon Jan 20 2026",
    "timerState": null
  },
  "todos": {
    "todos": "[...]",
    "groups": "[...]"
  }
}
```

## 🔄 与现有模块的关系

### 独立性保证

1. **vocabulary.js** 保留了自己的数据管理功能
2. **pomodoro-todo.js** 保留了自己的数据管理功能
3. **data-manager.js** 作为可选的增强模块

### 共存方式

```html
<!-- 方式1：只使用现有模块（不受影响） -->
<script src="/assets/vocabulary.js"></script>
<script src="/assets/pomodoro-todo.js"></script>

<!-- 方式2：同时使用（增强功能） -->
<script src="/assets/vocabulary.js"></script>
<script src="/assets/pomodoro-todo.js"></script>
<script src="/assets/data-manager.js"></script>
```

### 数据兼容性

- 数据格式完全兼容
- 可以互相导入导出
- 不会产生冲突

## 🎨 UI 定制

### 自定义样式

可以通过 CSS 变量自定义样式：

```css
:root {
    --text-color: #333;
    --bg-color: #fff;
    --border-color: #ddd;
    --hover-bg: #f5f5f5;
    --hover-border: #999;
}
```

### 暗色主题

模块自动支持暗色主题（通过 `prefers-color-scheme`）。

## 🧪 测试

### 运行测试页面

打开 `test-data-manager.html` 进行功能测试：

```bash
# 在项目根目录
open test-data-manager.html
```

### 测试步骤

1. 点击"生成模拟数据"创建测试数据
2. 点击"查看统计"查看数据统计
3. 点击"测试导出"导出数据文件
4. 使用"导入数据"按钮导入之前导出的文件
5. 测试完成后可以"清除模拟数据"

## 📝 使用示例

### 示例1：在侧栏中使用

```html
<div class="marginnote">
    <h3>数据管理</h3>
    <div id="data-management-app"></div>
</div>
```

### 示例2：程序化使用

```javascript
// 定期自动备份
setInterval(() => {
    const stats = window.dataManager.getDataStats();
    if (stats.vocabulary.progressCount > 0) {
        window.dataManager.exportAllData();
    }
}, 7 * 24 * 60 * 60 * 1000); // 每周备份
```

### 示例3：自定义导入逻辑

```javascript
// 监听文件选择
document.getElementById('my-import-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            window.dataManager.importData(event.target.result);
        };
        reader.readAsText(file);
    };
    input.click();
});
```

## ⚠️ 注意事项

1. **数据安全**：导出的数据包含所有学习记录，请妥善保管
2. **导入合并**：导入时会智能合并数据，保留最新记录
3. **清除确认**：清除数据需要二次确认，防止误操作
4. **浏览器兼容**：需要支持 ES6+ 的现代浏览器

## 🔮 未来计划

- [ ] 云端同步功能
- [ ] 数据加密选项
- [ ] 自动备份计划
- [ ] 数据分析报告
- [ ] 多设备同步

## 📞 支持

如有问题或建议，请查看项目文档或提交 Issue。

---

**版本**: 1.0.0  
**更新日期**: 2026-01-21
