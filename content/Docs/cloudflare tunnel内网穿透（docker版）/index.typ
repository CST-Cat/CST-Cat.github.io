#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(
  title: "Cloudflare Tunnel 内网穿透（Docker版）",
  description: "介绍如何使用 Cloudflare Tunnel 在 Docker 环境中实现内网穿透。",
  date: datetime(year: 2025, month: 12, day: 23),
  lang: "zh",
)

= 前言

Cloudflare Tunnel 是 Cloudflare 提供的一种内网穿透解决方案，可以将本地服务安全地暴露到互联网。本文介绍如何在 Docker 环境中使用 Cloudflare Tunnel 实现内网穿透，适用于需要将本地服务公开访问的场景。