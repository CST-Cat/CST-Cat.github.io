#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(
  title: "Linux 服务器常用加固操作",
  description: "一份自用的 Linux 服务器初始化加固操作。",
  date: datetime(year: 2025, month: 10, day: 1),
  lang: "zh",
)

= Linux 服务器常用加固操作

#outline()

如果嫌麻烦的话，可以不重装系统，只看 SSH 加固、防火墙、ZRAM/Swap、Fail2ban 和时区设置这五项。


=== 重装系统

如果服务商支持自定义 ISO，优先用官方方式。不支持的话，可以用一键 DD 脚本。

#warning-box[**注意**：DD 操作可能违反部分服务商的使用条款。]

常用脚本：

- #link("https://github.com/bin456789/reinstall")[bin456789/reinstall]：支持的系统类型更丰富
- #link("https://github.com/bohanwood/debi")[bohanwood/debi]：专注纯净精简的 Debian 环境

以 Oracle ARM 机器安装 Debian 13 为例：

```typst
# 下载脚本
curl -fLO https://raw.githubusercontent.com/bohanyang/debi/master/debi.sh && chmod +x debi.sh

# 配置参数
sudo ./debi.sh \
  --version 13 \
  --architecture arm64 \
  --cloudflare \
  --user youruser \
  --authorized-keys-url https://github.com/yourusername.keys \
  --ssh-port 22122

# 重启开始安装
sudo reboot
```

关键参数说明：

| 参数 | 说明 |
|---|---|
| `--version 13` | Debian 13（Trixie） |
| `--architecture arm64` | ARM 架构 |
| `--cloudflare` | 预设 Cloudflare DNS |
| `--user` | 创建 sudo 普通用户 |
| `--authorized-keys-url` | 导入 GitHub SSH 公钥 |
| `--ssh-port` | 自定义 SSH 端口，防暴力扫描 |

重启后通过 VNC 观察进度，数分钟后即可完成。


=== 用户与 sudo 配置

重装完成后，先给普通用户配置 sudo 权限，避免后续频繁切换 root：

```typst
# 切换 root
su

# 配置 sudo 免密（替换 youruser 为实际用户名）
echo "youruser ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/youruser
chmod 440 /etc/sudoers.d/youruser

# 退出 root
exit
```

=== 安装基础软件包

```typst
sudo apt update && sudo apt upgrade
sudo apt install \
    apt-transport-https \
    build-essential \
    git \
    curl \
    wget \
    unzip \
    tmux \
    btop \
    bind9-dnsutils \
    tree \
    vim
```

#tip-box[不习惯vim的话，可以换成 micro、nano 等编辑器：]

=== SSH 安全加固

SSH 是服务器的"大门"，加固它是初始化最重要的一步。

**公钥登录**

```typst
mkdir -p ~/.ssh
vim ~/.ssh/authorized_keys  # 粘贴你的公钥
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**修改 sshd 配置**

#warning-box[**重要**：保持当前终端不断开，新开一个终端确认能正常连接后再关闭旧终端。万一配错了还能回退。]

```typst
sudo vim /etc/ssh/sshd_config
```

核心配置项：

```typst
Port 22122                    # 修改默认端口
LoginGraceTime 1m             # 登录宽限 1 分钟
PermitRootLogin no            # 禁止 root 登录
PubkeyAuthentication yes      # 启用公钥认证
PasswordAuthentication no     # 禁用密码登录
PermitEmptyPasswords no       # 禁止空密码
UsePAM yes                    # Debian 默认需要
ClientAliveInterval 60        # 心跳间隔 60 秒
ClientAliveCountMax 5         # 5 次无响应断开
```

修改后先验证再重载：

```typst
sudo sshd -t                    # 检查配置
sudo systemctl restart sshd     # 重载生效
```


=== 防火墙：UFW 快速上手

对于新手来说，UFW 是最容易上手的防火墙工具。虽然 Debian 13 推荐使用 nftables，但 UFW 的底层已经切换到 nftables 后端，对新手足够友好。

#warning-box[**注意**：启用防火墙前一定要先放行 SSH 端口，否则会把自己锁在外面。]

```typst
sudo apt install ufw -y
```

基本用法：

```typst
# 先放行 SSH 端口（务必先做这一步！），和上一个步骤修改的ssh端口一致
sudo ufw allow 22122/tcp

