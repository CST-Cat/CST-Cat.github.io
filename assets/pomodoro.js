/*******************************************************************************
 * 番茄钟 JavaScript
 * 
 * 功能模块：
 * - 番茄钟计时器（Pomodoro Timer）
 *   - 25分钟专注、5分钟短休、15分钟长休
 *   - 支持暂停/继续/重置
 *   - 统计今日番茄数和总专注分钟数
 *   - 页面刷新后恢复计时状态
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
     * 初始化番茄钟模块
     */
    function init() {
        initPomodoro();    // 初始化番茄钟
    }

    // ==================== 番茄钟模块 ====================
    /**
     * 初始化番茄钟计时器
     * 
     * 功能：
     * - 三种模式：25分钟专注、5分钟短休、15分钟长休
     * - 开始/暂停/重置控制
     * - 统计今日番茄数和总专注分钟数
     * - 页面刷新后恢复计时状态
     * - 支持空格键开始/暂停，R键重置
     */
    function initPomodoro() {
        const container = document.getElementById('pomodoro-app');
        if (!container) return;  // 如果页面没有番茄钟容器，直接返回

        // 生成番茄钟界面 HTML
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

        // 计时器状态变量
        let timerInterval = null;      // 定时器 ID
        let timeLeft = 25 * 60;        // 剩余时间（秒）
        let isRunning = false;         // 是否正在运行
        let currentMode = 25;          // 当前模式（分钟数）
        let startTimestamp = null;     // 开始时间戳（用于精确计时）

        // 获取 DOM 元素
        const timerDisplay = document.getElementById('timer');
        const timerLabel = document.getElementById('timer-label');
        const startBtn = document.getElementById('start-btn');
        const resetBtn = document.getElementById('reset-btn');
        const modeBtns = container.querySelectorAll('.mode-btn');

        // 从 localStorage 加载统计数据
        let todayCount = parseInt(localStorage.getItem('pomodoro_todayCount') || '0');
        let totalMinutes = parseInt(localStorage.getItem('pomodoro_totalMinutes') || '0');
        let lastDate = localStorage.getItem('pomodoro_lastDate');

        // 检查日期，如果是新的一天，重置今日番茄数
        const today = new Date().toDateString();
        if (lastDate !== today) {
            todayCount = 0;
            localStorage.setItem('pomodoro_lastDate', today);
        }

        updateStats();  // 更新统计显示

        // ===== 计时状态存储函数 =====
        
        /**
         * 保存计时器状态到 localStorage
         * 用于页面刷新后恢复状态
         */
        function saveTimerState() {
            const state = {
                startTimestamp: startTimestamp,           // 开始时间戳
                currentMode: currentMode,                 // 当前模式
                isRunning: isRunning,                     // 是否运行中
                timeLeftWhenPaused: isRunning ? null : timeLeft  // 暂停时的剩余时间
            };
            localStorage.setItem('pomodoro_timerState', JSON.stringify(state));
        }

        /**
         * 清除保存的计时器状态
         */
        function clearTimerState() {
            localStorage.removeItem('pomodoro_timerState');
        }

        /**
         * 恢复计时器状态
         * 页面加载时调用，从 localStorage 恢复之前的状态
         * @returns {boolean} 是否成功恢复状态
         */
        function restoreTimerState() {
            try {
                const saved = localStorage.getItem('pomodoro_timerState');
                if (!saved) return false;

                const state = JSON.parse(saved);
                if (!state) return false;

                currentMode = state.currentMode || 25;

                // 更新模式按钮 UI
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

        /**
         * 格式化时间显示
         * @param {number} seconds - 秒数
         * @returns {string} 格式化的时间字符串（MM:SS）
         */
        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
        }

        /**
         * 更新计时器显示
         */
        function updateDisplay() {
            timerDisplay.textContent = formatTime(Math.max(0, timeLeft));
        }

        /**
         * 更新统计信息显示
         */
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

            // 使用统一定时器管理器（优化：合并定时器）
            const timerCallback = function () {
                // 基于时间戳计算，更准确
                const now = Date.now();
                const elapsed = Math.floor((now - startTimestamp) / 1000);
                timeLeft = (currentMode * 60) - elapsed;
                updateDisplay();

                if (timeLeft <= 0) {
                    if (window.timerManager) {
                        window.timerManager.unregister('pomodoro');
                    }
                    handleTimerComplete();
                }
            };

            if (window.timerManager) {
                window.timerManager.register('pomodoro', timerCallback, 1000);
            } else {
                // 降级方案
                timerInterval = setInterval(timerCallback, 1000);
            }
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
                if (window.timerManager) {
                    window.timerManager.unregister('pomodoro');
                } else {
                    clearInterval(timerInterval);
                }
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
            if (window.timerManager) {
                window.timerManager.unregister('pomodoro');
            } else {
                clearInterval(timerInterval);
            }
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
})();
