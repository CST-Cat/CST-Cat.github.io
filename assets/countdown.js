/*******************************************************************************
 * 考研倒计时 JavaScript
 * 
 * 功能模块：
 * - 显示距离考试的天、时、分、秒
 * - 支持自定义目标日期
 * - 支持边栏紧凑布局和页面完整布局
 * - 使用定时器管理器优化性能
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
     * 初始化倒计时模块
     */
    function init() {
        initCountdown();   // 初始化倒计时
    }

    // 监听重新初始化事件（用于动态创建的容器）
    window.addEventListener('reinit-countdown', () => {
        console.log('Reinitializing countdown...');
        initCountdown();
    });

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

        // 从 data-target 属性读取目标日期
        const targetDate = container.dataset.target || '2026-12-19T08:30:00';
        const examDate = new Date(targetDate);

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

        // 使用统一定时器管理器（优化：合并定时器）
        if (window.timerManager) {
            window.timerManager.register('countdown', updateCountdown, 1000);
        } else {
            // 降级方案：如果定时器管理器未加载，使用传统方式
            setInterval(updateCountdown, 1000);
        }

        // 初始化
        updateCountdown();
    }
})();
