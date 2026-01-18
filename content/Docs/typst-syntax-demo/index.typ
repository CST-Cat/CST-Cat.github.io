#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#import "@preview/tablem:0.3.0": *
#show: template.with(title: "Typst 语法演示模板")

= Typst 语法演示模板

本文档展示了在 Tufted Blog Template 中写作时可能用到的所有 Typst 语法格式。每个功能都包含**源代码**和**实际效果**对照。

#html.hr()

== 1. 文章头部模板

每篇文章的标准开头：

```typst
#import "../index.typ": template, tufted
#show: template.with(lang: "zh")

= 文章标题
```

*可用参数：*
- `lang` - 语言代码：`"zh"`, `"en"`
- `title` - 浏览器标签标题

#html.hr()

== 2. 标题层级

*代码：*
```typst
= 一级标题 (H1)
== 二级标题 (H2)
=== 三级标题 (H3)
==== 四级标题 (H4)
```

*效果演示：*

=== 三级标题示例
==== 四级标题示例

（一级和二级标题过大，此处用三四级演示）

#html.hr()

== 3. 文本格式

=== 3.1 基础格式

*代码：*
```typst
*粗体文本*
_斜体文本_
*_粗斜体_*
`行内代码`
```

*效果：*
- *粗体文本*
- _斜体文本_
- *_粗斜体_*
- `行内代码`

=== 3.2 装饰效果

*代码：*
```typst
#underline[下划线]
#strike[删除线]
#overline[上划线]
#highlight[高亮标记]
```

*效果：*
- #underline[下划线]
- #strike[删除线]
- #overline[上划线]
- #highlight[高亮标记]

=== 3.3 上标与下标

*代码：*
```typst
E = mc#super[2]
H#sub[2]O
```

*效果：*
- 质能方程：E = mc#super[2]
- 水分子：H#sub[2]O

=== 3.4 颜色与样式

*代码：*
```typst
#text(fill: red)[红色文字]
#text(fill: blue)[蓝色文字]
#text(fill: green)[绿色文字]
```

*效果：*#footnote[注意：颜色在网页中可能不显示，在 PDF 导出时有效。]
- #text(fill: red)[红色文字]
- #text(fill: blue)[蓝色文字]
- #text(fill: green)[绿色文字]

#html.hr()

== 4. 列表

=== 4.1 无序列表

*代码：*
```typst
- 第一项
- 第二项
  - 嵌套项
    - 更深嵌套
- 第三项
```

*效果：*
- 第一项
- 第二项
  - 嵌套项
    - 更深嵌套
- 第三项

=== 4.2 有序列表

*代码：*
```typst
+ 第一步
+ 第二步
  + 子步骤 A
  + 子步骤 B
+ 第三步
```

*效果：*
+ 第一步
+ 第二步
  + 子步骤 A
  + 子步骤 B
+ 第三步

=== 4.3 术语列表

*代码：*
```typst
/ Typst: 一个现代化的排版系统
/ Tufted: 基于 Tufte 风格的模板
```

*效果：*
/ Typst: 一个现代化的排版系统
/ Tufted: 基于 Tufte 风格的模板

=== 4.4 混合列表

*代码：*
```typst
- 无序项
  + 有序子项 1
  + 有序子项 2
- 另一个无序项
```

*效果：*
- 无序项
  + 有序子项 1
  + 有序子项 2
- 另一个无序项

#html.hr()

== 5. 链接与导航

=== 5.1 外部链接

*代码：*
```typst
#link("https://typst.app/")[Typst 官网]
#link("https://github.com/", "GitHub")
```

*效果：*
- #link("https://typst.app/")[Typst 官网]
- #link("https://github.com/", "GitHub")

=== 5.2 内部链接

*代码：*
```typst
#link("/Blog/")[返回博客列表]
#link("/CV/")[查看简历]
```

*效果：*
- #link("/Blog/")[返回博客列表]
- #link("/CV/")[查看简历]

=== 5.3 邮箱链接

*代码：*
```typst
#link("mailto:example@email.com")[发送邮件]
```

*效果：*
- #link("mailto:example@email.com")[发送邮件]

=== 5.4 文件链接

*代码：*
```typst
#link("sample.pdf")[下载 PDF 文件]
#link("../")[返回上级目录]
```

*效果：*
- #link("/Docs/typst-example/sample-PDF.pdf")[下载 PDF 文件]
- #link("../")[返回上级目录]

#html.hr()

== 6. 图片

=== 6.1 基础图片

*代码：*
```typst
#image("../../imgs/tufted-duck-male.webp", width: 200pt)
```

