#import "../index.typ": template, tufted
#show: template.with(title: "滚动条优化演示")

= 滚动条优化演示

本文档用于展示优化后的滚动条效果。页面足够长以展示右侧的纵向滚动条，同时包含需要横向滚动的长代码块。

#html.hr()

== 1. 滚动条设计理念

在网页设计中，滚动条往往是一个被忽视但非常重要的 UI 元素。一个好的滚动条应该：

- *融入背景*：不突兀，与整体设计风格一致
- *纤细优雅*：不占用太多空间，保持界面清爽
- *交互友好*：hover 时有适当的视觉反馈
- *跨浏览器兼容*：在不同浏览器中表现一致

=== 1.1 现代滚动条趋势

现代网站越来越倾向于使用细长的滚动条，甚至在不滚动时完全隐藏。这种设计让内容区域更加宽敞，阅读体验更好。

=== 1.2 技术实现

我们使用 CSS 伪元素来自定义滚动条样式：

- `::-webkit-scrollbar` - 整个滚动条
- `::-webkit-scrollbar-track` - 滚动条轨道
- `::-webkit-scrollbar-thumb` - 滚动条滑块
- `::-webkit-scrollbar-corner` - 横纵滚动条交汇处

对于 Firefox，使用 `scrollbar-width` 和 `scrollbar-color` 属性。

#html.hr()

== 2. 横向滚动代码块演示

以下代码块包含非常长的代码行，需要横向滚动才能查看完整内容。请观察横向滚动条的样式 —— 纤细、透明背景、完美融入代码块。

=== 2.1 超长单行代码示例

```javascript
// 这是一行超级长的 JavaScript 代码，包含大量的配置项和参数，用于演示横向滚动条的效果。在实际开发中，我们通常会将这样的长行拆分成多行，但这里为了演示目的，特意保持为单行。
const extremelyLongConfigurationObject = { apiEndpoint: "https://api.example.com/v1/users", timeout: 30000, retryCount: 3, headers: { "Content-Type": "application/json", "Authorization": "Bearer YOUR_TOKEN_HERE", "X-Custom-Header": "some-value" }, responseInterceptor: (response) => response.data, errorHandler: (error) => console.error("API Error:", error.message) };

// 另一个超长行：包含复杂的链式调用和内联注释
const processedData = rawDataArray.filter(item => item.isActive && item.value > 0).map(item => ({ ...item, processedAt: new Date().toISOString(), calculatedValue: item.value * 2.5 + 100 })).sort((a, b) => b.calculatedValue - a.calculatedValue).slice(0, 100).reduce((accumulator, currentItem) => ({ ...accumulator, [currentItem.id]: currentItem }), {});

// 极长的模板字符串，用于生成 HTML 内容
const generateCompleteHTMLDocument = (title, content, styles) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><style>${styles}</style></head><body><main class="container"><header><h1>${title}</h1></header><article>${content}</article><footer><p>Generated at ${new Date().toISOString()}</p></footer></main></body></html>`;
```

=== 2.2 复杂函数示例

```python
# Python 中的超长行示例：复杂的数据处理管道
def extremely_comprehensive_data_processing_pipeline_with_multiple_transformation_stages_and_validation_steps(input_dataframe, configuration_dictionary, logger_instance, cache_manager, error_handler):
    """这是一个演示用的函数，函数名和参数列表都非常长，用于测试横向滚动条。实际开发中不建议使用如此长的命名。"""
    validated_data = input_dataframe.dropna().query("value > 0 and category in ['A', 'B', 'C']").assign(processed_timestamp=lambda df: pd.Timestamp.now(), calculated_field=lambda df: df['value'] * configuration_dictionary.get('multiplier', 1.0) + configuration_dictionary.get('offset', 0))
    
    # 超长的字典定义，包含大量配置项
    complete_processing_configuration = {"stage_1_filter": {"min_value": 0, "max_value": 1000, "allowed_categories": ["A", "B", "C", "D", "E"]}, "stage_2_transform": {"multiplier": 2.5, "offset": 100, "precision": 4}, "stage_3_aggregate": {"group_by": ["category", "region", "date"], "aggregations": ["sum", "mean", "std", "min", "max"]}, "stage_4_export": {"format": "parquet", "compression": "snappy", "partition_by": ["date"]}}
    
    return validated_data, complete_processing_configuration
```

#html.hr()

== 3. 更多代码示例

为了展示页面的纵向滚动效果，我们继续添加更多内容。

=== 3.1 CSS 样式代码

```css
/* 滚动条样式的完整实现代码 - 包含所有状态和变体 */