# 放行 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```


=== ZRAM 与 Swap 配置

小内存服务器（1~4GB）强烈建议配置，能明显改善性能。

**ZRAM**

ZRAM 在内存中创建压缩区域，速度远超磁盘 Swap：

```typst
sudo apt install -y zram-tools
sudo vim /etc/default/zramswap
```

推荐参数：

```typst
ALGO=zstd       # 压缩比与速度的最佳平衡
PERCENT=70      # 2~4GB RAM 建议 60%，8GB+ 建议 25%
PRIORITY=100    # 确保优先使用 ZRAM
```

**Swapfile**

```typst
# 创建 2GB Swapfile
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon --priority -2 /swapfile

# 持久化
echo '/swapfile none swap sw,pri=-2 0 0' | sudo tee -a /etc/fstab
sudo mount -a
```

**内核参数调优**

根据物理内存调整 swappiness：

| 内存大小 | vm.swappiness | 策略 |
|---|---|---|
| 1GB | 100 | 激进 |
| 2~4GB | 60 | 积极 |
| 8GB+ | 10 | 保守 |

```typst
echo "vm.swappiness=60" | sudo tee -a /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

验证：

```typst
sudo swapon --show
sudo zramctl
```

=== Fail2ban 防护

Fail2ban 可以自动封禁多次登录失败的 IP，防止暴力破解。

```typst
sudo apt install fail2ban
sudo vim /etc/fail2ban/jail.local
```

最小 SSH 保护配置：

```toml
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1
bantime  = 1d
findtime = 10m
maxretry = 3
banaction = nftables-multiport

[sshd]
enabled = true
port    = 22122
backend = systemd
mode    = aggressive
```

```typst
sudo systemctl enable --now fail2ban
```

检查状态：

```typst
sudo fail2ban-client status         # 总览
sudo fail2ban-client status sshd    # SSH 封禁详情
```

=== 设置时区

统一使用 UTC 时区，避免跨时区运维时的日志混乱：

```typst
sudo timedatectl set-timezone UTC
```

=== 更换 Cloud 内核

Cloud 内核针对虚拟化环境优化，更轻量高效：

```typst
sudo apt install -y linux-image-cloud-amd64
sudo reboot
uname -r  # 确认新内核版本
```

清理旧内核释放空间：

```typst
# 查看已安装内核
sudo dpkg --list | grep linux-image

# 移除旧内核（按实际版本号替换）
sudo apt purge -y linux-image-amd64 linux-image-6.12.63+deb13-amd64
sudo update-grub
sudo apt autoremove --purge -y
```


=== 启用 SSD Trim

如果你的服务器使用 NVMe SSD，启用 Trim 可以延长硬盘寿命：

```typst
sudo systemctl enable --now fstrim.timer
```

验证支持情况：

```typst
lsblk -D   # DISC-MAX 不为 0 即支持
sudo fstrim -v /
```

=== Chrony 时间同步

Chrony 比系统默认的 systemd-timesyncd 精度和性能更好：

```typst
sudo apt install chrony
sudo vim /etc/chrony/chrony.conf
```

注释默认 pool/server，添加 Cloudflare NTP：

```typst
server time.cloudflare.com iburst
server time.cloudflare.com iburst
server time.cloudflare.com iburst
server time.cloudflare.com iburst
server time.cloudflare.com iburst
```

```typst
sudo systemctl mask systemd-timesyncd.service
sudo systemctl enable --now chrony
chronyc sources -v
```

== 延伸阅读

- #link("https://blog.dejavu.moe/posts/cloudflare-waf-set-up-guide/")[Cloudflare WAF 防护策略指南]
- #link("https://blog.dejavu.moe/posts/best-server-security-practices-with-cloudflare/")[服务器使用 Cloudflare CDN 最佳实践]