*效果：*
#image("../../imgs/tufted-duck-male.webp", width: 200pt)

=== 6.2 带标题的图片

*代码：*
```typst
#figure(
  image("../../imgs/tufted-duck-female-with-duckling.webp", width: 250pt),
  caption: [凤头潜鸭母子]
)
```

*效果：*
#figure(
  image("../../imgs/tufted-duck-female-with-duckling.webp", width: 250pt),
  caption: [凤头潜鸭母子],
)

=== 6.3 边栏图片

*代码：*
```typst
#tufted.margin-note[
  #image("../../imgs/gorilla.webp")
]
#tufted.margin-note[
  ⬆️ 这是一只大猩猩
]
```

*效果：*（查看右侧边栏）
#tufted.margin-note[
  #image("../../imgs/gorilla.webp")
]
#tufted.margin-note[
  ⬆️ 这是一只大猩猩
]

=== 6.4 全宽图片

*代码：*
```typst
#tufted.full-width[#image("../../imgs/devices.webp")]
```

*效果：*
#tufted.full-width[#image("../../imgs/devices.webp")]

=== 6.5 图片并排

*代码：*
```typst
#grid(
  columns: 2,
  gutter: 10pt,
  image("../../imgs/tufted-duck-male.webp"),
  image("../../imgs/gorilla.webp"),
)
```

*效果：*
#grid(
  columns: 2,
  gutter: 10pt,
  image("../../imgs/tufted-duck-male.webp"), image("../../imgs/gorilla.webp"),
)

#html.hr()

== 7. 表格

=== 7.1 基础表格

*代码：*
```typst
#table(
  columns: 3,
  [*姓名*], [*年龄*], [*城市*],
  [Alice], [25], [北京],
  [Bob], [30], [上海],
)
```

*效果：*
#table(
  columns: 3,
  [*姓名*], [*年龄*], [*城市*],
  [Alice], [25], [北京],
  [Bob], [30], [上海],
)

=== 7.2 Markdown 风格表格

*代码：*
```typst
#import "@preview/tablem:0.3.0": *

#tablem[
  | *Name* | *Score* | *Grade* |
  | :----: | :-----: | :-----: |
  | Alice  | 95      | A       |
  | Bob    | 87      | B       |
]
```

*效果：*
#tablem[
  | *Name* | *Score* | *Grade* |
  | :----: | :-----: | :-----: |
  | Alice  | 95      | A       |
  | Bob    | 87      | B       |
]

#html.hr()

== 8. 代码块

=== 8.1 行内代码

*代码：*
```typst
使用 `print()` 函数输出内容。
```

*效果：*
使用 `print()` 函数输出内容。

=== 8.2 Python 代码块

*代码：*（四个反引号包裹）

*效果：*
```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))  # 输出: 55
```

=== 8.3 Rust 代码块

*效果：*
```rust
fn main() {
    println!("Hello, Typst!");
}
```

=== 8.4 JavaScript 代码块

*效果：*
```javascript
const greet = (name) => {
    console.log(`Hello, ${name}!`);
};

greet('World');
```

=== 8.5 带标题的代码块

*代码：*
```typst
#figure(caption: "快速排序算法")[
```python
def quicksort(arr):
if len(arr) <= 1:
return arr
pivot = arr[len(arr) // 2]
left = [x for x in arr if x < pivot]
middle = [x for x in arr if x == pivot]
right = [x for x in arr if x > pivot]
return quicksort(left) + middle + quicksort(right)
```
]
```

*效果：*
#figure(caption: "快速排序算法")[
  ```python
  def quicksort(arr):
      if len(arr) <= 1:
          return arr
      pivot = arr[len(arr) // 2]
      left = [x for x in arr if x < pivot]
      middle = [x for x in arr if x == pivot]
      right = [x for x in arr if x > pivot]
      return quicksort(left) + middle + quicksort(right)
  ```
]

#html.hr()

== 9. 引用块与提示框

需要导入：`#import "@preview/theorion:0.4.1": *`

=== 9.1 引用块

*代码：*
```typst
#quote-box[
  这是一段引用文字。可以包含 *粗体* 和 _斜体_。
]
```

*效果：*
#quote-box[
  这是一段引用文字。可以包含 *粗体* 和 _斜体_。
]

=== 9.2 提示框 (Tip)

*代码：*
```typst
#tip-box[这是一个提示信息。]
```

*效果：*
#tip-box[这是一个提示信息。]

=== 9.3 注意框 (Note)

