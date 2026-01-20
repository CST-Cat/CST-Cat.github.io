/**
 * 代码块增强功能
 * 
 * 功能：
 * 1. 自动为代码块添加行号
 * 2. 添加复制按钮，支持一键复制代码
 * 
 * 在 DOM 加载完成后自动执行
 */
document.addEventListener('DOMContentLoaded', function() {
    // 选择所有代码块（pre > code 结构）
    const codeBlocks = document.querySelectorAll('pre > code');

    // 遍历每个代码块，添加行号和复制按钮
    codeBlocks.forEach(function(codeBlock) {
        const pre = codeBlock.parentElement;  // 获取父元素 pre
        
        // ========== 添加行号 ==========
        // 检查是否已经处理过（避免重复添加）
        if (!pre.querySelector('.line-numbers-rows')) {
            // 克隆代码块以正确计算行数（处理 <br> 标签）
            const clone = codeBlock.cloneNode(true);
            const brs = clone.querySelectorAll('br');
            // 将 <br> 标签替换为换行符
            brs.forEach(br => br.replaceWith('\n'));
            
            const text = clone.textContent;
            // 移除末尾的换行符，避免多出一个空行号
            const cleanText = text.replace(/\n$/, '');
            // 计算行数
            const lineCount = cleanText.split(/\r\n|\r|\n/).length;
            
            // 创建行号容器
            const rows = document.createElement('span');
            rows.className = 'line-numbers-rows';
            
            // 生成行号
            for (let i = 1; i <= lineCount; i++) {
                const span = document.createElement('span');
                span.textContent = i;
                rows.appendChild(span);
            }
            
            // 将行号插入到代码块前面
            pre.insertBefore(rows, codeBlock);
            pre.classList.add('has-line-numbers');
        }
        
        // ========== 添加复制按钮 ==========
        // 检查复制按钮是否已存在（避免重复添加）
        if (pre.querySelector('.copy-button')) return;
        
        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.textContent = 'Copy';
        
        // 添加点击事件监听器
        copyButton.addEventListener('click', function() {
            // 克隆代码块以正确处理 <br> 标签
            const clone = codeBlock.cloneNode(true);
            
            // 将 <br> 标签替换为换行符
            const brs = clone.querySelectorAll('br');
            brs.forEach(br => {
                br.replaceWith('\n');
            });

            // 获取文本内容（现在包含换行符）
            const codeText = clone.textContent;
            
            // 使用 Clipboard API 复制文本
            navigator.clipboard.writeText(codeText).then(function() {
                // 复制成功的反馈
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                copyButton.classList.add('copied');
                
                // 2秒后恢复原始状态
                setTimeout(function() {
                    copyButton.textContent = originalText;
                    copyButton.classList.remove('copied');
                }, 2000);
            }).catch(function(err) {
                // 复制失败时的错误处理
                console.error('Failed to copy text: ', err);
                copyButton.textContent = 'Error';
            });
        });

        // 确保 pre 元素使用相对定位，以便绝对定位复制按钮
        pre.style.position = 'relative';
        
        // 将按钮添加到 pre 元素中
        pre.appendChild(copyButton);
    });
});
