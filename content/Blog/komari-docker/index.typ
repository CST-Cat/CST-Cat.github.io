#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(
  title: "komari-docker",
  description: "介绍用docker部署komari",
  date: datetime(year: 2026, month: 3, day: 23),
  lang: "zh",
)

= komari-docker

== 前言

#tufted.margin-note[komari是一个开源的服务器监控面板，支持多服务器监控，部署简单，界面简洁，功能实用，非常适合个人使用。]

不少人在刚接触vps的时候，很容易不小心买了很多台vps，从而需要一个监控面板来同时查看多台vps的运行状态，本文介绍一下如何使用Docker来部署komari。

#tip-box("注意，安装分为主控端安装（推荐使用docker）和被控端安装（直接裸机安装就行了）")

#html.hr()

== 主控端 部署

主控端用于接受被控端传来的数据，并将其展示在面板上，推荐使用docker部署，方便快捷。

创建komari的数据目录并进入

```
mkdir -p ./komari/data && cd ./komari
```

运行 Docker 容器

```
docker run -d \
-p 25774:25774 \
-v ./data:/app/data \
--name komari \
ghcr.io/komari-monitor/komari:latest
```

查看默认账号和密码
```
docker logs komari
```

#tufted.margin-note[如果你访问不了，可能是防火墙没开25774端口，运行`sudo ufw allow 25774`，或者云服务商的安全组没放行25774端口，，得去服务提供商的网页配置。]

访问 `http://<your_server_ip>:25774`，即可访问探针面板。

=== 升级

拉取最新镜像

```
docker pull ghcr.io/komari-monitor/komari:latest
```

再次创建容器

```
docker run -d \
-p 25774:25774 \
-v ./data:/app/data \
--name komari \
ghcr.io/komari-monitor/komari:latest
```

=== 卸载

停止容器

```
docker stop komari
```

删除容器

```
docker rm komari
```

推荐使用cloudflare tunnel将komari面板暴露到公网，省去配置 Nginx 和 SSL 证书的步骤，详情可参考#link("cloudflare-tunnel-docker/")[Cloudflare Tunnel 内网穿透（Docker版）]

#html.hr()

== 被控端 安装

访问`http://<your_server_ip>:25774`，进入面板，点击右上角齿轮进入设置


#image("/assets/image-49.png")

点击右上角的添加节点

#image("/assets/image-50.png")

输入名称，然后点击添加节点

#image("/assets/image-51.png")

找到刚才创建的节点名称，右边的功能，分别是，一键部署、终端、编辑、账单(续费价格+到期时间)、删除

#image("/assets/image-52.png")

点击一键部署，选择系统，安装选项（大部分时候默认不勾选就行），然后点击复制下面的复制

#image("/assets/image-53.png")

在被控端服务器上粘贴并运行复制的命令，等待安装完成

#image("/assets/image-54.png")

安装完成后，刷新网页，就可以看到被控端的状态了

#image("/assets/image-55.png")

点击左上角的“komari”，返回到首页，就可以看到所有被控端的状态了

#image("/assets/image-56.png")

设置账单信息也很实用，续费价格+到期时间

#image("/assets/image-58.png")

#image("/assets/image-57.png")

#html.hr()

== 页面美化

更详细的美化，可参考#link("https://idcflare.com/t/topic/18769")[【保姆级教程】
Komari探针从部署到美化]

可在此处选择自己喜欢的主题#link("https://komari-document.pages.dev/community/theme")[komari社区维护的主题]

点击项目地址

#image("/assets/image-59.png")

进入release页面

#image("/assets/image-60.png")

下载压缩包，在首页点击后台设置，选择主题管理，上传压缩包

#image("/assets/image-61.png")

点击右下角的齿轮，即为选择使用

#image("/assets/image-62.png")

回到首页，查看效果

此时单击右上角，可对主题进行更细致的微调

#image("/assets/image-63.png")

#image("/assets/image-64.png")





