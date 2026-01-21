/*******************************************************************************
 * 性能监控工具
 * 
 * 功能：
 * - 监控函数执行时间
 * - 检测性能瓶颈
 * - 提供性能报告
 ******************************************************************************/

class PerformanceMonitor {
    constructor() {
        this.measurements = new Map();
        this.enabled = true;
        this.threshold = 16; // 一帧时间（16ms）
    }

    /**
     * 包装函数以监控性能
     * @param {Function} fn - 要监控的函数
     * @param {string} name - 函数名称
     * @returns {Function} 包装后的函数
     */
    measure(fn, name) {
        if (!this.enabled) return fn;

        const self = this;
        return function (...args) {
            const start = performance.now();
            const result = fn.apply(this, args);
            const end = performance.now();
            const duration = end - start;

            // 记录测量结果
            if (!self.measurements.has(name)) {
                self.measurements.set(name, {
                    count: 0,
                    totalTime: 0,
                    maxTime: 0,
                    minTime: Infinity,
                    slowCalls: []
                });
            }

            const stats = self.measurements.get(name);
            stats.count++;
            stats.totalTime += duration;
            stats.maxTime = Math.max(stats.maxTime, duration);
            stats.minTime = Math.min(stats.minTime, duration);

            // 记录慢调用
            if (duration > self.threshold) {
                stats.slowCalls.push({
                    duration: duration.toFixed(2),
                    timestamp: new Date().toISOString(),
                    args: args.length
                });

                // 只保留最近 10 次慢调用
                if (stats.slowCalls.length > 10) {
                    stats.slowCalls.shift();
                }

                console.warn(`⚠️ ${name} took ${duration.toFixed(2)}ms (threshold: ${self.threshold}ms)`);
            }

            return result;
        };
    }

    /**
     * 测量异步函数
     * @param {Function} fn - 要监控的异步函数
     * @param {string} name - 函数名称
     * @returns {Function} 包装后的函数
     */
    measureAsync(fn, name) {
        if (!this.enabled) return fn;

        const self = this;
        return async function (...args) {
            const start = performance.now();
            const result = await fn.apply(this, args);
            const end = performance.now();
            const duration = end - start;

            // 记录测量结果（同步版本）
            if (!self.measurements.has(name)) {
                self.measurements.set(name, {
                    count: 0,
                    totalTime: 0,
                    maxTime: 0,
                    minTime: Infinity,
                    slowCalls: []
                });
            }

            const stats = self.measurements.get(name);
            stats.count++;
            stats.totalTime += duration;
            stats.maxTime = Math.max(stats.maxTime, duration);
            stats.minTime = Math.min(stats.minTime, duration);

            if (duration > self.threshold) {
                stats.slowCalls.push({
                    duration: duration.toFixed(2),
                    timestamp: new Date().toISOString(),
                    args: args.length
                });

                if (stats.slowCalls.length > 10) {
                    stats.slowCalls.shift();
                }

                console.warn(`⚠️ ${name} (async) took ${duration.toFixed(2)}ms`);
            }

            return result;
        };
    }

    /**
     * 标记性能点
     * @param {string} name - 标记名称
     */
    mark(name) {
        if (this.enabled) {
            performance.mark(name);
        }
    }

    /**
     * 测量两个标记之间的时间
     * @param {string} name - 测量名称
     * @param {string} startMark - 开始标记
     * @param {string} endMark - 结束标记
     */
    measureBetween(name, startMark, endMark) {
        if (!this.enabled) return;

        try {
            performance.measure(name, startMark, endMark);
            const measure = performance.getEntriesByName(name)[0];
            
            if (measure.duration > this.threshold) {
                console.warn(`⚠️ ${name} took ${measure.duration.toFixed(2)}ms`);
            }
        } catch (error) {
            console.error('Performance measurement error:', error);
        }
    }

    /**
     * 获取性能报告
     * @returns {object} 性能统计
     */
    getReport() {
        const report = {
            summary: {
                totalFunctions: this.measurements.size,
                totalCalls: 0,
                totalTime: 0,
                slowFunctions: []
            },
            details: []
        };

        this.measurements.forEach((stats, name) => {
            const avgTime = stats.totalTime / stats.count;
            
            report.summary.totalCalls += stats.count;
            report.summary.totalTime += stats.totalTime;

            const detail = {
                name,
                calls: stats.count,
                avgTime: avgTime.toFixed(2),
                maxTime: stats.maxTime.toFixed(2),
                minTime: stats.minTime === Infinity ? 0 : stats.minTime.toFixed(2),
                totalTime: stats.totalTime.toFixed(2),
                slowCalls: stats.slowCalls.length
            };

            report.details.push(detail);

            // 记录慢函数
            if (avgTime > this.threshold) {
                report.summary.slowFunctions.push({
                    name,
                    avgTime: avgTime.toFixed(2)
                });
            }
        });

        // 按平均时间排序
        report.details.sort((a, b) => parseFloat(b.avgTime) - parseFloat(a.avgTime));
        report.summary.slowFunctions.sort((a, b) => parseFloat(b.avgTime) - parseFloat(a.avgTime));

        return report;
    }

    /**
     * 打印性能报告
     */
    printReport() {
        const report = this.getReport();
        
        console.group('📊 Performance Report');
        console.log(`Total Functions: ${report.summary.totalFunctions}`);
        console.log(`Total Calls: ${report.summary.totalCalls}`);
        console.log(`Total Time: ${report.summary.totalTime.toFixed(2)}ms`);
        
        if (report.summary.slowFunctions.length > 0) {
            console.group('⚠️ Slow Functions (avg > 16ms)');
            report.summary.slowFunctions.forEach(fn => {
                console.log(`${fn.name}: ${fn.avgTime}ms`);
            });
            console.groupEnd();
        }

        console.group('📈 Top 10 Functions by Avg Time');
        report.details.slice(0, 10).forEach(detail => {
            console.log(`${detail.name}: ${detail.avgTime}ms (${detail.calls} calls)`);
        });
        console.groupEnd();

        console.groupEnd();
    }

    /**
     * 清除所有测量数据
     */
    clear() {
        this.measurements.clear();
        performance.clearMarks();
        performance.clearMeasures();
    }

    /**
     * 启用/禁用监控
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 设置慢调用阈值
     * @param {number} threshold - 阈值（毫秒）
     */
    setThreshold(threshold) {
        this.threshold = threshold;
    }
}

// 创建全局单例
window.performanceMonitor = new PerformanceMonitor();

// 开发模式下自动打印报告
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // 每 30 秒打印一次报告
    setInterval(() => {
        if (window.performanceMonitor.measurements.size > 0) {
            window.performanceMonitor.printReport();
        }
    }, 30000);
}

// 提供全局快捷方式
window.perfReport = () => window.performanceMonitor.printReport();
window.perfClear = () => window.performanceMonitor.clear();