/* 基础滚动条设置 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; border-radius: 3px; }
::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.25); border-radius: 3px; transition: background 0.2s ease; }
::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.4); }
::-webkit-scrollbar-thumb:active { background: rgba(128, 128, 128, 0.5); }
::-webkit-scrollbar-corner { background: transparent; }

/* 代码块专用滚动条 - 更加纤细和隐蔽，与代码块背景完美融合，不会分散阅读者的注意力，让代码阅读体验更加流畅自然 */
pre::-webkit-scrollbar, code::-webkit-scrollbar, .code-block::-webkit-scrollbar { width: 5px; height: 5px; }
pre::-webkit-scrollbar-track, code::-webkit-scrollbar-track { background: transparent; }
pre::-webkit-scrollbar-thumb, code::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.2); border-radius: 2.5px; }

/* Firefox 浏览器兼容性设置 */
* { scrollbar-width: thin; scrollbar-color: rgba(128, 128, 128, 0.25) transparent; }
```

=== 3.2 TypeScript 类型定义

```typescript
// 复杂的 TypeScript 类型定义示例，展示横向滚动效果
interface ExtremleyDetailedUserProfileConfigurationWithAllPossiblePropertiesAndNestedObjectStructures<TUserData extends BaseUserInterface, TPreferences extends UserPreferencesInterface, TMetadata extends SystemMetadataInterface> {
    readonly userId: string; readonly username: string; readonly email: string; readonly createdAt: Date; readonly updatedAt: Date; readonly userData: TUserData; readonly preferences: TPreferences; readonly metadata: TMetadata; readonly permissions: ReadonlyArray<PermissionType>; readonly roles: ReadonlyArray<RoleType>;
}

