#import "../index.typ": template, tufted
#show: template.with(
  title: "自建 Tailscale DERP",
  description: "介绍如何用 Docker 搭建支持 --verify-clients 的 Tailscale DERP 服务，并通过补丁实现免域名接入。",
  date: datetime(year: 2026, month: 7, day: 2),
  lang: "zh",
)

= 自建 Tailscale DERP

Tailscale DERP 是 Tailscale 网络中的流量中继组件，主要用于复杂网络环境下、P2P 直连打洞失败时的流量转发。

但在国内网络环境中，官方提供的 DERP 节点往往存在延迟高、速度慢，甚至几乎不可用的情况。因此，自建私有 DERP 服务器就很有必要了。它可以在 P2P 无法成功直连时，为 Tailscale 提供低延迟、高可用的中继能力，显著改善实际使用体验。

本文介绍如何使用 Docker 搭建一个支持 `--verify-clients` 的 Tailscale DERP 服务器，并通过补丁实现免域名接入，适合国内环境直接落地。

== 环境准备

开始之前，请先确认以下条件：

- 操作系统：推荐使用 Linux，如 Ubuntu、Debian 等。Docker 在 Linux 上的兼容性和性能更好。
- Docker 环境：确保已安装 Docker，可通过 `docker --version` 检查。
- Tailscale 客户端：宿主机需安装并启动 Tailscale，以便 DERP 服务器与 tailnet 通信。
- 网络配置：确保服务器能正常访问公网，且所需端口未被防火墙拦截。

== 实现思路

本文使用的镜像为 #link("https://hub.docker.com/r/deepfal/tailscale-derp")[`deepfal/tailscale-derp`]，它基于上游 DERPer 源码构建，并移除了域名强校验限制，适合通过 `IP + 端口 + --verify-clients` 的方式部署和接入。

=== 镜像说明

- GitHub 仓库：#link("https://github.com/DeepFal/tailscale-derp")[DeepFal/tailscale-derp]
- GitHub Actions：#link("https://github.com/DeepFal/tailscale-derp/actions/workflows/build-and-push.yml")[build-and-push.yml]
- Docker Hub：#link("https://hub.docker.com/r/deepfal/tailscale-derp")[deepfal/tailscale-derp]

这是一个去除了域名校验限制的 DERP 补丁镜像，可直接用于免域名部署场景。

== 补丁目的

- 支持部署 `IP + 端口 + --verify-clients` 的自建 DERP。
- 移除 `cert mismatch with hostname` 这一步域名强校验，便于在 Tailscale Admin 中以 `IP:端口` 的形式接入。
- 安全性仍由 `--verify-clients` 保证，仅允许当前 tailnet 的客户端使用。
- 更适合国内环境，不依赖公网域名和备案流程即可部署。

== 实现原理

- 在 `cmd/derper/cert.go` 中移除 `getCertificate` 的 hostname 强校验逻辑，也就是 `cert mismatch with hostname` 这一步。
- 其余行为保持与上游一致，仍基于官方 DERPer 源码构建，并以 `CGO_ENABLED=0` 静态编译输出二进制文件。

提示：该补丁放宽了 TLS 握手阶段的 SNI 严格匹配。建议始终开启 `--verify-clients`，并在可信网络环境和正确证书配置下使用。

== 镜像标签

- `deepfal/tailscale-derp:latest`
- `deepfal/tailscale-derp:v1.94.1`（对应 Tailscale 发布版本）

== 自动同步状态

- 最新同步版本：`v1.98.8`
- 上次更新时间（UTC）：`2026-06-30 19:59 UTC`
- 上次检查时间（UTC）：`2026-07-02 02:58 UTC`

== 搭建步骤

=== 1. 安装并启动 Tailscale 客户端

先在宿主机上安装并启动 Tailscale。不同操作系统的安装方式略有差异，可参考 #link("https://tailscale.com/kb/1118/custom-derp-servers")[Tailscale 官方文档]。

