/*******************************************************************************
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
 *    - 多语言支持：基于 HTML lang 属性自动切换语言
 ******************************************************************************/

(function () {
    'use strict';

    // ==================== 国际化配置 ====================
    
    /**
     * 获取当前页面语言
     */
    function getLang() {
        return document.documentElement.lang || 'zh';
    }

    /**
     * 多语言文本配置
     */
    const i18n = {
        zh: {
            // 分组相关
            groups: '分组',
            addGroup: '新建分组',
            defaultGroup: '默认',
            
            // 输入提示
            inputPlaceholder: '请输入...',
            todoPlaceholder: 'To-do...',
            subTodoPlaceholder: '子待办...',
            
            // 按钮文本
            cancel: '取消',
            confirm: '确定',
            add: 'Add',
            
            // 工具提示
            addSubTodo: '添加子待办',
            deleteSubTodo: '删除子待办',
            dragToSort: '拖拽排序',
            delete: '删除',
            remove: '移除'
        },
        en: {
            // Groups
            groups: 'Groups',
            addGroup: 'Add Group',
            defaultGroup: 'Default',
            
            // Input placeholders
            inputPlaceholder: 'Enter...',
            todoPlaceholder: 'To-do...',
            subTodoPlaceholder: 'Sub-task...',
            
            // Button text
            cancel: 'Cancel',
            confirm: 'Confirm',
            add: 'Add',
            
            // Tooltips
            addSubTodo: 'Add sub-task',
            deleteSubTodo: 'Delete sub-task',
            dragToSort: 'Drag to sort',
            delete: 'Delete',
            remove: 'Remove'
        }
    };

    /**
     * 获取翻译文本
     */
    function t(key) {
        const lang = getLang();
        return i18n[lang][key] || i18n['zh'][key] || key;
    }

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

// ==================== 待办清单 ====================
    function initTodo() {
        const container = document.getElementById('todo-app');
        if (!container) return;

        // 已完成区域默认折叠状态
        let completedCollapsed = true;

        // Using spans to ensure we don't break the parent marginnote span structure
        // CSS classes handle the display properties (block/flex)
        container.innerHTML = `
            <span class="todo-wrapper">
                <span class="todo-groups-section">
                    <span class="todo-groups-header">
                        <span class="todo-groups-title">${t('groups')}</span>
                        <span class="todo-groups-add" title="${t('addGroup')}">+</span>
                    </span>
                    <span class="todo-groups-list" id="todo-groups-list"></span>
                </span>
                <span class="todo-main-section">
                    <span class="todo-input-group">
                        <input type="text" id="new-todo" placeholder="${t('todoPlaceholder')}" autocomplete="off">
                        <button id="add-todo-btn" title="${t('add')}">+</button>
                    </span>
                    <span id="todo-list"></span>
                    <span id="todo-completed-section"></span>
                </span>
            </span>
            <span class="todo-context-menu" id="todo-context-menu"></span>
        `;

        const input = document.getElementById('new-todo');
        const btn = document.getElementById('add-todo-btn');
        const list = document.getElementById('todo-list');
        const completedSection = document.getElementById('todo-completed-section');
        const groupsList = document.getElementById('todo-groups-list');
        const groupsAddBtn = container.querySelector('.todo-groups-add');
        const contextMenu = document.getElementById('todo-context-menu');

        // 自定义输入框模态窗口
        function showInputModal(title, defaultValue = '', onConfirm, onCancel) {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'todo-modal-overlay';

            // 创建模态窗口
            const modal = document.createElement('div');
            modal.className = 'todo-modal';

            // 标题
            const titleEl = document.createElement('div');
            titleEl.className = 'todo-modal-title';
            titleEl.textContent = title;

            // 输入框
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'todo-modal-input';
            input.value = defaultValue;
            input.placeholder = t('inputPlaceholder');

            // 按钮组
            const actions = document.createElement('div');
            actions.className = 'todo-modal-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'todo-modal-btn';
            cancelBtn.textContent = t('cancel');
            cancelBtn.onclick = () => {
                overlay.remove();
                if (onCancel) onCancel();
            };

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'todo-modal-btn primary';
            confirmBtn.textContent = t('confirm');
            confirmBtn.onclick = () => {
                const value = input.value.trim();
                overlay.remove();
                if (value && onConfirm) {
                    onConfirm(value);
                }
            };

            // 回车确认，ESC 取消
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmBtn.click();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelBtn.click();
                }
            };

            // 组装
            actions.appendChild(cancelBtn);
            actions.appendChild(confirmBtn);
            modal.appendChild(titleEl);
            modal.appendChild(input);
            modal.appendChild(actions);
            overlay.appendChild(modal);

            // 点击遮罩层关闭
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    cancelBtn.click();
                }
            };

            // 添加到页面
            document.body.appendChild(overlay);

            // 聚焦输入框并选中文本
            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);
        }

        // 分组数据
        let groups = [];
        try {
            groups = JSON.parse(localStorage.getItem('pomodoro_groups') || '[]');
            if (groups.length === 0) {
                groups = [{ id: 'default', name: t('defaultGroup'), checked: true }];
            }
        } catch (e) {
            groups = [{ id: 'default', name: t('defaultGroup'), checked: true }];
        }

        let todos = [];
        try {
            todos = JSON.parse(localStorage.getItem('pomodoro_todos') || '[]');
            // 确保每个todo都有children数组和groupId（兼容旧数据）
            todos.forEach(todo => {
                if (!todo.children) todo.children = [];
                if (!todo.groupId) todo.groupId = 'default';
            });
        } catch (e) { todos = []; }

        function saveGroups() {
            localStorage.setItem('pomodoro_groups', JSON.stringify(groups));
        }

        function saveTodos() {
            localStorage.setItem('pomodoro_todos', JSON.stringify(todos));
        }

        // 获取选中的分组ID列表
        function getCheckedGroupIds() {
            return groups.filter(g => g.checked).map(g => g.id);
        }

        // 渲染分组列表
        function renderGroups() {
            groupsList.innerHTML = '';
            groups.forEach((group, index) => {
                const item = document.createElement('span');
                item.className = 'todo-group-item';

                const checkbox = document.createElement('span');
                checkbox.className = 'todo-group-checkbox' + (group.checked ? ' checked' : '');
                checkbox.onclick = () => {
                    group.checked = !group.checked;
                    saveGroups();
                    renderGroups();
                    renderTodos();
                };

                const name = document.createElement('span');
                name.className = 'todo-group-name';
                name.textContent = group.name;

                // 统计该分组的待办数量
                const count = todos.filter(t => t.groupId === group.id && !t.completed).length;
                const countSpan = document.createElement('span');
                countSpan.className = 'todo-group-count';
                countSpan.textContent = count > 0 ? count : '';

                item.appendChild(checkbox);
                item.appendChild(name);
                item.appendChild(countSpan);

                // 右键删除分组（除了默认分组）
                if (group.id !== 'default') {
                    item.oncontextmenu = (e) => {
                        e.preventDefault();
                        showContextMenu(e, [
                            { label: '重命名', action: () => renameGroup(index) },
                            { label: '删除分组', action: () => deleteGroup(index) }
                        ]);
                    };
                }

                groupsList.appendChild(item);
            });
        }

        function addGroup() {
            showInputModal('请输入分组名称', '', (name) => {
                const id = 'group_' + Date.now();
                groups.push({ id, name: name, checked: true });
                saveGroups();
                renderGroups();
            });
        }

        function renameGroup(index) {
            showInputModal('请输入新的分组名称', groups[index].name, (newName) => {
                groups[index].name = newName;
                saveGroups();
                renderGroups();
            });
        }

        function deleteGroup(index) {
            if (confirm(`确定删除分组"${groups[index].name}"吗？该分组下的待办将移至默认分组。`)) {
                const groupId = groups[index].id;
                // 将该分组的待办移至默认分组
                todos.forEach(todo => {
                    if (todo.groupId === groupId) {
                        todo.groupId = 'default';
                    }
                });
                groups.splice(index, 1);
                saveGroups();
                saveTodos();
                renderGroups();
                renderTodos();
            }
        }

        if (groupsAddBtn) groupsAddBtn.onclick = addGroup;

        // 拖拽状态
        let draggedIndex = null;
        let draggedElement = null;

        // 右键菜单相关
        function showContextMenu(e, items) {
            e.preventDefault();
            hideContextMenu();

            contextMenu.innerHTML = '';
            items.forEach(item => {
                if (item.divider) {
                    const divider = document.createElement('span');
                    divider.className = 'todo-context-divider';
                    contextMenu.appendChild(divider);
                } else if (item.submenu) {
                    // 子菜单（用于分组选择）
                    const menuItem = document.createElement('span');
                    menuItem.className = 'todo-context-item has-submenu';
                    menuItem.innerHTML = `<span class="todo-context-icon">${item.icon || ''}</span>${item.label}<span class="todo-context-arrow">›</span>`;

                    const submenu = document.createElement('span');
                    submenu.className = 'todo-context-submenu';
                    item.submenu.forEach(subItem => {
                        const subMenuItem = document.createElement('span');
                        subMenuItem.className = 'todo-context-item' + (subItem.checked ? ' checked' : '');
                        subMenuItem.innerHTML = `<span class="todo-context-check">${subItem.checked ? '✓' : ''}</span>${subItem.label}`;
                        subMenuItem.onclick = () => {
                            subItem.action();
                            hideContextMenu();
                        };
                        submenu.appendChild(subMenuItem);
                    });
                    menuItem.appendChild(submenu);
                    contextMenu.appendChild(menuItem);
                } else {
                    const menuItem = document.createElement('span');
                    menuItem.className = 'todo-context-item';
                    menuItem.innerHTML = `<span class="todo-context-icon">${item.icon || ''}</span>${item.label}`;
                    menuItem.onclick = () => {
                        item.action();
                        hideContextMenu();
                    };
                    contextMenu.appendChild(menuItem);
                }
            });

            // 定位菜单
            contextMenu.style.display = 'block';
            const menuRect = contextMenu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = e.clientX;
            let top = e.clientY;

            if (left + menuRect.width > viewportWidth) {
                left = viewportWidth - menuRect.width - 10;
            }
            if (top + menuRect.height > viewportHeight) {
                top = viewportHeight - menuRect.height - 10;
            }

            contextMenu.style.left = left + 'px';
            contextMenu.style.top = top + 'px';
        }

        function hideContextMenu() {
            contextMenu.style.display = 'none';
        }

        // 点击其他地方关闭菜单
        document.addEventListener('click', hideContextMenu);
        document.addEventListener('contextmenu', (e) => {
            if (!contextMenu.contains(e.target) && !e.target.closest('.todo-item') && !e.target.closest('.todo-group-item')) {
                hideContextMenu();
            }
        });

        // 创建子待办项
        function createSubTodoItem(subTodo, subIndex, parentIndex, isInCompletedSection) {
            const li = document.createElement('span');
            li.className = 'todo-item todo-sub-item' + (subTodo.completed ? ' completed' : '');
            li.dataset.parentIndex = parentIndex;
            li.dataset.subIndex = subIndex;

            // CSS 自绘复选框
            const checkbox = document.createElement('span');
            checkbox.className = 'todo-checkbox' + (subTodo.completed ? ' checked' : '');
            if (!isInCompletedSection) {
                checkbox.onclick = (e) => {
                    e.stopPropagation();
                    toggleSubTodo(parentIndex, subIndex);
                };
            }

            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = subTodo.text;

            // 截止时间显示
            const dueDateSpan = document.createElement('span');
            dueDateSpan.className = 'todo-due-date';
            if (subTodo.dueDate && !isInCompletedSection) {
                updateDueDateDisplay(dueDateSpan, subTodo.dueDate);
            }

            // 双击文本进入编辑模式
            if (!isInCompletedSection) {
                textSpan.ondblclick = (e) => {
                    e.stopPropagation();
                    const editInput = document.createElement('input');
                    editInput.type = 'text';
                    editInput.value = subTodo.text;
                    editInput.className = 'todo-edit-input';

                    textSpan.replaceWith(editInput);
                    editInput.focus();
                    editInput.select();

                    const save = () => {
                        const newText = editInput.value.trim();
                        if (newText) {
                            subTodo.text = newText;
                            saveTodos();
                        }
                        renderTodos();
                    };

                    editInput.onblur = save;
                    editInput.onkeydown = (ev) => {
                        if (ev.key === 'Enter') save();
                        if (ev.key === 'Escape') renderTodos();
                    };
                };

                // 右键菜单
                li.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const menuItems = [
                        { icon: '⏰', label: subTodo.dueDate ? '修改截止时间' : '添加截止时间', action: () => showSubTodoDueDatePicker(parentIndex, subIndex, li) },
                    ];

                    // 如果有截止时间，添加移除选项
                    if (subTodo.dueDate) {
                        menuItems.push({
                            icon: '✕', label: '移除截止时间', action: () => {
                                todos[parentIndex].children[subIndex].dueDate = null;
                                saveTodos();
                                renderTodos();
                            }
                        });
                    }

                    menuItems.push(
                        { divider: true },
                        { icon: '↑', label: '取消缩进', action: () => promoteSubTodo(parentIndex, subIndex) },
                        { icon: '🗑', label: '删除', action: () => { deleteSubTodo(parentIndex, subIndex, e); } }
                    );
                    showContextMenu(e, menuItems);
                };
            }

            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'todo-delete';
            deleteBtn.textContent = '×';
            deleteBtn.title = t('deleteSubTodo');
            deleteBtn.onclick = (e) => deleteSubTodo(parentIndex, subIndex, e);

            li.appendChild(checkbox);
            li.appendChild(textSpan);
            if (subTodo.dueDate && !isInCompletedSection) {
                li.appendChild(dueDateSpan);
            }
            li.appendChild(deleteBtn);
            return li;
        }

        // 显示子待办截止时间选择器
        function showSubTodoDueDatePicker(parentIndex, subIndex, liElement) {
            // 移除已有的选择器
            const existingPicker = liElement.parentElement.querySelector('.todo-due-picker');
            if (existingPicker) {
                existingPicker.remove();
                return;
            }

            const parentDueDate = todos[parentIndex].dueDate;

            const pickerWrapper = document.createElement('span');
            pickerWrapper.className = 'todo-due-picker todo-sub-due-picker';
            pickerWrapper.style.position = 'relative';

            const picker = createDateTimePicker(
                todos[parentIndex].children[subIndex].dueDate,
                new Date().toISOString().slice(0, 16),
                parentDueDate || null,
                (value) => {
                    // 验证不超过父待办截止时间
                    if (parentDueDate && value > parentDueDate) {
                        alert('子待办的截止时间不能晚于父待办的截止时间');
                        return;
                    }
                    todos[parentIndex].children[subIndex].dueDate = value;
                    saveTodos();
                    renderTodos();
                },
                () => pickerWrapper.remove()
            );

            pickerWrapper.appendChild(picker);

            // 插入到子待办项后面
            liElement.after(pickerWrapper);
        }

        // 将子待办提升为父待办
        function promoteSubTodo(parentIndex, subIndex) {
            const subTodo = todos[parentIndex].children[subIndex];
            // 创建新的父待办
            const newTodo = {
                text: subTodo.text,
                completed: subTodo.completed,
                children: [],
                groupId: todos[parentIndex].groupId,
                dueDate: subTodo.dueDate || null
            };
            // 从父待办中移除
            todos[parentIndex].children.splice(subIndex, 1);
            // 插入到父待办后面
            todos.splice(parentIndex + 1, 0, newTodo);
            saveTodos();
            renderTodos();
            renderGroups();
        }

        function createTodoItem(todo, localIndex, actualIndex, isInCompletedSection) {
            const wrapper = document.createElement('span');
            wrapper.className = 'todo-item-wrapper';

            const li = document.createElement('span');
            li.className = 'todo-item todo-parent-item' + (todo.completed ? ' completed' : '');
            li.dataset.index = localIndex;
            li.dataset.actualIndex = actualIndex;

            // 只有未完成的待办可以拖拽
            if (!isInCompletedSection) {
                li.draggable = true;

                // 拖拽手柄
                const dragHandle = document.createElement('span');
                dragHandle.className = 'todo-drag-handle';
                dragHandle.innerHTML = '⋮⋮';
                dragHandle.title = t('dragToSort');
                li.appendChild(dragHandle);

                // 拖拽事件
                li.ondragstart = (e) => {
                    draggedIndex = localIndex;
                    draggedElement = li;
                    li.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', localIndex);
                };

                li.ondragend = () => {
                    li.classList.remove('dragging');
                    draggedIndex = null;
                    draggedElement = null;
                    // 移除所有拖拽指示器
                    document.querySelectorAll('.todo-item.drag-over').forEach(el => {
                        el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
                    });
                };

                li.ondragover = (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';

                    if (draggedElement === li) return;

                    const rect = li.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;

                    li.classList.remove('drag-over-top', 'drag-over-bottom');
                    li.classList.add('drag-over');

                    if (e.clientY < midY) {
                        li.classList.add('drag-over-top');
                    } else {
                        li.classList.add('drag-over-bottom');
                    }
                };

                li.ondragleave = (e) => {
                    // 只有在真正离开时才移除样式
                    if (!li.contains(e.relatedTarget)) {
                        li.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');
                    }
                };

                li.ondrop = (e) => {
                    e.preventDefault();
                    li.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom');

                    if (draggedIndex === null || draggedIndex === localIndex) return;

                    const rect = li.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    const insertBefore = e.clientY < midY;

                    // 重新排序
                    reorderTodos(draggedIndex, localIndex, insertBefore);
                };

                // 右键菜单
                li.oncontextmenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // 构建分组子菜单
                    const groupSubmenu = groups.map(g => ({
                        label: g.name,
                        checked: todo.groupId === g.id,
                        action: () => {
                            todo.groupId = g.id;
                            saveTodos();
                            renderTodos();
                            renderGroups();
                        }
                    }));

                    const menuItems = [
                        { icon: '⏰', label: todo.dueDate ? '修改截止时间' : '添加截止时间', action: () => showDueDatePicker(actualIndex, wrapper) },
                        { icon: '＋', label: '添加子任务', action: () => showSubTodoInput(actualIndex, wrapper) },
                        { icon: '🗑', label: '删除', action: () => { deleteTodo(actualIndex, e); } },
                        { divider: true },
                        { icon: '', label: '移动到分组', submenu: groupSubmenu }
                    ];

                    // 如果有截止时间，添加移除选项
                    if (todo.dueDate) {
                        menuItems.splice(1, 0, {
                            icon: '✕', label: '移除截止时间', action: () => {
                                todo.dueDate = null;
                                saveTodos();
                                renderTodos();
                            }
                        });
                    }

                    showContextMenu(e, menuItems);
                };
            }

            // CSS 自绘复选框
            const checkbox = document.createElement('span');
            checkbox.className = 'todo-checkbox' + (todo.completed ? ' checked' : '');
            checkbox.onclick = () => toggleTodo(actualIndex);

            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;

            // 截止时间显示
            const dueDateSpan = document.createElement('span');
            dueDateSpan.className = 'todo-due-date';
            if (todo.dueDate && !isInCompletedSection) {
                updateDueDateDisplay(dueDateSpan, todo.dueDate);
            }

            // 双击文本进入编辑模式
            textSpan.ondblclick = () => {
                const editInput = document.createElement('input');
                editInput.type = 'text';
                editInput.value = todo.text;
                editInput.className = 'todo-edit-input';

                textSpan.replaceWith(editInput);
                editInput.focus();
                editInput.select();

                const save = () => {
                    const newText = editInput.value.trim();
                    if (newText) {
                        todo.text = newText;
                        saveTodos();
                    }
                    renderTodos();
                };

                editInput.onblur = save;
                editInput.onkeydown = (e) => {
                    if (e.key === 'Enter') save();
                    if (e.key === 'Escape') renderTodos();
                };
            };

            // 添加子待办按钮（仅未完成的待办显示）
            const addSubBtn = document.createElement('span');
            addSubBtn.className = 'todo-add-sub';
            addSubBtn.textContent = '+';
            addSubBtn.title = t('addSubTodo');
            if (!isInCompletedSection) {
                addSubBtn.onclick = (e) => {
                    e.stopPropagation();
                    showSubTodoInput(actualIndex, wrapper);
                };
            } else {
                addSubBtn.style.display = 'none';
            }

            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'todo-delete';
            deleteBtn.textContent = '×';
            deleteBtn.title = isInCompletedSection ? t('delete') : t('remove');
            deleteBtn.onclick = (e) => deleteTodo(actualIndex, e);

            li.appendChild(checkbox);
            li.appendChild(textSpan);
            if (todo.dueDate && !isInCompletedSection) {
                li.appendChild(dueDateSpan);
            }
            li.appendChild(addSubBtn);
            li.appendChild(deleteBtn);
            wrapper.appendChild(li);

            // 渲染子待办
            if (todo.children && todo.children.length > 0) {
                const subList = document.createElement('span');
                subList.className = 'todo-sub-list';
                todo.children.forEach((subTodo, subIndex) => {
                    subList.appendChild(createSubTodoItem(subTodo, subIndex, actualIndex, isInCompletedSection));
                });
                wrapper.appendChild(subList);
            }

            return wrapper;
        }

        // 格式化倒计时显示
        function formatCountdown(dueDate) {
            const now = new Date();
            const target = new Date(dueDate);
            const diff = target - now;

            if (diff <= 0) {
                return { text: '已过期', className: 'overdue' };
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            let text = '';
            let className = '';

            if (days > 7) {
                // 超过7天显示日期
                const options = { month: 'short', day: 'numeric' };
                text = target.toLocaleDateString('zh-CN', options);
                className = 'normal';
            } else if (days > 0) {
                text = `${days}天${hours}时`;
                className = days <= 1 ? 'soon' : 'normal';
            } else if (hours > 0) {
                text = `${hours}时${minutes}分`;
                className = 'urgent';
            } else {
                text = `${minutes}分钟`;
                className = 'urgent';
            }

            return { text, className };
        }

        // 更新截止时间显示
        function updateDueDateDisplay(element, dueDate) {
            const { text, className } = formatCountdown(dueDate);
            element.textContent = text;
            element.className = 'todo-due-date ' + className;
        }

        // 自定义日期时间选择器
        function createDateTimePicker(currentValue, minDate, maxDate, onConfirm, onCancel) {
            const picker = document.createElement('span');
            picker.className = 'todo-datetime-picker';

            // 解析当前值或使用默认值
            let selectedDate = currentValue ? new Date(currentValue) : new Date();
            if (!currentValue) {
                selectedDate.setDate(selectedDate.getDate() + 1); // 默认明天
            }
            let displayMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

            const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

            function render() {
                const minDateTime = minDate ? new Date(minDate) : new Date();
                const maxDateTime = maxDate ? new Date(maxDate) : null;

                picker.innerHTML = '';

                // 快捷选项
                const shortcuts = document.createElement('span');
                shortcuts.className = 'todo-datetime-shortcuts';

                const shortcutOptions = [
                    { label: '今天', days: 0 },
                    { label: '明天', days: 1 },
                    { label: '3天后', days: 3 },
                    { label: '一周后', days: 7 }
                ];

                shortcutOptions.forEach(opt => {
                    const btn = document.createElement('span');
                    btn.className = 'todo-datetime-shortcut';
                    btn.textContent = opt.label;
                    btn.onclick = () => {
                        const d = new Date();
                        d.setDate(d.getDate() + opt.days);
                        d.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                        if (d >= minDateTime && (!maxDateTime || d <= maxDateTime)) {
                            selectedDate = d;
                            displayMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                            render();
                        }
                    };
                    shortcuts.appendChild(btn);
                });
                picker.appendChild(shortcuts);

                // 头部导航
                const header = document.createElement('span');
                header.className = 'todo-datetime-header';

                const title = document.createElement('span');
                title.className = 'todo-datetime-title';
                title.textContent = `${displayMonth.getFullYear()}年${displayMonth.getMonth() + 1}月`;

                const nav = document.createElement('span');
                nav.className = 'todo-datetime-nav';

                const prevBtn = document.createElement('span');
                prevBtn.className = 'todo-datetime-nav-btn';
                prevBtn.textContent = '‹';
                prevBtn.onclick = () => {
                    displayMonth.setMonth(displayMonth.getMonth() - 1);
                    render();
                };

                const nextBtn = document.createElement('span');
                nextBtn.className = 'todo-datetime-nav-btn';
                nextBtn.textContent = '›';
                nextBtn.onclick = () => {
                    displayMonth.setMonth(displayMonth.getMonth() + 1);
                    render();
                };

                nav.appendChild(prevBtn);
                nav.appendChild(nextBtn);
                header.appendChild(title);
                header.appendChild(nav);
                picker.appendChild(header);

                // 星期标题
                const weekdaysRow = document.createElement('span');
                weekdaysRow.className = 'todo-datetime-weekdays';
                weekdays.forEach(w => {
                    const wd = document.createElement('span');
                    wd.className = 'todo-datetime-weekday';
                    wd.textContent = w;
                    weekdaysRow.appendChild(wd);
                });
                picker.appendChild(weekdaysRow);

                // 日期网格
                const daysGrid = document.createElement('span');
                daysGrid.className = 'todo-datetime-days';

                const firstDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
                let startDay = firstDay.getDay() - 1; // 周一开始
                if (startDay < 0) startDay = 6;

                const lastDay = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0);
                const daysInMonth = lastDay.getDate();

                // 上月日期
                const prevMonthLast = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 0);
                for (let i = startDay - 1; i >= 0; i--) {
                    const day = document.createElement('span');
                    day.className = 'todo-datetime-day other-month disabled';
                    day.textContent = prevMonthLast.getDate() - i;
                    daysGrid.appendChild(day);
                }

                // 本月日期
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                for (let d = 1; d <= daysInMonth; d++) {
                    const day = document.createElement('span');
                    day.className = 'todo-datetime-day';
                    day.textContent = d;

                    const thisDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), d);
                    thisDate.setHours(23, 59, 59); // 用于比较

                    const thisDayStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), d);
                    thisDayStart.setHours(0, 0, 0, 0);

                    // 今天标记
                    if (thisDayStart.getTime() === today.getTime()) {
                        day.classList.add('today');
                    }

                    // 选中标记
                    if (selectedDate &&
                        thisDayStart.getDate() === selectedDate.getDate() &&
                        thisDayStart.getMonth() === selectedDate.getMonth() &&
                        thisDayStart.getFullYear() === selectedDate.getFullYear()) {
                        day.classList.add('selected');
                    }

                    // 禁用过去的日期
                    const compareDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), d);
                    compareDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());

                    if (compareDate < minDateTime || (maxDateTime && compareDate > maxDateTime)) {
                        day.classList.add('disabled');
                    } else {
                        day.onclick = () => {
                            selectedDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), d,
                                selectedDate.getHours(), selectedDate.getMinutes());
                            render();
                        };
                    }

                    daysGrid.appendChild(day);
                }

                // 下月日期
                const totalCells = startDay + daysInMonth;
                const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
                for (let d = 1; d <= remaining; d++) {
                    const day = document.createElement('span');
                    day.className = 'todo-datetime-day other-month disabled';
                    day.textContent = d;
                    daysGrid.appendChild(day);
                }

                picker.appendChild(daysGrid);

                // 时间选择
                const timeRow = document.createElement('span');
                timeRow.className = 'todo-datetime-time';

                const hourInput = document.createElement('input');
                hourInput.type = 'number';
                hourInput.className = 'todo-datetime-time-input';
                hourInput.min = 0;
                hourInput.max = 23;
                hourInput.value = selectedDate.getHours().toString().padStart(2, '0');
                hourInput.onchange = () => {
                    let h = parseInt(hourInput.value) || 0;
                    h = Math.max(0, Math.min(23, h));
                    selectedDate.setHours(h);
                    hourInput.value = h.toString().padStart(2, '0');
                };

                const sep = document.createElement('span');
                sep.className = 'todo-datetime-time-sep';
                sep.textContent = ':';

                const minInput = document.createElement('input');
                minInput.type = 'number';
                minInput.className = 'todo-datetime-time-input';
                minInput.min = 0;
                minInput.max = 59;
                minInput.value = selectedDate.getMinutes().toString().padStart(2, '0');
                minInput.onchange = () => {
                    let m = parseInt(minInput.value) || 0;
                    m = Math.max(0, Math.min(59, m));
                    selectedDate.setMinutes(m);
                    minInput.value = m.toString().padStart(2, '0');
                };

                timeRow.appendChild(hourInput);
                timeRow.appendChild(sep);
                timeRow.appendChild(minInput);
                picker.appendChild(timeRow);

                // 操作按钮
                const actions = document.createElement('span');
                actions.className = 'todo-datetime-actions';

                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'todo-datetime-btn';
                cancelBtn.textContent = t('cancel');
                cancelBtn.onclick = onCancel;

                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'todo-datetime-btn primary';
                confirmBtn.textContent = t('confirm');
                confirmBtn.onclick = () => {
                    // 格式化为 datetime-local 格式
                    const year = selectedDate.getFullYear();
                    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
                    const day = selectedDate.getDate().toString().padStart(2, '0');
                    const hour = selectedDate.getHours().toString().padStart(2, '0');
                    const min = selectedDate.getMinutes().toString().padStart(2, '0');
                    const value = `${year}-${month}-${day}T${hour}:${min}`;
                    onConfirm(value);
                };

                actions.appendChild(cancelBtn);
                actions.appendChild(confirmBtn);
                picker.appendChild(actions);
            }

            render();
            return picker;
        }

        // 显示截止时间选择器
        function showDueDatePicker(todoIndex, wrapper) {
            // 移除已有的选择器
            const existingPicker = wrapper.querySelector('.todo-due-picker');
            if (existingPicker) {
                existingPicker.remove();
                return;
            }

            const pickerWrapper = document.createElement('span');
            pickerWrapper.className = 'todo-due-picker';
            pickerWrapper.style.position = 'relative';

            const picker = createDateTimePicker(
                todos[todoIndex].dueDate,
                new Date().toISOString().slice(0, 16),
                null,
                (value) => {
                    todos[todoIndex].dueDate = value;
                    saveTodos();
                    renderTodos();
                },
                () => pickerWrapper.remove()
            );

            pickerWrapper.appendChild(picker);

            // 插入到待办项后面
            const todoItem = wrapper.querySelector('.todo-parent-item');
            todoItem.after(pickerWrapper);
        }

        // 定时更新所有截止时间显示
        function updateAllDueDates() {
            // 更新父待办的截止时间
            document.querySelectorAll('.todo-parent-item .todo-due-date').forEach(el => {
                const wrapper = el.closest('.todo-item-wrapper');
                if (!wrapper) return;
                const todoItem = wrapper.querySelector('.todo-parent-item');
                if (!todoItem) return;
                const actualIndex = parseInt(todoItem.dataset.actualIndex);
                if (todos[actualIndex] && todos[actualIndex].dueDate) {
                    updateDueDateDisplay(el, todos[actualIndex].dueDate);
                }
            });
            // 更新子待办的截止时间
            document.querySelectorAll('.todo-sub-item .todo-due-date').forEach(el => {
                const subItem = el.closest('.todo-sub-item');
                if (!subItem) return;
                const parentIndex = parseInt(subItem.dataset.parentIndex);
                const subIndex = parseInt(subItem.dataset.subIndex);
                if (todos[parentIndex] && todos[parentIndex].children && todos[parentIndex].children[subIndex] && todos[parentIndex].children[subIndex].dueDate) {
                    updateDueDateDisplay(el, todos[parentIndex].children[subIndex].dueDate);
                }
            });
        }

        // 使用统一定时器管理器（优化：合并定时器）
        if (window.timerManager) {
            window.timerManager.register('dueDateUpdate', updateAllDueDates, 60000);
        } else {
            // 降级方案
            setInterval(updateAllDueDates, 60000);
        }

        // 显示添加子待办的输入框
        function showSubTodoInput(parentIndex, wrapper) {
            // 检查是否已有输入框
            if (wrapper.querySelector('.todo-sub-input-group')) return;

            const inputGroup = document.createElement('span');
            inputGroup.className = 'todo-sub-input-group';

            const subInput = document.createElement('input');
            subInput.type = 'text';
            subInput.placeholder = t('subTodoPlaceholder');
            subInput.className = 'todo-sub-input';

            const confirmBtn = document.createElement('span');
            confirmBtn.className = 'todo-sub-confirm';
            confirmBtn.textContent = '✓';
            confirmBtn.onclick = () => addSubTodo(parentIndex, subInput.value);

            const cancelBtn = document.createElement('span');
            cancelBtn.className = 'todo-sub-cancel';
            cancelBtn.textContent = '×';
            cancelBtn.onclick = () => inputGroup.remove();

            subInput.onkeydown = (e) => {
                if (e.key === 'Enter') addSubTodo(parentIndex, subInput.value);
                if (e.key === 'Escape') inputGroup.remove();
            };

            inputGroup.appendChild(subInput);
            inputGroup.appendChild(confirmBtn);
            inputGroup.appendChild(cancelBtn);
            wrapper.appendChild(inputGroup);
            subInput.focus();
        }

        function addSubTodo(parentIndex, text) {
            const trimmedText = text.trim();
            if (trimmedText) {
                if (!todos[parentIndex].children) {
                    todos[parentIndex].children = [];
                }
                todos[parentIndex].children.push({ text: trimmedText, completed: false });
                saveTodos();
                renderTodos();
            }
        }

        function toggleSubTodo(parentIndex, subIndex) {
            todos[parentIndex].children[subIndex].completed = !todos[parentIndex].children[subIndex].completed;
            saveTodos();
            renderTodos();
        }

        function deleteSubTodo(parentIndex, subIndex, e) {
            e.stopPropagation();
            todos[parentIndex].children.splice(subIndex, 1);
            saveTodos();
            renderTodos();
        }

        function renderTodos() {
            const checkedGroupIds = getCheckedGroupIds();
            const pendingTodos = [];
            const completedTodos = [];

            todos.forEach((todo, index) => {
                // 只显示选中分组的待办
                if (!checkedGroupIds.includes(todo.groupId)) return;

                if (todo.completed) {
                    completedTodos.push({ todo, index });
                } else {
                    pendingTodos.push({ todo, index });
                }
            });

            // 优化：使用 DocumentFragment 批量插入，减少重排
            const pendingFragment = document.createDocumentFragment();
            pendingTodos.forEach(({ todo, index: actualIndex }, localIndex) => {
                pendingFragment.appendChild(createTodoItem(todo, localIndex, actualIndex, false));
            });
            
            // 一次性更新 DOM
            list.innerHTML = '';
            list.appendChild(pendingFragment);

            // 渲染已完成区域（如果有已完成项）
            if (completedTodos.length > 0) {
                const completedFragment = document.createDocumentFragment();
                
                // 已完成标题栏（可折叠）
                const header = document.createElement('span');
                header.className = 'todo-completed-header';
                header.onclick = () => {
                    completedCollapsed = !completedCollapsed;
                    renderTodos();
                };

                const headerText = document.createElement('span');
                headerText.textContent = `已完成 (${completedTodos.length})`;

                const chevron = document.createElement('span');
                chevron.className = 'todo-chevron';
                chevron.textContent = completedCollapsed ? '›' : '⌄';

                header.appendChild(headerText);
                header.appendChild(chevron);
                completedFragment.appendChild(header);

                // 已完成列表（可折叠）
                if (!completedCollapsed) {
                    const completedList = document.createElement('span');
                    completedList.className = 'todo-completed-list';

                    completedTodos.forEach(({ todo, index: actualIndex }, localIndex) => {
                        completedList.appendChild(createTodoItem(todo, localIndex, actualIndex, true));
                    });

                    completedFragment.appendChild(completedList);
                }
                
                // 一次性更新 DOM
                completedSection.innerHTML = '';
                completedSection.appendChild(completedFragment);
            } else {
                completedSection.innerHTML = '';
            }
        }

        function reorderTodos(fromIndex, toIndex, insertBefore) {
            // 获取当前显示的待办的实际索引
            const checkedGroupIds = getCheckedGroupIds();
            const pendingIndices = [];
            todos.forEach((todo, i) => {
                if (!todo.completed && checkedGroupIds.includes(todo.groupId)) {
                    pendingIndices.push(i);
                }
            });

            // 转换为在todos数组中的实际索引
            const actualFromIndex = pendingIndices[fromIndex] !== undefined ? pendingIndices[fromIndex] : fromIndex;
            const actualToIndex = pendingIndices[toIndex] !== undefined ? pendingIndices[toIndex] : toIndex;

            // 从原位置移除
            const [movedTodo] = todos.splice(actualFromIndex, 1);

            // 计算新的插入位置
            let newToIndex = actualToIndex;
            if (actualFromIndex < actualToIndex) {
                newToIndex--; // 因为移除了一个元素
            }
            if (!insertBefore) {
                newToIndex++;
            }

            // 插入到新位置
            todos.splice(newToIndex, 0, movedTodo);

            saveTodos();
            renderTodos();
        }

        function toggleTodo(index) {
            todos[index].completed = !todos[index].completed;
            // 同步子待办状态：父待办完成则子待办全完成，父待办取消完成则子待办全取消
            if (todos[index].children) {
                todos[index].children.forEach(child => {
                    child.completed = todos[index].completed;
                });
            }
            saveTodos();
            renderTodos();
            renderGroups();
        }

        function deleteTodo(index, e) {
            e.stopPropagation();
            todos.splice(index, 1);
            saveTodos();
            renderTodos();
            renderGroups();
        }

        function addTodo() {
            const text = input.value.trim();
            if (text) {
                // 新待办添加到第一个选中的分组
                const checkedGroupIds = getCheckedGroupIds();
                const groupId = checkedGroupIds.length > 0 ? checkedGroupIds[0] : 'default';
                todos.push({ text: text, completed: false, children: [], groupId: groupId });
                saveTodos();
                renderTodos();
                renderGroups();
                input.value = '';
            }
        }

        if (btn) btn.addEventListener('click', addTodo);
        if (input) input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTodo();
        });

        renderGroups();
        renderTodos();
    }
})();
