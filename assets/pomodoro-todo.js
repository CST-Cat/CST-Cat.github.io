/*******************************************************************************
 * 番茄钟 JavaScript - 动态生成界面
 ******************************************************************************/

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initPomodoro();
        initCountdown();
        initTodo();
    }

    // ==================== 番茄钟 ====================
    function initPomodoro() {
        const container = document.getElementById('pomodoro-app');
        if (!container) return;

        // 生成界面
        container.innerHTML = `
            <div class="timer-modes">
                <button class="mode-btn active" data-minutes="25">专注<span class="btn-number">25</span>分</button>
                <button class="mode-btn" data-minutes="5">短休<span class="btn-number">5</span>分</button>
                <button class="mode-btn" data-minutes="15">长休<span class="btn-number">15</span>分</button>
            </div>
            <div class="timer-display" id="timer">25:00</div>
            <div class="timer-label" id="timer-label">准备开始专注</div>
            <div class="timer-controls">
                <button class="control-btn secondary" id="reset-btn" title="重置">↺</button>
                <button class="control-btn primary" id="start-btn" title="开始">▶</button>
            </div>
            <div class="timer-stats">
                <div class="stat-item">
                    <span class="stat-value" id="today-count">0</span>
                    <span class="stat-label">今日番茄</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="total-minutes">0</span>
                    <span class="stat-label">专注分钟</span>
                </div>
            </div>
        `;

        let timerInterval = null;
        let timeLeft = 25 * 60;
        let isRunning = false;
        let currentMode = 25;
        let startTimestamp = null;  // 记录开始时间戳

        const timerDisplay = document.getElementById('timer');
        const timerLabel = document.getElementById('timer-label');
        const startBtn = document.getElementById('start-btn');
        const resetBtn = document.getElementById('reset-btn');
        const modeBtns = container.querySelectorAll('.mode-btn');

        // 统计数据
        let todayCount = parseInt(localStorage.getItem('pomodoro_todayCount') || '0');
        let totalMinutes = parseInt(localStorage.getItem('pomodoro_totalMinutes') || '0');
        let lastDate = localStorage.getItem('pomodoro_lastDate');

        const today = new Date().toDateString();
        if (lastDate !== today) {
            todayCount = 0;
            localStorage.setItem('pomodoro_lastDate', today);
        }

        updateStats();

        // ===== 计时状态存储函数 =====
        function saveTimerState() {
            const state = {
                startTimestamp: startTimestamp,
                currentMode: currentMode,
                isRunning: isRunning,
                timeLeftWhenPaused: isRunning ? null : timeLeft
            };
            localStorage.setItem('pomodoro_timerState', JSON.stringify(state));
        }

        function clearTimerState() {
            localStorage.removeItem('pomodoro_timerState');
        }

        function restoreTimerState() {
            try {
                const saved = localStorage.getItem('pomodoro_timerState');
                if (!saved) return false;

                const state = JSON.parse(saved);
                if (!state) return false;

                currentMode = state.currentMode || 25;
                
                // 更新模式按钮UI
                modeBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (parseInt(btn.dataset.minutes) === currentMode) {
                        btn.classList.add('active');
                    }
                });

                if (state.isRunning && state.startTimestamp) {
                    // 计算离开期间过了多少时间
                    const now = Date.now();
                    const elapsed = Math.floor((now - state.startTimestamp) / 1000);
                    const totalDuration = currentMode * 60;
                    timeLeft = totalDuration - elapsed;

                    if (timeLeft <= 0) {
                        // 在离开期间已经完成
                        handleTimerComplete();
                        clearTimerState();
                        return true;
                    }

                    // 恢复计时
                    startTimestamp = state.startTimestamp;
                    updateDisplay();
                    resumeTimer();
                    return true;
                } else if (state.timeLeftWhenPaused !== null && state.timeLeftWhenPaused !== undefined) {
                    // 恢复暂停状态
                    timeLeft = state.timeLeftWhenPaused;
                    updateDisplay();
                    timerLabel.textContent = '已暂停';
                    return true;
                }
            } catch (e) {
                // 恢复失败时静默处理
            }
            return false;
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
        }

        function updateDisplay() {
            timerDisplay.textContent = formatTime(Math.max(0, timeLeft));
        }

        function updateStats() {
            const todayEl = document.getElementById('today-count');
            const totalEl = document.getElementById('total-minutes');
            if (todayEl) todayEl.textContent = todayCount;
            if (totalEl) totalEl.textContent = totalMinutes;
        }

        function handleTimerComplete() {
            if (currentMode === 25) {
                todayCount++;
                totalMinutes += 25;
                localStorage.setItem('pomodoro_todayCount', todayCount);
                localStorage.setItem('pomodoro_totalMinutes', totalMinutes);
                localStorage.setItem('pomodoro_lastDate', today);
                updateStats();
                timerLabel.textContent = '🎉 完成！休息一下吧';
                playNotification();
            } else {
                timerLabel.textContent = '休息结束，继续加油！';
                playNotification();
            }
            timeLeft = currentMode * 60;
            updateDisplay();
            isRunning = false;
            startTimestamp = null;
            startBtn.textContent = '▶';
            container.classList.remove('running');
            clearTimerState();
        }

        function resumeTimer() {
            isRunning = true;
            startBtn.textContent = '⏸';
            container.classList.add('running');
            timerLabel.textContent = currentMode === 25 ? '专注中...' : '休息中...';
            
            // 保存运行状态
            saveTimerState();

            timerInterval = setInterval(function () {
                // 基于时间戳计算，更准确
                const now = Date.now();
                const elapsed = Math.floor((now - startTimestamp) / 1000);
                timeLeft = (currentMode * 60) - elapsed;
                updateDisplay();

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    handleTimerComplete();
                }
            }, 1000);
        }

        // 页面关闭/刷新前保存状态
        window.addEventListener('beforeunload', function () {
            if (isRunning) {
                saveTimerState();
            }
        });

        function startTimer() {
            if (isRunning) {
                // 暂停
                clearInterval(timerInterval);
                isRunning = false;
                startTimestamp = null;
                startBtn.textContent = '▶';
                container.classList.remove('running');
                timerLabel.textContent = '已暂停';
                saveTimerState();
            } else {
                // 开始/继续
                // 计算新的开始时间戳（基于剩余时间反推）
                startTimestamp = Date.now() - ((currentMode * 60 - timeLeft) * 1000);
                saveTimerState();
                resumeTimer();
            }
        }

        function resetTimer() {
            clearInterval(timerInterval);
            isRunning = false;
            startTimestamp = null;
            timeLeft = currentMode * 60;
            updateDisplay();
            startBtn.textContent = '▶';
            container.classList.remove('running');
            timerLabel.textContent = '准备开始专注';
            clearTimerState();
        }

        function playNotification() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.8);
            } catch (e) {
                console.log('Audio not available');
            }
        }

        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (isRunning) return;

                modeBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');

                currentMode = parseInt(btn.dataset.minutes);
                timeLeft = currentMode * 60;
                updateDisplay();
                clearTimerState();  // 切换模式时清除之前的状态

                if (currentMode === 25) {
                    timerLabel.textContent = '准备开始专注';
                } else if (currentMode === 5) {
                    timerLabel.textContent = '准备短休息';
                } else {
                    timerLabel.textContent = '准备长休息';
                }
            });
        });

        if (startBtn) startBtn.addEventListener('click', startTimer);
        if (resetBtn) resetBtn.addEventListener('click', resetTimer);

        document.addEventListener('keydown', function (e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                startTimer();
            } else if (e.code === 'KeyR') {
                resetTimer();
            }
        });

        // 页面加载时尝试恢复状态
        restoreTimerState();
    }

    // ==================== 考研倒计时 ====================
    function initCountdown() {
        const container = document.getElementById('countdown-app');
        if (!container) return;

        // 检测是否在边栏中（marginnote）
        const isInSidebar = container.closest('.marginnote') !== null;

        // 生成界面 - 边栏使用紧凑布局
        if (isInSidebar) {
            container.innerHTML = `
                <span class="countdown-compact">
                    <span class="countdown-value" id="days">---</span><span class="countdown-unit">天</span>
                    <span class="countdown-value" id="hours">--</span><span class="countdown-unit">时</span>
                    <span class="countdown-value" id="minutes-cd">--</span><span class="countdown-unit">分</span>
                    <span class="countdown-value" id="seconds">--</span><span class="countdown-unit">秒</span>
                </span>
            `;
        } else {
            container.innerHTML = `
                <div class="countdown-display">
                    <div class="countdown-item">
                        <span class="countdown-value" id="days">---</span>
                        <span class="countdown-unit">天</span>
                    </div>
                    <div class="countdown-item">
                        <span class="countdown-value" id="hours">--</span>
                        <span class="countdown-unit">时</span>
                    </div>
                    <div class="countdown-item">
                        <span class="countdown-value" id="minutes-cd">--</span>
                        <span class="countdown-unit">分</span>
                    </div>
                    <div class="countdown-item">
                        <span class="countdown-value" id="seconds">--</span>
                        <span class="countdown-unit">秒</span>
                    </div>
                </div>
            `;
        }

        // 优化2: 从 data-target 属性读取目标日期，支持每个页面自定义
        const targetDate = container.dataset.target || '2026-12-19T08:30:00';
        const examDate = new Date(targetDate);

        // 优化1: 使用 Page Visibility API，页面不可见时暂停定时器
        let countdownInterval = null;

        function updateCountdown() {
            const now = new Date();
            const diff = examDate - now;

            const daysEl = document.getElementById('days');
            const hoursEl = document.getElementById('hours');
            const minutesEl = document.getElementById('minutes-cd');
            const secondsEl = document.getElementById('seconds');

            if (diff <= 0) {
                if (daysEl) daysEl.textContent = '0';
                if (hoursEl) hoursEl.textContent = '00';
                if (minutesEl) minutesEl.textContent = '00';
                if (secondsEl) secondsEl.textContent = '00';
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (daysEl) daysEl.textContent = days;
            if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
            if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
            if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
        }

        function startCountdown() {
            if (countdownInterval) return;
            countdownInterval = setInterval(updateCountdown, 1000);
        }

        function stopCountdown() {
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        }

        // 页面可见性变化时启停定时器
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopCountdown();
            } else {
                updateCountdown();  // 立即更新一次
                startCountdown();
            }
        });

        // 初始化
        updateCountdown();
        startCountdown();
    }

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
                        <span class="todo-groups-title">分组</span>
                        <span class="todo-groups-add" title="新建分组">+</span>
                    </span>
                    <span class="todo-groups-list" id="todo-groups-list"></span>
                </span>
                <span class="todo-main-section">
                    <span class="todo-input-group">
                        <input type="text" id="new-todo" placeholder="To-do..." autocomplete="off">
                        <button id="add-todo-btn" title="Add">+</button>
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

        // 分组数据
        let groups = [];
        try {
            groups = JSON.parse(localStorage.getItem('pomodoro_groups') || '[]');
            if (groups.length === 0) {
                groups = [{ id: 'default', name: '默认', checked: true }];
            }
        } catch (e) { 
            groups = [{ id: 'default', name: '默认', checked: true }];
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
            const name = prompt('请输入分组名称：');
            if (name && name.trim()) {
                const id = 'group_' + Date.now();
                groups.push({ id, name: name.trim(), checked: true });
                saveGroups();
                renderGroups();
            }
        }

        function renameGroup(index) {
            const newName = prompt('请输入新的分组名称：', groups[index].name);
            if (newName && newName.trim()) {
                groups[index].name = newName.trim();
                saveGroups();
                renderGroups();
            }
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
                        menuItems.push({ icon: '✕', label: '移除截止时间', action: () => {
                            todos[parentIndex].children[subIndex].dueDate = null;
                            saveTodos();
                            renderTodos();
                        }});
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
            deleteBtn.title = '删除子待办';
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
                dragHandle.title = '拖拽排序';
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
                        menuItems.splice(1, 0, { icon: '✕', label: '移除截止时间', action: () => {
                            todo.dueDate = null;
                            saveTodos();
                            renderTodos();
                        }});
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
            addSubBtn.title = '添加子待办';
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
            deleteBtn.title = isInCompletedSection ? '删除' : '移除';
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
                cancelBtn.textContent = '取消';
                cancelBtn.onclick = onCancel;
                
                const confirmBtn = document.createElement('button');
                confirmBtn.className = 'todo-datetime-btn primary';
                confirmBtn.textContent = '确定';
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
        let dueDateUpdateInterval = null;
        function startDueDateUpdates() {
            if (dueDateUpdateInterval) return;
            dueDateUpdateInterval = setInterval(() => {
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
            }, 60000); // 每分钟更新一次
        }
        startDueDateUpdates();

        // 显示添加子待办的输入框
        function showSubTodoInput(parentIndex, wrapper) {
            // 检查是否已有输入框
            if (wrapper.querySelector('.todo-sub-input-group')) return;

            const inputGroup = document.createElement('span');
            inputGroup.className = 'todo-sub-input-group';

            const subInput = document.createElement('input');
            subInput.type = 'text';
            subInput.placeholder = '子待办...';
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
            list.innerHTML = '';
            completedSection.innerHTML = '';

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

            // 渲染未完成的待办（使用局部索引用于拖拽，实际索引用于操作）
            pendingTodos.forEach(({ todo, index: actualIndex }, localIndex) => {
                list.appendChild(createTodoItem(todo, localIndex, actualIndex, false));
            });

            // 渲染已完成区域（如果有已完成项）
            if (completedTodos.length > 0) {
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
                completedSection.appendChild(header);

                // 已完成列表（可折叠）
                if (!completedCollapsed) {
                    const completedList = document.createElement('span');
                    completedList.className = 'todo-completed-list';
                    
                    completedTodos.forEach(({ todo, index: actualIndex }, localIndex) => {
                        completedList.appendChild(createTodoItem(todo, localIndex, actualIndex, true));
                    });
                    
                    completedSection.appendChild(completedList);
                }
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
            // 当父待办完成时，所有子待办也标记为完成
            if (todos[index].completed && todos[index].children) {
                todos[index].children.forEach(child => {
                    child.completed = true;
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
