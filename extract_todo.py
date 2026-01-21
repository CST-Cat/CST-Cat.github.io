#!/usr/bin/env python3
"""
从 pomodoro-todo.js 和 pomodoro-todo.css 中提取 todo 功能
创建独立的 todo.js 和 todo.css 文件
"""

# 读取 JS 文件
with open('assets/pomodoro-todo.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# 读取 CSS 文件
with open('assets/pomodoro-todo.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

# 提取 initTodo 函数（从 "function initTodo()" 到文件末尾的 "})()" 之前）
import re

# 找到 initTodo 函数的开始位置
init_todo_start = js_content.find('// ==================== 待办清单 ====================')
init_todo_func_start = js_content.find('function initTodo()', init_todo_start)

# 找到整个 IIFE 的结束位置
iife_end = js_content.rfind('})();')

# 提取 initTodo 函数内容（到 IIFE 结束之前）
todo_js_content = js_content[init_todo_start:iife_end].strip()

# 创建新的 todo.js 文件
todo_js_header = '''/*******************************************************************************
 * 待办清单 JavaScript
 * 
 * 功能模块：
 * 1. 待办清单（Todo List）
 *    - 支持添加、编辑、删除、完成待办
 *    - 支持子待办（嵌套任务）
 *    - 支持分组管理
 *    - 支持拖拽排序
 *    - 支持截止时间设置
 *    - 右键菜单快捷操作
 *    - 数据持久化到 localStorage
 ******************************************************************************/

(function () {
    'use strict';

    // 根据 DOM 加载状态决定何时初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();  // DOM 已加载完成，直接初始化
    }

    /**
     * 初始化待办清单模块
     */
    function init() {
        initTodo();        // 初始化待办清单
    }

    // 监听重新初始化事件（用于动态创建的容器）
    window.addEventListener('reinit-todo', () => {
        console.log('Reinitializing todo...');
        initTodo();
    });

'''

todo_js_footer = '''
})();
'''

# 写入 todo.js
with open('assets/todo.js', 'w', encoding='utf-8') as f:
    f.write(todo_js_header)
    f.write(todo_js_content)
    f.write(todo_js_footer)

print("✓ 已创建 assets/todo.js")

# 提取 CSS 中的 todo 相关样式
# 从 "待办清单样式" 注释开始到文件末尾
todo_css_start = css_content.find('/* ==================== 待办清单样式 ==================== */')
todo_css_content = css_content[todo_css_start:].strip()

# 创建新的 todo.css 文件
todo_css_header = '''/*******************************************************************************
 * 待办清单样式
 * 
 * 本文件包含：
 * 1. 待办清单（Todo List）样式
 * 2. 分组管理样式
 * 3. 右键菜单样式
 * 4. 截止时间选择器样式
 * 
 * 设计理念：与 Tufted 主题风格一致，简洁优雅
 ******************************************************************************/

/* 定义待办清单变量，基于主题变量 */
:root {
    --fg: var(--theme-text);              /* 前景色（文字颜色）*/
    --bg: var(--theme-bg);                /* 背景色 */
    --fg-muted: var(--theme-copy-btn-text);  /* 弱化的前景色 */
    --bg-offset: var(--theme-code-bg);    /* 偏移背景色（用于悬停等）*/
    
    /* 优化：统一字体变量 */
    --font-sans: 'AnthropicSans', 'NotoSansSC', sans-serif;
    --font-serif: 'CrimsonPro', 'ZhuqueFangsong', serif;
    --font-mono: 'CrimsonPro', serif;
    
    /* 优化：统一过渡时间 */
    --transition-fast: 0.15s ease;
    --transition-normal: 0.2s ease;
}

'''

# 写入 todo.css
with open('assets/todo.css', 'w', encoding='utf-8') as f:
    f.write(todo_css_header)
    f.write(todo_css_content)

print("✓ 已创建 assets/todo.css")
print("\n完成！待办清单功能已独立到 todo.js 和 todo.css")
