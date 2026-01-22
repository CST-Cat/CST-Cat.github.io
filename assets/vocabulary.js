/*******************************************************************************
 * 背单词功能 JavaScript (Vocabulary Drill)
 * 
 * ============================================================================
 * 文件说明
 * ============================================================================
 * 这是一个完整的单词学习系统，实现了类似 Anki 的间隔重复学习算法。
 * 
 * 核心功能模块：
 * 1. 词库管理系统
 *    - 支持多词库切换（考研、六级等）
 *    - 从外部 JSON 文件动态加载词库数据
 *    - 使用 IndexedDB 缓存词库，提升加载速度
 *    - 自动合并多个 JSON 文件为完整词库
 * 
 * 2. 学习进度追踪
 *    - 记录每个单词的学习状态（未学、学习中、已掌握）
 *    - 追踪复习次数和最后复习时间
 *    - 基于艾宾浩斯遗忘曲线计算下次复习时间
 *    - 所有数据持久化到 localStorage
 * 
 * 3. 侧栏进度显示
 *    - 实时显示今日学习进度（新学/复习）
 *    - 展示本周学习统计
 *    - 显示词库掌握率
 *    - 提供快速开始学习的入口
 * 
 * 4. 主区域学习界面
 *    - 翻转卡片式单词展示
 *    - 正面显示单词和音标
 *    - 背面显示详细释义、例句、同义词等
 *    - 支持键盘快捷键操作
 *    - 三种掌握程度选择（不认识/模糊/认识）
 * 
 * 5. 智能学习算法
 *    - 优先复习到期的单词
 *    - 根据掌握程度动态调整复习间隔
 *    - 支持新词学习和旧词复习两种模式
 *    - 自动打乱单词顺序，避免记忆顺序
 * 
 * ============================================================================
 * 技术特点
 * ============================================================================
 * - 使用 IIFE（立即执行函数）封装，避免全局变量污染
 * - 异步加载词库数据，不阻塞页面渲染
 * - IndexedDB 缓存机制，减少网络请求
 * - 响应式设计，支持移动端和桌面端
 * - 完整的错误处理和降级方案
 * - 提供开发者工具，方便调试和测试
 * 
 * ============================================================================
 * 数据结构说明
 * ============================================================================
 * 
 * 词库配置 (wordBankConfig):
 * {
 *   kaoyan: {
 *     name: '考研核心词汇',
 *     files: ['path/to/json1', 'path/to/json2', ...]
 *   }
 * }
 * 
 * 学习进度 (localStorage: vocab_progress):
 * {
 *   'bankId_wordId': {
 *     status: 'unknown' | 'learning' | 'known',  // 学习状态
 *     reviewCount: 0,                             // 复习次数
 *     lastReview: '2024-01-01',                   // 最后复习日期
 *     nextReview: '2024-01-02',                   // 下次复习日期
 *     lastResult: 'unknown' | 'learning' | 'known' // 最后一次的掌握程度
 *   }
 * }
 * 
 * 今日统计 (localStorage: vocab_todayStats):
 * {
 *   date: '2024-01-01',  // 日期
 *   learned: 10,         // 今日新学单词数
 *   reviewed: 5,         // 今日复习单词数
 *   target: 20           // 每日目标单词数
 * }
 * 
 * ============================================================================
 * 使用方法
 * ============================================================================
 * 1. 在 HTML 中添加容器元素：
 *    <div id="vocab-sidebar"></div>  <!-- 侧栏进度 -->
 *    <div id="vocab-app"></div>      <!-- 主学习区域 -->
 * 
 * 2. 引入此 JS 文件，自动初始化
 * 
 * 3. 开发者工具（在浏览器控制台使用）：
 *    vocabDevTools.help()              // 查看所有可用命令
 *    vocabDevTools.showProgress()      // 查看学习进度
 *    vocabDevTools.clearAllData()      // 清除所有数据
 * 
 * ============================================================================
 * 作者信息
 * ============================================================================
 * 创建日期: 2024
 * 最后更新: 2024
 * 版本: 1.0.0
 ******************************************************************************/

