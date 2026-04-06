/**
 * 字体加载可见性控制（实验）
 *
 * 行为：
 * 1. 页面初始 opacity 为 0（见 custom.css）
 * 2. 等待 document.fonts.ready
 * 3. 加上 body.font-loaded 触发 0.15s 淡入
 * 4. 兜底超时，避免异常情况下页面长期不可见
 */
(function () {
    const REVEAL_CLASS = "font-loaded";
    const FALLBACK_TIMEOUT_MS = 1500;

    function revealBody() {
        if (!document.body) return;
        document.body.classList.add(REVEAL_CLASS);
    }

    function initFontReveal() {
        let finished = false;

        function finish() {
            if (finished) return;
            finished = true;
            revealBody();
        }

        const fallbackTimer = window.setTimeout(finish, FALLBACK_TIMEOUT_MS);

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function () {
                window.clearTimeout(fallbackTimer);
                finish();
            }).catch(function () {
                window.clearTimeout(fallbackTimer);
                finish();
            });
            return;
        }

        window.clearTimeout(fallbackTimer);
        finish();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initFontReveal, { once: true });
    } else {
        initFontReveal();
    }
})();