*代码：*
```typst
#note-box[这是一个注意事项。]
```

*效果：*
#note-box[这是一个注意事项。]

=== 9.4 重要框 (Important)

*代码：*
```typst
#important-box[这是一个重要信息！]
```

*效果：*
#important-box[这是一个重要信息！]

=== 9.5 警告框 (Warning)

*代码：*
```typst
#warning-box[这是一个警告信息！]
```

*效果：*
#warning-box[这是一个警告信息！]

=== 9.6 危险框 (Caution)

*代码：*
```typst
#caution-box[这是一个危险提示！]
```

*效果：*
#caution-box[这是一个危险提示！]

#html.hr()

== 10. 脚注与边栏

=== 10.1 脚注

*代码：*
```typst
这是正文内容。#footnote[这是脚注，会自动显示在边栏中。]
```

*效果：*
这是正文内容。#footnote[这是脚注，会自动显示在边栏中。]

=== 10.2 边栏注释

*代码：*
```typst
#tufted.margin-note[
  这是边栏内容，可以放置任意元素。
]
```

*效果：*（查看右侧边栏）
#tufted.margin-note[
  这是边栏内容，可以放置任意元素。包括公式 $E = m c^2$。
]

这段文字旁边有边栏注释 →

#html.hr()

== 11. 数学公式

=== 11.1 行内公式

*代码：*
```typst
质能方程 $E = m c^2$ 是物理学中最著名的公式之一。
```

*效果：*
质能方程 $E = m c^2$ 是物理学中最著名的公式之一。

=== 11.2 块级公式

*代码：*
```typst
$ f(x) = integral_0^infinity e^(-x^2) d x = sqrt(pi) / 2 $
```

*效果：*
$ f(x) = integral_0^infinity e^(-x^2) d x = sqrt(pi) / 2 $

=== 11.3 分数与根号

*代码：*
```typst
$ frac(a + b, c - d) = sqrt(x^2 + y^2) $
```

*效果：*
$ frac(a + b, c - d) = sqrt(x^2 + y^2) $

=== 11.4 求和与积分

*代码：*
```typst
$ sum_(i=1)^n i = frac(n(n+1), 2) $
$ integral_a^b f(x) d x $
```

*效果：*
$ sum_(i=1)^n i = frac(n(n+1), 2) $
$ integral_a^b f(x) d x $

=== 11.5 矩阵

*代码：*
```typst
$ mat(
  1, 2, 3;
  4, 5, 6;
  7, 8, 9
) $
```

*效果：*
$
  mat(
    1, 2, 3;
    4, 5, 6;
    7, 8, 9
  )
$

=== 11.6 向量

*代码：*
```typst
$ vec(x, y, z) $
```

*效果：*
$ vec(x, y, z) $

=== 11.7 多行对齐公式

*代码：*
```typst
$
  f(x) & = (x + 1)^2 \
       & = x^2 + 2x + 1
$
```

*效果：*
$
  f(x) & = (x + 1)^2 \
       & = x^2 + 2x + 1
$

=== 11.8 希腊字母

*代码：*
```typst
$ alpha, beta, gamma, delta, epsilon, theta, lambda, pi, sigma, omega $
```

*效果：*
$ alpha, beta, gamma, delta, epsilon, theta, lambda, pi, sigma, omega $

#html.hr()

== 12. 参考文献

=== 12.1 创建 .bib 文件

在文章目录下创建 `refs.bib`：

```bib
@book{knuth1984texbook,
  title={The TeXbook},
  author={Knuth, Donald E.},
  year={1984},
  publisher={Addison-Wesley}
}
```

=== 12.2 引用语法

*代码：*
```typst
根据 @knuth1984texbook 的描述...

#bibliography("refs.bib")
```

*说明：* 使用 `@key` 格式引用，在文档末尾用 `#bibliography()` 显示列表。

=== 12.3 样式选项

*代码：*
```typst
// 自定义标题和样式
#bibliography("refs.bib", title: "参考文献", style: "ieee")
```

*支持的样式：*
- `"ieee"` - IEEE 格式
- `"apa"` - APA 格式
- `"chicago-author-date"` - 芝加哥格式
- `"mla"` - MLA 格式

#html.hr()

== 13. 交叉引用与标签 <ch13>

=== 13.1 添加标签

*代码：*
```typst
== 我的章节 <my-section>

#figure(image("photo.webp"), caption: [示例图]) <fig-demo>
```

=== 13.2 引用标签

*代码：*
```typst
如 @my-section 中所述...
参见 @fig-demo...
```

*效果演示：*