启动后，Tailscale 会在 `/var/run/tailscale` 目录下创建 `tailscaled.sock` 套接字文件，供 DERP 容器调用。

=== 2. 拉取 Docker 镜像

执行以下命令拉取镜像：

```bash
docker pull deepfal/tailscale-derp:latest
```

=== 3. 启动 DERP 容器

```bash
docker run -d \
    --name tailscale-derp \
    --restart unless-stopped \
    -p 0.0.0.0:59443:36666 \
    -p 0.0.0.0:3478:3478/udp \
    -v /run/tailscale:/var/run/tailscale:ro \
    deepfal/tailscale-derp:latest \
    ./derper \
    -hostname derp.deepfal.cn \
    -a :36666 \
    -certmode manual \
    -certdir /ssl \
    --verify-clients
```

=== 参数说明

- `-d`：后台运行容器。
- `--name tailscale-derp`：指定容器名称为 `tailscale-derp`。
- `--restart unless-stopped`：容器异常退出后自动重启。
- `-p 0.0.0.0:59443:36666`：将容器内 `36666` 端口映射到宿主机 `59443` 端口，用于 DERP 服务访问。
- `-p 0.0.0.0:3478:3478/udp`：映射 `3478/udp`，用于 STUN/UDP 通信。
- `-v /run/tailscale:/var/run/tailscale:ro`：将宿主机 Tailscale 运行目录挂载到容器中，供 DERP 访问 `tailscaled.sock`。这里挂载整个目录而不是单独挂载 socket 文件，是为了避免客户端重启后 socket 失效导致 DERP 异常，挂目录更稳妥。
- `deepfal/tailscale-derp:latest`：使用的镜像名称。
- `./derper`：容器启动后执行的 DERP 主程序。
- `-hostname derp.deepfal.cn`：设置 DERP 主机名。
- `-a :36666`：指定 DERP 监听端口。
- `-certmode manual`：启用手动证书模式。
- `-certdir /ssl`：指定证书目录。
- `--verify-clients`：启用客户端验证，仅允许当前 tailnet 的客户端接入。

=== 4. 验证 DERP 服务状态

容器启动后，可以通过以下命令查看运行日志：

```bash
docker logs tailscale-derp
```

如果日志中出现类似 `DERP server started` 的信息，说明服务已正常启动。

=== 5. 在 Tailscale 后台添加自建 DERP 节点

在 Tailscale 后台的 DERP 配置中加入你的自建节点信息，如下所示：

```json
{
  "derpMap": {
    "OmitDefaultRegions": false,
    "Regions": {
      "910": {
        "RegionID": 910,
        "RegionCode": "自建节点(名称)",
        "Nodes": [
          {
            "Name": "910",
            "RegionID": 910,
            "HostName": "宿主机IP",
            "InsecureForTests": true,
            "DERPPort": 59443
          }
        ],
        "RegionName": "自建节点(名称)"
      }
    }
  }
}
```

#image("./imgs/PixPin_2026-07-02_11-21-26.webp")

将其中的 `宿主机IP` 替换为你服务器的实际公网 IP。

添加完成后，可以立即使用 `tailscale netcheck` 检查该 DERP 节点是否在线。

== 注意事项

- 请确保宿主机的 `59443/tcp` 和 `3478/udp` 端口未被其他服务占用。
- 防火墙和云服务安全组需放行上述端口。
- 虽然本文方案支持免域名接入，但仍建议配合 `--verify-clients` 使用，以降低被滥用的风险。
- 如果你需要更高的兼容性和更标准的 TLS 行为，仍建议使用域名加正常证书的方式部署。

== 参考资料

- #link("https://tailscale.com/kb/1118/custom-derp-servers")[Tailscale Custom DERP 文档]
- #link("https://github.com/DeepFal/tailscale-derp")[DeepFal/tailscale-derp 仓库]
- #link("https://hub.docker.com/r/deepfal/tailscale-derp")[deepfal/tailscale-derp Docker Hub]
