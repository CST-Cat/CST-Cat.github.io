/*******************************************************************************
 * IndexedDB 辅助工具
 * 
 * 功能：
 * - 提供简单的 IndexedDB 操作接口
 * - 用于缓存词库数据
 * - 自动处理版本升级
 ******************************************************************************/

class IndexedDBHelper {
    constructor(dbName = 'VocabCache', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    /**
     * 打开数据库
     */
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB open error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建词库存储
                if (!db.objectStoreNames.contains('wordBanks')) {
                    const store = db.createObjectStore('wordBanks', { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * 保存词库数据
     * @param {string} bankId - 词库 ID
     * @param {object} data - 词库数据
     */
    async saveWordBank(bankId, data) {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['wordBanks'], 'readwrite');
            const store = transaction.objectStore('wordBanks');

            const record = {
                id: bankId,
                data: data,
                timestamp: Date.now()
            };

            const request = store.put(record);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('IndexedDB save error:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 获取词库数据
     * @param {string} bankId - 词库 ID
     * @param {number} maxAge - 最大缓存时间（毫秒），默认 7 天
     */
    async getWordBank(bankId, maxAge = 7 * 24 * 60 * 60 * 1000) {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['wordBanks'], 'readonly');
            const store = transaction.objectStore('wordBanks');
            const request = store.get(bankId);

            request.onsuccess = () => {
                const record = request.result;

                if (!record) {
                    resolve(null);
                    return;
                }

                // 检查缓存是否过期
                const age = Date.now() - record.timestamp;
                if (age > maxAge) {
                    console.log(`Cache expired for ${bankId}, age: ${Math.round(age / 1000 / 60 / 60)}h`);
                    resolve(null);
                    return;
                }

                console.log(`Cache hit for ${bankId}, age: ${Math.round(age / 1000 / 60)}min`);
                resolve(record.data);
            };

            request.onerror = () => {
                console.error('IndexedDB get error:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 删除词库数据
     * @param {string} bankId - 词库 ID
     */
    async deleteWordBank(bankId) {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['wordBanks'], 'readwrite');
            const store = transaction.objectStore('wordBanks');
            const request = store.delete(bankId);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                console.error('IndexedDB delete error:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 清空所有缓存
     */
    async clearAll() {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['wordBanks'], 'readwrite');
            const store = transaction.objectStore('wordBanks');
            const request = store.clear();

            request.onsuccess = () => {
                console.log('All cache cleared');
                resolve();
            };
            request.onerror = () => {
                console.error('IndexedDB clear error:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * 获取缓存统计信息
     */
    async getStats() {
        if (!this.db) await this.open();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['wordBanks'], 'readonly');
            const store = transaction.objectStore('wordBanks');
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result;
                const stats = {
                    count: records.length,
                    banks: records.map(r => ({
                        id: r.id,
                        wordCount: r.data.words ? r.data.words.length : 0,
                        timestamp: r.timestamp,
                        age: Math.round((Date.now() - r.timestamp) / 1000 / 60) // 分钟
                    }))
                };
                resolve(stats);
            };

            request.onerror = () => {
                console.error('IndexedDB stats error:', request.error);
                reject(request.error);
            };
        });
    }
}

// 创建全局单例
window.indexedDBHelper = new IndexedDBHelper();