type CompleteApplicationStateWithAllDomainEntitiesAndUIStateAndCacheAndHistoryAndUndoRedoStack = { entities: Record<string, Entity>; ui: UIState; cache: CacheState; history: HistoryEntry[]; undoStack: Action[]; redoStack: Action[]; pendingRequests: Map<string, Promise<Response>>; websocketConnections: Map<string, WebSocket>; errorBoundaries: Map<string, Error>; performanceMetrics: PerformanceEntry[]; };
```

#html.hr()

== 4. 滚动条在不同场景的应用

=== 4.1 页面主滚动条

页面右侧的主滚动条是用户最常接触的滚动条。优化后的滚动条只有 6px 宽，背景完全透明，滑块使用半透明的灰色，hover 时略微加深。

这种设计既保持了滚动条的可见性，又不会对页面内容造成视觉干扰。

=== 4.2 代码块横向滚动条

代码块的横向滚动条更加纤细（5px），背景同样透明。滑块颜色比主滚动条更淡，与代码块的背景融为一体。

=== 4.3 深色模式适配

在深色模式下，滚动条滑块使用更浅的颜色（`rgba(200, 200, 200, 0.15)`），确保在深色背景上有足够的对比度但又不会过于刺眼。

#html.hr()

== 5. 技术细节

=== 5.1 Webkit 内核浏览器

Chrome、Safari、Edge 等使用 Webkit 内核的浏览器支持完整的滚动条自定义：

```css
/* Webkit 滚动条伪元素 */
::-webkit-scrollbar          /* 整个滚动条 */
::-webkit-scrollbar-button   /* 滚动条两端的按钮 */
::-webkit-scrollbar-track    /* 滚动条轨道 */
::-webkit-scrollbar-thumb    /* 滚动条滑块 */
::-webkit-scrollbar-corner   /* 滚动条交汇处 */
```

=== 5.2 Firefox 浏览器

Firefox 使用更简洁的属性：

```css
/* Firefox 滚动条属性 */
scrollbar-width: thin | auto | none;
scrollbar-color: <thumb-color> <track-color>;
```

=== 5.3 跨浏览器兼容方案

为了确保所有浏览器都能获得良好的体验，我们同时使用两种方案：

1. Webkit 伪元素用于精细控制
2. Firefox 属性用于基本兼容
3. 使用透明背景确保融入任何颜色的父容器

#html.hr()

== 6. 更多长代码示例

=== 6.1 SQL 查询

```sql
-- 这是一个非常长的 SQL 查询语句，用于演示横向滚动效果。包含多个 JOIN、子查询、聚合函数和复杂的 WHERE 条件
SELECT u.user_id, u.username, u.email, u.created_at, p.profile_picture_url, p.bio, p.location, o.order_count, o.total_spent, o.last_order_date, COALESCE(r.average_rating, 0) as avg_rating, COALESCE(r.review_count, 0) as total_reviews FROM users u LEFT JOIN user_profiles p ON u.user_id = p.user_id LEFT JOIN (SELECT user_id, COUNT(*) as order_count, SUM(total_amount) as total_spent, MAX(order_date) as last_order_date FROM orders WHERE order_status = 'completed' AND order_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR) GROUP BY user_id) o ON u.user_id = o.user_id LEFT JOIN (SELECT user_id, AVG(rating) as average_rating, COUNT(*) as review_count FROM reviews WHERE is_verified = 1 GROUP BY user_id) r ON u.user_id = r.user_id WHERE u.is_active = 1 AND u.email_verified = 1 ORDER BY o.total_spent DESC NULLS LAST LIMIT 1000;
```

=== 6.2 JSON 配置

```json
{"applicationConfiguration":{"server":{"host":"0.0.0.0","port":8080,"ssl":{"enabled":true,"certificatePath":"/etc/ssl/certs/server.crt","keyPath":"/etc/ssl/private/server.key"}},"database":{"primary":{"host":"db-primary.example.com","port":5432,"name":"main_database","user":"app_user","password":"${DB_PASSWORD}","pool":{"min":5,"max":50,"idleTimeout":30000}},"replica":{"hosts":["db-replica-1.example.com","db-replica-2.example.com"],"loadBalancing":"round-robin"}},"cache":{"redis":{"cluster":{"nodes":["redis-1:6379","redis-2:6379","redis-3:6379"]}}}},"featureFlags":{"newUserInterface":true,"experimentalFeatures":false,"betaProgram":{"enabled":true,"percentage":10}}}
```

#html.hr()

== 7. 总结

本页面演示了以下滚动条优化效果：

+ *纵向滚动条*：页面右侧的主滚动条，6px 宽，半透明滑块
+ *横向滚动条*：代码块中的横向滚动条，5px 高，与代码块背景融合
+ *深色/浅色模式*：自动适配当前主题颜色
+ *交互反馈*：hover 和 active 状态有细微的颜色变化

=== 7.1 设计原则

- 尊重用户的阅读体验
- 不喧宾夺主
- 保持功能性的同时追求美观
- 考虑无障碍访问需求

=== 7.2 兼容性

本方案兼容以下浏览器：

- Chrome 4+
- Safari 5.1+
- Edge 79+
- Firefox 64+
- Opera 15+

#html.hr()

== 8. 附录：完整样式代码

以下是滚动条优化的完整 CSS 代码，可直接复制使用：

```css
/* ===================================================================================================================================== */
/* 全局滚动条重构 - 完美融入背景，纤细优雅 - 适用于所有页面元素 - 包含深色模式和浅色模式的完整支持 - 兼容 Webkit 和 Firefox 内核浏览器 */
/* ===================================================================================================================================== */

/* Webkit 浏览器全局滚动条 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; border-radius: 3px; }
::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.25); border-radius: 3px; transition: background 0.2s ease; }
::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.4); }
::-webkit-scrollbar-thumb:active { background: rgba(128, 128, 128, 0.5); }
::-webkit-scrollbar-corner { background: transparent; }

/* 代码块专用滚动条 */
pre::-webkit-scrollbar, code::-webkit-scrollbar { width: 5px; height: 5px; }
pre::-webkit-scrollbar-track, code::-webkit-scrollbar-track { background: transparent; border-radius: 2.5px; }
pre::-webkit-scrollbar-thumb, code::-webkit-scrollbar-thumb { background: rgba(128, 128, 128, 0.2); border-radius: 2.5px; }
pre::-webkit-scrollbar-thumb:hover, code::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.35); }

/* Firefox 兼容 */
* { scrollbar-width: thin; scrollbar-color: rgba(128, 128, 128, 0.25) transparent; }

/* 深色模式适配 */
html[data-theme="dark"] ::-webkit-scrollbar-thumb { background: rgba(200, 200, 200, 0.15); }
html[data-theme="dark"] ::-webkit-scrollbar-thumb:hover { background: rgba(200, 200, 200, 0.25); }
html[data-theme="dark"] ::-webkit-scrollbar-thumb:active { background: rgba(200, 200, 200, 0.35); }
```

#html.hr()

_本文档由 Tufted Blog Template 生成，用于展示滚动条优化效果。_
