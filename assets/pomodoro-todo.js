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
                <span class="todo-input-group">
                    <input type="text" id="new-todo" placeholder="To-do..." autocomplete="off">
                    <button id="add-todo-btn" title="Add">+</button>
                </span>
                <span id="todo-list"></span>
                <span id="todo-completed-section"></span>
            </span>
        `;

        const input = document.getElementById('new-todo');
        const btn = document.getElementById('add-todo-btn');
        const list = document.getElementById('todo-list');
        const completedSection = document.getElementById('todo-completed-section');

        let todos = [];
        try {
            todos = JSON.parse(localStorage.getItem('pomodoro_todos') || '[]');
        } catch (e) { todos = []; }

        function saveTodos() {
            localStorage.setItem('pomodoro_todos', JSON.stringify(todos));
        }

        function createTodoItem(todo, index, isInCompletedSection) {
            const li = document.createElement('span');
            li.className = 'todo-item' + (todo.completed ? ' completed' : '');

            // CSS 自绘复选框
            const checkbox = document.createElement('span');
            checkbox.className = 'todo-checkbox' + (todo.completed ? ' checked' : '');
            checkbox.onclick = () => toggleTodo(index);

            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = todo.text;

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

            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'todo-delete';
            deleteBtn.textContent = '×';
            deleteBtn.title = isInCompletedSection ? '删除' : '移除';
            deleteBtn.onclick = (e) => deleteTodo(index, e);

            li.appendChild(checkbox);
            li.appendChild(textSpan);
            li.appendChild(deleteBtn);
            return li;
        }

        function renderTodos() {
            list.innerHTML = '';
            completedSection.innerHTML = '';

            const pendingTodos = [];
            const completedTodos = [];

            todos.forEach((todo, index) => {
                if (todo.completed) {
                    completedTodos.push({ todo, index });
                } else {
                    pendingTodos.push({ todo, index });
                }
            });

            // 渲染未完成的待办
            pendingTodos.forEach(({ todo, index }) => {
                list.appendChild(createTodoItem(todo, index, false));
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
                    
                    completedTodos.forEach(({ todo, index }) => {
                        completedList.appendChild(createTodoItem(todo, index, true));
                    });
                    
                    completedSection.appendChild(completedList);
                }
            }
        }

        function toggleTodo(index) {
            todos[index].completed = !todos[index].completed;
            saveTodos();
            renderTodos();
        }

        function deleteTodo(index, e) {
            e.stopPropagation();
            todos.splice(index, 1);
            saveTodos();
            renderTodos();
        }

        function addTodo() {
            const text = input.value.trim();
            if (text) {
                todos.push({ text: text, completed: false });
                saveTodos();
                renderTodos();
                input.value = '';
            }
        }

        if (btn) btn.addEventListener('click', addTodo);
        if (input) input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTodo();
        });

        renderTodos();
    }
})();
