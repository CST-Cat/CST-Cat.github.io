#import "../index.typ": template, tufted
#show: template.with(
  title: "oracle cloud一些基础操作",
  description: "一份关于在oracle cloud上进行一些基础操作的实用指南。",
  date: datetime(year: 2026, month: 3, day: 2),
  lang: "zh",
)

前几天刚注册完Oracle并成功升级，第一次使用Oracle官网，感觉跟迷宫一样，记录一下常见操作，给需要的网友参考一下

= 预留公网ip

左上角三杠→网络→预留的公共ip

#image("./imgs/image-20260320120220716.png")

#image("./imgs/image-20260320120311244.png")

#image("./imgs/image-20260320120353842.png")

= 绑定ip和换ip

绑定了ip才能对ip测速，免费预留ip的数量是50个，可以预留多个ip，再进行

#image("./imgs/image-20260320115541580.png")

#image("./imgs/image-20260320115625501.png")

#image("./imgs/image-20260320115739227.png")

#image("./imgs/image-20260320115840255.png")

#image("./imgs/image-20260320115840293.png")

#image("./imgs/image-20260320115902354.png")

#image("./imgs/image-20260320115945291.png")

= 防火墙

建议全开，之后不用网站的管理界面，直接在服务器上安装防火墙软件，设置好规则就行了

#image("./imgs/image-20260320120642024.png")

#image("./imgs/image-20260320120915741.png")

#image("./imgs/image-20260320120944680.png")

#image("./imgs/image-20260320121010339.png")
