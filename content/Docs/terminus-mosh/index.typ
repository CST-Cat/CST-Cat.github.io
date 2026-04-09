#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(
  title: "termius+mosh配置教程",
  description: "mosh 是一个远程终端工具，支持断线重连和多路径连接，非常适合在不稳定网络环境下使用。本文介绍如何在 Linux 服务器上安装 mosh，并在 Termius 中配置使用。",
  date: datetime(year: 2026, month: 3, day: 12),
  lang: "zh",
)

= Termius + mosh 配置教程

#outline()

== 前言

很多时候，我们ssh连接国外服务器时会遇到网络不稳定导致连接中断、敲命令不跟手的问题。mosh（mobile shell）是一个远程终端工具，支持断线重连和多路径连接，非常适合在不稳定网络环境下使用，有本地回显功能。本文介绍如何在 Linux 服务器上安装 mosh，并在 Termius 中配置使用。

== 服务端（Linux）— 安装与防火墙

安装 mosh：

```
# Ubuntu / Debian
sudo apt update && sudo apt install -y mosh

# CentOS / RHEL / Fedora
sudo dnf install -y mosh   # 或 sudo yum install -y mosh
```

确保 SSH 服务可用（mosh 使用 SSH 做认证）：

```
sudo systemctl enable --now ssh   # Debian/Ubuntu
# 或
sudo systemctl enable --now sshd  # RHEL/CentOS
```

放行 UDP 端口范围（默认 mosh 会使用随机 UDP 端口，常用 60000–61000）：

```
# ufw
sudo ufw allow 22/tcp
sudo ufw allow 60000:61000/udp
sudo ufw reload

# firewalld
sudo firewall-cmd --permanent --add-port=60000-61000/udp
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

提示：若受限网络或想固定端口，可在服务器防火墙/安全组只放行指定 UDP 端口，并在客户端使用 `--port` 指定该端口。

== Termius 客户端配置

下滑，mosh选择enabled。下面一行填写下面的命令

```
mosh-server new -s -l LANG=en_US.UTF-8
```

#image("/assets/image-47.png")

连接的时候选择mosh→continue

#image("/assets/image-48.png")


== 注意事项

与语法高亮冲突，写命令还是卡顿，建议关闭语法高亮


