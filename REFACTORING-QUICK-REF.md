# 重构快速参考

## 📦 新的文件结构

### 模块文件

| 文件 | 大小 | 功能 |
|------|------|------|
| `assets/pomodoro.js` | 18.7 KB | 番茄钟 + 倒计时 |
| `assets/pomodoro.css` | 10.1 KB | 番茄钟 + 倒计时样式 |
| `assets/todo.js` | 52.7 KB | 待办清单 |
| `assets/todo.css` | 27.0 KB | 待办清单样式 |

### 旧文件（可删除）

| 文件 | 状态 | 说明 |
|------|------|------|
| `assets/pomodoro-todo.js` | 可删除 | 已被拆分为 pomodoro.js 和 todo.js |
| `assets/pomodoro-todo.css` | 可删除 | 已被拆分为 pomodoro.css 和 todo.css |

## 🎯 使用方式

### 背单词页面（只需要待办清单）

```typst
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/todo.css"))
#html.elem("script", attrs: (src: "/assets/timer-manager.js"))[]
#html.elem("script", attrs: (src: "/assets/todo.js", defer: ""))[]
```

**加载大小：** ~80 KB（节省 ~27%）

### 番茄钟页面（需要全部功能）

```typst
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/pomodoro.css"))
#html.elem("link", attrs: (rel: "stylesheet", href: "/assets/todo.css"))
#html.elem("script", attrs: (src: "/assets/timer-manager.js"))[]
#html.elem("script", attrs: (src: "/assets/pomodoro.js", defer: "true"))[]
#html.elem("script", attrs: (src: "/assets/todo.js", defer: "true"))[]
```

**加载大小：** ~110 KB（与原来相同，但模块化更好）

## ✅ 已更新的页面

- [x] `content/Tools/Vocabulary/index.typ` - 背单词页面
- [x] `content/Tools/Pomodoro/index.typ` - 番茄钟页面

## 🔍 验证清单

### 功能测试
- [ ] 背单词页面 - 待办清单功能正常
- [ ] 番茄钟页面 - 番茄钟功能正常
- [ ] 番茄钟页面 - 倒计时功能正常
- [ ] 番茄钟页面 - 待办清单功能正常
- [ ] 数据持久化正常（localStorage）

### 性能测试
- [ ] 背单词页面加载速度
- [ ] 番茄钟页面加载速度
- [ ] 无控制台错误

## 🗑️ 清理步骤（可选）

如果确认新模块工作正常，可以删除旧文件：

```bash
# 备份旧文件（推荐）
mv assets/pomodoro-todo.js assets/backup/
mv assets/pomodoro-todo.css assets/backup/

# 或直接删除
rm assets/pomodoro-todo.js
rm assets/pomodoro-todo.css
```

## 📊 对比表

| 特性 | 旧方案 | 新方案 |
|------|--------|--------|
| 文件数量 | 2 个 | 4 个 |
| 模块化 | 否 | 是 |
| 按需加载 | 否 | 是 |
| 代码职责 | 混合 | 单一 |
| 维护难度 | 较高 | 较低 |
| 背单词页面大小 | ~110 KB | ~80 KB |

## 🎉 优势

1. **性能提升** - 背单词页面减少 ~27% 代码加载
2. **模块化** - 每个模块职责单一
3. **灵活性** - 可以按需组合模块
4. **可维护性** - 代码更清晰，易于维护

## 📚 相关文档

- `REFACTORING-SUMMARY.md` - 详细的重构总结
- `TODO-STANDALONE-GUIDE.md` - 待办清单模块指南
- `TODO-USAGE-EXAMPLES.md` - 使用示例

---

**重构完成！** 🎊