// ============================================================================
// 使用 IIFE（立即执行函数表达式）创建独立作用域
// 目的：
// 1. 避免变量污染全局作用域
// 2. 创建私有变量和函数
// 3. 只暴露必要的接口（如 vocabDevTools）
// ============================================================================
(function () {
    'use strict'; // 启用严格模式，捕获常见编程错误

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
            // 加载提示
            loading: '正在加载词库...',
            loadingTitle: '📚 正在加载词库...',
            loadingSubtitle: '请稍候，正在准备学习内容...',
            loadingText: '首次加载可能需要几秒钟',
            
            // 完成消息
            completeTitle: '🎉 恭喜完成！',
            completeText: '你已完成今日的学习目标',
            completeStats: '今日新学 {learned} 词，复习 {reviewed} 词',
            completeEncourage: '继续保持，每天进步一点点！',
            continueBtn: '继续学习',
            
            // 错误提示
            loadError: '加载失败，请刷新重试',
            detailsError: '详情加载失败'
        },
        en: {
            // Loading messages
            loading: 'Loading vocabulary...',
            loadingTitle: '📚 Loading Vocabulary...',
            loadingSubtitle: 'Please wait, preparing learning content...',
            loadingText: 'First load may take a few seconds',
            
            // Completion messages
            completeTitle: '🎉 Congratulations!',
            completeText: 'You have completed today\'s learning goal',
            completeStats: 'Learned {learned} words, reviewed {reviewed} words today',
            completeEncourage: 'Keep it up, progress a little every day!',
            continueBtn: 'Continue Learning',
            
            // Error messages
            loadError: 'Loading failed, please refresh',
            detailsError: 'Failed to load details'
        }
    };

    /**
     * 获取翻译文本
     */
    function t(key, params = {}) {
        const lang = getLang();
        let text = i18n[lang][key] || i18n['zh'][key] || key;
        
        // 替换参数占位符
        Object.keys(params).forEach(param => {
            text = text.replace(`{${param}}`, params[param]);
        });
        
        return text;
    }

    // ============================================================================
    // 词库配置区域
    // ============================================================================
    
    /**
     * 词库配置对象（使用轻量索引 + 按需加载详情）
     * 
     * 数据结构说明：
     * - 键名（如 'kaoyan'）是词库的唯一标识符，用于 localStorage 存储
     * - name: 词库的显示名称，会在界面上展示给用户
     * - indexFile: 轻量级索引文件路径（包含所有单词的基础信息）
     * - detailFiles: 完整详情文件路径数组（按需加载）
     * 
     * 新的加载策略：
     * 1. 首次加载：只加载 indexFile（约 1MB），包含所有单词的基础信息
     * 2. 学习时：从 detailFiles 按需加载当前单词的完整详情
     * 3. 优势：首次加载速度提升 15-18 倍
     * 
     * 添加新词库的方法：
     * 1. 准备 JSON 文件并运行 generate-vocab-index.py 生成索引
     * 2. 在此对象中添加新的词库配置
     * 3. 界面会自动显示新词库选项
     */
    const wordBankConfig = {
        // Graduate Entrance Exam Vocabulary
        kaoyan: {
            name: 'GRE',  // Display name (Graduate Entrance Exam)
            indexFile: '/assets/english-vocabulary/index/kaoyan_index.json',  // Lightweight index
            detailFiles: [      // Full detail files (loaded on demand)
                '/assets/english-vocabulary/KaoYan_1.json',
                '/assets/english-vocabulary/KaoYan_2.json',
                '/assets/english-vocabulary/KaoYan_3.json'
            ]
        },
        // CET-6 Vocabulary
        cet6: {
            name: 'CET-6',
            indexFile: '/assets/english-vocabulary/index/cet6_index.json',  // Lightweight index
            detailFiles: [
                '/assets/english-vocabulary/CET6_1.json',
                '/assets/english-vocabulary/CET6_2.json',
                '/assets/english-vocabulary/CET6_3.json'
            ]
        }
        // You can add more word banks here, such as:
        // toefl: { name: 'TOEFL', indexFile: '...', detailFiles: [...] },
        // ielts: { name: 'IELTS', indexFile: '...', detailFiles: [...] }
    };

    // ============================================================================
    // 全局状态变量
    // ============================================================================
    
    /**
     * 已加载的词库索引缓存
     * 
     * 结构：{ bankId: { name: '词库名', words: [...基础信息] } }
     * 
     * 作用：
     * - 存储轻量级索引数据（单词、音标、简单释义）
     * - 用于快速显示单词列表和学习进度
     * - 避免重复加载索引文件
     */
    let loadedWordBanks = {};
    
    /**
     * 单词详情缓存
     * 
     * 结构：{ 'bankId_wordId': { ...完整详情 } }
     * 
     * 作用：
     * - 缓存已加载的单词详情
     * - 避免重复加载同一单词的详情
     * - 提升学习体验
     */
    let wordDetailsCache = {};
    
    /**
     * 词库加载状态标志
     * 
     * 作用：
     * - 防止并发加载同一词库
     * - 在加载过程中显示加载提示
     * - 避免用户重复点击导致的多次请求
     */
    let isLoading = false;

    // ============================================================================
    // 初始化模块
    // ============================================================================

    /**
     * 生成模拟学习数据（仅用于演示和测试）
     * 
     * 功能说明：
     * 这个函数会在用户首次使用时自动创建一些"昨天学过的单词"，
     * 让用户可以立即体验复习功能，而不需要等到第二天。
     * 
     * 工作流程：
     * 1. 检查是否已有学习数据，如果有则跳过
     * 2. 随机选择 15 个单词作为"昨天学过的"
     * 3. 为每个单词随机分配学习结果（不认识/模糊/认识）
     * 4. 计算下次复习时间（大部分设为今天，让用户可以立即复习）
     * 5. 保存到 localStorage
     * 
     * 为什么需要这个函数？
     * - 新用户首次使用时，没有任何学习数据
     * - 复习功能需要有"过去学过的单词"才能展示
     * - 通过模拟数据，让用户立即体验完整功能
     * - 在生产环境中，可以移除此函数
     * 
     * @param {string} bankId - 词库 ID（如 'kaoyan'）
     * @param {object} bank - 词库对象，包含 words 数组
     */
    function generateMockLearningData(bankId, bank) {
        const progress = getProgress(); // 获取当前学习进度
        
        // ========================================
        // 步骤 1: 检查是否已有数据
        // ========================================
        // 遍历所有进度记录，查找是否有当前词库的数据
        // 如果找到任何一条记录，说明用户已经开始学习，不需要生成模拟数据
        const hasData = Object.keys(progress).some(key => key.startsWith(bankId));
        if (hasData) {
            console.log('Vocabulary: Already has learning data, skip mock generation');
            return; // 已有数据，直接返回
        }

        console.log('Vocabulary: Generating mock learning data for demo...');
        
        // ========================================
        // 步骤 2: 准备时间变量
        // ========================================
        // 创建"昨天"的日期对象
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1); // 减去一天
        const yesterdayStr = yesterday.toDateString(); // 转换为字符串格式
        
        // 创建"今天"的日期对象
        const today = new Date();
        const todayStr = today.toDateString();

        // ========================================
        // 步骤 3: 选择要模拟的单词
        // ========================================
        // 从词库中选择前 15 个单词作为"昨天学过的"
        // 使用 slice(0, 15) 创建数组副本，不修改原数组
        const mockWords = bank.words.slice(0, 15);
        
        // ========================================
        // 步骤 4: 为每个单词生成学习记录
        // ========================================
        mockWords.forEach((word, index) => {
            // 生成唯一的存储键：词库ID_单词ID
            const key = `${bankId}_${word.id}`;
            
            // 使用随机数决定学习结果，模拟真实的学习情况
            let status, lastResult, reviewCount;
            const rand = Math.random(); // 生成 0-1 之间的随机数
            
            if (rand < 0.3) {
                // 30% 的概率：不认识
                status = 'learning';      // 状态：学习中
                lastResult = 'unknown';   // 最后结果：不认识
                reviewCount = 0;          // 复习次数：0（首次学习）
            } else if (rand < 0.7) {
                // 40% 的概率：模糊
                status = 'learning';      // 状态：学习中
                lastResult = 'learning';  // 最后结果：模糊
                reviewCount = 0;          // 复习次数：0
            } else {
                // 30% 的概率：认识
                status = 'known';         // 状态：已掌握
                lastResult = 'known';     // 最后结果：认识
                reviewCount = 0;          // 复习次数：0
            }
            
            // ========================================
            // 步骤 5: 计算下次复习时间
            // ========================================
            // 基于昨天的时间和学习结果，计算下次应该复习的时间
            const nextReviewDate = new Date(yesterday);
            
            if (lastResult === 'unknown') {
                // 不认识的单词：今天就要复习
                nextReviewDate.setDate(nextReviewDate.getDate() + 1);
            } else if (lastResult === 'learning') {
                // 模糊的单词：今天就要复习
                nextReviewDate.setDate(nextReviewDate.getDate() + 1);
            } else {
                // 认识的单词：3天后复习
                nextReviewDate.setDate(nextReviewDate.getDate() + 3);
            }
            
            // ========================================
            // 步骤 6: 保存学习记录
            // ========================================
            progress[key] = {
                status: status,                              // 学习状态
                reviewCount: reviewCount,                    // 复习次数
                lastReview: yesterdayStr,                    // 最后复习时间（昨天）
                nextReview: nextReviewDate.toDateString(),   // 下次复习时间
                lastResult: lastResult                       // 最后学习结果
            };
        });
        
        // ========================================
        // 步骤 7: 保存进度到 localStorage
        // ========================================
        saveProgress(progress);
        
        // ========================================
        // 步骤 8: 更新昨天的统计数据
        // ========================================
        // 创建昨天的统计记录，显示"昨天学了 15 个单词"
        const stats = {
            date: yesterdayStr,           // 日期：昨天
            learned: 15,                  // 新学单词数：15
            reviewed: 0,                  // 复习单词数：0
            target: getDailyTarget()      // 每日目标
        };
        localStorage.setItem('vocab_todayStats', JSON.stringify(stats));
        
        // ========================================
        // 步骤 9: 输出日志
        // ========================================
        console.log('Vocabulary: Mock data generated - 15 words learned yesterday');
        console.log('Vocabulary: About 10-11 words should need review today');
        // 说明：15个单词中，约70%（10-11个）的单词今天需要复习
    }

    /**
     * 主初始化函数
     * 
     * 这是整个单词学习系统的入口函数，负责协调所有模块的初始化。
     * 
     * 执行流程：
     * 1. 加载当前选中的词库数据
     * 2. 等待词库加载完成
     * 3. 生成模拟数据（仅首次使用）
     * 4. 初始化侧栏进度显示
     * 5. 初始化主学习区域
     * 
     * 为什么要异步加载？
     * - 词库 JSON 文件可能很大（几 MB）
     * - 同步加载会阻塞页面渲染
     * - 异步加载可以先显示页面框架，再填充内容
     * 
     * 错误处理：
     * - 如果词库加载失败，会延迟 1 秒后重试
     * - 确保即使网络不稳定也能正常工作
     */
    async function init() {
        console.log('Vocabulary: Initializing...');

        // ========================================
        // 步骤 1: 获取当前选中的词库 ID
        // ========================================
        // 从 localStorage 读取用户上次选择的词库
        // 如果是首次使用，默认使用 'kaoyan'（考研词库）
        const currentBankId = getCurrentBank();
        
        // ========================================
        // 步骤 2: 异步加载词库数据
        // ========================================
        // 使用 await 等待词库加载完成
        // loadWordBank 函数会：
        // 1. 先尝试从 IndexedDB 缓存读取
        // 2. 如果缓存不存在，从网络加载 JSON 文件
        // 3. 将加载的数据保存到缓存
        const bank = await loadWordBank(currentBankId);

        // ========================================
        // 步骤 3: 验证词库数据
        // ========================================
        // 确保词库加载成功且包含单词数据
        if (bank && bank.words.length > 0) {
            console.log('Vocabulary: Bank loaded successfully, initializing UI...');
            
            // ========================================
            // 步骤 4: 生成演示数据（仅首次使用）
            // ========================================
            // 🎭 这个函数会检查是否已有学习数据
            // 如果是首次使用，会生成一些"昨天学过的单词"
            // 让用户可以立即体验复习功能
            generateMockLearningData(currentBankId, bank);
            
            // ========================================
            // 步骤 5: 初始化用户界面
            // ========================================
            initVocabSidebar();      // 初始化侧栏（进度条、统计信息）
            initVocabApp();          // 初始化主区域（单词卡片）
        } else {
            // ========================================
            // 错误处理：词库加载失败
            // ========================================
            console.warn('Vocabulary: Failed to load bank, retrying...');
            
            // 延迟 1 秒后重试
            // 给网络请求更多时间，或等待 IndexedDB 准备就绪
            setTimeout(() => {
                initVocabSidebar();
                initVocabApp();
            }, 1000);
        }
        
        console.log('Vocabulary: Initialization complete');
    }

    // ============================================================================
    // DOM 加载完成后自动初始化
    // ============================================================================
    
    // 检查 DOM 是否已经加载完成
    if (document.readyState === 'loading') {
        // DOM 还在加载中，等待 DOMContentLoaded 事件
        // 这个事件在 HTML 文档完全解析后触发
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM 已经加载完成，直接初始化
        // 这种情况发生在脚本延迟加载时
        init();
    }

    // ============================================================================
    // 词库加载模块
    // ============================================================================

    /**
     * 加载指定词库的轻量级索引
     * 
     * 新的加载策略（轻量索引 + 按需加载详情）：
     * 1. 内存缓存：检查 loadedWordBanks 对象
     * 2. IndexedDB 缓存：检查浏览器本地数据库
     * 3. 网络加载：从服务器获取索引 JSON 文件
     * 
     * 索引文件特点：
     * - 只包含基础信息（单词、音标、简单释义）
     * - 文件大小约为完整词库的 1/15
     * - 加载速度提升 15-18 倍
     * 
     * @param {string} bankId - 词库 ID（如 'kaoyan', 'cet6'）
     * @returns {Promise<object|null>} 词库索引对象 { name, words } 或 null（加载失败）
     * 
     * 返回的词库索引对象结构：
     * {
     *   name: 'GRE',
     *   words: [
     *     { id: 'CET6_1_1', word: 'abandon', phonetic: '/əˈbændən/', meaning: 'v. 放弃' },
     *     { id: 'CET6_1_2', word: 'ability', phonetic: '/əˈbɪləti/', meaning: 'n. 能力' },
     *     ...
     *   ]
     * }
     */
    async function loadWordBank(bankId) {
        // ========================================
        // 缓存检查 1: 内存缓存
        // ========================================
        if (loadedWordBanks[bankId]) {
            console.log(`Vocabulary: Bank ${bankId} already loaded from memory`);
            return loadedWordBanks[bankId];
        }

        // ========================================
        // 配置验证
        // ========================================
        const config = wordBankConfig[bankId];
        if (!config) {
            console.error(`Vocabulary: Unknown bank ${bankId}`);
            return null;
        }

        console.log(`Vocabulary: Loading bank ${bankId} index...`);
        isLoading = true;

        // ========================================
        // 缓存检查 2: IndexedDB 缓存
        // ========================================
        if (window.indexedDBHelper) {
            try {
                const cached = await window.indexedDBHelper.getWordBank(bankId);
                
                if (cached && cached.words && cached.words.length > 0) {
                    console.log(`Vocabulary: Loaded ${cached.words.length} words from IndexedDB cache`);
                    loadedWordBanks[bankId] = cached;
                    isLoading = false;
                    return cached;
                }
            } catch (error) {
                console.warn('Vocabulary: Cache read failed, loading from network:', error);
            }
        }

        // ========================================
        // 网络加载：从服务器获取索引文件
        // ========================================
        try {
            console.log(`Vocabulary: Loading index file ${config.indexFile}...`);
            
            const response = await fetch(config.indexFile);
            
            if (!response.ok) {
                console.error(`Vocabulary: Failed to load index file, status: ${response.status}`);
                isLoading = false;
                return { name: config.name, words: [] };
            }
            
            // 解析索引 JSON
            const indexData = await response.json();
            
            // 构建词库对象
            const bankData = {
                name: config.name,
                words: indexData  // 索引数据已经是轻量级格式
            };

            // 保存到内存缓存
            loadedWordBanks[bankId] = bankData;

            // 保存到 IndexedDB 缓存
            if (window.indexedDBHelper && indexData.length > 0) {
                try {
                    await window.indexedDBHelper.saveWordBank(bankId, bankData);
                    console.log(`Vocabulary: Saved ${indexData.length} words to IndexedDB cache`);
                } catch (error) {
                    console.warn('Vocabulary: Cache save failed:', error);
                }
            }

            console.log(`Vocabulary: Successfully loaded ${indexData.length} words for ${bankId}`);
            isLoading = false;
            return bankData;
            
        } catch (error) {
            console.error(`Vocabulary: Failed to load bank ${bankId}:`, error);
            isLoading = false;
            return { name: config.name, words: [] };
        }
    }

    /**
     * 按需加载单词的完整详情
     * 
     * 工作流程：
     * 1. 检查详情缓存
     * 2. 如果缓存中没有，从完整词库文件中查找
     * 3. 转换数据格式
     * 4. 保存到缓存
     * 
     * @param {string} bankId - 词库 ID
     * @param {string} wordId - 单词 ID（如 'CET6_1_1'）
     * @param {string} word - 单词本身（用于查找）
     * @returns {Promise<object|null>} 单词的完整详情或 null
     */
    async function loadWordDetails(bankId, wordId, word) {
        // ========================================
        // 缓存检查：详情缓存
        // ========================================
        const cacheKey = `${bankId}_${wordId}`;
        if (wordDetailsCache[cacheKey]) {
            console.log(`Vocabulary: Word details for ${word} loaded from cache`);
            return wordDetailsCache[cacheKey];
        }

        // ========================================
        // 从完整词库文件中查找
        // ========================================
        const config = wordBankConfig[bankId];
        if (!config || !config.detailFiles) {
            console.error(`Vocabulary: No detail files configured for ${bankId}`);
            return null;
        }

        try {
            // 从 wordId 中提取文件索引
            // wordId 格式：CET6_1_1 -> 文件索引 = 1
            const match = wordId.match(/_(\d+)_/);
            const fileIndex = match ? parseInt(match[1]) - 1 : 0;
            
            const detailFile = config.detailFiles[fileIndex];
            if (!detailFile) {
                console.error(`Vocabulary: Detail file not found for index ${fileIndex}`);
                return null;
            }

            console.log(`Vocabulary: Loading word details from ${detailFile}...`);
            
            // 加载完整词库文件
            const response = await fetch(detailFile);
            if (!response.ok) {
                console.error(`Vocabulary: Failed to load detail file, status: ${response.status}`);
                return null;
            }
            
            const fullData = await response.json();
            
            // 查找目标单词
            const wordData = fullData.find(item => item.headWord === word);
            if (!wordData) {
                console.warn(`Vocabulary: Word ${word} not found in detail file`);
                return null;
            }
            
            // 转换数据格式
            const details = transformWordData(wordData);
            details.id = wordId;
            
            // 保存到缓存
            wordDetailsCache[cacheKey] = details;
            
            console.log(`Vocabulary: Loaded details for ${word}`);
            return details;
            
        } catch (error) {
            console.error(`Vocabulary: Failed to load word details:`, error);
            return null;
        }
    }

    /**
     * 转换原始 JSON 数据为应用统一格式
     * 
     * 这个函数是数据适配层，负责将不同格式的 JSON 数据转换为应用内部使用的统一格式。
     * 
     * 为什么需要这个函数？
     * 1. 词库 JSON 可能来自不同来源，格式不统一
     * 2. 有些词库使用扁平结构，有些使用嵌套结构
     * 3. 需要提取和整理所有有用的信息（释义、例句、同义词等）
     * 4. 统一格式后，界面渲染代码更简单
     * 
     * 支持的数据格式：
     * 1. 新版扁平结构：{ word, translations, phrases, ... }
     * 2. 旧版嵌套结构：{ headWord, content: { word: { content: {...} } } }
     * 
     * 输出格式（统一结构）：
     * {
     *   word: '单词',
     *   usphone: '美式音标',
     *   ukphone: '英式音标',
     *   phonetic: '音标（美式或英式）',
     *   trans: [{ pos: '词性', tranCn: '中文释义', tranOther: '英文释义' }],
     *   meaning: '简化的释义文本',
     *   sentences: [{ sContent: '例句', sCn: '中文翻译' }],
     *   realExamSentences: [{ sContent: '真题例句', sourceInfo: {...} }],
     *   synos: [{ pos: '词性', hwds: ['同义词1', '同义词2'] }],
     *   antos: ['反义词1', '反义词2'],
     *   phrases: [{ pContent: '短语', pCn: '中文' }],
     *   relWords: [{ pos: '词性', words: [{hwd: '单词', tran: '释义'}] }],
     *   remMethod: '记忆方法'
     * }
     * 
     * @param {object} item - 原始 JSON 数据对象
     * @returns {object} 转换后的统一格式对象
     */
    function transformWordData(item) {
        // ========================================
        // 格式检测 1: 新版扁平结构
        // ========================================
        // 新版格式特征：直接包含 word 和 translations 字段
        // 例如：{ word: "abandon", translations: [...], phrases: [...] }
        if (item.word && item.translations) {
            // ========================================
            // 新版格式数据转换
            // ========================================
            return {
                // 基础信息
                word: item.word,                    // 单词本身
                usphone: '',                        // 美式音标（新版格式中可能没有）
                ukphone: '',                        // 英式音标
                phonetic: item.phonetic || '',      // 通用音标
                
                // 释义信息（转换为统一格式）
                trans: item.translations.map(t => ({
                    pos: t.type || '',              // 词性（n. v. adj. 等）
                    tranCn: t.translation || '',    // 中文释义
                    tranOther: ''                   // 英文释义（新版格式中没有）
                })),
                
                // 简化的释义文本（用于卡片正面显示）
                // 格式：n. 名词释义；v. 动词释义；adj. 形容词释义
                meaning: item.translations.map(t => 
                    (t.type ? `${t.type}. ` : '') + t.translation
                ).join('；'),
                
                // 例句（新版格式中可能没有）
                sentences: [],
                
                // 真题例句（新版格式中可能没有）
                realExamSentences: [],
                
                // 同义词（新版格式中可能没有）
                synos: [],
                
                // 反义词（新版格式中可能没有）
                antos: [],
                
                // 短语搭配（提取前 5 个）
                phrases: item.phrases ? item.phrases.slice(0, 5).map(p => ({
                    pContent: p.phrase,             // 短语内容
                    pCn: p.translation              // 中文翻译
                })) : [],
                
                // 同根词（新版格式中可能没有）
                relWords: [],
                
                // 记忆方法（新版格式中可能没有）
                remMethod: ''
            };
        }

        // ========================================
        // 格式检测 2: 旧版嵌套结构
        // ========================================
        // 旧版格式特征：深度嵌套的对象结构
        // 例如：{ headWord: "abandon", content: { word: { content: {...} } } }
        const content = item.content?.word?.content || {};

        // ========================================
        // 提取音标信息
        // ========================================
        // 美式音标：添加斜杠包裹，如 /əˈbændən/
        const usphone = content.usphone ? `/${content.usphone}/` : '';
        // 英式音标：添加斜杠包裹
        const ukphone = content.ukphone ? `/${content.ukphone}/` : '';
        // 优先使用美式音标，如果没有则使用英式音标
        const phonetic = usphone || ukphone || '';

        // ========================================
        // 提取释义信息（保留完整结构）
        // ========================================
        // trans 是一个数组，每个元素包含一个词性的释义
        const trans = content.trans ? content.trans.map(t => ({
            pos: t.pos || '',                   // 词性（n. v. adj. adv. 等）
            tranCn: t.tranCn || '',             // 中文释义
            tranOther: t.tranOther || '',       // 英文释义
            descOther: t.descOther || ''        // 其他描述信息
        })) : [];

        // ========================================
        // 生成简化的释义文本
        // ========================================
        // 将所有释义合并为一个字符串，用分号分隔
        // 格式：n. 放弃；v. 抛弃；adj. 被遗弃的
        const meaning = trans.map(t => {
            const pos = t.pos ? `${t.pos}. ` : '';  // 添加词性前缀
            return pos + (t.tranCn || t.tranOther || '');  // 优先使用中文释义
        }).join('；');

        // ========================================
        // 提取例句（保留完整结构，最多 3 个）
        // ========================================
        const sentences = content.sentence?.sentences ? 
            content.sentence.sentences.slice(0, 3).map(s => ({
                sContent: s.sContent || '',         // 原始例句（可能包含 HTML 标签）
                sCn: s.sCn || '',                   // 中文翻译
                sContent_eng: s.sContent_eng || '', // 纯英文例句（无标签）
                sSpeech: s.sSpeech || ''            // 语音 URL（如果有）
            })) : [];

        // ========================================
        // 提取真题例句（最多 2 个）
        // ========================================
        const realExamSentences = content.realExamSentence?.sentences ? 
            content.realExamSentence.sentences.slice(0, 2).map(s => ({
                sContent: s.sContent || '',         // 真题例句
                sourceInfo: s.sourceInfo || {}      // 来源信息（年份、级别、题型）
            })) : [];

        // ========================================
        // 提取同近义词
        // ========================================
        // synos 是一个数组，按词性分组
        const synos = content.syno?.synos ? content.syno.synos.map(s => ({
            pos: s.pos || '',                       // 词性
            tran: s.tran || '',                     // 该词性的释义
            hwds: s.hwds ? s.hwds.slice(0, 5).map(h => h.w) : []  // 同义词列表（最多 5 个）
        })) : [];

        // ========================================
        // 提取反义词（最多 3 个）
        // ========================================
        const antos = content.antos?.anto ? 
            content.antos.anto.slice(0, 3).map(a => a.hwd) : [];

        // ========================================
        // 提取短语搭配（最多 4 个）
        // ========================================
        const phrases = content.phrase?.phrases ? 
            content.phrase.phrases.slice(0, 4).map(p => ({
                pContent: p.pContent || '',         // 短语内容
                pCn: p.pCn || ''                    // 中文翻译
            })) : [];

        // ========================================
        // 提取同根词/相关词（最多 4 组）
        // ========================================
        const relWords = content.relWord?.rels ? 
            content.relWord.rels.slice(0, 4).map(r => ({
                pos: r.pos || '',                   // 词性
                words: r.words ? r.words.slice(0, 3).map(w => ({
                    hwd: w.hwd || '',               // 单词
                    tran: w.tran || ''              // 释义
                })) : []
            })) : [];

        // ========================================
        // 提取记忆方法
        // ========================================
        const remMethod = content.remMethod?.val || '';

        // ========================================
        // 返回统一格式的数据对象
        // ========================================
        return {
            word: item.headWord || '',              // 单词（从顶层获取）
            usphone: usphone,
            ukphone: ukphone,
            phonetic: phonetic,
            trans: trans,
            meaning: meaning,
            sentences: sentences,
            realExamSentences: realExamSentences,
            synos: synos,
            antos: antos,
            phrases: phrases,
            relWords: relWords,
            remMethod: remMethod
        };
    }

    /**
     * 生成单词详情 HTML
     * 
     * 这个函数负责将单词的完整详情数据转换为 HTML 字符串。
     * 用于按需加载详情时动态更新卡片背面内容。
     * 
     * @param {object} details - 单词的完整详情对象
     * @returns {string} 详情 HTML 字符串
     */
    function generateWordDetailsHtml(details) {
        // ========================================
        // 生成详细释义 HTML
        // ========================================
        let transHtml = '';
        if (details.trans && details.trans.length > 0) {
            transHtml = details.trans.map(t => {
                let html = `<div class="vocab-trans-item">`;
                if (t.pos) html += `<span class="vocab-pos">${t.pos}.</span> `;
                html += `<span class="vocab-tran-cn">${t.tranCn || ''}</span>`;
                if (t.tranOther) html += `<div class="vocab-tran-en">${t.tranOther}</div>`;
                html += `</div>`;
                return html;
            }).join('');
        } else {
            transHtml = `<div class="vocab-trans-item">${details.meaning}</div>`;
        }

        // ========================================
        // 生成例句 HTML
        // ========================================
        let sentencesHtml = '';
        if (details.sentences && details.sentences.length > 0) {
            sentencesHtml = `<div class="vocab-section vocab-sentences">
                <div class="vocab-section-title">📝 Examples</div>
                ${details.sentences.slice(0, 2).map(s => `
                    <div class="vocab-sentence-item">
                        <div class="vocab-sentence-en">${s.sContent_eng || s.sContent}</div>
                        <div class="vocab-sentence-cn">${s.sCn}</div>
                    </div>
                `).join('')}
            </div>`;
        }

        // ========================================
        // 生成真题例句 HTML
        // ========================================
        let realExamHtml = '';
        if (details.realExamSentences && details.realExamSentences.length > 0) {
            realExamHtml = `<div class="vocab-section vocab-real-exam">
                <div class="vocab-section-title">📚 Real Exam</div>
                ${details.realExamSentences.slice(0, 1).map(s => {
                const sourceText = s.sourceInfo ?
                    `${s.sourceInfo.year || ''} ${s.sourceInfo.level || ''} ${s.sourceInfo.type || ''}` : '';
                return `<div class="vocab-exam-item">
                        <div class="vocab-exam-content">${s.sContent}</div>
                        ${sourceText ? `<div class="vocab-exam-source">${sourceText}</div>` : ''}
                    </div>`;
            }).join('')}
            </div>`;
        }

        // ========================================
        // 生成同近义词 HTML
        // ========================================
        let synosHtml = '';
        if (details.synos && details.synos.length > 0) {
            const allSynos = details.synos.flatMap(s => s.hwds).slice(0, 6);
            if (allSynos.length > 0) {
                synosHtml = `<div class="vocab-section vocab-synos">
                    <div class="vocab-section-title">🔗 Synonyms</div>
                    <div class="vocab-tags">${allSynos.map(w => `<span class="vocab-tag">${w}</span>`).join('')}</div>
                </div>`;
            }
        }

        // ========================================
        // 生成反义词 HTML
        // ========================================
        let antosHtml = '';
        if (details.antos && details.antos.length > 0) {
            antosHtml = `<div class="vocab-section vocab-antos">
                <div class="vocab-section-title">⚡ Antonyms</div>
                <div class="vocab-tags">${details.antos.map(w => `<span class="vocab-tag vocab-tag-alt">${w}</span>`).join('')}</div>
            </div>`;
        }

        // ========================================
        // 生成短语搭配 HTML
        // ========================================
        let phrasesHtml = '';
        if (details.phrases && details.phrases.length > 0) {
            phrasesHtml = `<div class="vocab-section vocab-phrases">
                <div class="vocab-section-title">💡 Phrases</div>
                <div class="vocab-phrase-list">
                    ${details.phrases.slice(0, 3).map(p => `
                        <div class="vocab-phrase-item">
                            <span class="vocab-phrase-en">${p.pContent}</span>
                            <span class="vocab-phrase-cn">${p.pCn}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }

        // ========================================
        // 生成同根词 HTML
        // ========================================
        let relWordsHtml = '';
        if (details.relWords && details.relWords.length > 0) {
            relWordsHtml = `<div class="vocab-section vocab-rel-words">
                <div class="vocab-section-title">🌳 Related</div>
                <div class="vocab-rel-list">
                    ${details.relWords.slice(0, 3).map(r => `
                        <div class="vocab-rel-group">
                            <span class="vocab-rel-pos">${r.pos}.</span>
                            ${r.words.slice(0, 2).map(w => `<span class="vocab-rel-word">${w.hwd}</span>`).join(' ')}
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }

        // ========================================
        // 生成记忆方法 HTML
        // ========================================
        let remMethodHtml = '';
        if (details.remMethod) {
            remMethodHtml = `<div class="vocab-section vocab-rem-method">
                <div class="vocab-section-title">🧠 Memory Tip</div>
                <div class="vocab-rem-content">${details.remMethod}</div>
            </div>`;
        }

        // ========================================
        // 组装完整的详情 HTML
        // ========================================
        return `
            <div class="vocab-word-mini">${details.word}</div>
            <div class="vocab-trans-list">${transHtml}</div>
            ${sentencesHtml}
            ${realExamHtml}
            ${synosHtml}
            ${antosHtml}
            ${phrasesHtml}
            ${relWordsHtml}
            ${remMethodHtml}
        `;
    }

    // ============================================================================
    // 数据管理模块
    // ============================================================================
    // 这个模块负责所有数据的读取、保存和管理
    // 使用 localStorage 作为持久化存储
    // 所有数据都以 'vocab_' 为前缀，避免与其他应用冲突

    /**
     * 获取当前选中的词库 ID
     * 
     * 从 localStorage 读取用户上次选择的词库。
     * 如果是首次使用（没有保存的选择），返回默认值 'kaoyan'。
     * 
     * localStorage 键名：'vocab_currentBank'
     * 
     * @returns {string} 词库 ID（如 'kaoyan', 'cet6'）
     */
    function getCurrentBank() {
        return localStorage.getItem('vocab_currentBank') || 'kaoyan';
    }

    /**
     * 设置当前词库
     * 
     * 保存用户选择的词库到 localStorage。
     * 下次打开页面时会自动加载这个词库。
     * 
     * @param {string} bankId - 词库 ID
     */
    function setCurrentBank(bankId) {
        localStorage.setItem('vocab_currentBank', bankId);
    }

    /**
     * 获取学习进度数据
     * 
     * 从 localStorage 读取所有单词的学习进度。
     * 
     * 数据结构：
     * {
     *   'kaoyan_f0_i0': {
     *     status: 'learning',           // 学习状态
     *     reviewCount: 2,               // 复习次数
     *     lastReview: 'Mon Jan 01 2024', // 最后复习日期
     *     nextReview: 'Wed Jan 03 2024', // 下次复习日期
     *     lastResult: 'learning'        // 最后一次的掌握程度
     *   },
     *   'kaoyan_f0_i1': { ... },
     *   ...
     * }
     * 
     * 错误处理：
     * - 如果数据损坏（JSON 解析失败），返回空对象
     * - 不会影响应用运行，只是丢失学习进度
     * 
     * @returns {object} 学习进度对象
     */
    function getProgress() {
        try {
            // 尝试解析 JSON 数据
            return JSON.parse(localStorage.getItem('vocab_progress') || '{}');
        } catch (e) {
            // JSON 解析失败，返回空对象
            console.warn('Vocabulary: Failed to parse progress data:', e);
            return {};
        }
    }

    /**
     * 保存学习进度数据
     * 
     * 将学习进度对象序列化为 JSON 并保存到 localStorage。
     * 
     * 注意事项：
     * - localStorage 有大小限制（通常 5-10MB）
     * - 如果数据过大，保存可能失败
     * - 建议定期清理过期数据
     * 
     * @param {object} progress - 学习进度对象
     */
    function saveProgress(progress) {
        try {
            localStorage.setItem('vocab_progress', JSON.stringify(progress));
        } catch (e) {
            // 保存失败（可能是存储空间不足）
            console.error('Vocabulary: Failed to save progress:', e);
            // 可以在这里添加用户提示
        }
    }

    /**
     * 获取每日学习目标（单词数）
     * 
     * 从 localStorage 读取用户设置的每日目标。
     * 默认值：30 个单词/天
     * 
     * @returns {number} 每日目标单词数
     */
    function getDailyTarget() {
        return parseInt(localStorage.getItem('vocab_dailyTarget') || '30');
    }

    /**
     * 设置每日学习目标
     * 
     * 保存用户设置的每日目标到 localStorage。
     * 
     * @param {number} target - 每日目标单词数
     */
    function setDailyTarget(target) {
        localStorage.setItem('vocab_dailyTarget', target.toString());
    }

    /**
     * 获取今日学习统计
     * 
     * 从 localStorage 读取今日的学习统计数据。
     * 如果日期不是今天，会自动重置统计。
     * 
     * 数据结构：
     * {
     *   date: 'Mon Jan 01 2024',  // 日期字符串
     *   learned: 10,              // 今日新学单词数
     *   reviewed: 5,              // 今日复习单词数
     *   target: 30                // 每日目标
     * }
     * 
     * 日期检查逻辑：
     * - 每次调用都会检查保存的日期是否是今天
     * - 如果不是今天，说明是新的一天，重置统计
     * - 这样可以自动处理跨天的情况
     * 
     * @returns {object} 今日统计对象
     */
    function getTodayStats() {
        // 获取今天的日期字符串
        const today = new Date().toDateString();
        
        // 尝试读取保存的统计数据
        const saved = localStorage.getItem('vocab_todayStats');

        if (saved) {
            try {
                const stats = JSON.parse(saved);
                
                // 检查日期是否是今天
                if (stats.date === today) {
                    // 是今天的数据，更新 target 为当前设置的值
                    // （用户可能修改了每日目标）
                    stats.target = getDailyTarget();
                    return stats;
                }
                // 不是今天的数据，继续执行下面的重置逻辑
            } catch (e) {
                // JSON 解析失败，继续执行重置逻辑
                console.warn('Vocabulary: Failed to parse today stats:', e);
            }
        }

        // 新的一天，或者数据不存在/损坏，创建新的统计对象
        const newStats = {
            date: today,                // 今天的日期
            learned: 0,                 // 新学单词数：0
            reviewed: 0,                // 复习单词数：0
            target: getDailyTarget()    // 每日目标
        };
        
        // 保存新的统计数据
        localStorage.setItem('vocab_todayStats', JSON.stringify(newStats));
        
        return newStats;
    }

    /**
     * 保存今日统计数据
     * 
     * 将统计对象序列化为 JSON 并保存到 localStorage。
     * 
     * @param {object} stats - 统计对象
     */
    function saveTodayStats(stats) {
        localStorage.setItem('vocab_todayStats', JSON.stringify(stats));
    }

    /**
     * 获取单个单词的学习状态
     * 
     * 从学习进度中查找指定单词的状态。
     * 如果单词从未学过，返回默认状态。
     * 
     * 存储键格式：'词库ID_单词ID'
     * 例如：'kaoyan_f0_i0', 'cet6_f1_i25'
     * 
     * @param {string} bankId - 词库 ID
     * @param {string} wordId - 单词 ID
     * @returns {object} 单词状态对象
     * 
     * 返回对象结构：
     * {
     *   status: 'unknown' | 'learning' | 'known',  // 学习状态
     *   reviewCount: 0,                             // 复习次数
     *   lastReview: null,                           // 最后复习日期
     *   nextReview: null,                           // 下次复习日期
     *   lastResult: null                            // 最后一次的掌握程度
     * }
     */
    function getWordStatus(bankId, wordId) {
        const progress = getProgress();
        const key = `${bankId}_${wordId}`;  // 生成存储键
        
        // 返回单词状态，如果不存在则返回默认状态
        return progress[key] || {
            status: 'unknown',      // 未学习
            reviewCount: 0,         // 复习次数：0
            lastReview: null,       // 从未复习
            nextReview: null,       // 没有计划的复习时间
            lastResult: null        // 没有学习结果
        };
    }

    /**
     * 更新单词学习状态（核心学习算法）
     * 
     * 这是学习系统的核心函数，负责：
     * 1. 记录用户对单词的掌握程度
     * 2. 更新复习次数
     * 3. 计算下次复习时间（基于艾宾浩斯遗忘曲线）
     * 4. 更新今日学习统计
     * 
     * 学习状态说明：
     * - 'unknown': 不认识，需要频繁复习
     * - 'learning': 模糊，需要适度复习
     * - 'known': 认识，可以延长复习间隔
     * 
     * 复习间隔算法：
     * - 基于艾宾浩斯遗忘曲线
     * - 根据掌握程度和复习次数动态调整
     * - 详见 calculateNextReview 函数
     * 
     * @param {string} bankId - 词库 ID
     * @param {string} wordId - 单词 ID
     * @param {string} status - 掌握程度（'unknown' | 'learning' | 'known'）
     */
    function updateWordStatus(bankId, wordId, status) {
        // ========================================
        // 步骤 1: 获取当前数据
        // ========================================
        const progress = getProgress();           // 获取所有学习进度
        const key = `${bankId}_${wordId}`;        // 生成存储键
        const today = new Date();                 // 当前日期对象
        const todayStr = today.toDateString();    // 日期字符串

        // ========================================
        // 步骤 2: 获取单词的旧状态
        // ========================================
        // 如果单词从未学过，使用默认状态
        const oldStatus = progress[key] || { 
            status: 'unknown',      // 默认状态：未学习
            reviewCount: 0,         // 复习次数：0
            lastReview: null,       // 从未复习
            nextReview: null,       // 没有计划的复习时间
            lastResult: null        // 没有学习结果
        };

        // ========================================
        // 步骤 3: 计算下次复习时间
        // ========================================
        // 基于当前的复习次数和本次的掌握程度
        // calculateNextReview 函数实现了艾宾浩斯遗忘曲线算法
        const nextReviewDate = calculateNextReview(oldStatus.reviewCount, status);

        // ========================================
        // 步骤 4: 更新单词状态
        // ========================================
        progress[key] = {
            status: status,                         // 更新学习状态
            reviewCount: oldStatus.reviewCount + 1, // 复习次数 +1
            lastReview: todayStr,                   // 更新最后复习时间为今天
            nextReview: nextReviewDate,             // 设置下次复习时间
            lastResult: status                      // 记录本次学习结果
        };

        // ========================================
        // 步骤 5: 保存更新后的进度
        // ========================================
        saveProgress(progress);

        // ========================================
        // 步骤 6: 更新今日统计
        // ========================================
        const stats = getTodayStats();
        
        // 判断是新学还是复习
        if (oldStatus.status === 'unknown') {
            // 之前从未学过，算作新学
            stats.learned++;
        } else {
            // 之前学过，算作复习
            stats.reviewed++;
        }
        
        // 保存更新后的统计
        saveTodayStats(stats);
    }

    /**
     * 计算下次复习时间（艾宾浩斯遗忘曲线算法）
     * 
     * 这个函数实现了基于艾宾浩斯遗忘曲线的间隔重复算法（Spaced Repetition）。
     * 
     * ============================================================================
     * 艾宾浩斯遗忘曲线理论
     * ============================================================================
     * 德国心理学家艾宾浩斯发现，人的记忆遵循一定的遗忘规律：
     * - 刚学完后，遗忘速度最快
     * - 随着时间推移，遗忘速度逐渐变慢
     * - 通过及时复习，可以巩固记忆
     * - 每次成功复习后，下次复习的间隔可以延长
     * 
     * ============================================================================
     * 复习间隔策略
     * ============================================================================
     * 
     * 1. 不认识（unknown）：
     *    - 说明单词还没有进入短期记忆
     *    - 需要频繁复习，间隔：1 天
     *    - 目标：尽快建立初步印象
     * 
     * 2. 模糊（learning）：
     *    - 单词已进入短期记忆，但不够牢固
     *    - 需要逐步延长间隔，巩固记忆
     *    - 间隔序列：1天 → 2天 → 4天 → 7天 → 15天
     *    - 目标：将短期记忆转化为长期记忆
     * 
     * 3. 认识（known）：
     *    - 单词已进入长期记忆
     *    - 可以使用更长的复习间隔
     *    - 间隔序列：3天 → 7天 → 15天 → 30天 → 60天 → 90天
     *    - 目标：保持长期记忆，防止遗忘
     * 
     * ============================================================================
     * 为什么这样设计？
     * ============================================================================
     * 
     * 1. 符合记忆规律：
     *    - 初期频繁复习，建立记忆
     *    - 后期延长间隔，节省时间
     * 
     * 2. 提高学习效率：
     *    - 不会过度复习已掌握的单词
     *    - 重点关注需要加强的单词
     * 
     * 3. 保持学习动力：
     *    - 看到进步（间隔逐渐延长）
     *    - 避免枯燥（不是每天复习同样的单词）
     * 
     * @param {number} reviewCount - 已复习次数（0, 1, 2, ...）
     * @param {string} lastResult - 本次学习结果（'unknown' | 'learning' | 'known'）
     * @returns {string} 下次复习日期字符串（如 'Mon Jan 01 2024'）
     */
    function calculateNextReview(reviewCount, lastResult) {
        // ========================================
        // 步骤 1: 获取当前日期
        // ========================================
        const today = new Date();
        let daysToAdd;  // 要添加的天数

        // ========================================
        // 步骤 2: 根据掌握程度选择间隔策略
        // ========================================
        
        if (lastResult === 'unknown') {
            // ----------------------------------------
            // 策略 A: 不认识 - 固定 1 天间隔
            // ----------------------------------------
            // 原因：
            // - 单词还没有进入记忆
            // - 需要尽快再次学习
            // - 不管复习多少次，只要还不认识，就保持短间隔
            daysToAdd = 1;
            
        } else if (lastResult === 'learning') {
            // ----------------------------------------
            // 策略 B: 模糊 - 渐进式间隔
            // ----------------------------------------
            // 间隔序列：[1, 2, 4, 7, 15] 天
            // 
            // 复习次数 → 间隔天数：
            // 0 次 → 1 天   （第一次复习）
            // 1 次 → 2 天   （第二次复习）
            // 2 次 → 4 天   （第三次复习）
            // 3 次 → 7 天   （第四次复习）
            // 4+ 次 → 15 天 （第五次及以后）
            const intervals = [1, 2, 4, 7, 15];
            
            // 使用 Math.min 确保不会超出数组范围
            // 如果 reviewCount >= 5，始终使用最后一个值（15天）
            daysToAdd = intervals[Math.min(reviewCount, intervals.length - 1)];
            
        } else if (lastResult === 'known') {
            // ----------------------------------------
            // 策略 C: 认识 - 长间隔
            // ----------------------------------------
            // 间隔序列：[3, 7, 15, 30, 60, 90] 天
            // 
            // 复习次数 → 间隔天数：
            // 0 次 → 3 天   （第一次复习）
            // 1 次 → 7 天   （第二次复习）
            // 2 次 → 15 天  （第三次复习）
            // 3 次 → 30 天  （第四次复习）
            // 4 次 → 60 天  （第五次复习）
            // 5+ 次 → 90 天 （第六次及以后）
            const intervals = [3, 7, 15, 30, 60, 90];
            
            // 使用 Math.min 确保不会超出数组范围
            daysToAdd = intervals[Math.min(reviewCount, intervals.length - 1)];
        }

        // ========================================
        // 步骤 3: 计算下次复习的日期
        // ========================================
        const nextDate = new Date(today);           // 创建新的日期对象（避免修改 today）
        nextDate.setDate(nextDate.getDate() + daysToAdd);  // 添加天数
        
        // ========================================
        // 步骤 4: 返回日期字符串
        // ========================================
        // 使用 toDateString() 格式化为标准日期字符串
        // 格式：'Mon Jan 01 2024'
        return nextDate.toDateString();
    }

    /**
     * 判断单词是否需要复习
     * 
     * 这个函数检查一个单词是否到了应该复习的时间。
     * 
     * 判断逻辑：
     * 1. 如果单词从未学过（status === 'unknown'），不算复习
     * 2. 如果单词没有设置下次复习时间，不算复习
     * 3. 如果今天的日期 >= 下次复习日期，需要复习
     * 
     * 为什么从未学过的不算复习？
     * - 复习是指"再次学习已经学过的内容"
     * - 从未学过的单词应该算作"新学"，不是"复习"
     * - 这样可以区分新学和复习的统计数据
     * 
     * @param {string} bankId - 词库 ID
     * @param {string} wordId - 单词 ID
     * @returns {boolean} true 表示需要复习，false 表示不需要
     */
    function shouldReview(bankId, wordId) {
        // ========================================
        // 步骤 1: 获取单词状态
        // ========================================
        const status = getWordStatus(bankId, wordId);
        
        // ========================================
        // 步骤 2: 检查是否从未学过
        // ========================================
        // 从未学过的单词不算复习
        if (status.status === 'unknown' || !status.nextReview) {
            return false;
        }

        // ========================================
        // 步骤 3: 比较日期
        // ========================================
        const today = new Date();                       // 今天的日期对象
        const nextReview = new Date(status.nextReview); // 下次复习日期对象
        
        // 如果今天 >= 下次复习日期，返回 true
        // 注意：>= 表示到期或过期的都需要复习
        return today >= nextReview;
    }



    // ============================================================================
    // 侧栏模块 - 学习进度显示
    // ============================================================================
    // 这个模块负责在页面侧栏显示学习进度、统计信息和快捷操作按钮

    /**
     * 初始化侧栏进度显示
     * 
     * 这个函数负责生成侧栏的 HTML 内容，包括：
     * 1. 今日学习进度条（新学单词）
     * 2. 今日复习进度条（复习单词）
     * 3. 快捷操作按钮（学习新词/温习旧词）
     * 4. 本周学习统计
     * 5. 词库掌握率
     * 
     * 工作流程：
     * 1. 查找侧栏容器元素
     * 2. 检查词库是否已加载
     * 3. 计算各种统计数据
     * 4. 生成 HTML 内容
     * 5. 绑定按钮事件
     * 
     * 错误处理：
     * - 如果容器不存在，静默返回（可能页面不需要侧栏）
     * - 如果词库未加载，显示"正在加载"提示
     * - 所有错误都会被捕获并记录到控制台
     */
    function initVocabSidebar() {
        console.log('Vocabulary: initVocabSidebar called');
        
        try {
            // ========================================
            // 步骤 1: 查找侧栏容器
            // ========================================
            const container = document.getElementById('vocab-sidebar');
            console.log('Vocabulary: sidebar container =', container);
            
            if (!container) {
                console.log('Vocabulary: sidebar container not found');
                return;  // 容器不存在，直接返回
            }

            // ========================================
            // 步骤 2: 获取今日统计数据
            // ========================================
            console.log('Vocabulary: Getting stats...');
            const stats = getTodayStats();
            console.log('Vocabulary: stats =', stats);

            // ========================================
            // 步骤 3: 获取当前词库
            // ========================================
            const bankId = getCurrentBank();
            console.log('Vocabulary: bankId =', bankId);

            const bank = loadedWordBanks[bankId];
            console.log('Vocabulary: bank =', bank);

            // ========================================
            // 步骤 4: 检查词库是否已加载
            // ========================================
            if (!bank || !bank.words || bank.words.length === 0) {
                console.warn('Vocabulary: Bank not loaded, showing loading message');
                
                // 显示加载中提示
                container.innerHTML = `
                    <div class="vocab-sidebar-wrapper">
                        <div class="vocab-loading">${t('loading')}</div>
                    </div>
                `;
                return;
            }

            // ========================================
            // 步骤 5: 计算待复习单词数
            // ========================================
            const progress = getProgress();
            console.log('Vocabulary: progress keys =', Object.keys(progress).length);

            // 遍历词库中的所有单词，统计需要复习的数量
            // shouldReview 函数会检查单词是否到了复习时间
            const reviewCount = bank.words.filter(w => shouldReview(bankId, w.id)).length;
            console.log('Vocabulary: reviewCount =', reviewCount);

            // ========================================
            // 步骤 6: 计算本周统计
            // ========================================
            const weekStats = calculateWeekStats(progress);
            console.log('Vocabulary: weekStats =', weekStats);

            // ========================================
            // 步骤 7: 计算词库掌握率
            // ========================================
            const totalWords = bank.words.length;  // 词库总单词数
            
            // 统计已掌握的单词数（status === 'known'）
            const knownWords = bank.words.filter(w => {
                const status = getWordStatus(bankId, w.id);
                return status.status === 'known';
            }).length;
            
            // 计算掌握率百分比（四舍五入）
            const masteryRate = totalWords > 0 ? Math.round((knownWords / totalWords) * 100) : 0;
            console.log('Vocabulary: masteryRate =', masteryRate);

            // ========================================
            // 步骤 8: 生成侧栏 HTML
            // ========================================
            console.log('Vocabulary: Generating HTML...');
            
            container.innerHTML = `
                <div class="vocab-sidebar-wrapper">
                    <!-- Today's Learning Progress -->
                    <div class="vocab-progress-section">
                        <div class="vocab-progress-label">Today</div>
                        <div class="vocab-progress-bar">
                            <!-- Progress bar fill, width = (learned/target) * 100%, max 100% -->
                            <div class="vocab-progress-fill" style="width: ${Math.min((stats.learned / stats.target) * 100, 100)}%"></div>
                        </div>
                        <div class="vocab-progress-text">${stats.learned}/${stats.target} words</div>
                    </div>
                    
                    <!-- Today's Review Progress (only show when there are words to review) -->
                    ${reviewCount > 0 ? `
                    <div class="vocab-progress-section">
                        <div class="vocab-progress-label">Review</div>
                        <div class="vocab-progress-bar">
                            <!-- Review progress bar uses different color -->
                            <div class="vocab-progress-fill vocab-progress-fill-review" style="width: ${Math.min((stats.reviewed / reviewCount) * 100, 100)}%"></div>
                        </div>
                        <div class="vocab-progress-text">${stats.reviewed}/${reviewCount} words</div>
                    </div>
                    ` : ''}
                    
                    <!-- Quick Action Buttons -->
                    <div class="vocab-action-buttons">
                        <!-- Learn New Words Button -->
                        <a href="/Tools/Vocabulary/" class="vocab-action-btn vocab-btn-new">
                            Learn New
                        </a>
                        <!-- Review Old Words Button (only show when there are words to review) -->
                        ${reviewCount > 0 ? `
                        <a href="/Tools/Vocabulary/" class="vocab-action-btn vocab-btn-review">
                            Review
                        </a>
                        ` : ''}
                    </div>
                    
                    <!-- Weekly Statistics -->
                    <div class="vocab-stats-section">
                        <div class="vocab-stats-title">This Week</div>
                        <div class="vocab-stat-item">
                            <div class="vocab-stat-label">• Learned</div>
                            <div class="vocab-stat-value">${weekStats.learned} words</div>
                        </div>
                        <div class="vocab-stat-item">
                            <div class="vocab-stat-label">• Reviewed</div>
                            <div class="vocab-stat-value">${weekStats.reviewed} words</div>
                        </div>
                        <div class="vocab-stat-item">
                            <div class="vocab-stat-label">• Mastery</div>
                            <div class="vocab-stat-value">${masteryRate}%</div>
                        </div>
                    </div>
                </div>
            `;
            console.log('Vocabulary: Sidebar HTML generated successfully');
            
            // ========================================
            // 步骤 9: 绑定按钮事件
            // ========================================
            // 使用 setTimeout 确保 DOM 已经更新
            setTimeout(() => {
                const buttons = container.querySelectorAll('.vocab-action-btn');
                
                // 恢复之前的选中状态
                // 用户上次点击的按钮会保持选中状态
                const selectedMode = localStorage.getItem('vocab_selectedMode');
                buttons.forEach(btn => {
                    if (btn.classList.contains('vocab-btn-new') && selectedMode === 'new') {
                        btn.classList.add('selected');
                    } else if (btn.classList.contains('vocab-btn-review') && selectedMode === 'review') {
                        btn.classList.add('selected');
                    }
                });
                
                // 监听按钮点击事件
                buttons.forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        // 保存用户选择的学习模式
                        if (this.classList.contains('vocab-btn-new')) {
                            localStorage.setItem('vocab_selectedMode', 'new');
                        } else if (this.classList.contains('vocab-btn-review')) {
                            localStorage.setItem('vocab_selectedMode', 'review');
                        }
                        
                        // 更新按钮选中状态
                        buttons.forEach(b => b.classList.remove('selected'));
                        this.classList.add('selected');
                    });
                });
            }, 0);
            
        } catch (error) {
            // ========================================
            // 错误处理
            // ========================================
            console.error('Vocabulary: Error in initVocabSidebar:', error);
        }
    }

    /**
     * 计算本周学习统计
     * 
     * 这个函数统计过去 7 天内的学习情况，用于侧栏显示。
     * 
     * 统计逻辑：
     * 1. 遍历所有学习进度记录
     * 2. 筛选出最近 7 天内复习过的单词
     * 3. 根据复习次数判断是新学还是复习
     *    - reviewCount === 1: 第一次学习，算作"新学"
     *    - reviewCount > 1: 不是第一次，算作"复习"
     * 
     * 为什么用 reviewCount 判断？
     * - 第一次学习时，reviewCount 会从 0 变成 1
     * - 之后每次复习，reviewCount 都会递增
     * - 所以 reviewCount === 1 表示这是首次学习
     * 
     * 时间范围：
     * - 使用毫秒计算：7 天 = 7 * 24 * 60 * 60 * 1000 毫秒
     * - 包含今天在内的过去 7 天
     * 
     * @param {object} progress - 学习进度对象（所有单词的学习记录）
     * @returns {object} 本周统计 { learned: 新学数, reviewed: 复习数 }
     * 
     * 返回示例：
     * { learned: 50, reviewed: 30 }
     * 表示本周新学了 50 个单词，复习了 30 个单词
     */
    function calculateWeekStats(progress) {
        // ========================================
        // 步骤 1: 计算时间范围
        // ========================================
        const today = new Date();  // 当前时间
        
        // 计算 7 天前的时间点
        // getTime() 返回毫秒时间戳
        // 减去 7 天的毫秒数，得到 7 天前的时间戳
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        // ========================================
        // 步骤 2: 初始化计数器
        // ========================================
        let learned = 0;    // 本周新学单词数
        let reviewed = 0;   // 本周复习单词数

        // ========================================
        // 步骤 3: 遍历所有学习记录
        // ========================================
        // Object.values() 将对象转换为值的数组
        // 例如：{ 'key1': {data1}, 'key2': {data2} } → [{data1}, {data2}]
        Object.values(progress).forEach(item => {
            // ========================================
            // 步骤 4: 检查是否有复习记录
            // ========================================
            // 如果 lastReview 为 null 或 undefined，说明从未学过，跳过
            if (item.lastReview) {
                // ========================================
                // 步骤 5: 解析复习日期
                // ========================================
                // lastReview 是日期字符串（如 'Mon Jan 01 2024'）
                // 转换为 Date 对象以便比较
                const reviewDate = new Date(item.lastReview);
                
                // ========================================
                // 步骤 6: 检查是否在本周范围内
                // ========================================
                // 如果复习日期 >= 7 天前，说明是本周内的学习
                if (reviewDate >= weekAgo) {
                    // ========================================
                    // 步骤 7: 判断是新学还是复习
                    // ========================================
                    if (item.reviewCount === 1) {
                        // reviewCount === 1 表示这是第一次学习
                        // 算作"新学"
                        learned++;
                    } else {
                        // reviewCount > 1 表示之前学过，这次是复习
                        // 算作"复习"
                        reviewed++;
                    }
                }
            }
        });

        // ========================================
        // 步骤 8: 返回统计结果
        // ========================================
        return { learned, reviewed };
    }



    // ============================================================================
    // 主区域模块 - 单词学习界面
    // ============================================================================
    // 这个模块负责主学习区域的所有功能，包括：
    // - 单词卡片的渲染和翻转
    // - 学习进度的跟踪
    // - 用户交互（按钮点击、键盘快捷键）
    // - 词库切换和设置调整

    /**
     * Fisher-Yates 洗牌算法 - 高效随机打乱数组
     * 
     * ============================================================================
     * 算法说明
     * ============================================================================
     * Fisher-Yates（费雪-耶茨）洗牌算法是一个经典的数组随机排列算法，
     * 由 Ronald Fisher 和 Frank Yates 于 1938 年提出。
     * 
     * ============================================================================
     * 算法原理
     * ============================================================================
     * 从数组末尾开始，逐个将当前元素与前面的随机元素交换位置。
     * 
     * 工作流程（以 [A, B, C, D] 为例）：
     * 
     * 初始状态：[A, B, C, D]
     * 
     * 第 1 轮（i = 3）：
     * - 从 [0, 1, 2, 3] 中随机选一个索引 j
     * - 假设 j = 1，交换 D 和 B
     * - 结果：[A, D, C, B]
     * 
     * 第 2 轮（i = 2）：
     * - 从 [0, 1, 2] 中随机选一个索引 j
     * - 假设 j = 0，交换 C 和 A
     * - 结果：[C, D, A, B]
     * 
     * 第 3 轮（i = 1）：
     * - 从 [0, 1] 中随机选一个索引 j
     * - 假设 j = 1，交换 D 和 D（自己）
     * - 结果：[C, D, A, B]
     * 
     * 完成！最终得到随机排列的数组。
     * 
     * ============================================================================
     * 算法特点
     * ============================================================================
     * 
     * 1. 时间复杂度：O(n)
     *    - 只需要遍历数组一次
     *    - 每个元素只交换一次
     * 
     * 2. 空间复杂度：O(n)
     *    - 需要创建数组副本（不修改原数组）
     *    - 如果允许修改原数组，可以优化到 O(1)
     * 
     * 3. 均匀分布：
     *    - 每种排列出现的概率完全相同
     *    - 这是真正的"随机"，不是伪随机
     * 
     * 4. 原地操作：
     *    - 不需要额外的辅助数组
     *    - 直接在数组内交换元素
     * 
     * ============================================================================
     * 为什么使用这个算法？
     * ============================================================================
     * 
     * 1. 避免记忆顺序：
     *    - 如果单词总是按固定顺序出现，用户可能记住顺序而不是单词
     *    - 随机打乱可以强制用户真正记忆单词本身
     * 
     * 2. 提高学习效果：
     *    - 随机顺序更接近真实使用场景
     *    - 避免"位置记忆"（记住单词在列表中的位置）
     * 
     * 3. 保持新鲜感：
     *    - 每次学习的顺序都不同
     *    - 避免枯燥和厌倦
     * 
     * ============================================================================
     * 其他洗牌算法对比
     * ============================================================================
     * 
     * 1. 简单随机排序（不推荐）：
     *    array.sort(() => Math.random() - 0.5)
     *    - 问题：不是真正的均匀分布
     *    - 某些排列出现的概率更高
     *    - 时间复杂度：O(n log n)，更慢
     * 
     * 2. 多次随机交换（不推荐）：
     *    for (let i = 0; i < n; i++) {
     *      swap(random(), random())
     *    }
     *    - 问题：不保证均匀分布
     *    - 可能某些元素从未被交换
     * 
     * 3. Fisher-Yates（推荐）：
     *    - 数学上证明是均匀分布
     *    - 时间复杂度最优
     *    - 实现简单
     * 
     * @param {Array} array - 要打乱的数组
     * @returns {Array} 打乱后的新数组（不修改原数组）
     * 
     * 使用示例：
     * const words = ['apple', 'banana', 'cherry'];
     * const shuffled = shuffleArray(words);
     * // shuffled 可能是 ['cherry', 'apple', 'banana']
     * // words 保持不变：['apple', 'banana', 'cherry']
     */
    function shuffleArray(array) {
        // ========================================
        // 步骤 1: 创建数组副本
        // ========================================
        // 使用扩展运算符 [...array] 创建浅拷贝
        // 这样不会修改原数组，避免副作用
        const shuffled = [...array];
        
        // ========================================
        // 步骤 2: 从后向前遍历数组
        // ========================================
        // i 从最后一个索引开始，递减到 1
        // 为什么到 1 而不是 0？
        // - 当只剩最后一个元素时，不需要再交换
        // - 它已经在正确的位置了
        for (let i = shuffled.length - 1; i > 0; i--) {
            // ========================================
            // 步骤 3: 生成随机索引
            // ========================================
            // Math.random() 生成 [0, 1) 之间的随机数
            // 乘以 (i + 1) 得到 [0, i+1) 之间的随机数
            // Math.floor() 向下取整，得到 [0, i] 之间的整数
            // 
            // 例如：i = 3 时
            // Math.random() * 4 → [0, 4) 之间的小数
            // Math.floor() → 0, 1, 2, 或 3
            const j = Math.floor(Math.random() * (i + 1));
            
            // ========================================
            // 步骤 4: 交换元素
            // ========================================
            // 使用 ES6 解构赋值语法交换两个元素
            // 等价于：
            // const temp = shuffled[i];
            // shuffled[i] = shuffled[j];
            // shuffled[j] = temp;
            // 
            // 但解构赋值更简洁，不需要临时变量
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // ========================================
        // 步骤 5: 返回打乱后的数组
        // ========================================
        return shuffled;
    }

    /**
     * 初始化主区域学习界面
     * 
     * 这是主学习区域的入口函数，负责：
     * 1. 检查容器元素是否存在
     * 2. 加载当前词库数据
     * 3. 筛选今日要学习的单词
     * 4. 渲染学习界面
     * 5. 绑定交互事件
     * 
     * ============================================================================
     * 学习模式说明
     * ============================================================================
     * 
     * 系统支持两种学习模式：
     * 
     * 1. 新词模式（'new'）：
     *    - 优先学习从未学过的单词
     *    - 适合扩展词汇量
     *    - 每天学习固定数量的新词
     * 
     * 2. 复习模式（'review'）：
     *    - 优先复习到期的单词
     *    - 适合巩固已学单词
     *    - 如果复习词不够，会补充新词
     * 
     * ============================================================================
     * 单词筛选逻辑
     * ============================================================================
     * 
     * 复习词筛选：
     * - 使用 shouldReview() 函数判断
     * - 条件：单词已学过 && 到了复习时间
     * - 基于艾宾浩斯遗忘曲线算法
     * 
     * 新词筛选：
     * - 条件：status === 'unknown'（从未学过）
     * - 按词库顺序选择
     * - 数量受每日目标限制
     * 
     * 混合策略：
     * - 复习模式：先复习词，不够则补充新词
     * - 新词模式：只学新词，达到每日目标
     * 
     * ============================================================================
     * 错误处理
     * ============================================================================
     * 
     * 1. 容器不存在：
     *    - 静默返回，不报错
     *    - 可能页面不需要学习界面
     * 
     * 2. 词库未加载：
     *    - 显示"正在加载"提示
     *    - 等待词库加载完成
     * 
     * 3. 没有单词可学：
     *    - 显示完成消息
     *    - 提示用户已完成今日目标
     * 
     * 4. 其他错误：
     *    - 捕获并记录到控制台
     *    - 不影响页面其他功能
     */
    function initVocabApp() {
        console.log('Vocabulary: initVocabApp called');
        
        try {
            // ========================================
            // 步骤 1: 查找主区域容器
            // ========================================
            const container = document.getElementById('vocab-app');
            console.log('Vocabulary: app container =', container);
            
            if (!container) {
                console.log('Vocabulary: app container not found');
                return;  // 容器不存在，直接返回
            }

            // ========================================
            // 步骤 2: 获取当前词库
            // ========================================
            const bankId = getCurrentBank();  // 从 localStorage 读取当前词库 ID
            const bank = loadedWordBanks[bankId];  // 从内存缓存获取词库数据

            // ========================================
            // 步骤 3: 验证词库数据
            // ========================================
            // 检查词库是否已加载且包含单词
            if (!bank || bank.words.length === 0) {
                // 词库未加载或为空，显示加载提示
                container.innerHTML = `
                    <div class="vocab-loading-message">
                        <div class="vocab-loading-title">${t('loadingTitle')}</div>
                        <div class="vocab-loading-text">${t('loadingText')}</div>
                    </div>
                `;
                return;
            }

            // ========================================
            // 步骤 4: 获取学习进度数据
            // ========================================
            const progress = getProgress();  // 从 localStorage 读取所有学习进度

            console.log('Vocabulary: Getting words to learn...');
            
            // ========================================
            // 步骤 5: 获取用户选择的学习模式
            // ========================================
            // 从 localStorage 读取用户上次选择的模式
            // 默认为 'new'（新词模式）
            const selectedMode = localStorage.getItem('vocab_selectedMode') || 'new';
            console.log('Vocabulary: Selected mode =', selectedMode);
            
            // ========================================
            // 步骤 6: 筛选待复习的单词
            // ========================================
            // 🔄 使用 filter() 方法筛选需要复习的单词
            // shouldReview() 函数会检查：
            // 1. 单词是否已学过（status !== 'unknown'）
            // 2. 是否到了复习时间（today >= nextReview）
            const reviewWords = bank.words.filter(w => shouldReview(bankId, w.id));
            
            // ========================================
            // 步骤 7: 筛选新单词（未学过的）
            // ========================================
            // 📖 筛选从未学过的单词
            const newWords = bank.words.filter(w => {
                const status = getWordStatus(bankId, w.id);
                // status === 'unknown' 表示从未学过
                return status.status === 'unknown';
            });

            // ========================================
            // 步骤 8: 根据学习模式组合学习队列
            // ========================================
            // 🎯 这是核心逻辑，决定用户今天要学哪些单词
            let todayWords = [];  // 今日学习队列
            let learningMode = selectedMode;  // 实际使用的学习模式
            
            if (selectedMode === 'review' && reviewWords.length > 0) {
                // ----------------------------------------
                // 情况 A: 用户选择复习模式，且有待复习的单词
                // ----------------------------------------
                
                // 将所有待复习的单词加入队列，并随机打乱
                // 为什么要打乱？避免用户记住单词顺序
                todayWords = [...shuffleArray(reviewWords)];
                
                // 检查复习词数量是否达到每日目标
                const dailyTarget = getDailyTarget();  // 获取每日目标（如 30 词）
                const remainingSlots = Math.max(0, dailyTarget - reviewWords.length);
                
                // 如果复习词不够，补充新词
                // 例如：目标 30 词，复习词只有 20 个，则补充 10 个新词
                if (remainingSlots > 0 && newWords.length > 0) {
                    // 从新词中随机选择需要的数量
                    // slice(0, remainingSlots) 取前 N 个
                    todayWords.push(...shuffleArray(newWords).slice(0, remainingSlots));
                }
                
            } else {
                // ----------------------------------------
                // 情况 B: 用户选择新词模式，或没有待复习的单词
                // ----------------------------------------
                
                const dailyTarget = getDailyTarget();  // 获取每日目标
                
                // 从新词中随机选择，数量 = 每日目标
                // 例如：目标 30 词，则选择 30 个新词
                todayWords = shuffleArray(newWords).slice(0, dailyTarget);
                
                // 更新学习模式为新词模式
                learningMode = 'new';
            }

            // ========================================
            // 步骤 9: 输出调试信息
            // ========================================
            console.log('Vocabulary: Learning mode =', learningMode);
            console.log('Vocabulary: Review words =', reviewWords.length);
            console.log('Vocabulary: New words =', newWords.length);
            console.log('Vocabulary: Today words =', todayWords.length);

            // ========================================
            // 步骤 10: 初始化学习状态变量
            // ========================================
            let currentIndex = 0;      // 当前单词索引（从 0 开始）
            let isFlipped = false;     // 卡片是否翻转（false = 正面，true = 背面）

            // ========================================
            // 步骤 11: 检查是否有单词可学
            // ========================================
            if (todayWords.length === 0) {
                // 没有单词可学，可能的原因：
                // 1. 所有新词都学完了
                // 2. 没有到期的复习词
                // 3. 今日目标已完成
                console.log('Vocabulary: No words to learn today');
                showCompleteMessage(container, bank);  // 显示完成消息
                return;
            }

            // ========================================
            // 步骤 12: 渲染学习界面
            // ========================================
            console.log('Vocabulary: Rendering main app...');
            // renderMainApp 函数负责生成 HTML 内容
            // 包括：单词卡片、进度条、统计信息、控制按钮等
            renderMainApp(container, bankId, bank, todayWords, currentIndex, isFlipped, learningMode);

            // ========================================
            // 步骤 13: 绑定交互事件
            // ========================================
            console.log('Vocabulary: Setting up events...');
            // setupMainAppEvents 函数负责绑定所有事件监听器
            // 包括：按钮点击、键盘快捷键、卡片翻转、词库切换等
            setupMainAppEvents(container, bankId, todayWords, currentIndex, isFlipped, learningMode);

            console.log('Vocabulary: Main app initialized successfully');
            
        } catch (error) {
            // ========================================
            // 错误处理
            // ========================================
            // 捕获所有错误，避免影响页面其他功能
            console.error('Vocabulary: Error in initVocabApp:', error);
        }
    }

    /**
     * 渲染主应用界面（生成单词卡片 HTML）
     * 
     * 这是一个核心渲染函数，负责生成完整的学习界面 HTML。
     * 
     * ============================================================================
     * 界面组成部分
     * ============================================================================
     * 
     * 1. 顶部工具栏（vocab-header）：
     *    - 词库选择器（自定义下拉菜单）
     *    - 每日目标设置（自定义下拉菜单）
     *    - 学习进度指示器（第 X/Y 词）
     *    - 词库掌握率统计
     * 
     * 2. 单词卡片（vocab-card）：
     *    - 正面（front）：单词 + 音标 + 翻转提示
     *    - 背面（back）：详细释义 + 例句 + 同义词等
     *    - 支持点击翻转（CSS 3D transform）
     * 
     * 3. 控制按钮（vocab-controls）：
     *    - 不认识按钮（触发 'unknown' 状态）
     *    - 模糊按钮（触发 'learning' 状态）
     *    - 认识按钮（触发 'known' 状态，主按钮样式）
     * 
     * 4. 快捷键提示（vocab-shortcuts）：
     *    - 显示键盘快捷键说明
     *    - ← 不认识 | ↓ 模糊 | → 认识 | 空格 翻转
     * 
     * 5. 底部统计（vocab-bottom-stats）：
     *    - 今日新学数
     *    - 今日复习数
     *    - 累计掌握数
     *    - 掌握率百分比
     * 
     * ============================================================================
     * 数据处理流程
     * ============================================================================
     * 
     * 1. 获取当前单词数据和学习状态
     * 2. 计算统计数据（今日进度、掌握率等）
     * 3. 生成各个部分的 HTML 字符串
     * 4. 组装完整的 HTML 并插入容器
     * 
     * ============================================================================
     * HTML 生成策略
     * ============================================================================
     * 
     * - 使用模板字符串（template literal）生成 HTML
     * - 条件渲染：${condition ? html : ''}
     * - 数组映射：array.map(item => html).join('')
     * - 数据限制：slice(0, n) 限制显示数量
     * 
     * @param {HTMLElement} container - 容器元素
     * @param {string} bankId - 词库 ID
     * @param {object} bank - 词库对象
     * @param {Array} wordsToLearn - 今日学习的单词数组
     * @param {number} currentIndex - 当前单词索引
     * @param {boolean} isFlipped - 卡片是否翻转（未使用，保留用于扩展）
     * @param {string} learningMode - 学习模式（'new' 或 'review'）
     */
    function renderMainApp(container, bankId, bank, wordsToLearn, currentIndex, isFlipped, learningMode = 'new') {
        // ========================================
        // 步骤 1: 获取当前单词数据和状态
        // ========================================
        const currentWord = wordsToLearn[currentIndex];  // 从学习队列中获取当前单词
        const wordStatus = getWordStatus(bankId, currentWord.id);  // 获取单词的学习状态
        const isReviewWord = wordStatus.status !== 'unknown';  // 判断是否为复习词
        
        // 输出调试信息，方便开发时追踪
        console.log('Vocabulary: Rendering word:', currentWord.word);
        console.log('Vocabulary: Word status:', wordStatus);
        console.log('Vocabulary: Learning mode:', learningMode);
        console.log('Vocabulary: Is review word:', isReviewWord);
        
        // ========================================
        // 步骤 2: 获取统计数据
        // ========================================
        const stats = getTodayStats();  // 今日学习统计（新学数、复习数）
        const totalWords = bank.words.length;  // 词库总单词数
        
        // 计算已掌握的单词数（status === 'known'）
        const knownWords = bank.words.filter(w => {
            const status = getWordStatus(bankId, w.id);
            return status.status === 'known';  // 只统计状态为 'known' 的单词
        }).length;

        // ========================================
        // 步骤 3: 生成音标显示 HTML
        // ========================================
        // 音标显示策略：
        // - 如果同时有美式和英式音标，分别显示并用国旗 emoji 区分
        // - 否则显示通用音标
        let phoneticHtml = '';
        if (currentWord.usphone && currentWord.ukphone) {
            // 同时有美式和英式音标
            // 🇺🇸 表示美式发音，🇬🇧 表示英式发音
            phoneticHtml = `<span class="vocab-phonetic-us">🇺🇸 ${currentWord.usphone}</span> <span class="vocab-phonetic-uk">🇬🇧 ${currentWord.ukphone}</span>`;
        } else {
            // 只有一种音标或通用音标
            phoneticHtml = currentWord.phonetic;
        }

        // ========================================
        // 步骤 4: 生成详细释义 HTML
        // ========================================
        // 释义包含：词性（n. v. adj. 等）+ 中文释义 + 英文释义
        // 
        // 数据结构：
        // trans: [
        //   { pos: 'n.', tranCn: '名词释义', tranOther: '英文解释' },
        //   { pos: 'v.', tranCn: '动词释义', tranOther: '英文解释' }
        // ]
        let transHtml = '';
        if (currentWord.trans && currentWord.trans.length > 0) {
            // 有详细的释义数据，逐条生成 HTML
            transHtml = currentWord.trans.map(t => {
                let html = `<div class="vocab-trans-item">`;
                
                // 添加词性标签（如果有）
                // 例如：n. v. adj. adv. prep. conj. 等
                if (t.pos) html += `<span class="vocab-pos">${t.pos}.</span> `;
                
                // 添加中文释义（主要释义，用户最关注的部分）
                html += `<span class="vocab-tran-cn">${t.tranCn || ''}</span>`;
                
                // 添加英文释义（如果有）
                // 英文释义通常是更详细的解释，帮助理解单词的精确含义
                if (t.tranOther) html += `<div class="vocab-tran-en">${t.tranOther}</div>`;
                
                html += `</div>`;
                return html;
            }).join('');  // 将所有释义连接成一个字符串
        } else {
            // 没有详细释义，使用简化的 meaning 字段
            // meaning 是一个合并后的字符串，包含所有词性的释义
            transHtml = `<div class="vocab-trans-item">${currentWord.meaning}</div>`;
        }

        // ========================================
        // 步骤 5: 生成例句 HTML
        // ========================================
        // 例句帮助理解单词在实际语境中的用法
        // 
        // 显示策略：
        // - 最多显示 2 个例句（避免内容过多）
        // - 每个例句包含英文原句和中文翻译
        let sentencesHtml = '';
        if (currentWord.sentences && currentWord.sentences.length > 0) {
            sentencesHtml = `<div class="vocab-section vocab-sentences">
                <div class="vocab-section-title">📝 例句</div>
                ${currentWord.sentences.slice(0, 2).map(s => `
                    <div class="vocab-sentence-item">
                        <div class="vocab-sentence-en">${s.sContent_eng || s.sContent}</div>
                        <div class="vocab-sentence-cn">${s.sCn}</div>
                    </div>
                `).join('')}
            </div>`;
            // 说明：
            // - slice(0, 2): 只取前 2 个例句
            // - sContent_eng: 纯英文例句（无 HTML 标签）
            // - sContent: 原始例句（可能包含 HTML 标签，如加粗、斜体）
            // - sCn: 中文翻译
        }

        // ========================================
        // 步骤 6: 生成真题例句 HTML
        // ========================================
        // 真题例句来自实际考试，更有参考价值
        // 
        // 显示策略：
        // - 只显示 1 个真题例句（真题例句通常较长）
        // - 显示来源信息（年份、级别、题型）
        let realExamHtml = '';
        if (currentWord.realExamSentences && currentWord.realExamSentences.length > 0) {
            realExamHtml = `<div class="vocab-section vocab-real-exam">
                <div class="vocab-section-title">📚 真题例句</div>
                ${currentWord.realExamSentences.slice(0, 1).map(s => {
                // 生成来源信息文本
                // 例如：2020 考研 阅读理解
                const sourceText = s.sourceInfo ?
                    `${s.sourceInfo.year || ''} ${s.sourceInfo.level || ''} ${s.sourceInfo.type || ''}` : '';
                return `<div class="vocab-exam-item">
                        <div class="vocab-exam-content">${s.sContent}</div>
                        ${sourceText ? `<div class="vocab-exam-source">${sourceText}</div>` : ''}
                    </div>`;
            }).join('')}
            </div>`;
            // 说明：
            // - slice(0, 1): 只显示 1 个真题例句
            // - sourceInfo: 包含 year（年份）、level（级别）、type（题型）
        }

        // ========================================
        // 步骤 7: 生成同近义词 HTML
        // ========================================
        // 同义词帮助扩展词汇量，理解单词的不同表达方式
        // 
        // 显示策略：
        // - 从所有词性的同义词中提取单词
        // - 最多显示 6 个同义词
        // - 使用标签（tag）样式显示
        let synosHtml = '';
        if (currentWord.synos && currentWord.synos.length > 0) {
            // flatMap: 将嵌套数组展平
            // 例如：[[a, b], [c, d]] → [a, b, c, d]
            const allSynos = currentWord.synos.flatMap(s => s.hwds).slice(0, 6);
            
            if (allSynos.length > 0) {
                synosHtml = `<div class="vocab-section vocab-synos">
                    <div class="vocab-section-title">🔗 同近义词</div>
                    <div class="vocab-tags">${allSynos.map(w => `<span class="vocab-tag">${w}</span>`).join('')}</div>
                </div>`;
                // 说明：
                // - vocab-tag: 标签样式，类似"胶囊"形状
                // - 每个同义词都是一个独立的标签
            }
        }

        // ========================================
        // 步骤 8: 生成反义词 HTML
        // ========================================
        // 反义词帮助理解单词的对立含义
        // 
        // 显示策略：
        // - 使用与同义词不同的颜色（vocab-tag-alt）
        // - 帮助用户区分同义词和反义词
        let antosHtml = '';
        if (currentWord.antos && currentWord.antos.length > 0) {
            antosHtml = `<div class="vocab-section vocab-antos">
                <div class="vocab-section-title">⚡ 反义词</div>
                <div class="vocab-tags">${currentWord.antos.map(w => `<span class="vocab-tag vocab-tag-alt">${w}</span>`).join('')}</div>
            </div>`;
            // 说明：
            // - vocab-tag-alt: 使用不同颜色区分反义词和同义词
        }

        // ========================================
        // 步骤 9: 生成短语搭配 HTML
        // ========================================
        // 短语搭配展示单词的常用组合
        // 
        // 显示策略：
        // - 最多显示 3 个短语
        // - 每个短语包含英文和中文翻译
        let phrasesHtml = '';
        if (currentWord.phrases && currentWord.phrases.length > 0) {
            phrasesHtml = `<div class="vocab-section vocab-phrases">
                <div class="vocab-section-title">💡 短语搭配</div>
                <div class="vocab-phrase-list">
                    ${currentWord.phrases.slice(0, 3).map(p => `
                        <div class="vocab-phrase-item">
                            <span class="vocab-phrase-en">${p.pContent}</span>
                            <span class="vocab-phrase-cn">${p.pCn}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
            // 说明：
            // - slice(0, 3): 最多显示 3 个短语
            // - pContent: 英文短语
            // - pCn: 中文翻译
        }

        // ========================================
        // 步骤 10: 生成同根词 HTML
        // ========================================
        // 同根词帮助理解词根和词缀的变化规律
        // 
        // 显示策略：
        // - 最多显示 3 组同根词
        // - 每组最多显示 2 个单词
        // - 按词性分组显示
        let relWordsHtml = '';
        if (currentWord.relWords && currentWord.relWords.length > 0) {
            relWordsHtml = `<div class="vocab-section vocab-rel-words">
                <div class="vocab-section-title">🌳 同根词</div>
                <div class="vocab-rel-list">
                    ${currentWord.relWords.slice(0, 3).map(r => `
                        <div class="vocab-rel-group">
                            <span class="vocab-rel-pos">${r.pos}.</span>
                            ${r.words.slice(0, 2).map(w => `<span class="vocab-rel-word">${w.hwd}</span>`).join(' ')}
                        </div>
                    `).join('')}
                </div>
            </div>`;
            // 说明：
            // - 外层 slice(0, 3): 最多 3 组
            // - 内层 slice(0, 2): 每组最多 2 个单词
            // - 按词性分组，便于理解词性变化规律
        }

        // ========================================
        // 步骤 11: 生成记忆方法 HTML
        // ========================================
        // 记忆方法提供助记技巧，帮助记忆单词
        // 
        // 常见的记忆方法：
        // - 词根词缀分析
        // - 谐音联想
        // - 图像记忆
        // - 故事记忆
        let remMethodHtml = '';
        if (currentWord.remMethod) {
            remMethodHtml = `<div class="vocab-section vocab-rem-method">
                <div class="vocab-section-title">🧠 记忆技巧</div>
                <div class="vocab-rem-content">${currentWord.remMethod}</div>
            </div>`;
        }

        // ========================================
        // 步骤 12: 组装完整的 HTML 字符串并插入容器
        // ========================================
        // 
        // 使用模板字符串（template literal）生成 HTML
        // 
        // 优点：
        // 1. 可读性好，结构清晰
        // 2. 支持多行字符串
        // 3. 支持变量插值 ${...}
        // 4. 支持条件渲染 ${condition ? html : ''}
        // 
        // HTML 结构说明：
        // - vocab-header: 顶部工具栏
        //   - vocab-bank-selector: 词库和目标选择器
        //   - vocab-progress-indicator: 进度指示器
        // - vocab-card-container: 卡片容器
        //   - vocab-card: 翻转卡片
        //     - vocab-card-front: 卡片正面（单词+音标）
        //     - vocab-card-back: 卡片背面（详细信息）
        // - vocab-controls: 控制按钮
        // - vocab-shortcuts: 快捷键提示
        // - vocab-bottom-stats: 底部统计
        container.innerHTML = `
            <!-- ========================================
                 顶部工具栏
                 ======================================== -->
            <div class="vocab-header">
                <!-- Word Bank Selector and Daily Target Settings -->
                <div class="vocab-bank-selector">
                    <span class="vocab-bank-label">Bank:</span>
                    
                    <!-- Custom Dropdown Selector (Word Bank Selection)
                         Why use custom dropdown instead of native select?
                         1. Native select styles are hard to customize
                         2. Inconsistent display across browsers
                         3. Custom dropdown allows full control over style and interaction -->
                    <div class="vocab-bank-select-custom" id="vocab-bank-select-custom">
                        <!-- Display Area (what user clicks) -->
                        <div class="vocab-bank-select-display" id="vocab-bank-select-display">
                            <span class="vocab-bank-select-text">${wordBankConfig[bankId].name}</span>
                            <!-- Dropdown Arrow Icon (SVG) -->
                            <span class="vocab-bank-select-arrow">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
                                    <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2 4l4 4 4-4"/>
                                </svg>
                            </span>
                        </div>
                        <!-- Dropdown Options List -->
                        <div class="vocab-bank-select-dropdown" id="vocab-bank-select-dropdown">
                            ${Object.keys(wordBankConfig).map(key =>
                                `<div class="vocab-bank-select-option ${key === bankId ? 'selected' : ''}" data-value="${key}">${wordBankConfig[key].name}</div>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <!-- Native select (hidden, for compatibility)
                         Reasons to keep native select:
                         1. As data source, easy to read selected value
                         2. Provides fallback when JavaScript is disabled
                         3. Convenient for form submission (if needed) -->
                    <select class="vocab-bank-select" id="vocab-bank-select" style="display: none;">
                        ${Object.keys(wordBankConfig).map(key =>
            `<option value="${key}" ${key === bankId ? 'selected' : ''}>${wordBankConfig[key].name}</option>`
        ).join('')}
                    </select>
                    
                    <span class="vocab-bank-label" style="margin-left: 0.65rem;">Daily:</span>
                    
                    <!-- Custom Dropdown Selector (Daily Target Setting) -->
                    <div class="vocab-bank-select-custom" id="vocab-daily-target-custom">
                        <div class="vocab-bank-select-display" id="vocab-daily-target-display">
                            <span class="vocab-bank-select-text">${getDailyTarget()} words</span>
                            <span class="vocab-bank-select-arrow">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
                                    <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2 4l4 4 4-4"/>
                                </svg>
                            </span>
                        </div>
                        <div class="vocab-bank-select-dropdown" id="vocab-daily-target-dropdown">
                            <!-- Provide 30, 40, 50 options -->
                            ${[30, 40, 50].map(num =>
                                `<div class="vocab-bank-select-option ${num === getDailyTarget() ? 'selected' : ''}" data-value="${num}">${num} words</div>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                
                <!-- Learning Progress Indicator -->
                <div class="vocab-progress-indicator">
                    ${currentIndex + 1}/${wordsToLearn.length}
                    <!-- Display Learning Mode Badge -->
                    ${learningMode === 'review' ? '<span class="vocab-review-badge">Review</span>' : '<span class="vocab-new-badge">New</span>'}
                    <!-- Display Bank Mastery Status -->
                    <span class="vocab-bank-total">${knownWords}/${totalWords} words</span>
                </div>
            </div>
            
            <!-- ========================================
                 单词卡片容器
                 ======================================== -->
            <div class="vocab-card-container">
                <!-- 翻转卡片
                     使用 CSS 3D transform 实现翻转效果
                     点击卡片时添加 'flipped' 类触发翻转动画 -->
                <div class="vocab-card" id="vocab-card">
                    <!-- Card Front: Display word and phonetic -->
                    <div class="vocab-card-front">
                        <div class="vocab-word">${currentWord.word}</div>
                        <div class="vocab-phonetic">${phoneticHtml}</div>
                        <div class="vocab-flip-hint">Click to see definition</div>
                    </div>
                    
                    <!-- 卡片背面：显示详细信息 -->
                    <div class="vocab-card-back">
                        <!-- 可滚动的内容区域 -->
                        <div class="vocab-card-back-content" id="vocab-card-back-content" data-word-id="${currentWord.id}">
                            <!-- 初始显示简单释义，翻转时加载完整详情 -->
                            <div class="vocab-word-mini">${currentWord.word}</div>
                            <div class="vocab-trans-list">
                                <div class="vocab-trans-item">${currentWord.meaning || 'Loading...'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ========================================
                 Control Buttons
                 ======================================== -->
            <div class="vocab-controls">
                <!-- Don't Know Button (red, indicates need focused learning) -->
                <button class="vocab-btn" id="vocab-unknown-btn">Don't Know</button>
                <!-- Fuzzy Button (yellow, indicates need continued practice) -->
                <button class="vocab-btn" id="vocab-fuzzy-btn">Fuzzy</button>
                <!-- Know Button (green, primary button style, indicates mastered) -->
                <button class="vocab-btn primary" id="vocab-known-btn">Know</button>
            </div>
            
            <!-- ========================================
                 Keyboard Shortcuts Hint
                 ======================================== -->
            <div class="vocab-shortcuts">
                Shortcuts: ← Don't Know | ↓ Fuzzy | → Know | Space Flip
            </div>
            
            <!-- ========================================
                 Bottom Statistics
                 ======================================== -->
            <div class="vocab-bottom-stats">
                <!-- Today's New Words Count -->
                <div class="vocab-bottom-stat">
                    <div class="vocab-bottom-stat-value">${stats.learned}</div>
                    <div class="vocab-bottom-stat-label">Learned Today</div>
                </div>
                <!-- Today's Review Count -->
                <div class="vocab-bottom-stat">
                    <div class="vocab-bottom-stat-value">${stats.reviewed}</div>
                    <div class="vocab-bottom-stat-label">Reviewed Today</div>
                </div>
                <!-- Total Mastered Words -->
                <div class="vocab-bottom-stat">
                    <div class="vocab-bottom-stat-value">${knownWords}</div>
                    <div class="vocab-bottom-stat-label">Total Mastered</div>
                </div>
                <!-- Mastery Rate Percentage -->
                <div class="vocab-bottom-stat">
                    <div class="vocab-bottom-stat-value">${Math.round((knownWords / totalWords) * 100)}%</div>
                    <div class="vocab-bottom-stat-label">Mastery Rate</div>
                </div>
            </div>
        `;
    }

    /**
     * 设置主应用事件监听器
     * 
     * 这个函数负责绑定所有用户交互事件，包括：
     * 1. 自定义下拉菜单的交互（词库选择、每日目标设置）
     * 2. 单词卡片的翻转
     * 3. 控制按钮的点击（不认识/模糊/认识）
     * 4. 键盘快捷键
     * 5. 词库切换
     * 6. 滚动事件处理
     * 
     * ============================================================================
     * 事件处理策略
     * ============================================================================
     * 
     * 1. 事件委托：
     *    - 在父元素上监听事件，通过 event.target 判断具体元素
     *    - 减少事件监听器数量，提高性能
     * 
     * 2. 事件冒泡控制：
     *    - 使用 stopPropagation() 阻止事件冒泡
     *    - 防止下拉菜单点击触发外部点击事件
     * 
     * 3. 防止默认行为：
     *    - 使用 preventDefault() 阻止默认行为
     *    - 例如：阻止空格键滚动页面
     * 
     * 4. 闭包保存状态：
     *    - 使用闭包保存 currentIndex、isFlipped 等状态
     *    - 避免全局变量污染
     * 
     * ============================================================================
     * 交互设计说明
     * ============================================================================
     * 
     * 1. 自定义下拉菜单：
     *    - 点击显示区域：切换下拉菜单开关状态
     *    - 点击选项：更新选中状态，关闭菜单，触发相应操作
     *    - 点击外部：关闭所有下拉菜单
     * 
     * 2. 卡片翻转：
     *    - 点击卡片：切换翻转状态
     *    - 空格键：切换翻转状态
     *    - 翻转动画由 CSS 实现
     * 
     * 3. 答题按钮：
     *    - 点击按钮：记录答案，移动到下一个单词
     *    - 键盘快捷键：← 不认识 | ↓ 模糊 | → 认识
     * 
     * 4. 滚动处理：
     *    - 卡片背面内容可滚动
     *    - 阻止滚动事件冒泡到页面，避免页面跟随滚动
     * 
     * @param {HTMLElement} container - 容器元素
     * @param {string} bankId - 词库 ID
     * @param {Array} wordsToLearn - 今日学习的单词数组
     * @param {number} currentIndex - 当前单词索引
     * @param {boolean} isFlipped - 卡片是否翻转（未使用，保留用于扩展）
     * @param {string} learningMode - 学习模式（'new' 或 'review'）
     */
    function setupMainAppEvents(container, bankId, wordsToLearn, currentIndex, isFlipped, learningMode = 'new') {
        // ========================================
        // 步骤 1: 获取 DOM 元素引用
        // ========================================
        // 获取所有需要绑定事件的元素
        // 使用 getElementById 比 querySelector 更快
        const card = document.getElementById('vocab-card');  // 单词卡片
        const unknownBtn = document.getElementById('vocab-unknown-btn');  // 不认识按钮
        const fuzzyBtn = document.getElementById('vocab-fuzzy-btn');  // 模糊按钮
        const knownBtn = document.getElementById('vocab-known-btn');  // 认识按钮
        const bankSelect = document.getElementById('vocab-bank-select');  // 原生 select（隐藏）
        
        // ========================================
        // 自定义下拉选择器元素 - 词库选择
        // ========================================
        const customSelect = document.getElementById('vocab-bank-select-custom');  // 自定义下拉容器
        const selectDisplay = document.getElementById('vocab-bank-select-display');  // 显示区域
        const selectDropdown = document.getElementById('vocab-bank-select-dropdown');  // 下拉列表
        const selectOptions = selectDropdown.querySelectorAll('.vocab-bank-select-option');  // 所有选项

        // ========================================
        // 自定义下拉选择器元素 - 每日单词数
        // ========================================
        const dailyTargetCustom = document.getElementById('vocab-daily-target-custom');  // 自定义下拉容器
        const dailyTargetDisplay = document.getElementById('vocab-daily-target-display');  // 显示区域
        const dailyTargetDropdown = document.getElementById('vocab-daily-target-dropdown');  // 下拉列表
        const dailyTargetOptions = dailyTargetDropdown.querySelectorAll('.vocab-bank-select-option');  // 所有选项

        // ========================================
        // 步骤 2: 绑定词库下拉菜单事件
        // ========================================
        // 点击显示区域，切换下拉菜单的开关状态
        selectDisplay.addEventListener('click', (e) => {
            // 阻止事件冒泡，防止触发外部点击事件
            e.stopPropagation();
            
            // 切换当前下拉菜单的 'open' 类
            // toggle: 如果有这个类就移除，没有就添加
            customSelect.classList.toggle('open');
            
            // 关闭另一个下拉菜单（每日目标）
            // 确保同时只有一个下拉菜单打开
            dailyTargetCustom.classList.remove('open');
        });

        // ========================================
        // 步骤 3: 绑定每日目标下拉菜单事件
        // ========================================
        // 点击显示区域，切换下拉菜单的开关状态
        dailyTargetDisplay.addEventListener('click', (e) => {
            e.stopPropagation();  // 阻止事件冒泡
            dailyTargetCustom.classList.toggle('open');  // 切换开关状态
            customSelect.classList.remove('open');  // 关闭另一个下拉菜单
        });

        // ========================================
        // 步骤 4: 绑定词库选项点击事件
        // ========================================
        // 遍历所有词库选项，为每个选项绑定点击事件
        selectOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();  // 阻止事件冒泡
                
                // 获取选项的值（词库 ID）
                // data-value 是 HTML 中的自定义属性
                const value = option.dataset.value;
                
                // ========================================
                // 更新选中状态
                // ========================================
                // 移除所有选项的 'selected' 类
                selectOptions.forEach(opt => opt.classList.remove('selected'));
                // 为当前选项添加 'selected' 类
                option.classList.add('selected');
                
                // ========================================
                // 更新显示文本
                // ========================================
                // 获取选项的文本内容（词库名称）
                const text = option.textContent;
                // 更新显示区域的文本
                selectDisplay.querySelector('.vocab-bank-select-text').textContent = text;
                
                // ========================================
                // 更新隐藏的 select（保持兼容性）
                // ========================================
                bankSelect.value = value;
                
                // ========================================
                // 关闭下拉菜单
                // ========================================
                customSelect.classList.remove('open');
                
                // ========================================
                // 触发词库切换
                // ========================================
                // 只有当选择的词库与当前词库不同时才切换
                // 避免重复加载同一词库
                if (value !== bankId) {
                    switchWordBank(value);
                }
            });
        });

        // ========================================
        // 步骤 5: 绑定每日目标选项点击事件
        // ========================================
        // 遍历所有每日目标选项，为每个选项绑定点击事件
        dailyTargetOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();  // 阻止事件冒泡
                
                // 获取选项的值（每日目标数）
                // parseInt: 将字符串转换为整数
                const value = parseInt(option.dataset.value);
                
                // ========================================
                // 更新选中状态
                // ========================================
                dailyTargetOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // ========================================
                // 更新显示文本
                // ========================================
                const text = option.textContent;
                dailyTargetDisplay.querySelector('.vocab-bank-select-text').textContent = text;
                
                // ========================================
                // 关闭下拉菜单
                // ========================================
                dailyTargetCustom.classList.remove('open');
                
                // ========================================
                // 保存设置并重新加载
                // ========================================
                // 只有当选择的目标与当前目标不同时才更新
                if (value !== getDailyTarget()) {
                    setDailyTarget(value);  // 保存到 localStorage
                    console.log(`✅ Daily target updated to ${value} words`);
                    location.reload();  // 重新加载页面以应用新设置
                }
            });
        });

        // ========================================
        // 步骤 6: 绑定外部点击事件（关闭下拉菜单）
        // ========================================
        // 在整个文档上监听点击事件
        // 当用户点击下拉菜单外部时，关闭所有下拉菜单
        document.addEventListener('click', (e) => {
            // 检查点击目标是否在词库下拉菜单内
            // contains: 检查元素是否包含指定的子元素
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');  // 关闭词库下拉菜单
            }
            
            // 检查点击目标是否在每日目标下拉菜单内
            if (!dailyTargetCustom.contains(e.target)) {
                dailyTargetCustom.classList.remove('open');  // 关闭每日目标下拉菜单
            }
        });

        // ========================================
        // 步骤 7: 绑定卡片翻转事件（支持按需加载详情）
        // ========================================
        // 点击卡片时，切换翻转状态
        // 如果是首次翻转到背面，则加载完整详情
        if (card) {
            card.addEventListener('click', async function () {
                const backContent = document.getElementById('vocab-card-back-content');
                const isFlipped = card.classList.contains('flipped');
                
                if (!isFlipped) {
                    // 翻转到背面
                    card.classList.add('flipped');
                    
                    // 检查是否已加载详情
                    if (backContent && !backContent.dataset.detailsLoaded) {
                        const wordId = backContent.dataset.wordId;
                        const currentWord = wordsToLearn[currentIndex];
                        
                        // 显示加载提示
                        const loadingHtml = `
                            <div class="vocab-word-mini">${currentWord.word}</div>
                            <div class="vocab-loading" style="text-align: center; padding: 2rem; color: var(--fg-muted);">
                                Loading details...
                            </div>
                        `;
                        backContent.innerHTML = loadingHtml;
                        
                        // 加载完整详情
                        try {
                            const details = await loadWordDetails(getCurrentBank(), wordId, currentWord.word);
                            
                            if (details) {
                                // 生成详情HTML
                                const detailsHtml = generateWordDetailsHtml(details);
                                backContent.innerHTML = detailsHtml;
                                backContent.dataset.detailsLoaded = 'true';
                            } else {
                                // 加载失败，显示错误提示
                                backContent.innerHTML = `
                                    <div class="vocab-word-mini">${currentWord.word}</div>
                                    <div class="vocab-trans-list">
                                        <div class="vocab-trans-item">${currentWord.meaning}</div>
                                    </div>
                                    <div style="text-align: center; padding: 1rem; color: var(--fg-muted); font-size: 0.9rem;">
                                        Failed to load details. Please try again.
                                    </div>
                                `;
                            }
                        } catch (error) {
                            console.error('Vocabulary: Error loading word details:', error);
                            backContent.innerHTML = `
                                <div class="vocab-word-mini">${currentWord.word}</div>
                                <div class="vocab-trans-list">
                                    <div class="vocab-trans-item">${currentWord.meaning}</div>
                                </div>
                            `;
                        }
                    }
                } else {
                    // 翻转回正面
                    card.classList.remove('flipped');
                }
            });
        }

        // ========================================
        // 步骤 8: 阻止卡片内容滚动时页面跟随滚动
        // ========================================
        // 这是一个重要的用户体验优化
        // 
        // 问题：
        // - 卡片背面内容可能很长，需要滚动查看
        // - 默认情况下，当卡片内容滚动到顶部或底部时，
        //   继续滚动会导致整个页面跟随滚动
        // - 这会让用户感到困惑和不适
        // 
        // 解决方案：
        // - 监听卡片内容的滚动事件
        // - 当内容在顶部或底部时，阻止事件冒泡
        // - 这样滚动只会影响卡片内容，不会影响页面
        const cardBackContent = document.querySelector('.vocab-card-back-content');
        if (cardBackContent) {
            cardBackContent.addEventListener('wheel', function (e) {
                // 获取滚动相关的尺寸信息
                const scrollTop = this.scrollTop;  // 当前滚动位置
                const scrollHeight = this.scrollHeight;  // 内容总高度
                const clientHeight = this.clientHeight;  // 可见区域高度
                const delta = e.deltaY;  // 滚动方向（正数向下，负数向上）

                // 判断是否在顶部或底部
                const atTop = scrollTop === 0 && delta < 0;  // 在顶部且向上滚动
                const atBottom = scrollTop + clientHeight >= scrollHeight && delta > 0;  // 在底部且向下滚动

                // 如果内容可滚动（内容高度 > 可见高度）
                if (scrollHeight > clientHeight) {
                    // 在顶部或底部时，阻止默认行为
                    if (atTop || atBottom) {
                        e.preventDefault();
                    }
                    // 始终阻止事件冒泡，防止页面滚动
                    e.stopPropagation();
                }
            }, { passive: false });  // passive: false 允许调用 preventDefault()
        }

        // ========================================
        // 步骤 9: 绑定按钮点击事件
        // ========================================
        // 为三个控制按钮绑定点击事件
        // 每个按钮对应一个学习结果：unknown（不认识）、learning（模糊）、known（认识）
        if (unknownBtn) {
            unknownBtn.addEventListener('click', function () {
                handleAnswer('unknown');  // 处理"不认识"答案
            });
        }

        if (fuzzyBtn) {
            fuzzyBtn.addEventListener('click', function () {
                handleAnswer('learning');  // 处理"模糊"答案
            });
        }

        if (knownBtn) {
            knownBtn.addEventListener('click', function () {
                handleAnswer('known');  // 处理"认识"答案
            });
        }

        // ========================================
        // 步骤 10: 定义词库切换函数
        // ========================================
        /**
         * 词库切换函数（异步）
         * 
         * 这个函数负责切换到新的词库并重新初始化学习界面。
         * 
         * 工作流程：
         * 1. 保存新的词库 ID 到 localStorage
         * 2. 显示加载提示
         * 3. 异步加载新词库数据
         * 4. 重新初始化学习界面
         * 
         * 为什么使用 async/await？
         * - 词库加载是异步操作（网络请求或 IndexedDB 读取）
         * - async/await 使异步代码看起来像同步代码，更易读
         * - 可以使用 try/catch 捕获错误
         * 
         * @param {string} newBankId - 新词库的 ID
         */
        async function switchWordBank(newBankId) {
            // ========================================
            // 步骤 1: 保存新词库 ID
            // ========================================
            setCurrentBank(newBankId);  // 保存到 localStorage

            // ========================================
            // 步骤 2: 显示加载提示
            // ========================================
            // 在加载新词库期间，显示友好的加载提示
            // 避免用户看到空白页面
            container.innerHTML = `
                <div class="vocab-loading-message">
                    <div class="vocab-loading-title">${t('loadingTitle')}</div>
                    <div class="vocab-loading-text">${t('loadingText')}</div>
                </div>
            `;

            // ========================================
            // 步骤 3: 加载新词库
            // ========================================
            // await: 等待异步操作完成
            // loadWordBank 会从缓存或网络加载词库数据
            await loadWordBank(newBankId);

            // ========================================
            // 步骤 4: 重新初始化学习界面
            // ========================================
            // 加载完成后，重新初始化整个学习界面
            // 包括侧栏和主区域
            initVocabApp();
        }

        // ========================================
        // 步骤 11: 绑定原生 select 的 change 事件（兼容性）
        // ========================================
        // 保留原生 select 的事件监听，作为降级方案
        // 如果 JavaScript 出错或自定义下拉菜单失效，
        // 用户仍然可以通过原生 select 切换词库
        if (bankSelect) {
            bankSelect.addEventListener('change', async function () {
                const newBankId = this.value;  // 获取选中的词库 ID
                await switchWordBank(newBankId);  // 切换词库
            });
        }

        // ========================================
        // 步骤 12: 绑定键盘快捷键
        // ========================================
        // 在整个文档上监听键盘事件
        // 这样无论焦点在哪里，快捷键都能工作
        document.addEventListener('keydown', handleKeyPress);

        // ========================================
        // 步骤 13: 定义答案处理函数
        // ========================================
        /**
         * 处理用户答案
         * 
         * 这是学习流程的核心函数，负责：
         * 1. 记录用户对当前单词的掌握程度
         * 2. 更新学习进度和统计数据
         * 3. 移动到下一个单词或显示完成消息
         * 
         * 工作流程：
         * 1. 获取当前单词
         * 2. 调用 updateWordStatus 更新学习状态
         * 3. 索引递增，移动到下一个单词
         * 4. 检查是否完成所有单词
         * 5. 如果未完成，渲染下一个单词
         * 6. 如果完成，显示完成消息
         * 
         * @param {string} status - 掌握程度（'unknown' | 'learning' | 'known'）
         */
        function handleAnswer(status) {
            // ========================================
            // 步骤 1: 获取当前单词
            // ========================================
            const currentWord = wordsToLearn[currentIndex];
            
            // ========================================
            // 步骤 2: 更新单词学习状态
            // ========================================
            // updateWordStatus 会：
            // 1. 更新单词的学习状态
            // 2. 增加复习次数
            // 3. 计算下次复习时间
            // 4. 更新今日统计
            updateWordStatus(bankId, currentWord.id, status);

            // ========================================
            // 步骤 3: 移动到下一个单词
            // ========================================
            currentIndex++;  // 索引递增

            // ========================================
            // 步骤 4: 检查是否完成所有单词
            // ========================================
            if (currentIndex >= wordsToLearn.length) {
                // ----------------------------------------
                // 情况 A: 已完成所有单词
                // ----------------------------------------
                
                // 显示完成消息
                showCompleteMessage(container, loadedWordBanks[bankId]);
                
                // 移除键盘事件监听器
                // 避免在完成页面继续响应快捷键
                document.removeEventListener('keydown', handleKeyPress);
                
            } else {
                // ----------------------------------------
                // 情况 B: 还有单词未学习
                // ----------------------------------------
                
                // 重置翻转状态（显示正面）
                isFlipped = false;
                
                // 获取词库数据
                const bank = loadedWordBanks[bankId];
                
                // 渲染下一个单词
                renderMainApp(container, bankId, bank, wordsToLearn, currentIndex, isFlipped, learningMode);
                
                // 重新绑定事件（因为 DOM 已更新）
                setupMainAppEvents(container, bankId, wordsToLearn, currentIndex, isFlipped, learningMode);
            }
        }

        // ========================================
        // 步骤 14: 定义键盘事件处理函数
        // ========================================
        /**
         * 处理键盘按键事件（支持异步卡片翻转）
         * 
         * 支持的快捷键：
         * - 空格键（Space）：翻转卡片（支持按需加载详情）
         * - 左箭头（ArrowLeft）：不认识
         * - 下箭头（ArrowDown）：模糊
         * - 右箭头（ArrowRight）：认识
         * 
         * 为什么使用这些键？
         * - 空格键：最常用的键，方便快速翻转
         * - 箭头键：位置接近，便于单手操作
         * - 左中右：对应不认识、模糊、认识的程度递增
         * 
         * 注意事项：
         * - 忽略输入框中的按键，避免干扰正常输入
         * - 阻止默认行为，避免触发浏览器默认操作
         * - 空格键翻转支持异步加载详情
         * 
         * @param {KeyboardEvent} e - 键盘事件对象
         */
        async function handleKeyPress(e) {
            // ========================================
            // 步骤 1: 检查焦点是否在输入元素上
            // ========================================
            // 如果用户正在输入框或下拉菜单中输入，
            // 不应该触发快捷键，避免干扰正常输入
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            // ========================================
            // 步骤 2: 处理空格键（翻转卡片，支持异步加载）
            // ========================================
            if (e.code === 'Space') {
                e.preventDefault();  // 阻止空格键的默认行为（滚动页面）
                
                if (card) {
                    const backContent = document.getElementById('vocab-card-back-content');
                    const isFlipped = card.classList.contains('flipped');
                    
                    if (!isFlipped) {
                        // 翻转到背面
                        card.classList.add('flipped');
                        
                        // 检查是否需要加载详情
                        if (backContent && !backContent.dataset.detailsLoaded) {
                            const wordId = backContent.dataset.wordId;
                            const currentWord = wordsToLearn[currentIndex];
                            
                            // 显示加载提示
                            const loadingHtml = `
                                <div class="vocab-word-mini">${currentWord.word}</div>
                                <div class="vocab-loading" style="text-align: center; padding: 2rem; color: var(--fg-muted);">
                                    Loading details...
                                </div>
                            `;
                            backContent.innerHTML = loadingHtml;
                            
                            // 加载完整详情
                            try {
                                const details = await loadWordDetails(getCurrentBank(), wordId, currentWord.word);
                                
                                if (details) {
                                    const detailsHtml = generateWordDetailsHtml(details);
                                    backContent.innerHTML = detailsHtml;
                                    backContent.dataset.detailsLoaded = 'true';
                                } else {
                                    backContent.innerHTML = `
                                        <div class="vocab-word-mini">${currentWord.word}</div>
                                        <div class="vocab-trans-list">
                                            <div class="vocab-trans-item">${currentWord.meaning}</div>
                                        </div>
                                        <div style="text-align: center; padding: 1rem; color: var(--fg-muted); font-size: 0.9rem;">
                                            Failed to load details. Please try again.
                                        </div>
                                    `;
                                }
                            } catch (error) {
                                console.error('Vocabulary: Error loading word details:', error);
                                backContent.innerHTML = `
                                    <div class="vocab-word-mini">${currentWord.word}</div>
                                    <div class="vocab-trans-list">
                                        <div class="vocab-trans-item">${currentWord.meaning}</div>
                                    </div>
                                `;
                            }
                        }
                    } else {
                        // 翻转回正面
                        card.classList.remove('flipped');
                    }
                }
                
            // ========================================
            // 步骤 3: 处理左箭头（不认识）
            // ========================================
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();  // 阻止左箭头的默认行为（滚动页面）
                handleAnswer('unknown');  // 处理"不认识"答案
                
            // ========================================
            // 步骤 4: 处理下箭头（模糊）
            // ========================================
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();  // 阻止下箭头的默认行为（滚动页面）
                handleAnswer('learning');  // 处理"模糊"答案
                
            // ========================================
            // 步骤 5: 处理右箭头（认识）
            // ========================================
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();  // 阻止右箭头的默认行为（滚动页面）
                handleAnswer('known');  // 处理"认识"答案
            }
        }
    }

    /**
     * 显示完成消息
     * 
     * 当用户完成今日所有学习任务时，显示祝贺消息和统计信息。
     * 
     * ============================================================================
     * 功能说明
     * ============================================================================
     * 
     * 1. 显示祝贺标题和图标
     * 2. 展示今日学习统计（新学数、复习数）
     * 3. 提供鼓励性文字
     * 4. 显示"继续学习"按钮，允许用户继续学习更多单词
     * 
     * ============================================================================
     * 设计理念
     * ============================================================================
     * 
     * 1. 正向反馈：
     *    - 使用祝贺性语言和图标（🎉）
     *    - 强调用户的成就
     *    - 鼓励持续学习
     * 
     * 2. 信息透明：
     *    - 清晰展示今日学习成果
     *    - 让用户了解自己的进步
     * 
     * 3. 继续学习：
     *    - 提供"继续学习"按钮
     *    - 允许超额完成学习目标
     *    - 满足学习热情高的用户需求
     * 
     * @param {HTMLElement} container - 容器元素
     * @param {object} bank - 词库对象（未使用，保留用于扩展）
     */
    function showCompleteMessage(container, bank) {
        // ========================================
        // 步骤 1: 获取今日统计数据
        // ========================================
        const stats = getTodayStats();  // 获取今日新学数和复习数

        // ========================================
        // 步骤 2: 生成完成消息 HTML
        // ========================================
        // 使用模板字符串生成友好的完成界面
        container.innerHTML = `
            <div class="vocab-complete-message">
                <!-- 祝贺标题 -->
                <div class="vocab-complete-title">${t('completeTitle')}</div>
                
                <!-- 统计信息和鼓励文字 -->
                <div class="vocab-complete-text">
                    ${t('completeText')}<br>
                    ${t('completeStats', { learned: stats.learned, reviewed: stats.reviewed })}<br>
                    <br>
                    ${t('completeEncourage')}
                </div>
                
                <!-- 继续学习按钮 -->
                <!-- 点击后重新加载页面，可以继续学习更多单词 -->
                <button class="vocab-btn primary" onclick="location.reload()" style="margin-top: 2rem;">
                    ${t('continueBtn')}
                </button>
            </div>
        `;
        
        // 说明：
        // - vocab-complete-message: 完成消息容器，居中显示
        // - vocab-complete-title: 大号标题，包含祝贺图标
        // - vocab-complete-text: 统计信息和鼓励文字
        // - onclick="location.reload()": 点击按钮重新加载页面
        // - style="margin-top: 2rem;": 内联样式，增加按钮上方间距
    }

    // ============================================================================
    // 开发者工具模块
    // ============================================================================
    // 这个模块提供了一组开发和调试工具，方便开发者测试和调试单词学习系统。
    // 
    // 使用方法：
    // 1. 打开浏览器控制台（F12）
    // 2. 输入 vocabDevTools.help() 查看所有可用命令
    // 3. 使用各种命令进行测试和调试
    // 
    // 注意事项：
    // - 这些工具仅用于开发和测试
    // - 在生产环境中，用户也可以使用这些工具重置数据
    // - 所有操作都会立即生效，请谨慎使用
    
    /**
     * 暴露给控制台的开发者工具对象
     * 
     * 这个对象包含了一系列实用函数，帮助开发者：
     * 1. 清除和重置学习数据
     * 2. 查看当前学习状态
     * 3. 模拟学习场景
     * 4. 测试各种功能
     * 
     * 为什么暴露到全局？
     * - 方便在控制台直接调用
     * - 不需要修改代码就能测试
     * - 提供友好的调试接口
     */
    window.vocabDevTools = {
        /**
         * 清除所有学习数据
         * 
         * 功能：
         * - 删除所有学习进度（vocab_progress）
         * - 删除今日统计（vocab_todayStats）
         * - 重新加载页面
         * 
         * 使用场景：
         * - 测试新用户首次使用的体验
         * - 清除错误的测试数据
         * - 重新开始学习
         * 
         * 注意：
         * - 此操作不可恢复
         * - 所有学习进度将丢失
         * - 词库数据不会被删除（存储在 IndexedDB 中）
         * 
         * 使用示例：
         * vocabDevTools.clearAllData()
         */
        clearAllData: function() {
            // 删除学习进度
            localStorage.removeItem('vocab_progress');
            // 删除今日统计
            localStorage.removeItem('vocab_todayStats');
            // 输出确认消息
            console.log('✅ All vocabulary data cleared');
            // 重新加载页面，应用更改
            location.reload();
        },
        
        /**
         * 重新生成模拟数据
         * 
         * 功能：
         * - 清除现有数据
         * - 重新加载页面
         * - 触发 generateMockLearningData 函数
         * - 生成新的演示数据
         * 
         * 使用场景：
         * - 测试模拟数据生成逻辑
         * - 重新生成演示数据
         * - 测试复习功能
         * 
         * 与 clearAllData 的区别：
         * - clearAllData: 完全清空，不生成新数据
         * - regenerateMockData: 清空后自动生成新的模拟数据
         * 
         * 使用示例：
         * vocabDevTools.regenerateMockData()
         */
        regenerateMockData: function() {
            // 删除学习进度
            localStorage.removeItem('vocab_progress');
            // 删除今日统计
            localStorage.removeItem('vocab_todayStats');
            // 输出提示消息
            console.log('✅ Data cleared, reloading to generate new mock data...');
            // 重新加载页面，触发模拟数据生成
            location.reload();
        },
        
        /**
         * 查看当前学习进度
         * 
         * 功能：
         * - 从 localStorage 读取学习进度
         * - 在控制台输出完整的进度对象
         * - 返回进度对象供进一步分析
         * 
         * 使用场景：
         * - 检查学习进度数据结构
         * - 调试进度保存问题
         * - 分析学习状态
         * 
         * 返回值：
         * {
         *   'kaoyan_f0_i0': {
         *     status: 'learning',
         *     reviewCount: 2,
         *     lastReview: 'Mon Jan 01 2024',
         *     nextReview: 'Wed Jan 03 2024',
         *     lastResult: 'learning'
         *   },
         *   ...
         * }
         * 
         * 使用示例：
         * const progress = vocabDevTools.showProgress()
         * console.log(Object.keys(progress).length)  // 查看已学单词数
         */
        showProgress: function() {
            // 从 localStorage 读取进度数据
            const progress = JSON.parse(localStorage.getItem('vocab_progress') || '{}');
            // 在控制台输出
            console.log('📊 Current Progress:', progress);
            // 返回进度对象
            return progress;
        },
        
        /**
         * 查看今日统计
         * 
         * 功能：
         * - 从 localStorage 读取今日统计
         * - 在控制台输出统计对象
         * - 返回统计对象供进一步分析
         * 
         * 使用场景：
         * - 检查今日学习统计
         * - 调试统计更新问题
         * - 验证学习目标设置
         * 
         * 返回值：
         * {
         *   date: 'Mon Jan 01 2024',
         *   learned: 10,
         *   reviewed: 5,
         *   target: 30
         * }
         * 
         * 使用示例：
         * const stats = vocabDevTools.showStats()
         * console.log(`完成率: ${(stats.learned / stats.target * 100).toFixed(1)}%`)
         */
        showStats: function() {
            // 从 localStorage 读取统计数据
            const stats = JSON.parse(localStorage.getItem('vocab_todayStats') || '{}');
            // 在控制台输出
            console.log('📈 Today Stats:', stats);
            // 返回统计对象
            return stats;
        },
        
        /**
         * 模拟学习一些单词（用于测试）
         * 
         * 功能：
         * - 模拟昨天学习了指定数量的单词
         * - 设置这些单词今天需要复习
         * - 用于测试复习功能
         * 
         * 使用场景：
         * - 测试复习功能
         * - 快速生成测试数据
         * - 验证复习算法
         * 
         * 工作原理：
         * 1. 从词库中选择前 N 个单词
         * 2. 设置它们的学习状态为"昨天学过"
         * 3. 设置下次复习时间为今天
         * 4. 重新加载页面
         * 
         * @param {number} count - 要模拟学习的单词数量（默认 5）
         * 
         * 使用示例：
         * vocabDevTools.simulateLearn(10)  // 模拟昨天学了 10 个词
         */
        simulateLearn: function(count = 5) {
            // ========================================
            // 步骤 1: 获取当前词库
            // ========================================
            const bankId = getCurrentBank();  // 获取当前词库 ID
            const bank = loadedWordBanks[bankId];  // 获取词库数据
            
            // 检查词库是否已加载
            if (!bank) {
                console.error('❌ Bank not loaded');
                return;
            }
            
            // ========================================
            // 步骤 2: 获取学习进度
            // ========================================
            const progress = getProgress();
            
            // ========================================
            // 步骤 3: 创建"昨天"的日期
            // ========================================
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);  // 减去一天
            
            // ========================================
            // 步骤 4: 模拟学习指定数量的单词
            // ========================================
            for (let i = 0; i < count; i++) {
                // 获取单词
                const word = bank.words[i];
                // 生成存储键
                const key = `${bankId}_${word.id}`;
                
                // 创建学习记录
                progress[key] = {
                    status: 'learning',  // 状态：学习中
                    reviewCount: 0,  // 复习次数：0（首次学习）
                    lastReview: yesterday.toDateString(),  // 最后复习：昨天
                    nextReview: new Date().toDateString(),  // 下次复习：今天
                    lastResult: 'learning'  // 最后结果：模糊
                };
            }
            
            // ========================================
            // 步骤 5: 保存进度并重新加载
            // ========================================
            saveProgress(progress);  // 保存到 localStorage
            console.log(`✅ Simulated learning ${count} words yesterday`);
            location.reload();  // 重新加载页面
        },
        
        /**
         * 显示帮助信息
         * 
         * 功能：
         * - 在控制台输出所有可用命令
         * - 提供使用示例
         * - 帮助开发者快速上手
         * 
         * 使用示例：
         * vocabDevTools.help()
         */
        help: function() {
            console.log(`
📚 Vocabulary Dev Tools

可用命令：
- vocabDevTools.clearAllData()        清除所有学习数据
- vocabDevTools.regenerateMockData()  重新生成模拟数据
- vocabDevTools.showProgress()        查看学习进度
- vocabDevTools.showStats()           查看今日统计
- vocabDevTools.simulateLearn(5)      模拟昨天学了5个词
- vocabDevTools.help()                显示此帮助

示例：
  vocabDevTools.regenerateMockData()  // 重新生成演示数据
  vocabDevTools.simulateLearn(10)     // 模拟昨天学了10个词
            `);
        }
    };
    
    // ========================================
    // 输出加载成功消息
    // ========================================
    // 当脚本加载完成时，在控制台输出提示消息
    // 告诉开发者工具已经可用
    console.log('💡 Vocabulary Dev Tools loaded. Type "vocabDevTools.help()" for commands.');

})();
