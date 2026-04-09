#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(
  title: "Cloudflare Tunnel 内网穿透（Docker版）",
  description: "介绍如何使用 Cloudflare Tunnel 在 Docker 环境中实现内网穿透。",
  date: datetime(year: 2025, month: 12, day: 23),
  lang: "zh",
)

= Cloudflare Tunnel 内网穿透（Docker版）

#outline()

== 前言

很多时候我们需要把本地服务器、云服务器的docker应用安全地暴露到公网，不想暴露整台机器，又想要方便地访问，这时候cloudflare tunnel就派上用场了。有全球cdn，自动部署证书，既方便又安全。

使用cloudflare tunnel最好有一个自己的域名，方便记忆，可以给不同的docker，分配一个专属的子域名，最好将域名托管到cloudflare，不用每个子域名都添加CNAME解析，cloudflare会自动解析。

本文只介绍，有自己域名的情况下，如何使用cloudflare tunnel在docker环境中实现内网穿透的步骤。

== 安装 Cloudflare Tunnel

首先注册cloudflare的账户，然后找到cloudflare网页左侧的tunnel的进入路径，进入后，点击右上角的“创建隧道”

#image("/assets/image-1.png")

取个隧道名

#image("/assets/image.png")

选择“docker”

#image("/assets/image-2.png")

#tufted.margin-note[
如果你还没安装docker\
`curl -fsSL https://get.docker.com -o get-docker.sh`\
`sudo sh get-docker.sh`\
检查是否安装成功：`docker --version`\
如果需要免sudo配置docker：`sudo usermod -aG docker $USER`\
注销并重新登录，方可生效
]

点击右边的按键，复制一键安装cloudflared的命令，粘贴到终端，在docker run后面加入-d，后台运行

#image("/assets/image-3.png")

```
docker run -d cloudflare/cloudflared:latest tunnel --no-autoupdate run --token eyJhIjoiOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXyJ9
```

#image("/assets/image-4.png")

安装完成后，查看下面的连接状态

#image("/assets/image-5.png")

点击继续，即可创建成功，然后会返回到tunnel的页面，点击刚才创建的隧道

#image("/assets/image-6.png")

进入到隧道页面，点击创建路由

#image("/assets/image-7.png")

点击已发布的应用程序

#image("/assets/image-8.png")

填写子域、域名、服务url

填写子域，方便记忆，多个docker可以分配不同的子域，域名选择之前托管到cloudflare的域名，服务url填写本地服务的地址和端口，例如http://172.17.0.1:8080，路径留空。

用hostname -I 命令查看本地ip地址，如果是本地服务器，选192.168开头的地址，如果是云服务器，选172开头或者10开头的地址，端口号根据docker暴露的端口填写。

#image("/assets/image-9.png")

填写完毕，点击添加路由

#image("/assets/image-10.png")

等待几分钟，然后浏览器访问域名

#image("/assets/image-11.png")

访问成功

#image("/assets/image-12.png")

== tunnel的第二种打开路径

点击zero trust，进入到zero trust的页面，点击左侧的网络→连接器

#image("/assets/image-13.png")

来到tunnel的页面，创建过程都大差不差，就不多赘述了

#image("/assets/image-14.png")

#image("/assets/image-15.png")



