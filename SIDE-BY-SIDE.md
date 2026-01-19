# 图文并排布局 (Side-by-Side Layout)

这个模板支持图文并排布局，可以将图片和文字并排显示，支持图片在左或在右。

## 基本用法

首先在 `.typ` 文件中导入组件：

```typst
#import "../tufted-lib/layout.typ": side-by-side
```

### 图片在左，文字在右（默认）

```typst
#side-by-side(
  image("your-image.png"),
  [这里是文字内容。可以写多段文字，支持所有 Typst 格式。
  
  - 支持列表
  - 支持 *强调* 和 **加粗**
  - 支持链接等]
)
```

### 图片在右，文字在左

```typst
#side-by-side(
  image("your-image.png"),
  [这里是文字内容。],
  position: "right"
)
```

### 调整图片占比

通过 `ratio` 参数调整图片宽度占比：

```typst
#side-by-side(
  image("your-image.png"),
  [这里是文字内容。],
  ratio: "large"  // 图片占 50%
)
```

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `image-content` | content | 必填 | 图片内容，通常是 `image()` 函数 |
| `text-content` | content | 必填 | 文字内容 |
| `position` | string | `"left"` | 图片位置：`"left"` 图片在左，`"right"` 图片在右 |
| `ratio` | string | `"medium"` | 图片宽度占比（见下表） |

### ratio 可选值

| 值 | 图片宽度 |
|------|------|
| `"small"` | 30% |
| `"medium"` | 40%（默认） |
| `"large"` | 50% |
| `"half"` | 50% |

## 完整示例

```typst
#import "../config.typ": template, tufted
#import "../tufted-lib/layout.typ": side-by-side

#show: template

= 示例页面

== 图片在左

#side-by-side(
  image("imgs/example.png"),
  [
    === 这是标题
    
    这里是描述文字。图片在左侧显示，文字在右侧。
    
    - 支持列表项
    - 支持各种格式
  ]
)

== 图片在右

#side-by-side(
  image("imgs/example.png"),
  [
    这次图片在右边显示，文字在左边。
    
    适合需要变换布局节奏的场景。
  ],
  position: "right"
)

== 大图占比

#side-by-side(
  image("imgs/example.png"),
  [文字区域较小，适合展示大图配简短说明。],
  ratio: "large"
)

== 小图占比

#side-by-side(
  image("imgs/example.png"),
  [图片较小，文字区域更大，适合长文本配小图。],
  ratio: "small"
)
```

## 响应式设计

- ✅ 在宽屏（>760px）时并排显示
- ✅ 在窄屏（≤760px）时自动垂直堆叠，图片在上
- ✅ 支持深色/浅色主题
- ✅ 图片自动添加圆角效果

## 注意事项

1. 图片路径使用相对路径（相对于当前 `.typ` 文件）
2. `ratio` 参数只能使用预设值：`"small"`, `"medium"`, `"large"`, `"half"`
3. 文字内容建议用 `[]` 包裹，支持完整的 Typst 语法
