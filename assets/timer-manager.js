/*******************************************************************************
 * 统一定时器管理器
 * 
 * 功能：
 * - 使用单一 requestAnimationFrame 管理所有定时器
 * - 页面不可见时自动暂停
 * - 减少 CPU 占用和提升性能
 ******************************************************************************/

class TimerManager {
    constructor() {
        this.timers = new Map();
        this.rafId = null;
        this.isRunning = false;
        this.setupVisibilityHandler();
    }

    /**
     * 注册定时器
     * @param {string} name - 定时器名称
     * @param {Function} callback - 回调函数
     * @param {number} interval - 间隔时间（毫秒）
     */
    register(name, callback, interval) {
        this.timers.set(name, {
            callback,
            interval,
            lastRun: 0,
            enabled: true
        });
        
        if (!this.isRunning) {
            this.start();
        }
    }

    /**
     * 注销定时器
     * @param {string} name - 定时器名称
     */
    unregister(name) {
        this.timers.delete(name);
        
        if (this.timers.size === 0) {
            this.stop();
        }
    }

    /**
     * 启用/禁用定时器
     * @param {string} name - 定时器名称
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(name, enabled) {
        const timer = this.timers.get(name);
        if (timer) {
            timer.enabled = enabled;
        }
    }

    /**
     * 启动定时器循环
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        const update = (timestamp) => {
            if (!this.isRunning) return;
            
            this.timers.forEach((timer, name) => {
                if (!timer.enabled) return;
                
                if (timestamp - timer.lastRun >= timer.interval) {
                    try {
                        timer.callback(timestamp);
                        timer.lastRun = timestamp;
                    } catch (error) {
                        console.error(`Timer ${name} error:`, error);
                    }
                }
            });
            
            this.rafId = requestAnimationFrame(update);
        };
        
        this.rafId = requestAnimationFrame(update);
    }

    /**
     * 停止定时器循环
     */
    stop() {
        this.isRunning = false;
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * 立即执行指定定时器
     * @param {string} name - 定时器名称
     */
    executeNow(name) {
        const timer = this.timers.get(name);
        if (timer && timer.enabled) {
            try {
                timer.callback(performance.now());
                timer.lastRun = performance.now();
            } catch (error) {
                console.error(`Timer ${name} error:`, error);
            }
        }
    }

    /**
     * 设置页面可见性处理
     */
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stop();
            } else {
                // 页面重新可见时，立即执行所有定时器一次
                this.timers.forEach((timer, name) => {
                    if (timer.enabled) {
                        timer.lastRun = 0; // 重置以便立即执行
                    }
                });
                this.start();
            }
        });
    }

    /**
     * 获取定时器状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            timerCount: this.timers.size,
            timers: Array.from(this.timers.keys())
        };
    }
}

// 创建全局单例
window.timerManager = new TimerManager();
