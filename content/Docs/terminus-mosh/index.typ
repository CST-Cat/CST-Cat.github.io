#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(
  title: "termius+mosh配置教程",
  description: "mosh 是一个远程终端工具，支持断线重连和多路径连接，非常适合在不稳定网络环境下使用。本文介绍如何在 Linux 服务器上安装 mosh，并在 Termius 中配置使用。",
  date: datetime(year: 2026, month: 3, day: 12),
  lang: "zh",
)

#outline()

= 前言
很多时候，我们ssh连接国外服务器时会遇到网络不稳定导致连接中断的问题。mosh（mobile shell）是一个远程终端工具，支持断线重连和多路径连接，非常适合在不稳定网络环境下使用。本文介绍如何在 Linux 服务器上安装 mosh，并在 Termius 中配置使用。