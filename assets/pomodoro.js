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

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
        }

        function updateDisplay() {
            timerDisplay.textContent = formatTime(timeLeft);
        }

        function updateStats() {
            const todayEl = document.getElementById('today-count');
            const totalEl = document.getElementById('total-minutes');
            if (todayEl) todayEl.textContent = todayCount;
            if (totalEl) totalEl.textContent = totalMinutes;
        }

        function startTimer() {
            if (isRunning) {
                clearInterval(timerInterval);
                isRunning = false;
                startBtn.textContent = '▶';
                container.classList.remove('running');
                timerLabel.textContent = '已暂停';
            } else {
                isRunning = true;
                startBtn.textContent = '⏸';
                container.classList.add('running');
                timerLabel.textContent = currentMode === 25 ? '专注中...' : '休息中...';

                timerInterval = setInterval(function () {
                    timeLeft--;
                    updateDisplay();

                    if (timeLeft <= 0) {
                        clearInterval(timerInterval);
                        isRunning = false;
                        startBtn.textContent = '▶';
                        container.classList.remove('running');

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
                    }
                }, 1000);
            }
        }

        function resetTimer() {
            clearInterval(timerInterval);
            isRunning = false;
            timeLeft = currentMode * 60;
            updateDisplay();
            startBtn.textContent = '▶';
            container.classList.remove('running');
            timerLabel.textContent = '准备开始专注';
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

        const examDate = new Date('2026-12-19T08:30:00');

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

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
})();
