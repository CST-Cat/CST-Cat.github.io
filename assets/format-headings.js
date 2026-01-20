/**
 * 标题格式化脚本
 * 
 * 功能：自动识别标题中的英文/数字部分，并用 span 包裹
 * 目的：为英文/数字应用不同的字体样式（AnthropicSans）
 * 
 * 工作原理：
 * 1. 遍历所有标题元素（h1-h6）
 * 2. 递归处理每个文本节点
 * 3. 识别 ASCII 字符（英文、数字、标点）
 * 4. 用 <span class="heading-en"> 包裹这些字符
 * 5. 保持中文部分不变
 */
document.addEventListener('DOMContentLoaded', function() {
    // 选择所有级别的标题
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    // 遍历每个标题，处理其内容
    headings.forEach(el => {
        processNode(el);
    });

    /**
     * 递归处理节点
     * @param {Node} node - 要处理的节点
     */
    function processNode(node) {
        if (node.nodeType === 3) { 
            // nodeType === 3 代表文本节点
            const text = node.nodeValue;
            
            // 检查是否包含 ASCII 字符（英文、数字、半角标点）
            if (/[\x00-\x7F]/.test(text)) {
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                // 正则表达式：匹配连续的 ASCII 字符
                const regex = /[\x00-\x7F]+/g;
                let match;
                
                // 遍历所有匹配项
                while ((match = regex.exec(text)) !== null) {
                    // 1. 添加匹配前的中文文本（不包裹）
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                    }
                    
                    // 2. 添加匹配到的英文文本，用 span 包裹
                    const span = document.createElement('span');
                    span.className = 'heading-en';  // 应用英文字体样式
                    span.textContent = match[0];
                    fragment.appendChild(span);
                    
                    lastIndex = regex.lastIndex;
                }
                
                // 3. 添加剩余的文本（最后一段中文）
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                }
                
                // 用新的文档片段替换原来的文本节点
                node.parentNode.replaceChild(fragment, node);
            }
        } else if (node.nodeType === 1) { 
            // nodeType === 1 代表元素节点（如 h2 里的 a 标签）
            // 递归处理子节点
            Array.from(node.childNodes).forEach(processNode);
        }
    }
});