#figure(
  table(
    columns: 2,
    [*A*], [*B*],
    [1], [2],
  ),
  caption: [示例表格],
) <tbl-demo>

如 @ch13 所述，我们可以引用章节。也可以引用 @tbl-demo。

#html.hr()

== 14. 分隔线与换行

=== 14.1 分隔线

*代码：*
```typst
#html.hr()
```

*效果：*
#html.hr()

=== 14.2 换行

*代码：*
```typst
第一行文字 \
第二行文字（使用反斜杠换行）
```

*效果：*
第一行文字 \
第二行文字（使用反斜杠换行）

=== 14.3 分段

*代码：*
```typst
第一段落

第二段落（空行分段）
```

*效果：*
第一段落

第二段落（空行分段）

#html.hr()

== 15. 特殊字符转义

*代码：*
```typst
\*  // 显示星号 *
\_  // 显示下划线 _
\#  // 显示井号 #
\$  // 显示美元符号 $
\@  // 显示 @ 符号
```

*效果：*
- 星号：\*
- 下划线：\_
- 井号：\#
- 美元符号：\$
- At 符号：\@

#html.hr()

== 16. 嵌入 Markdown

*代码：*
```typst
#import "@preview/cmarker:0.1.8"
#import "@preview/mitex:0.2.6": *

#let scope = (
  image: (source, alt: none, format: auto) => figure(image(source, alt: alt, format: format))
)
#let md-content = read("article.md")
#cmarker.render(md-content, math: mitex, scope: scope)
```

*说明：* 可以将现有的 Markdown 文件嵌入到 Typst 文档中渲染。

#html.hr()

== 17. 编程特性

=== 17.1 变量定义

*代码：*
```typst
#let name = "Typst"
#let version = 0.12
```

*效果：*
#let name = "Typst"
#let version = 0.12
- 名称：#name
- 版本：#version

=== 17.2 条件判断

*代码：*
```typst
#let is_typst = true
#if is_typst [
  ✅ 这是 Typst！
] else [
  ❌ 这不是 Typst。
]
```

*效果：*
#let is_typst = true
#if is_typst [
  ✅ 这是 Typst！
] else [
  ❌ 这不是 Typst。
]

=== 17.3 循环

*代码：*
```typst
#for i in range(1, 4) [
  第 #i 次循环 \
]
```

*效果：*
#for i in range(1, 4) [
  第 #i 次循环 \
]

=== 17.4 遍历列表

*代码：*
```typst
#for item in ("苹果", "香蕉", "橙子") [
  - #item
]
```

*效果：*
#for item in ("苹果", "香蕉", "橙子") [
  - #item
]

=== 17.5 自定义函数

*代码：*
```typst
#let greet(name) = [👋 Hello, #name!]

#greet("World")
#greet("Typst")
```

*效果：*
#let greet(name) = [👋 Hello, #name!]

#greet("World") \
#greet("Typst")

=== 17.6 文本替换

*代码：*
```typst
#show "旧文本": "新文本"
这里会把所有的旧文本替换为新文本。
```

*效果（本段使用替换规则）：*
#show "Latex": "Typst"
我爱 Latex！（Latex 被替换为 Typst）

#html.hr()

== 常用包导入汇总

```typst
// 引用块与提示框
#import "@preview/theorion:0.4.1": *

// Markdown 风格表格
#import "@preview/tablem:0.3.0": *

// 嵌入 Markdown
#import "@preview/cmarker:0.1.8"

// LaTeX 公式兼容
#import "@preview/mitex:0.2.6": *

// 文献解析
#import "@preview/citegeist:0.2.0": load-bibliography

// 图表绑定
#import "@preview/lilaq:0.5.0" as lq
```

#html.hr()

== 完整文章示例

以下是一篇完整文章的模板代码：

```typst
#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(lang: "zh")

= 我的技术博客文章

== 引言

这是一篇关于 *Typst* 排版系统的介绍文章。#footnote[Typst 是新一代排版系统。]

#tufted.margin-note[
  #image("imgs/logo.webp")
]

== 主要特性

Typst 具有以下优点：

+ 语法简洁
+ 编译速度快
+ 支持现代化布局

#tip-box[
  推荐使用 VS Code 配合 Typst 插件进行写作。
]

=== 代码示例

```python
print("Hello, Typst!")
```

=== 数学公式

著名的欧拉公式：

$ e^(i pi) + 1 = 0 $

== 总结

Typst 是一个优秀的排版工具。

#bibliography("refs.bib")
```

#html.hr()

_本模板最后更新：2026-01-18_

