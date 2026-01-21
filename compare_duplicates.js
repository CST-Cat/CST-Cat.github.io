const fs = require('fs');
const path = require('path');

const files = ['KaoYan_1.json', 'KaoYan_2.json', 'KaoYan_3.json'];
const wordMap = new Map();

console.log('正在分析考研词库重复情况...');

files.forEach(f => {
    try {
        const filePath = path.join(__dirname, 'assets', 'english-vocabulary', f);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        data.forEach((item, index) => {
            const word = item.headWord;
            if (!word) return;

            if (!wordMap.has(word)) {
                wordMap.set(word, []);
            }

            // 提取关键信息用于对比
            let trans = '';
            if (item.content && item.content.word && item.content.word.content && item.content.word.content.trans) {
                trans = item.content.word.content.trans.map(t => t.tranCn).join('; ');
            }

            let sentence = '';
            if (item.content && item.content.word && item.content.word.content && item.content.word.content.sentence && item.content.word.content.sentence.sentences) {
                sentence = item.content.word.content.sentence.sentences[0].sContent;
            } else if (item.content && item.content.word && item.content.word.content && item.content.word.content.realExamSentence && item.content.word.content.realExamSentence.sentences) {
                sentence = item.content.word.content.realExamSentence.sentences[0].sContent;
            }

            wordMap.get(word).push({
                file: f,
                trans: trans,
                sentence: sentence || '无例句'
            });
        });
    } catch (e) {
        console.error('读取文件失败:', f, e.message);
    }
});

let count = 0;
for (const [word, entries] of wordMap) {
    if (entries.length > 1) {
        console.log(`\n【${word}】 出现 ${entries.length} 次:`);
        entries.forEach((e, i) => {
            console.log(`  [${i + 1}] 来源: ${e.file}`);
            console.log(`      释义: ${e.trans}`);
            console.log(`      例句: ${e.sentence.substring(0, 60)}${e.sentence.length > 60 ? '...' : ''}`);
        });

        // 检查是否完全相同
        const first = JSON.stringify(entries[0]);
        const allSame = entries.every(e => JSON.stringify(e) === first);
        console.log(`      >>> 结论: ${allSame ? '完全相同 (冗余数据)' : '内容存在差异'}`);

        count++;
        if (count >= 3) break;
    }
}
