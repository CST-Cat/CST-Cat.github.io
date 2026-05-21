#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(
  title: "托管域名到 Cloudflare",
  description: "本文将介绍如何将域名托管到 Cloudflare，包括设置 DNS 和启用 CDN 的详细步骤。",
  date: datetime(year: 2025, month: 11, day: 8),
  lang: "zh",
)

= 托管域名到 Cloudflare

== 前言

将域名托管到 Cloudflare 有以下几个显著的好处：

- *免费 CDN 加速*：Cloudflare 提供全球分布的内容分发网络（CDN），可以显著提升网站的访问速度。
- *DNS 管理便捷*：Cloudflare 的 DNS 服务响应速度快，且支持一键管理所有记录。
- *安全防护*：内置 DDoS 防护、SSL/TLS 加密和防火墙规则，提升网站安全性。
- *分析工具*：提供详细的流量分析报告，帮助你了解访问者的行为。
- *灵活的规则配置*：支持页面规则和负载均衡，适合不同规模的网站需求。

本文将以 spaceship 平台为例，简要介绍如何将域名托管到 Cloudflare。

进入cloudflare首页，右上角，链接→添加域

#image("/assets/image-34.png")

输入你要托管的域名，然后点击继续

#image("/assets/image-35.png")

选择free即可

#image("/assets/image-36.png")

Cloudflare会自动扫描你的DNS记录，点击继续前往激活

#image("/assets/image-38.png")

记下这两个名称服务器

#image("/assets/image-39.png")

我们返回购买域名的平台，进入dns设置，修改名称服务器为cloudflare提供的两个名称服务器

#image("/assets/image-40.png")

点击要托管的域名

#image("/assets/image-41.png")

点击更改

#image("/assets/image-42.png")

添加之前记下的cloudflare提供的两个名称服务器，保存

#image("/assets/image-43.png")

返回cloudflare，点击我已更改

#image("/assets/image-44.png")

等待更新，成功后会发邮件的

#image("/assets/image-45.png")

更新完成，就可以在cloudflare上管理你的域名了

#image("/assets/image-46.png")





