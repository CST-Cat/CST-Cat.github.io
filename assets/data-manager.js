/*******************************************************************************
 * 统一数据管理模块 (Data Manager)
 * 
 * 功能：
 * 1. 统一的数据导入/导出接口
 * 2. localStorage 数据管理
 * 3. 数据备份与恢复
 * 4. 跨模块数据同步
 * 5. 通知系统
 * 
 * 设计原则：
 * - 向后兼容：不影响现有 vocabulary.js 和 pomodoro-todo.js
 * - 可选增强：现有模块可以选择性使用此模块
 * - 独立运行：可以单独加载和使用
 * - 多语言支持：基于 HTML lang 属性自动切换语言
 ******************************************************************************/

(function () {
    'use strict';

    // ==================== 国际化配置 ====================
    
    /**
     * 获取当前页面语言
     * 从 HTML 根元素的 lang 属性读取
     */
    function getLang() {
        return document.documentElement.lang || 'zh';
    }

    /**
     * 多语言文本配置
     */
    const i18n = {
        zh: {
            // 按钮文本
            export: '导出',
            import: '导入',
            clear: '清除',
            
            // 工具提示
            exportTitle: '导出所有学习数据',
            importTitle: '导入学习数据',
            clearTitle: '清除所有数据',
            
            // 通知消息
            exportSuccess: '数据导出成功',
            importSuccess: '数据导入成功',
            clearSuccess: '所有数据已清除',
            fileReadError: '文件读取失败',
            exportError: '导出失败',
            importError: '导入失败',
            clearError: '清除失败',
            invalidFormat: '无效的备份文件格式',
            
            // 确认对话框
            clearConfirm1: '确定要清除所有学习数据吗？此操作不可恢复！\n\n建议先导出备份。',
            clearConfirm2: '再次确认：真的要删除所有数据吗？'
        },
        en: {
            // Button text
            export: 'Export',
            import: 'Import',
            clear: 'Clear',
            
            // Tooltips
            exportTitle: 'Export all learning data',
            importTitle: 'Import learning data',
            clearTitle: 'Clear all data',
            
            // Notification messages
            exportSuccess: 'Data exported successfully',
            importSuccess: 'Data imported successfully',
            clearSuccess: 'All data cleared',
            fileReadError: 'Failed to read file',
            exportError: 'Export failed',
            importError: 'Import failed',
            clearError: 'Clear failed',
            invalidFormat: 'Invalid backup file format',
            
            // Confirmation dialogs
            clearConfirm1: 'Are you sure you want to clear all learning data? This action cannot be undone!\n\nIt is recommended to export a backup first.',
            clearConfirm2: 'Confirm again: Do you really want to delete all data?'
        }
    };

    /**
     * 获取翻译文本
     * @param {string} key - 文本键名
     * @returns {string} 翻译后的文本
     */
    function t(key) {
        const lang = getLang();
        return i18n[lang][key] || i18n['zh'][key] || key;
    }

    // ==================== 数据管理核心类 ====================

    class DataManager {
        constructor() {
            this.version = '1.0.0';
            this.initialized = false;
        }

        /**
         * 初始化数据管理器
         */
        init() {
            if (this.initialized) return;
            
            console.log('DataManager: Initializing...');
            this.setupUI();
            this.initialized = true;
            console.log('DataManager: Initialized successfully');
        }

        /**
         * 设置数据管理UI（如果容器存在）
         */
        setupUI() {
            const container = document.getElementById('data-management-app');
            if (!container) {
                console.log('DataManager: No UI container found, running in headless mode');
                return;
            }

            // 生成数据管理UI
            container.innerHTML = `
                <span class="data-management-wrapper">
                    <span class="data-management-buttons">
                        <button class="data-btn" id="data-export-btn" title="${t('exportTitle')}">
                            ${t('export')}
                        </button>
                        <button class="data-btn" id="data-import-btn" title="${t('importTitle')}">
                            ${t('import')}
                        </button>
                        <button class="data-btn" id="data-clear-btn" title="${t('clearTitle')}">
                            ${t('clear')}
                        </button>
                    </span>
                    <input type="file" id="data-import-file" accept=".json" style="display: none;">
                </span>
            `;

            // 绑定事件
            this.bindEvents();
        }

        /**
         * 绑定UI事件
         */
        bindEvents() {
            const exportBtn = document.getElementById('data-export-btn');
            const importBtn = document.getElementById('data-import-btn');
            const clearBtn = document.getElementById('data-clear-btn');
            const fileInput = document.getElementById('data-import-file');

            if (exportBtn) {
                exportBtn.addEventListener('click', () => this.exportAllData());
            }

            if (importBtn && fileInput) {
                importBtn.addEventListener('click', () => fileInput.click());
                
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            this.importData(event.target.result);
                        } catch (error) {
                            this.showNotification(t('fileReadError'), 'error');
                        }
                        fileInput.value = '';
                    };
                    reader.readAsText(file);
                });
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearAllData());
            }
        }

        // ==================== 数据导出 ====================

        /**
         * 导出所有学习数据
         */
        exportAllData() {
            try {
                const data = this.collectAllData();
                
                // 创建下载链接
                const dataStr = JSON.stringify(data, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                const dateStr = new Date().toISOString().split('T')[0];
                link.download = `kiro-backup-${dateStr}.json`;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                this.showNotification(t('exportSuccess'), 'success');
                console.log('DataManager: Data exported successfully');
            } catch (error) {
                console.error('DataManager: Export failed:', error);
                this.showNotification(t('exportError') + '：' + error.message, 'error');
            }
        }

        /**
         * 收集所有需要导出的数据
         */
        collectAllData() {
            const data = {
                version: this.version,
                exportDate: new Date().toISOString(),
                vocabulary: this.collectVocabularyData(),
                pomodoro: this.collectPomodoroData(),
                todos: this.collectTodoData(),
                settings: this.collectSettingsData()
            };

            return data;
        }

        /**
         * 收集单词学习数据
         */
        collectVocabularyData() {
            return {
                progress: this.getLocalStorageItem('vocab_progress', {}),
                todayStats: this.getLocalStorageItem('vocab_todayStats', {}),
                currentBank: localStorage.getItem('vocab_currentBank') || 'kaoyan',
                selectedMode: localStorage.getItem('vocab_selectedMode') || 'new'
            };
        }

        /**
         * 收集番茄钟数据
         */
        collectPomodoroData() {
            return {
                todayCount: localStorage.getItem('pomodoro_todayCount'),
                totalMinutes: localStorage.getItem('pomodoro_totalMinutes'),
                lastDate: localStorage.getItem('pomodoro_lastDate'),
                timerState: this.getLocalStorageItem('pomodoro_timerState', null)
            };
        }

        /**
         * 收集待办清单数据
         */
        collectTodoData() {
            return {
                todos: localStorage.getItem('pomodoro_todos'),
                groups: localStorage.getItem('pomodoro_groups')
            };
        }

        /**
         * 收集用户设置数据
         */
        collectSettingsData() {
            return {
                themePreference: localStorage.getItem('theme-preference')
            };
        }

        // ==================== 数据导入 ====================

        /**
         * 导入并合并学习数据
         */
        importData(jsonData) {
            try {
                const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

                if (!data.version) {
                    throw new Error(t('invalidFormat'));
                }

                let importedCount = 0;

                // 导入单词学习数据
                if (data.vocabulary) {
                    importedCount += this.importVocabularyData(data.vocabulary);
                }

                // 导入番茄钟数据
                if (data.pomodoro) {
                    this.importPomodoroData(data.pomodoro);
                }

                // 导入待办清单数据
                if (data.todos) {
                    this.importTodoData(data.todos);
                }

                // 导入用户设置
                if (data.settings) {
                    this.importSettingsData(data.settings);
                }

                this.showNotification(`数据导入成功！已更新 ${importedCount} 条学习记录`, 'success');
                console.log('DataManager: Data imported successfully');

                // 刷新页面以显示新数据
                setTimeout(() => {
                    location.reload();
                }, 1500);

            } catch (error) {
                console.error('DataManager: Import failed:', error);
                this.showNotification(t('importError') + '：' + error.message, 'error');
            }
        }

        /**
         * 导入单词学习数据
         */
        importVocabularyData(vocabData) {
            let importedCount = 0;

            // 合并学习进度（保留最新记录）
            if (vocabData.progress) {
                const currentProgress = this.getLocalStorageItem('vocab_progress', {});
                const importedProgress = vocabData.progress;
                
                Object.keys(importedProgress).forEach(key => {
                    const imported = importedProgress[key];
                    const current = currentProgress[key];
                    
                    // 如果没有当前记录，或导入的记录更新，则使用导入的
                    if (!current || 
                        !current.lastReview || 
                        (imported.lastReview && new Date(imported.lastReview) > new Date(current.lastReview))) {
                        currentProgress[key] = imported;
                        importedCount++;
                    }
                });
                
                this.setLocalStorageItem('vocab_progress', currentProgress);
            }

            // 合并今日统计（保留今天的数据，累加历史数据）
            if (vocabData.todayStats) {
                const today = new Date().toDateString();
                const currentStats = this.getLocalStorageItem('vocab_todayStats', {
                    date: today,
                    learned: 0,
                    reviewed: 0,
                    target: 20
                });
                const importedStats = vocabData.todayStats;
                
                // 如果导入的是今天的数据，取最大值
                if (importedStats.date === today) {
                    currentStats.learned = Math.max(currentStats.learned, importedStats.learned || 0);
                    currentStats.reviewed = Math.max(currentStats.reviewed, importedStats.reviewed || 0);
                    currentStats.target = importedStats.target || currentStats.target;
                }
                // 如果导入的是历史数据，保留当前数据
                
                this.setLocalStorageItem('vocab_todayStats', currentStats);
            }

            // 导入其他单词数据
            if (vocabData.currentBank) {
                localStorage.setItem('vocab_currentBank', vocabData.currentBank);
            }
            
            if (vocabData.selectedMode) {
                localStorage.setItem('vocab_selectedMode', vocabData.selectedMode);
            }

            return importedCount;
        }

        /**
         * 导入番茄钟数据
         */
        importPomodoroData(pomodoroData) {
            // 累加总分钟数
            if (pomodoroData.totalMinutes) {
                const currentTotal = parseInt(localStorage.getItem('pomodoro_totalMinutes') || '0');
                const importedTotal = parseInt(pomodoroData.totalMinutes || '0');
                localStorage.setItem('pomodoro_totalMinutes', (currentTotal + importedTotal).toString());
            }

            // 保留最大的今日番茄数
            if (pomodoroData.todayCount) {
                const currentCount = parseInt(localStorage.getItem('pomodoro_todayCount') || '0');
                const importedCount = parseInt(pomodoroData.todayCount || '0');
                if (importedCount > currentCount) {
                    localStorage.setItem('pomodoro_todayCount', pomodoroData.todayCount);
                }
            }

            if (pomodoroData.lastDate) {
                localStorage.setItem('pomodoro_lastDate', pomodoroData.lastDate);
            }
        }

        /**
         * 导入待办清单数据
         */
        importTodoData(todoData) {
            if (todoData.todos) {
                // 合并待办（避免重复）
                try {
                    const currentTodos = this.getLocalStorageItem('pomodoro_todos', []);
                    const importedTodos = JSON.parse(todoData.todos);
                    
                    // 简单合并：添加不存在的待办
                    const existingTexts = new Set(currentTodos.map(t => t.text));
                    importedTodos.forEach(todo => {
                        if (!existingTexts.has(todo.text)) {
                            currentTodos.push(todo);
                        }
                    });
                    
                    this.setLocalStorageItem('pomodoro_todos', currentTodos);
                } catch (e) {
                    localStorage.setItem('pomodoro_todos', todoData.todos);
                }
            }

            if (todoData.groups) {
                // 合并分组
                try {
                    const currentGroups = this.getLocalStorageItem('pomodoro_groups', []);
                    const importedGroups = JSON.parse(todoData.groups);
                    
                    const existingIds = new Set(currentGroups.map(g => g.id));
                    importedGroups.forEach(group => {
                        if (!existingIds.has(group.id)) {
                            currentGroups.push(group);
                        }
                    });
                    
                    this.setLocalStorageItem('pomodoro_groups', currentGroups);
                } catch (e) {
                    localStorage.setItem('pomodoro_groups', todoData.groups);
                }
            }
        }

        /**
         * 导入用户设置数据
         */
        importSettingsData(settingsData) {
            if (settingsData.themePreference) {
                localStorage.setItem('theme-preference', settingsData.themePreference);
            }
        }

        // ==================== 数据清除 ====================

        /**
         * 清除所有数据（需要确认）
         */
        clearAllData() {
            if (!confirm(t('clearConfirm1'))) {
                return;
            }

            if (!confirm(t('clearConfirm2'))) {
                return;
            }

            try {
                // 清除单词学习数据
                localStorage.removeItem('vocab_progress');
                localStorage.removeItem('vocab_todayStats');
                localStorage.removeItem('vocab_currentBank');
                localStorage.removeItem('vocab_selectedMode');

                // 清除番茄钟数据
                localStorage.removeItem('pomodoro_todayCount');
                localStorage.removeItem('pomodoro_totalMinutes');
                localStorage.removeItem('pomodoro_lastDate');
                localStorage.removeItem('pomodoro_timerState');

                // 清除待办清单数据
                localStorage.removeItem('pomodoro_todos');
                localStorage.removeItem('pomodoro_groups');

                // 清除用户设置
                localStorage.removeItem('theme-preference');

                // 清除 IndexedDB 缓存
                if (window.indexedDBHelper) {
                    window.indexedDBHelper.clearAll().catch(e => {
                        console.warn('Failed to clear IndexedDB:', e);
                    });
                }

                this.showNotification(t('clearSuccess'), 'success');
                console.log('DataManager: All data cleared');

                // 刷新页面
                setTimeout(() => {
                    location.reload();
                }, 1000);

            } catch (error) {
                console.error('DataManager: Clear failed:', error);
                this.showNotification(t('clearError') + '：' + error.message, 'error');
            }
        }

        // ==================== 工具方法 ====================

        /**
         * 安全获取 localStorage 项（JSON 解析）
         */
        getLocalStorageItem(key, defaultValue) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn(`Failed to parse localStorage item: ${key}`, e);
                return defaultValue;
            }
        }

        /**
         * 安全设置 localStorage 项（JSON 序列化）
         */
        setLocalStorageItem(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error(`Failed to set localStorage item: ${key}`, e);
                throw e;
            }
        }

        /**
         * 显示通知消息
         */
        showNotification(message, type = 'info') {
            // 创建通知元素
            const notification = document.createElement('div');
            notification.className = `data-notification data-notification-${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            // 触发动画
            setTimeout(() => {
                notification.classList.add('show');
            }, 10);
            
            // 3秒后移除
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }

        // ==================== 数据统计 ====================

        /**
         * 获取数据统计信息
         */
        getDataStats() {
            const progress = this.getLocalStorageItem('vocab_progress', {});
            const todayStats = this.getLocalStorageItem('vocab_todayStats', {});
            
            // 计算需要复习的单词数量
            const today = new Date();
            let reviewDueCount = 0;
            
            Object.values(progress).forEach(item => {
                if (item.status !== 'unknown' && item.nextReview) {
                    const nextReview = new Date(item.nextReview);
                    if (today >= nextReview) {
                        reviewDueCount++;
                    }
                }
            });
            
            const stats = {
                vocabulary: {
                    progressCount: Object.keys(progress).length,
                    reviewDueCount: reviewDueCount,
                    todayLearned: todayStats.learned || 0,
                    todayReviewed: todayStats.reviewed || 0,
                    currentBank: localStorage.getItem('vocab_currentBank') || 'kaoyan',
                    selectedMode: localStorage.getItem('vocab_selectedMode') || 'new'
                },
                pomodoro: {
                    todayCount: parseInt(localStorage.getItem('pomodoro_todayCount') || '0'),
                    totalMinutes: parseInt(localStorage.getItem('pomodoro_totalMinutes') || '0')
                },
                todos: {
                    todoCount: this.getLocalStorageItem('pomodoro_todos', []).length,
                    groupCount: this.getLocalStorageItem('pomodoro_groups', []).length
                },
                settings: {
                    themePreference: localStorage.getItem('theme-preference') || 'auto'
                }
            };

            return stats;
        }

        /**
         * 打印数据统计（开发者工具）
         */
        printStats() {
            const stats = this.getDataStats();
            console.log('Data Statistics:', stats);
            return stats;
        }
    }

    // ==================== 全局实例 ====================

    // 创建全局单例
    window.dataManager = new DataManager();

    // 根据 DOM 加载状态决定何时初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.dataManager.init();
        });
    } else {
        window.dataManager.init();
    }

    // ==================== 开发者工具 ====================

    /**
     * 暴露给控制台的工具函数
     */
    window.dataManagerDevTools = {
        // 查看数据统计
        stats: function() {
            return window.dataManager.printStats();
        },
        
        // 导出数据
        export: function() {
            window.dataManager.exportAllData();
        },
        
        // 清除所有数据
        clear: function() {
            window.dataManager.clearAllData();
        },
        
        // 查看原始数据
        raw: function() {
            return window.dataManager.collectAllData();
        },
        
        // 帮助信息
        help: function() {
            console.log(`
Data Manager Dev Tools

可用命令：
- dataManagerDevTools.stats()   查看数据统计
- dataManagerDevTools.export()  导出所有数据
- dataManagerDevTools.clear()   清除所有数据
- dataManagerDevTools.raw()     查看原始数据
- dataManagerDevTools.help()    显示此帮助

示例：
  dataManagerDevTools.stats()   // 查看数据统计
  dataManagerDevTools.export()  // 导出备份
            `);
        }
    };

    console.log('Data Manager loaded. Type "dataManagerDevTools.help()" for commands.');

})();
