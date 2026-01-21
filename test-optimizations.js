/*******************************************************************************
 * 性能优化测试脚本
 * 
 * 在浏览器控制台运行此脚本以验证所有优化是否正常工作
 ******************************************************************************/

(async function testOptimizations() {
    console.log('🧪 Starting optimization tests...\n');
    
    const results = {
        passed: 0,
        failed: 0,
        warnings: 0
    };
    
    // 测试 1：定时器管理器
    console.group('⏱️ Test 1: Timer Manager');
    try {
        if (!window.timerManager) {
            throw new Error('Timer Manager not found');
        }
        
        // 注册测试定时器
        let callCount = 0;
        window.timerManager.register('test-timer', () => {
            callCount++;
        }, 100);
        
        // 等待 250ms
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // 应该被调用 2-3 次
        if (callCount >= 2 && callCount <= 3) {
            console.log('✅ Timer Manager working correctly');
            console.log(`   Callback called ${callCount} times in 250ms`);
            results.passed++;
        } else {
            console.warn(`⚠️ Timer Manager callback called ${callCount} times (expected 2-3)`);
            results.warnings++;
        }
        
        // 清理
        window.timerManager.unregister('test-timer');
        
        // 检查状态
        const status = window.timerManager.getStatus();
        console.log(`   Active timers: ${status.timerCount}`);
        console.log(`   Timer names: ${status.timers.join(', ')}`);
        
    } catch (error) {
        console.error('❌ Timer Manager test failed:', error.message);
        results.failed++;
    }
    console.groupEnd();
    
    // 测试 2：IndexedDB 缓存
    console.group('💾 Test 2: IndexedDB Cache');
    try {
        if (!window.indexedDBHelper) {
            throw new Error('IndexedDB Helper not found');
        }
        
        // 测试保存和读取
        const testData = {
            name: 'Test Bank',
            words: [
                { id: 'test1', word: 'test', meaning: 'test' },
                { id: 'test2', word: 'example', meaning: 'example' }
            ]
        };
        
        console.log('   Saving test data...');
        await window.indexedDBHelper.saveWordBank('test-bank', testData);
        
        console.log('   Reading test data...');
        const cached = await window.indexedDBHelper.getWordBank('test-bank');
        
        if (cached && cached.words.length === 2) {
            console.log('✅ IndexedDB Cache working correctly');
            console.log(`   Cached ${cached.words.length} words`);
            results.passed++;
        } else {
            throw new Error('Cache data mismatch');
        }
        
        // 获取统计
        const stats = await window.indexedDBHelper.getStats();
        console.log(`   Total cached banks: ${stats.count}`);
        
        // 清理测试数据
        await window.indexedDBHelper.deleteWordBank('test-bank');
        console.log('   Test data cleaned up');
        
    } catch (error) {
        console.error('❌ IndexedDB Cache test failed:', error.message);
        results.failed++;
    }
    console.groupEnd();
    
    // 测试 3：性能监控器
    console.group('📊 Test 3: Performance Monitor');
    try {
        if (!window.performanceMonitor) {
            throw new Error('Performance Monitor not found');
        }
        
        // 创建测试函数
        const slowFunction = () => {
            const start = Date.now();
            while (Date.now() - start < 20) {
                // 模拟慢函数（20ms）
            }
            return 'done';
        };
        
        // 包装函数
        const monitoredFunction = window.performanceMonitor.measure(
            slowFunction,
            'test-slow-function'
        );
        
        // 执行几次
        console.log('   Running slow function 3 times...');
        for (let i = 0; i < 3; i++) {
            monitoredFunction();
        }
        
        // 检查测量结果
        const measurements = window.performanceMonitor.measurements.get('test-slow-function');
        
        if (measurements && measurements.count === 3) {
            console.log('✅ Performance Monitor working correctly');
            console.log(`   Measured ${measurements.count} calls`);
            console.log(`   Avg time: ${(measurements.totalTime / measurements.count).toFixed(2)}ms`);
            console.log(`   Max time: ${measurements.maxTime.toFixed(2)}ms`);
            results.passed++;
        } else {
            throw new Error('Performance measurements not recorded');
        }
        
        // 清理
        window.performanceMonitor.measurements.delete('test-slow-function');
        
    } catch (error) {
        console.error('❌ Performance Monitor test failed:', error.message);
        results.failed++;
    }
    console.groupEnd();
    
    // 测试 4：CSS 优化
    console.group('🎨 Test 4: CSS Optimizations');
    try {
        // 检查 CSS 变量
        const root = document.documentElement;
        const fontSans = getComputedStyle(root).getPropertyValue('--font-sans');
        const transitionFast = getComputedStyle(root).getPropertyValue('--transition-fast');
        
        if (fontSans && fontSans.trim() !== '') {
            console.log('✅ CSS variables defined correctly');
            console.log(`   --font-sans: ${fontSans.trim()}`);
            console.log(`   --transition-fast: ${transitionFast.trim()}`);
            results.passed++;
        } else {
            console.warn('⚠️ CSS variables not found (may not be loaded yet)');
            results.warnings++;
        }
        
    } catch (error) {
        console.error('❌ CSS optimization test failed:', error.message);
        results.failed++;
    }
    console.groupEnd();
    
    // 测试 5：集成测试
    console.group('🔗 Test 5: Integration');
    try {
        // 检查原有功能是否正常
        const hasPomodoro = document.getElementById('pomodoro-app') !== null;
        const hasCountdown = document.getElementById('countdown-app') !== null;
        const hasTodo = document.getElementById('todo-app') !== null;
        const hasVocab = document.getElementById('vocab-app') !== null;
        
        const foundElements = [hasPomodoro, hasCountdown, hasTodo, hasVocab].filter(Boolean).length;
        
        console.log(`   Found ${foundElements}/4 app containers`);
        
        if (foundElements >= 2) {
            console.log('✅ Integration test passed');
            results.passed++;
        } else {
            console.warn('⚠️ Some app containers not found (may be on different page)');
            results.warnings++;
        }
        
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        results.failed++;
    }
    console.groupEnd();
    
    // 总结
    console.log('\n' + '='.repeat(50));
    console.log('📋 Test Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`⚠️ Warnings: ${results.warnings}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log('='.repeat(50));
    
    if (results.failed === 0) {
        console.log('\n🎉 All critical tests passed!');
        console.log('💡 Tip: Run window.perfReport() to see performance statistics');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the errors above.');
    }
    
    return results;
})();
