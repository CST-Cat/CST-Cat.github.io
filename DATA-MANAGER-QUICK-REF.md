# 数据管理模块 - 快速参考

## 🎯 一分钟上手

### 引入模块
```html
<link rel="stylesheet" href="/assets/data-manager.css">
<script src="/assets/data-manager.js"></script>
```

### 添加UI
```html
<div id="data-management-app"></div>
```

## 🔧 常用API

### 导出数据
```javascript
window.dataManager.exportAllData()
```

### 导入数据
```javascript
window.dataManager.importData(jsonData)
```

### 查看统计
```javascript
const stats = window.dataManager.getDataStats()
console.log(stats)
```

### 显示通知
```javascript
window.dataManager.showNotification('消息', 'success')
// 类型: 'success' | 'error' | 'info' | 'warning'
```

### 清除数据
```javascript
window.dataManager.clearAllData()
```

## 🎮 开发者工具

### 控制台命令
```javascript
dataManagerDevTools.help()    // 帮助
dataManagerDevTools.stats()   // 统计
dataManagerDevTools.export()  // 导出
dataManagerDevTools.raw()     // 原始数据
dataManagerDevTools.clear()   // 清除
```

## 📊 数据结构

### 统计信息
```javascript
{
  vocabulary: {
    progressCount: 150,
    currentBank: 'kaoyan'
  },
  pomodoro: {
    todayCount: 3,
    totalMinutes: 75
  },
  todos: {
    todoCount: 10,
    groupCount: 3
  }
}
```

### 导出格式
```javascript
{
  version: '1.0.0',
  exportDate: '2026-01-21T10:30:00.000Z',
  vocabulary: { ... },
  pomodoro: { ... },
  todos: { ... }
}
```

## 🧪 测试页面

- **功能测试**: `test-data-manager.html`
- **兼容性测试**: `test-compatibility.html`

## 📚 完整文档

- [README](DATA-MANAGER-README.md) - 快速开始
- [指南](DATA-MANAGER-GUIDE.md) - 完整文档
- [总结](DATA-MANAGER-SUMMARY.md) - 实施说明

## ⚡ 快速示例

### 定期备份
```javascript
// 每周自动备份
setInterval(() => {
  window.dataManager.exportAllData()
}, 7 * 24 * 60 * 60 * 1000)
```

### 自定义导入
```javascript
document.getElementById('import-btn').onclick = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      window.dataManager.importData(event.target.result)
    }
    reader.readAsText(file)
  }
  input.click()
}
```

### 数据监控
```javascript
// 监控数据变化
setInterval(() => {
  const stats = window.dataManager.getDataStats()
  console.log('当前进度:', stats.vocabulary.progressCount)
}, 60000) // 每分钟检查
```

## ✅ 兼容性保证

- ✅ 不修改现有文件
- ✅ 不影响现有功能
- ✅ 可选择性使用
- ✅ 完全向后兼容

## 🎨 UI定制

### CSS变量
```css
:root {
  --text-color: #333;
  --bg-color: #fff;
  --border-color: #ddd;
}
```

### 暗色主题
自动适配系统主题设置

## 💡 最佳实践

1. **定期备份**: 每周导出一次数据
2. **多设备同步**: 使用导入/导出功能
3. **数据安全**: 妥善保管备份文件
4. **测试先行**: 使用测试页面验证功能

## ⚠️ 注意事项

- 导出文件包含所有学习数据
- 导入时会智能合并数据
- 清除操作需要二次确认
- 需要现代浏览器支持

---

**快速链接**: [README](DATA-MANAGER-README.md) | [完整指南](DATA-MANAGER-GUIDE.md) | [测试](test-data-manager.html)
