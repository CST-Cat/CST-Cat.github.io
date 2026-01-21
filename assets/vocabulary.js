/*******************************************************************************
 * Vocabulary Drill 功能 JavaScript
 * 
 * 功能模块：
 * 1. 侧栏学习进度显示
 * 2. 侧栏每日一词
 * 3. 主区域单词卡片学习
 * 4. 词库管理（从外部 JSON 加载）
 * 5. 学习进度追踪
 * 6. 数据持久化
 ******************************************************************************/

(function () {
    'use strict';

    // ==================== 词库配置 ====================

    /**
     * 词库配置 - 定义可用的词库及其 JSON 文件路径
     */
    const wordBankConfig = {
        kaoyan: {
            name: '考研核心词汇',
            files: [
                '/assets/english-vocabulary/KaoYan_1.json',
                '/assets/english-vocabulary/KaoYan_2.json',
                '/assets/english-vocabulary/KaoYan_3.json'
            ]
        },
        cet6: {
            name: '六级核心词汇',
            files: [
                '/assets/english-vocabulary/CET6_1.json',
                '/assets/english-vocabulary/CET6_2.json',
                '/assets/english-vocabulary/CET6_3.json'
            ]
        }
    };

    // 存储已加载的词库数据
    let loadedWordBanks = {};
    let isLoading = false;

    // ==================== 初始化 ====================

    /**
     * 生成模拟学习数据（用于演示复习功能）
     * 模拟昨天学过一些单词，今天需要复习
     */
    function generateMockLearningData(bankId, bank) {
        const progress = getProgress();
        
        // 检查是否已有数据
        const hasData = Object.keys(progress).some(key => key.startsWith(bankId));
        if (hasData) {
            console.log('Vocabulary: Already has learning data, skip mock generation');
            return;
        }

        console.log('Vocabulary: Generating mock learning data for demo...');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        const today = new Date();
        const todayStr = today.toDateString();

        // 随机选择 15 个单词作为"昨天学过的"
        const mockWords = bank.words.slice(0, 15);
        
        mockWords.forEach((word, index) => {
            const key = `${bankId}_${word.id}`;
            
            // 随机分配学习结果
            let status, lastResult, reviewCount;
            const rand = Math.random();
            
            if (rand < 0.3) {
                // 30% 不认识
                status = 'learning';
                lastResult = 'unknown';
                reviewCount = 0;
            } else if (rand < 0.7) {
                // 40% 模糊
                status = 'learning';
                lastResult = 'learning';
                reviewCount = 0;
            } else {
                // 30% 认识
                status = 'known';
                lastResult = 'known';
                reviewCount = 0;
            }
            
            // 计算下次复习时间（基于昨天）
            const nextReviewDate = new Date(yesterday);
            if (lastResult === 'unknown') {
                nextReviewDate.setDate(nextReviewDate.getDate() + 1); // 今天复习
            } else if (lastResult === 'learning') {
                nextReviewDate.setDate(nextReviewDate.getDate() + 1); // 今天复习
            } else {
                nextReviewDate.setDate(nextReviewDate.getDate() + 3); // 3天后复习
            }
            
            progress[key] = {
                status: status,
                reviewCount: reviewCount,
                lastReview: yesterdayStr,
                nextReview: nextReviewDate.toDateString(),
                lastResult: lastResult
            };
        });
        
        saveProgress(progress);
        
        // 更新昨天的统计
        const stats = {
            date: yesterdayStr,
            learned: 15,
            reviewed: 0,
            target: 20
        };
        localStorage.setItem('vocab_todayStats', JSON.stringify(stats));
        
        console.log('Vocabulary: Mock data generated - 15 words learned yesterday');
        console.log('Vocabulary: About 10-11 words should need review today');
    }

    /**
     * 初始化所有功能模块
     */
    async function init() {
        console.log('Vocabulary: Initializing...');

        // 先加载当前选中的词库
        const currentBankId = getCurrentBank();
        const bank = await loadWordBank(currentBankId);

        // 确保词库加载完成后再初始化界面
        if (bank && bank.words.length > 0) {
            console.log('Vocabulary: Bank loaded successfully, initializing UI...');
            
            // 🎭 生成模拟数据（仅在首次使用时）
            generateMockLearningData(currentBankId, bank);
            
            initVocabSidebar();      // 初始化侧栏
            initVocabApp();          // 初始化主区域
        } else {
            console.warn('Vocabulary: Failed to load bank, retrying...');
            // 如果加载失败，延迟重试
            setTimeout(() => {
                initVocabSidebar();
                initVocabApp();
            }, 1000);
        }
        console.log('Vocabulary: Initialization complete');
    }

    // 根据 DOM 加载状态决定何时初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ==================== 词库加载 ====================

    /**
     * 加载指定词库的数据（加载所有文件）
     * 优化：使用 IndexedDB 缓存
     */
    async function loadWordBank(bankId) {
        if (loadedWordBanks[bankId]) {
            console.log(`Vocabulary: Bank ${bankId} already loaded`);
            return loadedWordBanks[bankId];
        }

        const config = wordBankConfig[bankId];
        if (!config) {
            console.error(`Vocabulary: Unknown bank ${bankId}`);
            return null;
        }

        console.log(`Vocabulary: Loading bank ${bankId}...`);
        isLoading = true;

        // 优化：尝试从 IndexedDB 缓存读取
        if (window.indexedDBHelper) {
            try {
                const cached = await window.indexedDBHelper.getWordBank(bankId);
                if (cached && cached.words && cached.words.length > 0) {
                    console.log(`Vocabulary: Loaded ${cached.words.length} words from cache`);
                    loadedWordBanks[bankId] = cached;
                    isLoading = false;
                    return cached;
                }
            } catch (error) {
                console.warn('Vocabulary: Cache read failed, loading from network:', error);
            }
        }

        try {
            // 加载所有 JSON 文件并合并
            const allWords = [];

            for (const file of config.files) {
                try {
                    console.log(`Vocabulary: Loading file ${file}...`);
                    const response = await fetch(file);
                    if (!response.ok) {
                        console.warn(`Vocabulary: Failed to load ${file}, status: ${response.status}`);
                        continue;
                    }
                    const rawData = await response.json();

                    // 转换数据格式并添加到总列表
                    // 为每个单词生成唯一 ID：文件名索引_单词索引
                    const fileIndex = config.files.indexOf(file);
                    const words = rawData.map((item, index) => {
                        const wordData = transformWordData(item);
                        // 使用唯一 ID 区分重复单词
                        wordData.id = `${bankId}_f${fileIndex}_i${index}`;
                        return wordData;
                    });

                    allWords.push(...words);
                    console.log(`Vocabulary: Loaded ${words.length} words from ${file}`);
                } catch (fileError) {
                    console.warn(`Vocabulary: Error loading ${file}:`, fileError);
                }
            }

            const bankData = {
                name: config.name,
                words: allWords
            };

            loadedWordBanks[bankId] = bankData;

            // 优化：保存到 IndexedDB 缓存
            if (window.indexedDBHelper && allWords.length > 0) {
                try {
                    await window.indexedDBHelper.saveWordBank(bankId, bankData);
                    console.log(`Vocabulary: Saved ${allWords.length} words to cache`);
                } catch (error) {
                    console.warn('Vocabulary: Cache save failed:', error);
                }
            }

            console.log(`Vocabulary: Loaded ${allWords.length} words for ${bankId}`);
            isLoading = false;
            return bankData;
        } catch (error) {
            console.error(`Vocabulary: Failed to load bank ${bankId}:`, error);
            isLoading = false;
            // 返回空词库以避免崩溃
            return { name: config.name, words: [] };
        }
    }

    /**
     * 转换原始 JSON 数据为应用所需格式
     * 完整提取 JSON 中的所有丰富信息
     */
    function transformWordData(item) {
        // 适配新版数据结构 (Flat structure)
        if (item.word && item.translations) {
            return {
                word: item.word,
                usphone: '',
                ukphone: '',
                phonetic: item.phonetic || '',
                trans: item.translations.map(t => ({
                    pos: t.type || '',
                    tranCn: t.translation || '',
                    tranOther: ''
                })),
                meaning: item.translations.map(t => (t.type ? `${t.type}. ` : '') + t.translation).join('；'),
                sentences: [],
                realExamSentences: [],
                synos: [],
                antos: [],
                phrases: item.phrases ? item.phrases.slice(0, 5).map(p => ({
                    pContent: p.phrase,
                    pCn: p.translation
                })) : [],
                relWords: [],
                remMethod: ''
            };
        }

        // 适配旧版数据结构 (Deeply nested)
        const content = item.content?.word?.content || {};

        // 获取音标
        const usphone = content.usphone ? `/${content.usphone}/` : '';
        const ukphone = content.ukphone ? `/${content.ukphone}/` : '';
        const phonetic = usphone || ukphone || '';

        // 获取释义（保留完整结构）
        const trans = content.trans ? content.trans.map(t => ({
            pos: t.pos || '',
            tranCn: t.tranCn || '',
            tranOther: t.tranOther || '',
            descOther: t.descOther || ''
        })) : [];

        // 简化的释义文本
        const meaning = trans.map(t => {
            const pos = t.pos ? `${t.pos}. ` : '';
            return pos + (t.tranCn || t.tranOther || '');
        }).join('；');

        // 获取例句（保留完整结构）
        const sentences = content.sentence?.sentences ? content.sentence.sentences.slice(0, 3).map(s => ({
            sContent: s.sContent || '',
            sCn: s.sCn || '',
            sContent_eng: s.sContent_eng || '',
            sSpeech: s.sSpeech || ''
        })) : [];

        // 获取真题例句
        const realExamSentences = content.realExamSentence?.sentences ? content.realExamSentence.sentences.slice(0, 2).map(s => ({
            sContent: s.sContent || '',
            sourceInfo: s.sourceInfo || {}
        })) : [];

        // 获取同近义词
        const synos = content.syno?.synos ? content.syno.synos.map(s => ({
            pos: s.pos || '',
            tran: s.tran || '',
            hwds: s.hwds ? s.hwds.slice(0, 5).map(h => h.w) : []
        })) : [];

        // 获取反义词
        const antos = content.antos?.anto ? content.antos.anto.slice(0, 3).map(a => a.hwd) : [];

        // 获取短语搭配
        const phrases = content.phrase?.phrases ? content.phrase.phrases.slice(0, 4).map(p => ({
            pContent: p.pContent || '',
            pCn: p.pCn || ''
        })) : [];

        // 获取同根词/相关词
        const relWords = content.relWord?.rels ? content.relWord.rels.slice(0, 4).map(r => ({
            pos: r.pos || '',
            words: r.words ? r.words.slice(0, 3).map(w => ({
                hwd: w.hwd || '',
                tran: w.tran || ''
            })) : []
        })) : [];

        // 获取记忆方法
        const remMethod = content.remMethod?.val || '';

        return {
            word: item.headWord || '',
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

    // ==================== 数据管理 ====================

    /**
     * 获取当前词库
     */
    function getCurrentBank() {
        return localStorage.getItem('vocab_currentBank') || 'kaoyan';
    }

    /**
     * 设置当前词库
     */
    function setCurrentBank(bankId) {
        localStorage.setItem('vocab_currentBank', bankId);
    }

    /**
     * 获取学习进度
     */
    function getProgress() {
        try {
            return JSON.parse(localStorage.getItem('vocab_progress') || '{}');
        } catch (e) {
            return {};
        }
    }

    /**
     * 保存学习进度
     */
    function saveProgress(progress) {
        localStorage.setItem('vocab_progress', JSON.stringify(progress));
    }

    /**
     * 获取今日统计
     */
    function getTodayStats() {
        const today = new Date().toDateString();
        const saved = localStorage.getItem('vocab_todayStats');

        if (saved) {
            try {
                const stats = JSON.parse(saved);
                if (stats.date === today) {
                    return stats;
                }
            } catch (e) { }
        }

        // 新的一天，重置统计
        const newStats = {
            date: today,
            learned: 0,
            reviewed: 0,
            target: 20
        };
        localStorage.setItem('vocab_todayStats', JSON.stringify(newStats));
        return newStats;
    }

    /**
     * 保存今日统计
     */
    function saveTodayStats(stats) {
        localStorage.setItem('vocab_todayStats', JSON.stringify(stats));
    }

    /**
     * 获取单词状态
     */
    function getWordStatus(bankId, wordId) {
        const progress = getProgress();
        const key = `${bankId}_${wordId}`;
        return progress[key] || {
            status: 'unknown',  // unknown, learning, known
            reviewCount: 0,
            lastReview: null,
            nextReview: null,
            lastResult: null  // 'unknown', 'fuzzy', 'known'
        };
    }

    /**
     * 更新单词状态（带智能复习间隔）
     */
    function updateWordStatus(bankId, wordId, status) {
        const progress = getProgress();
        const key = `${bankId}_${wordId}`;
        const today = new Date();
        const todayStr = today.toDateString();

        const oldStatus = progress[key] || { 
            status: 'unknown', 
            reviewCount: 0,
            lastReview: null,
            nextReview: null,
            lastResult: null
        };

        // 计算下次复习时间
        const nextReviewDate = calculateNextReview(oldStatus.reviewCount, status);

        progress[key] = {
            status: status,
            reviewCount: oldStatus.reviewCount + 1,
            lastReview: todayStr,
            nextReview: nextReviewDate,
            lastResult: status
        };

        saveProgress(progress);

        // 更新今日统计
        const stats = getTodayStats();
        if (oldStatus.status === 'unknown') {
            stats.learned++;
        } else {
            stats.reviewed++;
        }
        saveTodayStats(stats);
    }

    /**
     * 计算下次复习时间（基于艾宾浩斯遗忘曲线）
     */
    function calculateNextReview(reviewCount, lastResult) {
        const today = new Date();
        let daysToAdd;

        // 根据掌握程度和复习次数决定间隔
        if (lastResult === 'unknown') {
            // 不认识：1天后再复习
            daysToAdd = 1;
        } else if (lastResult === 'learning') {
            // 模糊：根据复习次数递增
            const intervals = [1, 2, 4, 7, 15];
            daysToAdd = intervals[Math.min(reviewCount, intervals.length - 1)];
        } else if (lastResult === 'known') {
            // 认识：更长的间隔
            const intervals = [3, 7, 15, 30, 60, 90];
            daysToAdd = intervals[Math.min(reviewCount, intervals.length - 1)];
        }

        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        return nextDate.toDateString();
    }

    /**
     * 判断单词是否需要复习
     */
    function shouldReview(bankId, wordId) {
        const status = getWordStatus(bankId, wordId);
        
        // 从未学过的不算复习
        if (status.status === 'unknown' || !status.nextReview) {
            return false;
        }

        const today = new Date();
        const nextReview = new Date(status.nextReview);
        
        // 到期或过期的需要复习
        return today >= nextReview;
    }



    // ==================== 侧栏模块 ====================

    /**
     * 初始化侧栏
     */
    function initVocabSidebar() {
        console.log('Vocabulary: initVocabSidebar called');
        try {
            const container = document.getElementById('vocab-sidebar');
            console.log('Vocabulary: sidebar container =', container);
            if (!container) {
                console.log('Vocabulary: sidebar container not found');
                return;
            }

            console.log('Vocabulary: Getting stats...');
            const stats = getTodayStats();
            console.log('Vocabulary: stats =', stats);

            const bankId = getCurrentBank();
            console.log('Vocabulary: bankId =', bankId);

            const bank = loadedWordBanks[bankId];
            console.log('Vocabulary: bank =', bank);

            if (!bank || !bank.words || bank.words.length === 0) {
                console.warn('Vocabulary: Bank not loaded, showing loading message');
                container.innerHTML = `
                    <div class="vocab-sidebar-wrapper">
                        <div class="vocab-loading">正在加载词库...</div>
                    </div>
                `;
                return;
            }

            const progress = getProgress();
            console.log('Vocabulary: progress keys =', Object.keys(progress).length);

            // 计算待复习单词数
            const reviewCount = bank.words.filter(w => shouldReview(bankId, w.id)).length;
            console.log('Vocabulary: reviewCount =', reviewCount);

            // 计算本周统计
            const weekStats = calculateWeekStats(progress);
            console.log('Vocabulary: weekStats =', weekStats);

            // 计算掌握率
            const totalWords = bank.words.length;
            const knownWords = bank.words.filter(w => {
                const status = getWordStatus(bankId, w.id);
                return status.status === 'known';
            }).length;
            const masteryRate = totalWords > 0 ? Math.round((knownWords / totalWords) * 100) : 0;
            console.log('Vocabulary: masteryRate =', masteryRate);

            // 生成侧栏 HTML
            console.log('Vocabulary: Generating HTML...');
            container.innerHTML = `
                <div class="vocab-sidebar-wrapper">
                    <div class="vocab-progress-section">
                        <div class="vocab-progress-label">今日进度</div>
                        <div class="vocab-progress-bar">
                            <div class="vocab-progress-fill" style="width: ${Math.min((stats.learned / stats.target) * 100, 100)}%"></div>
                        </div>
                        <div class="vocab-progress-text">${stats.learned}/${stats.target} 词</div>
                    </div>
                    
                    ${reviewCount > 0 ? `
                    <div class="vocab-progress-section">
                        <div class="vocab-progress-label">复习进度</div>
                        <div class="vocab-progress-bar">
                            <div class="vocab-progress-fill vocab-progress-fill-review" style="width: ${Math.min((stats.reviewed / reviewCount) * 100, 100)}%"></div>
                        </div>
                        <div class="vocab-progress-text">${stats.reviewed}/${reviewCount} 词</div>
                    </div>
                    ` : ''}
                    
                    <div class="vocab-action-buttons">
                        <a href="/Tools/Vocabulary/" class="vocab-action-btn vocab-btn-new">
                            学习新词
                        </a>
                        ${reviewCount > 0 ? `
                        <a href="/Tools/Vocabulary/" class="vocab-action-btn vocab-btn-review">
                            温习旧词
                        </a>
                        ` : ''}
                    </div>
                    
                    <div class="vocab-stats-section">
                        <div class="vocab-stats-title">本周统计</div>
                        <div class="vocab-stat-item">
                            <div class="vocab-stat-label">• 新学</div>
                            <div class="vocab-stat-value">${weekStats.learned} 词</div>
                        </div>
                        <div class="vocab-stat-item">
                            <div class="vocab-stat-label">• 复习</div>
                            <div class="vocab-stat-value">${weekStats.reviewed} 词</div>
                        </div>
                        <div class="vocab-stat-item">
                            <div class="vocab-stat-label">• 掌握率</div>
                            <div class="vocab-stat-value">${masteryRate}%</div>
                        </div>
                    </div>
                </div>
            `;
            console.log('Vocabulary: Sidebar HTML generated successfully');
            
            // 添加按钮点击事件 - 保存选中状态
            setTimeout(() => {
                const buttons = container.querySelectorAll('.vocab-action-btn');
                
                // 恢复之前的选中状态
                const selectedMode = localStorage.getItem('vocab_selectedMode');
                buttons.forEach(btn => {
                    if (btn.classList.contains('vocab-btn-new') && selectedMode === 'new') {
                        btn.classList.add('selected');
                    } else if (btn.classList.contains('vocab-btn-review') && selectedMode === 'review') {
                        btn.classList.add('selected');
                    }
                });
                
                // 监听点击事件
                buttons.forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        // 保存选中状态
                        if (this.classList.contains('vocab-btn-new')) {
                            localStorage.setItem('vocab_selectedMode', 'new');
                        } else if (this.classList.contains('vocab-btn-review')) {
                            localStorage.setItem('vocab_selectedMode', 'review');
                        }
                        
                        // 移除所有按钮的选中状态
                        buttons.forEach(b => b.classList.remove('selected'));
                        // 添加当前按钮的选中状态
                        this.classList.add('selected');
                    });
                });
            }, 0);
        } catch (error) {
            console.error('Vocabulary: Error in initVocabSidebar:', error);
        }
    }

    /**
     * 计算本周统计
     */
    function calculateWeekStats(progress) {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        let learned = 0;
        let reviewed = 0;

        Object.values(progress).forEach(item => {
            if (item.lastReview) {
                const reviewDate = new Date(item.lastReview);
                if (reviewDate >= weekAgo) {
                    if (item.reviewCount === 1) {
                        learned++;
                    } else {
                        reviewed++;
                    }
                }
            }
        });

        return { learned, reviewed };
    }



    // ==================== 主区域模块 ====================

    /**
     * Fisher-Yates 洗牌算法 - 高效随机打乱数组
     */
    function shuffleArray(array) {
        const shuffled = [...array]; // 创建副本，不修改原数组
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * 初始化主区域学习界面
     */
    function initVocabApp() {
        console.log('Vocabulary: initVocabApp called');
        try {
            const container = document.getElementById('vocab-app');
            console.log('Vocabulary: app container =', container);
            if (!container) {
                console.log('Vocabulary: app container not found');
                return;
            }

            const bankId = getCurrentBank();
            const bank = loadedWordBanks[bankId];

            if (!bank || bank.words.length === 0) {
                container.innerHTML = `
                    <div class="vocab-loading-message">
                        <div class="vocab-loading-title">📚 正在加载词库...</div>
                        <div class="vocab-loading-text">首次加载可能需要几秒钟</div>
                    </div>
                `;
                return;
            }

            const progress = getProgress();

            console.log('Vocabulary: Getting words to learn...');
            
            // 获取用户选择的学习模式
            const selectedMode = localStorage.getItem('vocab_selectedMode') || 'new';
            console.log('Vocabulary: Selected mode =', selectedMode);
            
            // 🔄 获取需要复习的单词
            const reviewWords = bank.words.filter(w => shouldReview(bankId, w.id));
            
            // 📖 获取新单词（未学过的）
            const newWords = bank.words.filter(w => {
                const status = getWordStatus(bankId, w.id);
                return status.status === 'unknown';
            });

            // 🎯 根据用户选择的模式组合学习队列
            let todayWords = [];
            let learningMode = selectedMode; // 'new' 或 'review'
            
            if (selectedMode === 'review' && reviewWords.length > 0) {
                // 用户选择复习模式，且有待复习的单词
                todayWords = [...shuffleArray(reviewWords)];
                
                // 如果复习词不够20个，补充新词
                const remainingSlots = Math.max(0, 20 - reviewWords.length);
                if (remainingSlots > 0 && newWords.length > 0) {
                    todayWords.push(...shuffleArray(newWords).slice(0, remainingSlots));
                }
            } else {
                // 用户选择新学习模式，或没有待复习的单词
                todayWords = shuffleArray(newWords).slice(0, 20);
                learningMode = 'new';
            }

            console.log('Vocabulary: Learning mode =', learningMode);
            console.log('Vocabulary: Review words =', reviewWords.length);
            console.log('Vocabulary: New words =', newWords.length);
            console.log('Vocabulary: Today words =', todayWords.length);

            let currentIndex = 0;
            let isFlipped = false;

            // 如果没有单词可学
            if (todayWords.length === 0) {
                console.log('Vocabulary: No words to learn today');
                showCompleteMessage(container, bank);
                return;
            }

            // 生成主界面
            console.log('Vocabulary: Rendering main app...');
            renderMainApp(container, bankId, bank, todayWords, currentIndex, isFlipped, learningMode);

            // 绑定事件
            console.log('Vocabulary: Setting up events...');
            setupMainAppEvents(container, bankId, todayWords, currentIndex, isFlipped, learningMode);

            console.log('Vocabulary: Main app initialized successfully');
        } catch (error) {
            console.error('Vocabulary: Error in initVocabApp:', error);
        }
    }

    /**
     * 渲染主应用界面
     */
    function renderMainApp(container, bankId, bank, wordsToLearn, currentIndex, isFlipped, learningMode = 'new') {
        const currentWord = wordsToLearn[currentIndex];
        const wordStatus = getWordStatus(bankId, currentWord.id);
        const isReviewWord = wordStatus.status !== 'unknown';
        
        console.log('Vocabulary: Rendering word:', currentWord.word);
        console.log('Vocabulary: Word status:', wordStatus);
        console.log('Vocabulary: Learning mode:', learningMode);
        console.log('Vocabulary: Is review word:', isReviewWord);
        
        const stats = getTodayStats();
        const totalWords = bank.words.length;
        const knownWords = bank.words.filter(w => {
            const status = getWordStatus(bankId, w.id);
            return status.status === 'known';
        }).length;

        // 生成音标显示（美式/英式）
        let phoneticHtml = '';
        if (currentWord.usphone && currentWord.ukphone) {
            phoneticHtml = `<span class="vocab-phonetic-us">🇺🇸 ${currentWord.usphone}</span> <span class="vocab-phonetic-uk">🇬🇧 ${currentWord.ukphone}</span>`;
        } else {
            phoneticHtml = currentWord.phonetic;
        }

        // 生成详细释义HTML
        let transHtml = '';
        if (currentWord.trans && currentWord.trans.length > 0) {
            transHtml = currentWord.trans.map(t => {
                let html = `<div class="vocab-trans-item">`;
                if (t.pos) html += `<span class="vocab-pos">${t.pos}.</span> `;
                html += `<span class="vocab-tran-cn">${t.tranCn || ''}</span>`;
                if (t.tranOther) html += `<div class="vocab-tran-en">${t.tranOther}</div>`;
                html += `</div>`;
                return html;
            }).join('');
        } else {
            transHtml = `<div class="vocab-trans-item">${currentWord.meaning}</div>`;
        }

        // 生成例句HTML
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
        }

        // 生成真题例句HTML
        let realExamHtml = '';
        if (currentWord.realExamSentences && currentWord.realExamSentences.length > 0) {
            realExamHtml = `<div class="vocab-section vocab-real-exam">
                <div class="vocab-section-title">📚 真题例句</div>
                ${currentWord.realExamSentences.slice(0, 1).map(s => {
                const sourceText = s.sourceInfo ?
                    `${s.sourceInfo.year || ''} ${s.sourceInfo.level || ''} ${s.sourceInfo.type || ''}` : '';
                return `<div class="vocab-exam-item">
                        <div class="vocab-exam-content">${s.sContent}</div>
                        ${sourceText ? `<div class="vocab-exam-source">${sourceText}</div>` : ''}
                    </div>`;
            }).join('')}
            </div>`;
        }

        // 生成同近义词HTML
        let synosHtml = '';
        if (currentWord.synos && currentWord.synos.length > 0) {
            const allSynos = currentWord.synos.flatMap(s => s.hwds).slice(0, 6);
            if (allSynos.length > 0) {
                synosHtml = `<div class="vocab-section vocab-synos">
                    <div class="vocab-section-title">🔗 同近义词</div>
                    <div class="vocab-tags">${allSynos.map(w => `<span class="vocab-tag">${w}</span>`).join('')}</div>
                </div>`;
            }
        }

        // 生成反义词HTML
        let antosHtml = '';
        if (currentWord.antos && currentWord.antos.length > 0) {
            antosHtml = `<div class="vocab-section vocab-antos">
                <div class="vocab-section-title">⚡ 反义词</div>
                <div class="vocab-tags">${currentWord.antos.map(w => `<span class="vocab-tag vocab-tag-alt">${w}</span>`).join('')}</div>
            </div>`;
        }

        // 生成短语搭配HTML
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
        }

        // 生成同根词HTML
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
        }

        // 生成记忆方法HTML
        let remMethodHtml = '';
        if (currentWord.remMethod) {
            remMethodHtml = `<div class="vocab-section vocab-rem-method">
                <div class="vocab-section-title">🧠 记忆技巧</div>
                <div class="vocab-rem-content">${currentWord.remMethod}</div>
            </div>`;
        }

        container.innerHTML = `
            <div class="vocab-header">
                <div class="vocab-bank-selector">
                    <span class="vocab-bank-label">词库：</span>
                    <div class="vocab-bank-select-custom" id="vocab-bank-select-custom">
                        <div class="vocab-bank-select-display" id="vocab-bank-select-display">
                            <span class="vocab-bank-select-text">${wordBankConfig[bankId].name}</span>
                            <span class="vocab-bank-select-arrow">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
                                    <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2 4l4 4 4-4"/>
                                </svg>
                            </span>
                        </div>
                        <div class="vocab-bank-select-dropdown" id="vocab-bank-select-dropdown">
                            ${Object.keys(wordBankConfig).map(key =>
                                `<div class="vocab-bank-select-option ${key === bankId ? 'selected' : ''}" data-value="${key}">${wordBankConfig[key].name}</div>`
                            ).join('')}
                        </div>
                    </div>
                    <select class="vocab-bank-select" id="vocab-bank-select" style="display: none;">
                        ${Object.keys(wordBankConfig).map(key =>
            `<option value="${key}" ${key === bankId ? 'selected' : ''}>${wordBankConfig[key].name}</option>`
        ).join('')}
                    </select>
                </div>
                <div class="vocab-progress-indicator">
                    ${learningMode === 'review' ? '<span class="vocab-review-badge">复习</span>' : '<span class="vocab-new-badge">新词</span>'}
                    第 ${currentIndex + 1}/${wordsToLearn.length} 词
                </div>
            </div>
            
            <div class="vocab-card-container">
                <div class="vocab-card" id="vocab-card">
                    <div class="vocab-card-front">
                        <div class="vocab-word">${currentWord.word}</div>
                        <div class="vocab-phonetic">${phoneticHtml}</div>
                        <div class="vocab-flip-hint">点击卡片查看释义</div>
                    </div>
                    <div class="vocab-card-back">
                        <div class="vocab-card-back-content">
                            <div class="vocab-word-mini">${currentWord.word}</div>
                            <div class="vocab-trans-list">${transHtml}</div>
                            ${sentencesHtml}
                            ${realExamHtml}
                            ${synosHtml}
                            ${antosHtml}
                            ${phrasesHtml}
                            ${relWordsHtml}
                            ${remMethodHtml}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="vocab-controls">
                <button class="vocab-btn" id="vocab-unknown-btn">不认识</button>
                <button class="vocab-btn" id="vocab-fuzzy-btn">模糊</button>
                <button class="vocab-btn primary" id="vocab-known-btn">认识</button>
            </div>
            
            <div class="vocab-shortcuts">
                快捷键：← 不认识 | ↓ 模糊 | → 认识 | 空格 翻转
            </div>
            
            <div class="vocab-bottom-stats">
                <div class="vocab-bottom-stat">
                    <div class="vocab-bottom-stat-value">${stats.learned}</div>
                    <div class="vocab-bottom-stat-label">今日新学</div>
                </div>
                <div class="vocab-bottom-stat">
                    <div class="vocab-bottom-stat-value">${stats.reviewed}</div>
                    <div class="vocab-bottom-stat-label">今日复习</div>
                </div>
                <div class="vocab-bottom-stat">
                    <div class="vocab-bottom-stat-value">${knownWords}</div>
                    <div class="vocab-bottom-stat-label">累计掌握</div>
                </div>
                <div class="vocab-bottom-stat">
                    <div class="vocab-bottom-stat-value">${Math.round((knownWords / totalWords) * 100)}%</div>
                    <div class="vocab-bottom-stat-label">掌握率</div>
                </div>
            </div>
        `;
    }

    /**
     * 设置主应用事件
     */
    function setupMainAppEvents(container, bankId, wordsToLearn, currentIndex, isFlipped, learningMode = 'new') {
        const card = document.getElementById('vocab-card');
        const unknownBtn = document.getElementById('vocab-unknown-btn');
        const fuzzyBtn = document.getElementById('vocab-fuzzy-btn');
        const knownBtn = document.getElementById('vocab-known-btn');
        const bankSelect = document.getElementById('vocab-bank-select');
        
        // 自定义下拉选择器元素
        const customSelect = document.getElementById('vocab-bank-select-custom');
        const selectDisplay = document.getElementById('vocab-bank-select-display');
        const selectDropdown = document.getElementById('vocab-bank-select-dropdown');
        const selectOptions = selectDropdown.querySelectorAll('.vocab-bank-select-option');

        // 切换下拉菜单显示/隐藏
        selectDisplay.addEventListener('click', (e) => {
            e.stopPropagation();
            customSelect.classList.toggle('open');
        });

        // 点击选项
        selectOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                
                // 更新选中状态
                selectOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // 更新显示文本
                const text = option.textContent;
                selectDisplay.querySelector('.vocab-bank-select-text').textContent = text;
                
                // 更新隐藏的 select（保持兼容性）
                bankSelect.value = value;
                
                // 关闭下拉菜单
                customSelect.classList.remove('open');
                
                // 触发词库切换
                if (value !== bankId) {
                    switchWordBank(value);
                }
            });
        });

        // 点击外部关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        });

        // 卡片翻转
        if (card) {
            card.addEventListener('click', function () {
                card.classList.toggle('flipped');
            });
        }

        // 阻止卡片内容滚动时页面跟随滚动
        const cardBackContent = document.querySelector('.vocab-card-back-content');
        if (cardBackContent) {
            cardBackContent.addEventListener('wheel', function (e) {
                const scrollTop = this.scrollTop;
                const scrollHeight = this.scrollHeight;
                const clientHeight = this.clientHeight;
                const delta = e.deltaY;

                // 判断是否在顶部或底部
                const atTop = scrollTop === 0 && delta < 0;
                const atBottom = scrollTop + clientHeight >= scrollHeight && delta > 0;

                // 如果内容可滚动，始终阻止事件冒泡
                if (scrollHeight > clientHeight) {
                    if (atTop || atBottom) {
                        e.preventDefault();
                    }
                    e.stopPropagation();
                }
            }, { passive: false });
        }

        // 按钮点击
        if (unknownBtn) {
            unknownBtn.addEventListener('click', function () {
                handleAnswer('unknown');
            });
        }

        if (fuzzyBtn) {
            fuzzyBtn.addEventListener('click', function () {
                handleAnswer('learning');
            });
        }

        if (knownBtn) {
            knownBtn.addEventListener('click', function () {
                handleAnswer('known');
            });
        }

        // 词库切换函数
        async function switchWordBank(newBankId) {
            setCurrentBank(newBankId);

            // 显示加载中
            container.innerHTML = `
                <div class="vocab-loading-message">
                    <div class="vocab-loading-title">📚 正在加载词库...</div>
                    <div class="vocab-loading-text">首次加载可能需要几秒钟</div>
                </div>
            `;

            // 加载新词库
            await loadWordBank(newBankId);

            // 重新初始化
            initVocabApp();
        }

        // 词库切换（保留原生 select 的兼容性）
        if (bankSelect) {
            bankSelect.addEventListener('change', async function () {
                const newBankId = this.value;
                await switchWordBank(newBankId);
            });
        }

        // 键盘快捷键
        document.addEventListener('keydown', handleKeyPress);

        function handleAnswer(status) {
            const currentWord = wordsToLearn[currentIndex];
            updateWordStatus(bankId, currentWord.id, status);

            // 移动到下一个单词
            currentIndex++;

            if (currentIndex >= wordsToLearn.length) {
                // 完成所有单词
                showCompleteMessage(container, loadedWordBanks[bankId]);
                document.removeEventListener('keydown', handleKeyPress);
            } else {
                // 显示下一个单词
                isFlipped = false;
                const bank = loadedWordBanks[bankId];
                renderMainApp(container, bankId, bank, wordsToLearn, currentIndex, isFlipped, learningMode);
                setupMainAppEvents(container, bankId, wordsToLearn, currentIndex, isFlipped, learningMode);
            }
        }

        function handleKeyPress(e) {
            // 忽略输入框中的按键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            if (e.code === 'Space') {
                e.preventDefault();
                if (card) card.classList.toggle('flipped');
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                handleAnswer('unknown');
            } else if (e.code === 'ArrowDown') {
                e.preventDefault();
                handleAnswer('learning');
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                handleAnswer('known');
            }
        }
    }

    /**
     * 显示完成消息
     */
    function showCompleteMessage(container, bank) {
        const stats = getTodayStats();

        container.innerHTML = `
            <div class="vocab-complete-message">
                <div class="vocab-complete-title">🎉 恭喜完成！</div>
                <div class="vocab-complete-text">
                    你已完成今日的学习目标<br>
                    今日新学 ${stats.learned} 词，复习 ${stats.reviewed} 词<br>
                    <br>
                    继续保持，每天进步一点点！
                </div>
                <button class="vocab-btn primary" onclick="location.reload()" style="margin-top: 2rem;">
                    继续学习
                </button>
            </div>
        `;
    }

    // ==================== 开发者工具 ====================
    
    /**
     * 暴露给控制台的工具函数
     */
    window.vocabDevTools = {
        // 清除所有学习数据
        clearAllData: function() {
            localStorage.removeItem('vocab_progress');
            localStorage.removeItem('vocab_todayStats');
            console.log('✅ All vocabulary data cleared');
            location.reload();
        },
        
        // 重新生成模拟数据
        regenerateMockData: function() {
            localStorage.removeItem('vocab_progress');
            localStorage.removeItem('vocab_todayStats');
            console.log('✅ Data cleared, reloading to generate new mock data...');
            location.reload();
        },
        
        // 查看当前学习数据
        showProgress: function() {
            const progress = JSON.parse(localStorage.getItem('vocab_progress') || '{}');
            console.log('📊 Current Progress:', progress);
            return progress;
        },
        
        // 查看今日统计
        showStats: function() {
            const stats = JSON.parse(localStorage.getItem('vocab_todayStats') || '{}');
            console.log('📈 Today Stats:', stats);
            return stats;
        },
        
        // 模拟学习一些单词（用于测试）
        simulateLearn: function(count = 5) {
            const bankId = getCurrentBank();
            const bank = loadedWordBanks[bankId];
            if (!bank) {
                console.error('❌ Bank not loaded');
                return;
            }
            
            const progress = getProgress();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            for (let i = 0; i < count; i++) {
                const word = bank.words[i];
                const key = `${bankId}_${word.id}`;
                
                progress[key] = {
                    status: 'learning',
                    reviewCount: 0,
                    lastReview: yesterday.toDateString(),
                    nextReview: new Date().toDateString(),
                    lastResult: 'learning'
                };
            }
            
            saveProgress(progress);
            console.log(`✅ Simulated learning ${count} words yesterday`);
            location.reload();
        },
        
        // 帮助信息
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
    
    console.log('💡 Vocabulary Dev Tools loaded. Type "vocabDevTools.help()" for commands.');

})();
