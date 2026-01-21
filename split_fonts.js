const { fontSplit } = require('@konghayao/cn-font-split');
const path = require('path');
const fs = require('fs');

/**
 * 字体切片处理脚本
 * 用于将大字体文件切分为小切片，优化加载速度
 */

// 配置
const CONFIG = {
    // 输入目录：读取 assets 下的原始字体文件
    inputDir: path.join(__dirname, 'assets'),

    // 输出目录：生成到 assets/fonts 下
    outputDir: path.join(__dirname, 'assets', 'fonts'),

    // 待处理字体列表
    fonts: [
        { filename: 'STKaiti.woff2', family: 'STKaiti', weight: 400 },
        { filename: 'STZhongsong.woff2', family: 'STZhongsong', weight: 400 },
        { filename: 'STHeiti.woff2', family: 'STHeiti', weight: 400 },
        { filename: 'NotoSansSC-Regular.woff2', family: 'NotoSansSC', weight: 400, outputName: 'NotoSansSC-Regular' },
        { filename: 'NotoSansSC-SemiBold.woff2', family: 'NotoSansSC', weight: 600, outputName: 'NotoSansSC-SemiBold' },
        { filename: 'ZhuqueFangsong-Regular.woff2', family: 'ZhuqueFangsong', weight: 400 }
    ]
};

// 确保目录存在
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function processFonts() {
    console.log('🚀 开始处理字体切片...');
    ensureDir(CONFIG.outputDir);

    for (const font of CONFIG.fonts) {
        const inputPath = path.join(CONFIG.inputDir, font.filename);
        // 使用 outputName（如果存在），否则使用 family
        const outputDirName = font.outputName || font.family;
        const outputPath = path.join(CONFIG.outputDir, outputDirName);

        // 检查源文件是否存在
        if (!fs.existsSync(inputPath)) {
            console.error(`❌ [跳过] 未找到源文件: ${inputPath}`);
            continue;
        }

        console.log(`\n📦 正在处理: ${outputDirName}`);
        console.log(`   源文件: ${inputPath}`);
        console.log(`   输出到: ${outputPath}`);
        console.log(`   font-family: ${font.family}, font-weight: ${font.weight}`);

        try {
            await fontSplit({
                FontPath: inputPath,
                destFold: outputPath,
                targetTypes: ['woff2'],
                chunkSize: 70 * 1024, // 70kb 切片大小
                testHTML: false,      // 不生成测试 HTML
                reporter: true,       // 显示进度
                preview: false,       // 不生成预览图
                css: {
                    // 强制指定 font-family，确保与现有 CSS 一致
                    fontFamily: font.family,
                    fontWeight: font.weight || 400,
                }
            });
            console.log(`✅ [完成] ${outputDirName} 处理完毕`);
        } catch (err) {
            console.error(`❌ [错误] 处理 ${outputDirName} 失败:`, err);
        }
    }

    console.log('\n🎉 所有字体处理完成！');
    console.log(`📂 请检查目录: ${CONFIG.outputDir}`);
}

processFonts();
