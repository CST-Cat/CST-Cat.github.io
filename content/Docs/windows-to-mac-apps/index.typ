#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *

#show: template.with(
  title: "Windows 用户购入 MacBook 后推荐安装的软件",
  description: "一份面向 Windows 转 Mac 用户的软件清单：Finder 替代、窗口分屏、Dock 预览、鼠标优化、图片与 PDF 查看、文本编辑、剪贴板和截图工具。",
  date: datetime(year: 2026, month: 7, day: 22),
  lang: "zh",
)

= Windows 用户购入 MacBook 后推荐安装的软件

== 必装系列

=== QSpace Pro

#tufted.html-img("imgs/qspace-pro.png", alt: "QSpace Pro Logo", style: "width: 128px; height: 128px; object-fit: contain;")

*可以称之为必装中的必装* 

Finder 不能直接复制地址，右键不能快速新建文件、也没有在 xxx 终端打开此路径，所以 Finder 给我的感觉就像是一个半成品，UI/UX 设计很差，各种操作反人类，功能缺失也很严重，而 QSpace Pro 总体完成度很高，多窗格、标签页、地址栏、右键菜单、快捷键和远程连接功能都很方便，比 Finder 顺手太多。

安装后，最优先的配置，

- 开启顶部地址栏。路径一眼可见，也能直接复制，给终端、脚本或别人发文件位置都方便很多。
- 在右键菜单中加入“新建文件”，并按自己的习惯配置常用后缀，例如 `.txt`、`.md`、`.py`、`.js`、`.json` 和 `.typ`。
- 配置远程连接。用 SFTP 管理 VPS，用 FTP、WebDAV 等方式访问 NAS 文件，省去在终端和多个客户端之间来回切换。

还有很多功能，不一一展开。

=== Loop

#tufted.html-img("imgs/loop.png", alt: "Loop Logo", style: "width: 128px; height: 128px; object-fit: contain;")

Loop 补足从 Windows 带来的快速分屏肌肉记忆。不仅复刻 `Win + 方向键`：既能给左右半屏、四分之一屏、居中、三等分等布局绑定快捷键，也能通过环形菜单快速选择窗口位置。

建议把最常用的左半屏、右半屏、最大化先绑定到熟悉的组合键，其他布局用环形菜单调用。这样上手成本很低，但可玩性和自定义能力比 Windows 自带分屏更强。

- *开源*：是，GPL-3.0 许可证。
- *官网与下载*：#link("https://github.com/MrKai77/Loop")[访问 Loop 项目主页]
- *GitHub*：#link("https://github.com/MrKai77/Loop")[点击跳转到GitHub 仓库]

=== DockDoor

#tufted.html-img("imgs/dockdoor.png", alt: "DockDoor Logo", style: "width: 128px; height: 128px; object-fit: contain;")

DockDoor 补上 macOS Dock 缺少窗口缩略图预览的遗憾。把鼠标移到 Dock 的应用图标上，就能查看该应用已经打开的窗口，并直接切换、关闭或管理窗口，还提供带实时预览的 `Option + Tab` 窗口切换。

- *开源*：DockDoor Free 是开源软件，采用 GPL-3.0-or-later 许可证。
- *官网*：#link("https://dockdoor.net/")[访问 DockDoor 官网]
- *GitHub*：#link("https://github.com/ejbills/DockDoor")[点击跳转到GitHub 仓库]

=== Mos

#tufted.html-img("imgs/mos.png", alt: "Mos Logo", style: "width: 128px; height: 128px; object-fit: contain;")

如果你使用鼠标，必装。

- *源码状态*：源码公开，但当前仓库采用 CC BY-NC 4.0 非商业许可证，带有非商业使用限制，因此这里不把它简单写成标准开源许可证软件。
- *官网*：#link("https://mos.caldis.me/")[访问 Mos 官网]
- *GitHub*：#link("https://github.com/Caldis/Mos")[点击跳转到GitHub 仓库]

== 选装系列

=== Picview

#tufted.html-img("imgs/picview.png", alt: "Picview Logo", style: "width: 128px; height: 128px; object-fit: contain;")

操作手感很像 Windows 自带的照片。

=== BuhoLaunchpad

#tufted.html-img("imgs/buholaunchpad.png", alt: "BuhoLaunchpad Logo", style: "width: 128px; height: 128px; object-fit: contain;")

补足 macOS 26 没有启动台的遗憾，我个人不是很喜欢聚焦搜索。

=== CotEditor

#tufted.html-img("imgs/coteditor.png", alt: "CotEditor Logo", style: "width: 128px; height: 128px; object-fit: contain;")

CotEditor 的手感很像 Windows 上的 Notepad3：启动快、界面干净、专注纯文本，同时又保留了编码选择、换行符、语法高亮、正则查找替换等实用功能。

- *开源*：是，源代码采用 Apache-2.0 许可证。
- *官网*：#link("https://coteditor.com/")[访问 CotEditor 官网]
- *GitHub*：#link("https://github.com/coteditor/CotEditor")[点击跳转到GitHub 仓库]

=== Skim

#tufted.html-img("imgs/skim.png", alt: "Skim Logo", style: "width: 128px; height: 128px; object-fit: contain;")

Skim 的定位是轻量 PDF 阅读器与批注工具，手感很像 Windows 上的 SumatraPDF：启动快、界面克制，也提供目录、搜索、书签、阅读条、批注和 LaTeX/SyncTeX 配合等功能。系统自带 Preview 也就个 Preview 罢了，连标签页都没有，很难日用。

- *开源*：是，BSD 许可证；官方主仓库托管在 SourceForge。
- *官网*：#link("https://skim-app.sourceforge.io/")[访问 Skim 官网]
- *GitHub*：#link("https://github.com/scris/skim-pdf")[点击跳转到GitHub 仓库]（第三方 GitHub 镜像，更新与提交仍以 SourceForge 官方仓库为准）

=== Syntax Highlight

#tufted.html-img("imgs/syntax-highlight.png", alt: "Syntax Highlight Logo", style: "width: 128px; height: 128px; object-fit: contain;")

补足*Quick Look*没有高亮的遗憾。

- *开源*：是，GPL-3.0 许可证。
- *项目主页*：#link("https://github.com/sbarex/SourceCodeSyntaxHighlight")[查看安装说明]
- *GitHub*：#link("https://github.com/sbarex/SourceCodeSyntaxHighlight")[点击跳转到GitHub 仓库]

=== Maccy

#tufted.html-img("imgs/maccy.png", alt: "Maccy Logo", style: "width: 128px; height: 128px; object-fit: contain;")

Maccy 是一个轻量、简洁、克制、以键盘操作为主的剪贴板历史工具，呼出后直接输入关键词搜索，选中记录就能再次粘贴，几乎没有学习成本，建议再开启自动粘贴的功能。

我更喜欢它而不是 CleanClip：界面简单、响应快、功能边界清楚，而且剪贴板内容保存在本机。对需要反复复制命令、链接、代码片段和常用文本的人来说，它是体积很小但使用频率很高的工具。

- *开源*：是，MIT 许可证。
- *官网*：#link("https://maccy.app/")[访问 Maccy 官网]
- *GitHub*：#link("https://github.com/p0deje/Maccy")[点击跳转到GitHub 仓库]

=== PixPin

#tufted.html-img("imgs/pixpin.png", alt: "PixPin Logo", style: "width: 128px; height: 128px; object-fit: contain;")

PixPin ，功能齐全，支持截图、贴图、长截图、OCR 和屏幕录制，没有 CleanShot X 那么美观，但更直观。

