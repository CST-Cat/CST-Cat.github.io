#import "../index.typ": template, tufted
#import "@preview/theorion:0.4.1": *
#show: template.with(
  title: "数一考研笔记",
  description: "记录数一考研复习过程中的一些笔记和心得体会",
  date: datetime(year: 2026, month: 4, day: 6),
  lang: "zh",
)

= 高数

== 极限

=== 常用极限公式

$ lim_(x -> 0) sin x / x = 1 $

$ lim_(x -> 0) tan x / x = 1 $

$ lim_(x -> 0) (1 - cos x) / x^2 = 1 / 2 $

$ lim_(x -> 0) arcsin x / x = 1 $

$ lim_(x -> 0) arctan x / x = 1 $

$ lim_(x -> 0) ln(1 + x) / x = 1 $

$ lim_(x -> 0) (e^x - 1) / x = 1 $

$ lim_(x -> 0) (a^x - 1) / x = ln a quad (a > 0, a != 1) $

$ lim_(x -> 0) ((1 + x)^alpha - 1) / x = alpha $

$ lim_(x -> 0) (1 + x)^(1 / x) = e $

$ lim_(x -> infinity) (1 + 1 / x)^x = e $

$ lim_(x -> 0) (sin x - x) / x^3 = -1 / 6 $

$ lim_(x -> 0) (tan x - x) / x^3 = 1 / 3 $

$ lim_(x -> 0) (x - ln(1 + x)) / x^2 = 1 / 2 $

$ lim_(x -> 0) (e^x - 1 - x) / x^2 = 1 / 2 $



== 导数

== 微分

== 积分

== 多元函数微积分

=== 第一类线积分（对弧长的线积分）

==== 定义

设 $L$ 为 $x O y$ 平面上的一条光滑曲线弧，$f(x, y)$ 在 $L$ 上有界。将 $L$ 任意分成 $n$ 小段，第 $i$ 段弧长为 $Delta s_i$，在其上任取一点 $(xi_i, eta_i)$，若极限

$ lim_(lambda -> 0) sum_(i=1)^n f(xi_i, eta_i) Delta s_i $

存在（$lambda$ 为各小弧段长度的最大值），则称此极限为 $f(x, y)$ 在曲线弧 $L$ 上*对弧长的线积分*，记为

$ integral_L f(x, y) dif s $

==== 计算公式

若 $L$ 的参数方程为 $x = phi(t), y = psi(t) quad (alpha <= t <= beta)$，则

$ integral_L f(x, y) dif s = integral_alpha^beta f(phi(t), psi(t)) sqrt(phi'^2(t) + psi'^2(t)) dif t $

#tip-box[
  *性质*：第一类线积分与路径方向无关，即 $ integral_L f(x, y) dif s = integral_(-L) f(x, y) dif s $
]

=== 第二类线积分（对坐标的线积分）

==== 定义

设 $L$ 为从 $A$ 到 $B$ 的有向光滑曲线弧，$P(x, y), Q(x, y)$ 在 $L$ 上有界。将 $L$ 任意分成 $n$ 小段，第 $i$ 段在 $x$ 轴和 $y$ 轴上的投影分别为 $Delta x_i, Delta y_i$，在其上任取一点 $(xi_i, eta_i)$，若极限

$ lim_(lambda -> 0) sum_(i=1)^n [P(xi_i, eta_i) Delta x_i + Q(xi_i, eta_i) Delta y_i] $

存在，则称此极限为 $P, Q$ 在有向曲线弧 $L$ 上*对坐标的线积分*，记为

$ integral_L P(x, y) dif x + Q(x, y) dif y $

==== 计算公式

若 $L$ 的参数方程为 $x = phi(t), y = psi(t)$，起点对应 $t = alpha$，终点对应 $t = beta$，则

$ integral_L P dif x + Q dif y = integral_alpha^beta [P(phi(t), psi(t)) phi'(t) + Q(phi(t), psi(t)) psi'(t)] dif t $

#tip-box[
  *性质*：第二类线积分与路径方向有关，即 $ integral_L P dif x + Q dif y = -integral_(-L) P dif x + Q dif y $
]

==== 格林公式

设 $D$ 为平面上由分段光滑的闭曲线 $L$ 围成的单连通区域，$P(x, y), Q(x, y)$ 在 $D$ 上有一阶连续偏导数，则

$ integral.cont.ccw_L P dif x + Q dif y = integral.double_D ((partial Q) / (partial x) - (partial P) / (partial y)) dif x dif y $

其中 $L$ 取正方向（逆时针）。

=== 第一类面积分（对面积的面积分）

==== 定义

设 $Sigma$ 为空间中的光滑曲面，$f(x, y, z)$ 在 $Sigma$ 上有界。将 $Sigma$ 任意分成 $n$ 小块，第 $i$ 块面积为 $Delta S_i$，在其上任取一点 $(xi_i, eta_i, zeta_i)$，若极限

$ lim_(lambda -> 0) sum_(i=1)^n f(xi_i, eta_i, zeta_i) Delta S_i $

存在，则称此极限为 $f(x, y, z)$ 在曲面 $Sigma$ 上*对面积的面积分*，记为

$ integral.double_Sigma f(x, y, z) dif S $

==== 计算公式

若曲面 $Sigma$ 由 $z = z(x, y)$ 给出，$(x, y) in D_(x y)$，则

$ integral.double_Sigma f(x, y, z) dif S = integral.double_(D_(x y)) f(x, y, z(x, y)) sqrt(1 + z_x^2 + z_y^2) dif x dif y $

#tip-box[
  *性质*：第一类面积分与曲面的侧无关，即 $ integral.double_Sigma f(x, y, z) dif S = integral.double_(-Sigma) f(x, y, z) dif S $
]

=== 第二类面积分（对坐标的面积分）

==== 定义

设 $Sigma$ 为有向光滑曲面，$R(x, y, z)$ 在 $Sigma$ 上有界。将 $Sigma$ 任意分成 $n$ 小块，第 $i$ 小块在 $x O y$ 面上的投影为 $(Delta S_i)_(x y)$（带符号，取决于法向量方向），在其上任取一点 $(xi_i, eta_i, zeta_i)$，若极限

$ lim_(lambda -> 0) sum_(i=1)^n R(xi_i, eta_i, zeta_i) (Delta S_i)_(x y) $

存在，则称此极限为*对坐标的面积分*。一般形式记为

$ integral.double_Sigma P dif y dif z + Q dif z dif x + R dif x dif y $

==== 计算公式

若 $Sigma$ 由 $z = z(x, y)$ 给出，$(x, y) in D_(x y)$，取上侧（法向量朝上），则

$ integral.double_Sigma R(x, y, z) dif x dif y = integral.double_(D_(x y)) R(x, y, z(x, y)) dif x dif y $

取下侧时需添加负号。

#tip-box[
  *性质*：第二类面积分与曲面的侧有关，即 $ integral.double_Sigma P dif y dif z + Q dif z dif x + R dif x dif y = -integral.double_(-Sigma) P dif y dif z + Q dif z dif x + R dif x dif y $
]

==== 高斯公式

设空间区域 $Omega$ 由分片光滑的闭曲面 $Sigma$ 围成，$P, Q, R$ 在 $Omega$ 上有一阶连续偏导数，则

$ integral.surf_Sigma P dif y dif z + Q dif z dif x + R dif x dif y = integral.triple_Omega ((partial P) / (partial x) + (partial Q) / (partial y) + (partial R) / (partial z)) dif V $

其中 $Sigma$ 取外侧。

==== 斯托克斯公式

设 $Sigma$ 为分片光滑的有向曲面，$Gamma$ 为 $Sigma$ 的边界曲线（取与 $Sigma$ 的侧相协调的方向），$P, Q, R$ 有一阶连续偏导数，则

$ integral.cont_Gamma P dif x + Q dif y + R dif z = integral.double_Sigma mat(delim: "|", dif y dif z, dif z dif x, dif x dif y; partial / (partial x), partial / (partial y), partial / (partial z); P, Q, R) $

即

$ integral.cont_Gamma P dif x + Q dif y + R dif z = integral.double_Sigma ((partial R) / (partial y) - (partial Q) / (partial z)) dif y dif z + ((partial P) / (partial z) - (partial R) / (partial x)) dif z dif x + ((partial Q) / (partial x) - (partial P) / (partial y)) dif x dif y $

=== 四类积分对比总结

#table(
  columns: (auto, auto, auto, auto, auto),
  align: center,
  table.header([*类型*], [*积分对象*], [*几何/物理意义*], [*方向性*], [*计算核心*]),
  [第一类线积分], [对弧长 $dif s$], [曲线上的质量、弧长], [无关], [$sqrt(x'^2 + y'^2) dif t$],
  [第二类线积分], [对坐标 $dif x, dif y$], [力沿曲线做的功], [有关（反向变号）], [$x'(t) dif t, y'(t) dif t$],
  [第一类面积分], [对面积 $dif S$], [曲面的质量、面积], [无关], [$sqrt(1 + z_x^2 + z_y^2) dif x dif y$],
  [第二类面积分], [对坐标 $dif x dif y$], [流体通过曲面的通量], [有关（翻侧变号）], [投影到坐标面],
)

=== 交叉对比与易混淆点辨析

==== 第一类 vs 第二类：核心区别

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([*对比维度*], [*第一类（对弧长/面积）*], [*第二类（对坐标）*]),
  [积分微元], [$dif s$（标量，弧长）或 $dif S$（面积）], [$dif x, dif y$（有向投影）],
  [方向性], [*无关*——路径/曲面翻转，值不变], [*有关*——翻转方向/侧，值变号],
  [物理背景], [求质量、弧长、面积等"累加量"], [求做功、通量等"有方向的累积"],
  [被积函数], [通常是标量函数 $f$], [通常是向量场的分量 $P, Q, R$],
  [计算时额外因子], [需乘 $sqrt(dots)$（弧长/面积元素）], [不需要 $sqrt(dots)$，直接代入导数],
)

#warning-box[
  *最易混淆的点*：
  - 第一类线积分化为定积分后，积分上下限必须 $alpha < beta$（因为 $dif s > 0$）；第二类线积分的上下限由起点→终点决定，可以 $alpha > beta$。
  - 第一类面积分化为二重积分时要乘 $sqrt(1 + z_x^2 + z_y^2)$；第二类面积分*不乘*这个因子，但要注意正负侧。
]

==== 线积分 vs 面积分：维度升级

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([*对比维度*], [*线积分*], [*面积分*]),
  [积分域], [曲线 $L$（一维）], [曲面 $Sigma$（二维）],
  [参数化], [一个参数 $t$], [两个参数 $(u, v)$ 或 $z = z(x,y)$],
  [第一类微元], [$dif s = sqrt(x'^2 + y'^2) dif t$], [$dif S = sqrt(1 + z_x^2 + z_y^2) dif x dif y$],
  [第二类微元], [$dif x = x'(t) dif t$], [$dif x dif y$（投影面积元）],
  [联系公式], [格林公式（线→面）], [高斯公式（面→体）、斯托克斯公式（线→面）],
)

==== 四大公式的联系

#note-box[
  *格林公式*：将 *第二类线积分* $integral.cont_L P dif x + Q dif y$ 转化为 *二重积分*（平面情形）

  *斯托克斯公式*：将 *第二类线积分* $integral.cont_Gamma P dif x + Q dif y + R dif z$ 转化为 *第二类面积分*（空间情形，格林公式的推广）

  *高斯公式*：将 *第二类面积分* $integral.surf_Sigma$ 转化为 *三重积分*
]

=== 典型例题

==== 第一类线积分例题

*例1*：计算 $integral_L (x^2 + y^2) dif s$，其中 $L$ 为圆 $x^2 + y^2 = a^2$。

*解*：参数化：$x = a cos t, y = a sin t, quad t in [0, 2 pi]$

$ dif s = sqrt((-a sin t)^2 + (a cos t)^2) dif t = a dif t $

$ integral_L (x^2 + y^2) dif s = integral_0^(2 pi) a^2 dot a dif t = a^3 integral_0^(2 pi) dif t = 2 pi a^3 $

#tip-box[
  *要点*：在圆上 $x^2 + y^2 = a^2$ 为常数，可直接提出积分号；$dif s = a dif t$ 是弧长微元。
]

*例2*：计算 $integral_L y dif s$，其中 $L$ 为上半圆 $x^2 + y^2 = 1, y >= 0$。

*解*：参数化：$x = cos t, y = sin t, quad t in [0, pi]$

$ dif s = sqrt(sin^2 t + cos^2 t) dif t = dif t $

$ integral_L y dif s = integral_0^pi sin t dif t = [-cos t]_0^pi = -(-1) + 1 = 2 $

*例3*：计算 $integral_L x dif s$，其中 $L$ 为线段 $y = x$，从 $(0, 0)$ 到 $(1, 1)$。

*解*：参数化：$x = t, y = t, quad t in [0, 1]$

$ dif s = sqrt(1 + 1) dif t = sqrt(2) dif t $

$ integral_L x dif s = integral_0^1 t dot sqrt(2) dif t = sqrt(2) dot 1 / 2 = sqrt(2) / 2 $

#tip-box[
  *注意*：即使将 $L$ 反向（从 $(1,1)$ 到 $(0,0)$），结果仍然是 $sqrt(2) / 2$——第一类线积分与方向无关。
]

==== 第二类线积分例题

*例1*：计算 $integral_L y dif x + x dif y$，其中 $L$ 为从 $(0, 0)$ 到 $(1, 1)$ 的线段 $y = x$。

*解*：参数化：$x = t, y = t, quad t: 0 -> 1$

$ dif x = dif t, quad dif y = dif t $

$ integral_L y dif x + x dif y = integral_0^1 (t dot 1 + t dot 1) dif t = integral_0^1 2t dif t = [t^2]_0^1 = 1 $

若反向（从 $(1,1)$ 到 $(0,0)$），参数化 $t: 1 -> 0$：

$ integral_(-L) = integral_1^0 2t dif t = -1 $

#tip-box[
  *验证*：反向后结果变号，这正是第二类线积分与第一类的本质区别。
]

*例2*：用格林公式计算 $integral.cont_L (x^2 - y) dif x + (y^2 + x) dif y$，$L$ 为单位圆 $x^2 + y^2 = 1$ 逆时针方向。

*解*：令 $P = x^2 - y, quad Q = y^2 + x$

$ (partial Q) / (partial x) - (partial P) / (partial y) = 1 - (-1) = 2 $

由格林公式：

$ integral.cont_L P dif x + Q dif y = integral.double_D 2 dif x dif y = 2 dot pi dot 1^2 = 2 pi $

*例3*：计算 $integral_L y^2 dif x$，其中 $L$ 为抛物线 $y = x^2$ 从 $(0, 0)$ 到 $(1, 1)$。

*解*：以 $x$ 为参数：$y = x^2, quad dif x = dif x, quad x: 0 -> 1$

$ integral_L y^2 dif x = integral_0^1 (x^2)^2 dif x = integral_0^1 x^4 dif x = [x^5 / 5]_0^1 = 1 / 5 $

==== 第一类面积分例题

*例1*：计算 $integral.double_Sigma dif S$，其中 $Sigma$ 为球面 $x^2 + y^2 + z^2 = a^2$ 的上半部分（$z >= 0$）。

*解*：$z = sqrt(a^2 - x^2 - y^2)$，投影域 $D_(x y): x^2 + y^2 <= a^2$

$ z_x = (-x) / sqrt(a^2 - x^2 - y^2), quad z_y = (-y) / sqrt(a^2 - x^2 - y^2) $

$ sqrt(1 + z_x^2 + z_y^2) = sqrt(1 + (x^2 + y^2) / (a^2 - x^2 - y^2)) = a / sqrt(a^2 - x^2 - y^2) $

用极坐标 $x = r cos theta, y = r sin theta$：

$ integral.double_Sigma dif S = integral_0^(2 pi) dif theta integral_0^a a / sqrt(a^2 - r^2) r dif r = 2 pi a [-sqrt(a^2 - r^2)]_0^a = 2 pi a^2 $

#tip-box[
  *验证*：半球面面积为 $2 pi a^2$，全球面面积 $4 pi a^2$，结果正确。
]

*例2*：计算 $integral.double_Sigma z dif S$，其中 $Sigma$ 为锥面 $z = sqrt(x^2 + y^2), quad 0 <= z <= 1$。

*解*：$z = sqrt(x^2 + y^2)$，投影域 $D_(x y): x^2 + y^2 <= 1$

$ z_x = x / sqrt(x^2 + y^2), quad z_y = y / sqrt(x^2 + y^2) $

$ sqrt(1 + z_x^2 + z_y^2) = sqrt(1 + (x^2 + y^2) / (x^2 + y^2)) = sqrt(2) $

$ integral.double_Sigma z dif S = integral.double_(D_(x y)) sqrt(x^2 + y^2) dot sqrt(2) dif x dif y $

极坐标：

$ = sqrt(2) integral_0^(2 pi) dif theta integral_0^1 r dot r dif r = sqrt(2) dot 2 pi dot 1 / 3 = (2 sqrt(2) pi) / 3 $

==== 第二类面积分例题

*例1*：计算 $integral.double_Sigma x dif y dif z + y dif z dif x + z dif x dif y$，其中 $Sigma$ 为球面 $x^2 + y^2 + z^2 = 1$ 的外侧。

*解*：用高斯公式。$P = x, Q = y, R = z$

$ (partial P) / (partial x) + (partial Q) / (partial y) + (partial R) / (partial z) = 1 + 1 + 1 = 3 $

$ integral.surf_Sigma P dif y dif z + Q dif z dif x + R dif x dif y = integral.triple_Omega 3 dif V = 3 dot 4 / 3 pi = 4 pi $

#tip-box[
  *要点*：高斯公式将复杂的面积分转化为简单的三重积分，是第二类面积分最强大的工具。
]

*例2*：计算 $integral.double_Sigma z^2 dif x dif y$，其中 $Sigma$ 为抛物面 $z = x^2 + y^2$ 的 $0 <= z <= 1$ 部分，取上侧。

*解*：$z = x^2 + y^2$，投影域 $D_(x y): x^2 + y^2 <= 1$，取上侧（法向量朝上，$cos gamma > 0$）

$ integral.double_Sigma z^2 dif x dif y = integral.double_(D_(x y)) (x^2 + y^2)^2 dif x dif y $

极坐标：

$ = integral_0^(2 pi) dif theta integral_0^1 r^4 dot r dif r = 2 pi dot [r^6 / 6]_0^1 = pi / 3 $

#warning-box[
  *易错点*：如果取下侧，结果为 $-pi / 3$。第二类面积分的正负取决于曲面的侧。
]

*例3*：计算 $integral.double_Sigma x^2 dif y dif z$，其中 $Sigma$ 为平面 $x + y + z = 1$ 在第一卦限部分，取前侧（法向量指向 $x$ 轴正方向一侧）。

*解*：将 $Sigma$ 投影到 $y O z$ 面。由 $x = 1 - y - z$，投影域 $D_(y z): y >= 0, z >= 0, y + z <= 1$

法向量 $arrow(n) = (1, 1, 1)$，$cos alpha > 0$ 对应前侧（取正）。

$ integral.double_Sigma x^2 dif y dif z = integral.double_(D_(y z)) (1 - y - z)^2 dif y dif z $

$ = integral_0^1 dif y integral_0^(1 - y) (1 - y - z)^2 dif z $

令 $u = 1 - y - z$：

$ = integral_0^1 dif y [-(1 - y - z)^3 / 3]_0^(1 - y) = integral_0^1 (1 - y)^3 / 3 dif y = 1 / 3 dot [(1 - y)^4 / (-4)]_0^1 = 1 / 12 $

=== 做题判断流程

#note-box[
  拿到一道积分题，按以下步骤判断类型：

  1. *看积分域*：是曲线 $L$ → 线积分；是曲面 $Sigma$ → 面积分
  2. *看微元*：是 $dif s$ 或 $dif S$ → 第一类；是 $dif x, dif y$ 或 $dif y dif z$ 等 → 第二类
  3. *看有无方向/侧要求*：无方向/侧 → 第一类；有方向/侧 → 第二类
  4. *选计算方法*：
    - 第一类：参数化 + 乘弧长/面积元素 $sqrt(dots)$
    - 第二类线积分：参数化代入或格林公式
    - 第二类面积分：投影法或高斯公式
]

=== 微元符号全面辨析：$dif s$、$dif S$、$dif V$、$dif x$、$dif x dif y$……

==== 一张表搞清所有微元

#table(
  columns: (auto, auto, auto, auto, auto),
  align: center,
  table.header([*符号*], [*名称*], [*维度*], [*几何意义*], [*出现场景*]),
  [$dif x$], [坐标微元], [1D], [曲线在 $x$ 轴上的有向投影], [第二类线积分],
  [$dif s$], [弧长微元], [1D], [曲线的一小段弧长（$> 0$）], [第一类线积分],
  [$dif x dif y$], [面积微元], [2D], [平面区域的一小块面积], [二重积分],
  [$dif sigma$], [面积微元], [2D], [$dif x dif y$ 的另一种写法], [二重积分],
  [$dif S$], [曲面面积微元], [2D], [曲面的一小块面积（$> 0$）], [第一类面积分],
  [$dif y dif z$], [坐标面积微元], [2D], [曲面在 $y O z$ 面上的有向投影], [第二类面积分],
  [$dif z dif x$], [坐标面积微元], [2D], [曲面在 $z O x$ 面上的有向投影], [第二类面积分],
  [$dif x dif y$（面积分中）], [坐标面积微元], [2D], [曲面在 $x O y$ 面上的有向投影], [第二类面积分],
  [$dif V$], [体积微元], [3D], [空间区域的一小块体积], [三重积分],
  [$dif x dif y dif z$], [体积微元], [3D], [$dif V$ 的直角坐标写法], [三重积分],
)

==== 最容易混淆的三组

*1. $dif s$ vs $dif x$（线积分中的两个微元）*

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([], [$dif s$（弧长微元）], [$dif x$（坐标微元）]),
  [类型], [标量，恒 $>= 0$], [有向，可正可负],
  [几何], [曲线的实际长度], [曲线在 $x$ 轴的投影],
  [展开式], [$sqrt(x'^2(t) + y'^2(t)) dif t$], [$x'(t) dif t$],
  [方向], [与路径方向*无关*], [与路径方向*有关*],
  [积分号], [$integral_L f dif s$（第一类）], [$integral_L P dif x$（第二类）],
)

#warning-box[
  *关键记忆*：$dif s$ 永远是正的（长度不会为负），所以第一类线积分与方向无关；$dif x$ 是投影，可以为负，所以第二类线积分与方向有关。
]

*2. $dif S$ vs $dif x dif y$（面积分中的两个微元）*

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([], [$dif S$（曲面面积微元）], [$dif x dif y$（坐标面积微元）]),
  [类型], [标量，恒 $>= 0$], [有向，取决于法向量方向],
  [几何], [曲面的实际面积], [曲面在 $x O y$ 面上的投影面积],
  [展开式], [$sqrt(1 + z_x^2 + z_y^2) dif x dif y$], [$plus.minus dif x dif y$（上侧取 $+$，下侧取 $-$）],
  [方向], [与曲面的侧*无关*], [与曲面的侧*有关*],
  [积分号], [$integral.double_Sigma f dif S$（第一类）], [$integral.double_Sigma R dif x dif y$（第二类）],
)

#warning-box[
  *关键记忆*：$dif S$ 和 $dif s$ 类似——都是"实际大小"，恒正，不关心方向；$dif x dif y$（面积分中）和 $dif x$（线积分中）类似——都是"投影"，有正负，关心方向/侧。
]

*3. 二重积分的 $dif x dif y$ vs 第二类面积分的 $dif x dif y$*

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([], [二重积分 $integral.double_D f dif x dif y$], [第二类面积分 $integral.double_Sigma R dif x dif y$]),
  [积分域], [*平面区域* $D$（$x O y$ 平面上的）], [*曲面* $Sigma$（空间中的）],
  [$dif x dif y$ 含义], [平面上的面积元素], [曲面在 $x O y$ 面上的*有向投影*面积],
  [有无方向], [*无方向*——$dif x dif y > 0$], [*有方向*——取决于法向量朝向],
  [被积函数], [$f(x, y)$——只含两个变量], [$R(x, y, z)$——含三个变量，需用曲面方程消去 $z$],
)

#warning-box[
  *最大陷阱*：看到 $dif x dif y$ 不要急着判断是二重积分！一定要看积分域是平面区域 $D$ 还是曲面 $Sigma$。
  - $integral.double_D f(x,y) dif x dif y$ → 二重积分
  - $integral.double_Sigma R(x,y,z) dif x dif y$ → 第二类面积分
]

==== $dif s$ 和 $dif S$ 展开公式速查

#table(
  columns: (auto, auto),
  align: center,
  table.header([*微元*], [*展开公式*]),
  [$dif s$（平面曲线 $y = y(x)$）], [$sqrt(1 + y'^2) dif x$],
  [$dif s$（参数方程 $x(t), y(t)$）], [$sqrt(x'^2(t) + y'^2(t)) dif t$],
  [$dif s$（极坐标 $r = r(theta)$）], [$sqrt(r^2 + r'^2) dif theta$],
  [$dif s$（空间曲线 $x(t), y(t), z(t)$）], [$sqrt(x'^2 + y'^2 + z'^2) dif t$],
  [$dif S$（$z = z(x,y)$）], [$sqrt(1 + z_x^2 + z_y^2) dif x dif y$],
  [$dif S$（$x = x(y,z)$）], [$sqrt(1 + x_y^2 + x_z^2) dif y dif z$],
  [$dif S$（参数方程 $arrow(r)(u,v)$）], [$|arrow(r)_u times arrow(r)_v| dif u dif v$],
)

=== 重积分 vs 线面积分：本质区别

==== 它们在积什么？

#table(
  columns: (auto, auto, auto, auto),
  align: center,
  table.header([*积分类型*], [*积分域*], [*在积什么*], [*降维结果*]),
  [一重积分 $integral$], [区间 $[a,b]$], [函数值 $times$ 长度], [一个数],
  [二重积分 $integral.double$], [平面区域 $D$], [函数值 $times$ 面积], [一个数],
  [三重积分 $integral.triple$], [空间区域 $Omega$], [函数值 $times$ 体积], [一个数],
  [第一类线积分], [曲线 $L$], [函数值 $times$ 弧长], [一个数],
  [第一类面积分], [曲面 $Sigma$], [函数值 $times$ 曲面面积], [一个数],
  [第二类线积分], [有向曲线 $L$], [向量场 $dot$ 切方向 $times$ 弧长], [一个数],
  [第二类面积分], [有向曲面 $Sigma$], [向量场 $dot$ 法方向 $times$ 面积], [一个数],
)

==== 重积分 vs 线面积分的核心区别

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([*对比维度*], [*重积分（二重/三重）*], [*线面积分*]),
  [积分域形状], [*填满*的区域（面/体）], [*边界*上的曲线/曲面],
  [积分域维度], [和微元维度相同], [积分域嵌入在更高维空间],
  [例子], [$D$ 是平面上一块区域], [$L$ 是平面上一条线（比 $D$ 低一维）],
  [类比], [求一块板的质量], [求一根弯曲铁丝的质量],
  [有无方向], [重积分*没有方向*], [第二类线面积分*有方向*],
)

#note-box[
  *一句话理解*：
  - *重积分*：在一个"实心"区域上积分（面积、体积上的累加）
  - *线积分*：沿一条"线"上积分（沿曲线的累加）
  - *面积分*：在一个"壳"上积分（沿曲面的累加）
]

==== 它们之间的联系：转化公式

#table(
  columns: (auto, auto, auto, auto),
  align: center,
  table.header([*公式*], [*从什么积分*], [*转化为什么积分*], [*条件*]),
  [格林公式], [第二类线积分（沿 $partial D$）], [二重积分（在 $D$ 上）], [平面闭曲线],
  [高斯公式], [第二类面积分（沿 $partial Omega$）], [三重积分（在 $Omega$ 上）], [空间闭曲面],
  [斯托克斯公式], [第二类线积分（沿 $partial Sigma$）], [第二类面积分（在 $Sigma$ 上）], [空间曲面及其边界],
)

#note-box[
  *规律*：三大公式的本质都是 *边界上的积分 = 内部的积分*。
  - 格林公式：线（$partial D$ 的边界）→ 面（$D$ 内部）
  - 高斯公式：面（$partial Omega$ 的边界）→ 体（$Omega$ 内部）
  - 斯托克斯公式：线（$partial Sigma$ 的边界）→ 面（$Sigma$ 内部）

  维度关系：$n-1$ 维边界上的积分 $=$ $n$ 维内部的积分。
]

=== 六种积分全家福

#table(
  columns: (auto, auto, auto, auto, auto, auto),
  align: center,
  table.header([*积分*], [*记号*], [*积分域*], [*微元*], [*方向*], [*化简关键*]),
  [二重积分], [$integral.double_D$], [平面区域], [$dif x dif y$], [无], [选坐标系],
  [三重积分], [$integral.triple_Omega$], [空间区域], [$dif x dif y dif z$], [无], [选坐标系/投影],
  [一类线积分], [$integral_L f dif s$], [曲线], [$dif s$], [无], [参数化 + $sqrt(dots)$],
  [二类线积分], [$integral_L P dif x + Q dif y$], [有向曲线], [$dif x, dif y$], [有], [参数化 / 格林],
  [一类面积分], [$integral.double_Sigma f dif S$], [曲面], [$dif S$], [无], [投影 + $sqrt(dots)$],
  [二类面积分], [$integral.double_Sigma P dif y dif z + dots$], [有向曲面], [$dif y dif z, dots$], [有], [投影 / 高斯],
)

=== 深入辨析：十个最常见的困惑

==== 困惑1：第一类线积分和普通定积分有什么区别？

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([*对比*], [*普通定积分 $integral_a^b f(x) dif x$*], [*第一类线积分 $integral_L f dif s$*]),
  [积分域], [数轴上的区间 $[a,b]$], [平面/空间中的曲线 $L$],
  [微元], [$dif x$——$x$ 轴上的一小段], [$dif s$——曲线的一小段弧长],
  [几何], [曲线下的面积], [沿曲线的"带状面积"或质量],
  [区别], [积分路径是直线（$x$ 轴）], [积分路径是弯曲的],
)

当曲线 $L$ 恰好是 $x$ 轴上的区间 $[a,b]$ 时，$dif s = dif x$，第一类线积分退化为普通定积分。

#tip-box[
  *关键理解*：第一类线积分就是普通定积分的"弯曲版"。把直尺掰弯了，在上面积分，就是第一类线积分。
]

==== 困惑2：二重积分和第一类面积分有什么区别？

这是*最常被混淆*的一组！

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([*对比*], [*二重积分 $integral.double_D f dif x dif y$*], [*第一类面积分 $integral.double_Sigma f dif S$*]),
  [积分域], [*平面*区域 $D$（躺在 $x O y$ 平面上）], [*空间曲面* $Sigma$（可以弯曲、倾斜）],
  [微元], [$dif x dif y$——平面上的小矩形面积], [$dif S$——曲面上的小块实际面积],
  [被积函数], [$f(x, y)$——两个变量], [$f(x, y, z)$——三个变量（在曲面上）],
  [几何意义], [曲面 $z = f(x,y)$ 下的体积], [曲面 $Sigma$ 上的"质量"（密度 $times$ 面积）],
  [关系], [积分域*本身就是*坐标面], [积分域在空间中弯曲，需要*投影到*坐标面],
)

#warning-box[
  *核心区别*：
  - 二重积分：积分域 $D$ 是*平的*（在 $x O y$ 平面上），$dif x dif y$ 就是真正的面积
  - 第一类面积分：积分域 $Sigma$ 是*弯的*（空间曲面），$dif S != dif x dif y$，而是 $dif S = sqrt(1 + z_x^2 + z_y^2) dif x dif y$

  当曲面 $Sigma$ 恰好就是 $x O y$ 平面上的区域 $D$（即 $z = 0$）时，$dif S = dif x dif y$，第一类面积分退化为二重积分。
]

==== 困惑3："方向"和"侧"到底是什么？

*方向（线积分）*：指曲线从哪个端点走到哪个端点。

- 从 $A$ 走到 $B$ 是正方向 → $integral_L$
- 从 $B$ 走到 $A$ 是反方向 → $integral_(-L)$

*侧（面积分）*：指曲面法向量指向哪一边。

- 法向量朝上（$cos gamma > 0$）→ 上侧
- 法向量朝下（$cos gamma < 0$）→ 下侧
- 法向量朝外 → 外侧（闭曲面常用）
- 法向量朝内 → 内侧

#note-box[
  *类比*：
  - "方向"就像单行道——从 $A$ 到 $B$ 和从 $B$ 到 $A$ 是不同的
  - "侧"就像一张纸的正面和反面——翻过来就变了
]

==== 困惑4：什么时候用 $integral$、$integral.cont$、$integral.double$、$integral.surf$？

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([*符号*], [*含义*], [*使用场景*]),
  [$integral_L$], [沿曲线 $L$ 的积分（非闭合）], [线积分，$L$ 有起点和终点],
  [$integral.cont_L$], [沿*闭合*曲线 $L$ 的积分], [线积分，$L$ 是封闭的（起点 $=$ 终点）],
  [$integral.double_D$ 或 $integral.double_Sigma$], [二重积分或面积分（非闭合）], [区域/曲面不封闭],
  [$integral.surf_Sigma$], [沿*闭合*曲面 $Sigma$ 的积分], [面积分，$Sigma$ 是封闭曲面（如球面）],
)

#tip-box[
  *判断方法*：看积分域是否"首尾相连"。
  - 曲线：起点 $=$ 终点 → 用 $integral.cont$
  - 曲面：没有边界（像球面那样封闭）→ 用 $integral.surf$
  - 格林公式和高斯公式要求闭合，所以它们的左边一定有圈 $integral.cont$ 或 $integral.surf$
]

==== 困惑5：格林公式、高斯公式、斯托克斯公式分别什么时候用？

#table(
  columns: (auto, auto, auto, auto, auto),
  align: center,
  table.header([*公式*], [*空间维度*], [*左边*], [*右边*], [*什么时候用*]),
  [格林公式], [二维平面], [$integral.cont_L P dif x + Q dif y$], [$integral.double_D (Q_x - P_y) dif x dif y$], [$L$ 是平面闭曲线],
  [高斯公式], [三维空间], [$integral.surf_Sigma P dif y dif z + dots$], [$integral.triple_Omega (P_x + Q_y + R_z) dif V$], [$Sigma$ 是空间闭曲面],
  [斯托克斯], [三维空间], [$integral.cont_Gamma P dif x + Q dif y + R dif z$], [$integral.double_Sigma dots dif S$], [$Gamma$ 是空间闭曲线],
)

#note-box[
  *速记口诀*：
  - 平面闭曲线做功 → *格林*
  - 空间闭曲面通量 → *高斯*
  - 空间闭曲线做功 → *斯托克斯*

  *共同前提*：被积函数 $P, Q, R$ 在区域内有连续偏导数。如果区域内有奇点（偏导不存在），不能直接用！
]

==== 困惑6：第一类线积分参数化后，积分上下限怎么确定？

这是一个*极易出错的细节*。

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([], [*第一类线积分*], [*第二类线积分*]),
  [参数范围], [必须 $alpha < beta$], [由起点→终点决定，$alpha$ 可以 $>$ $beta$],
  [原因], [$dif s > 0$，弧长恒正], [$dif x$ 有正负，方向决定符号],
  [例子], [$t: 0 -> 2 pi$（不能写 $2 pi -> 0$）], [若起点对应 $t = pi$，终点对应 $t = 0$，则 $integral_pi^0$],
)

*具体例子*：沿单位圆从 $(1, 0)$ 顺时针到 $(0, 1)$，参数化 $x = cos t, y = sin t$。

- 起点 $(1,0)$：$t = 0$
- 终点 $(0,1)$：$t = pi / 2$
- 但顺时针方向意味着 $t$ 从 $0$ 减小到 $-3 pi / 2$（或等价地 $t: 0 -> -3 pi / 2$）

第一类线积分：不管方向，$integral_(-3 pi / 2)^0 f dot |dots| dif t$（*交换上下限使其 $alpha < beta$*）

第二类线积分：$integral_0^(-3 pi / 2) [P dot (-sin t) + Q dot cos t] dif t$（*保持起点→终点的顺序*）

#warning-box[
  *记住*：
  - 第一类：上下限永远小→大（$dif s > 0$）
  - 第二类：上下限跟着起点→终点走（$dif x$ 的正负自动包含了方向信息）
]

==== 困惑7：$dif S$ 和 $dif sigma$ 一样吗？

不一样！虽然都是"面积微元"，但用在不同的地方：

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([*符号*], [*出现在*], [*含义*]),
  [$dif sigma$（或 $dif x dif y$）], [*二重积分*], [平面区域 $D$ 上的面积元素],
  [$dif S$], [*第一类面积分*], [空间曲面 $Sigma$ 上的面积元素],
)

$ dif S = sqrt(1 + z_x^2 + z_y^2) dif sigma $

当曲面退化为平面（$z = "常数"$）时，$z_x = z_y = 0$，$dif S = dif sigma$。

==== 困惑8：第一类面积分和第二类面积分能互相转化吗？

可以！它们之间有如下关系：

设曲面 $Sigma$ 的单位法向量为 $arrow(n) = (cos alpha, cos beta, cos gamma)$，则

$ P dif y dif z + Q dif z dif x + R dif x dif y = (P cos alpha + Q cos beta + R cos gamma) dif S $

即：第二类面积分 $=$ 向量场与法向量的点积 $times$ 第一类面积分

#note-box[
  *理解*：
  - 第一类面积分：标量函数在曲面上积分（不关心法向量方向）
  - 第二类面积分：向量场在曲面上沿法方向积分（关心法向量方向）
  - 关系：$integral.double_Sigma arrow(F) dot dif arrow(S) = integral.double_Sigma arrow(F) dot arrow(n) dif S$
  - 左边是第二类，右边是第一类！
]

==== 困惑9：第一类线积分和第二类线积分能互相转化吗？

类似地，设曲线的单位切向量为 $arrow(tau) = (cos alpha, cos beta)$，则

$ P dif x + Q dif y = (P cos alpha + Q cos beta) dif s $

即：第二类线积分 $=$ 向量场与切向量的点积 $times$ 第一类线积分

#note-box[
  *统一理解向量场积分*：
  - *第二类线积分*：$integral_L arrow(F) dot dif arrow(r) = integral_L arrow(F) dot arrow(tau) dif s$（向量场沿*切线方向*积分 → 做功）
  - *第二类面积分*：$integral.double_Sigma arrow(F) dot dif arrow(S) = integral.double_Sigma arrow(F) dot arrow(n) dif S$（向量场沿*法线方向*积分 → 通量）
]

==== 困惑10：为什么有的题目求出来是负数？

- *重积分*：只要被积函数 $f >= 0$，结果一定 $>= 0$
- *第一类线/面积分*：同上，$f >= 0$ 则 $>= 0$（因为 $dif s, dif S > 0$）
- *第二类线/面积分*：结果*可以是负数*，这很正常！

#note-box[
  *物理解释*：
  - 第二类线积分是"力做的功"，力和运动方向相反时，功为负
  - 第二类面积分是"流体通量"，流体从内向外流为正，从外向内流为负

  如果你算第一类积分（$dif s$ 或 $dif S$）得到了负数，那一定是算错了！
]

=== 同一道题的不同解法对比

下面这道题用两种方法做，帮你直观感受第一类和第二类的计算差异。

*题目*：设 $L$ 为从 $(1, 0)$ 到 $(0, 1)$ 的直线段（$x + y = 1$），分别计算：

(a) 第一类线积分：$integral_L (x + y) dif s$

(b) 第二类线积分：$integral_L y dif x + x dif y$

*解 (a)*：参数化 $x = 1 - t, y = t, quad t in [0, 1]$

$ dif s = sqrt((-1)^2 + 1^2) dif t = sqrt(2) dif t $

$ integral_L (x + y) dif s = integral_0^1 ((1 - t) + t) sqrt(2) dif t = integral_0^1 sqrt(2) dif t = sqrt(2) $

若反向（从 $(0,1)$ 到 $(1,0)$），令 $x = t, y = 1 - t, quad t in [0, 1]$：

$ integral_(-L) (x + y) dif s = integral_0^1 1 dot sqrt(2) dif t = sqrt(2) quad "（结果不变！）" $

*解 (b)*：同样参数化 $x = 1 - t, y = t, quad t: 0 -> 1$

$ dif x = -dif t, quad dif y = dif t $

$ integral_L y dif x + x dif y = integral_0^1 [t dot (-1) + (1 - t) dot 1] dif t = integral_0^1 (1 - 2t) dif t = [t - t^2]_0^1 = 0 $

若反向（$t: 1 -> 0$）：

$ integral_(-L) = integral_1^0 (1 - 2t) dif t = -(integral_0^1 (1 - 2t) dif t) = 0 quad "(巧了，这道题恰好是 0)" $

#tip-box[
  *本例的特殊性*：$y dif x + x dif y = dif(x y)$ 是全微分，所以第二类线积分只取决于端点值 $x y |_A^B = 0 - 0 = 0$，与路径无关。这是*与路径无关*的线积分的特征。
]

=== 与路径无关的条件（补充辨析）

并非所有第二类线积分都与路径有关！满足以下条件时，第二类线积分与路径无关：

$ (partial P) / (partial y) = (partial Q) / (partial x) quad "(平面情形)" $

此时 $P dif x + Q dif y$ 是某个函数 $u(x,y)$ 的全微分，积分只取决于起点和终点：

$ integral_L P dif x + Q dif y = u(B) - u(A) $

#warning-box[
  *注意前提条件*：
  - 区域 $D$ 必须是*单连通*的（没有"洞"）
  - $P, Q$ 在 $D$ 上有连续偏导数
  - 如果区域有洞（如去掉原点），即使 $(partial P) / (partial y) = (partial Q) / (partial x)$，也可能与路径有关！

  *经典反例*：$P = -y / (x^2 + y^2), quad Q = x / (x^2 + y^2)$

  验证 $(partial P) / (partial y) = (partial Q) / (partial x)$，但沿原点的单位圆积分 $= 2 pi != 0$。因为原点是奇点，区域不是单连通的。
]

=== 考研常考的计算陷阱总结

#table(
  columns: (auto, auto, auto),
  align: center,
  table.header([*陷阱*], [*错误做法*], [*正确做法*]),
  [第一类线积分上下限], [按方向写 $integral_beta^alpha$（$beta > alpha$）], [必须 $integral_alpha^beta$（$alpha < beta$）],
  [第二类线积分忘变号], [反向后不加负号], [反向结果变号：$integral_(-L) = -integral_L$],
  [第一类面积分漏乘 $sqrt(dots)$], [$integral.double_Sigma f dif S = integral.double_D f dif x dif y$], [$integral.double_Sigma f dif S = integral.double_D f sqrt(1 + z_x^2 + z_y^2) dif x dif y$],
  [第二类面积分多乘 $sqrt(dots)$], [$integral.double_Sigma R dif x dif y "中乘" sqrt(dots)$], [第二类*不乘* $sqrt(dots)$，直接代入],
  [第二类面积分忘正负侧], [不看法向量方向], [上侧取 $+$，下侧取 $-$（或外侧 $+$，内侧 $-$）],
  [格林公式忘检查连通性], [有奇点也直接用格林公式], [先检查区域是否单连通，有奇点需挖洞处理],
  [高斯公式忘检查闭合], [开曲面直接用高斯公式], [先补面使其闭合，再减去补面的贡献],
  [混淆 $dif sigma$ 和 $dif S$], [在面积分中用 $dif sigma$], [$dif sigma$ 用于二重积分，$dif S$ 用于第一类面积分],
)

=== 实战训练：看到题目，三秒判断用什么方法

==== 方法选择速判（只判断方法，不计算）

*题1*：$integral_L x^2 dif s$，$L$ 为圆 $x^2 + y^2 = 4$。

#tip-box[*判断*：微元是 $dif s$ → *第一类线积分* → 参数化 + 乘 $sqrt(x'^2 + y'^2)$]

*题2*：$integral_L x dif y - y dif x$，$L$ 为从 $(0,0)$ 到 $(1,1)$。

#tip-box[*判断*：微元是 $dif x, dif y$ → *第二类线积分* → 参数化代入（非闭合，不用格林）]

*题3*：$integral.cont_L (2x - y) dif x + (x + 3y) dif y$，$L$ 为正方形边界逆时针。

#tip-box[*判断*：$integral.cont$（闭合）+ $dif x, dif y$ → *第二类线积分* → 优先用*格林公式*]

*题4*：$integral.double_D (x^2 + y^2) dif x dif y$，$D: x^2 + y^2 <= 1$。

#tip-box[*判断*：积分域是平面区域 $D$ → *二重积分* → 极坐标]

*题5*：$integral.double_Sigma (x^2 + y^2) dif S$，$Sigma$ 为球面 $x^2 + y^2 + z^2 = 1$。

#tip-box[*判断*：积分域是曲面 $Sigma$，微元 $dif S$ → *第一类面积分* → 投影 + 乘 $sqrt(1 + z_x^2 + z_y^2)$]

*题6*：$integral.double_Sigma x dif y dif z + y dif z dif x + z dif x dif y$，$Sigma$ 为球面外侧。

#tip-box[*判断*：$dif y dif z$ 等坐标微元 → *第二类面积分* → 闭曲面 → 优先用*高斯公式*]

*题7*：$integral.triple_Omega (x^2 + y^2 + z^2) dif V$，$Omega$ 为球体 $x^2 + y^2 + z^2 <= a^2$。

#tip-box[*判断*：积分域是空间区域 $Omega$ → *三重积分* → 球坐标]

*题8*：$integral.double_Sigma z dif x dif y$，$Sigma$ 为 $z = x^2 + y^2$，$0 <= z <= 1$，取上侧。

#tip-box[*判断*：坐标微元 $dif x dif y$ + 曲面 $Sigma$ → *第二类面积分* → 非闭合 → 投影法（注意上侧取正）]

*题9*：$integral.cont_Gamma y dif x + z dif y + x dif z$，$Gamma$ 为空间闭曲线。

#tip-box[*判断*：空间闭曲线 + $dif x, dif y, dif z$ → *第二类线积分* → 用*斯托克斯公式*]

*题10*：$integral_L sqrt(x^2 + y^2 + z^2) dif s$，$L$ 为空间螺旋线。

#tip-box[*判断*：$dif s$ → *第一类线积分*（三维） → 参数化 + $sqrt(x'^2 + y'^2 + z'^2) dif t$]

==== 易混淆对比组：相似题目，不同方法

===== 对比组 A：同一条曲线，$dif s$ vs $dif x$

*题 A1*：$integral_L y dif s$，$L$ 为 $y = x^2$，$0 <= x <= 1$。

*解*：第一类线积分。$dif s = sqrt(1 + (2x)^2) dif x = sqrt(1 + 4x^2) dif x$

$ integral_L y dif s = integral_0^1 x^2 sqrt(1 + 4x^2) dif x $

令 $x = 1/2 tan theta$：$= 1/8 integral_0^(arctan 2) tan^2 theta sec^3 theta dif theta$（计算较复杂，此处重点在于方法选择）

*题 A2*：$integral_L y dif x$，$L$ 为 $y = x^2$，从 $(0,0)$ 到 $(1,1)$。

*解*：第二类线积分。*不需要乘* $sqrt(1 + 4x^2)$，直接代入：

$ integral_L y dif x = integral_0^1 x^2 dif x = 1/3 $

#warning-box[
  *对比*：同样的曲线 $y = x^2$，同样的被积函数 $y$：
  - $integral y dif s$：要乘 $sqrt(1 + 4x^2)$，计算复杂
  - $integral y dif x$：不乘，直接代入，计算简单
  - 区别就在于微元是 $dif s$（弧长）还是 $dif x$（坐标投影）
]

===== 对比组 B：同一个曲面，$dif S$ vs $dif x dif y$

*题 B1*：$integral.double_Sigma z dif S$，$Sigma: z = sqrt(1 - x^2 - y^2)$（上半球面）。

*解*：第一类面积分。$z_x = -x / sqrt(1 - x^2 - y^2)$，$z_y = -y / sqrt(1 - x^2 - y^2)$

$ sqrt(1 + z_x^2 + z_y^2) = 1 / sqrt(1 - x^2 - y^2) $

$ integral.double_Sigma z dif S = integral.double_D sqrt(1 - x^2 - y^2) dot 1 / sqrt(1 - x^2 - y^2) dif x dif y = integral.double_D dif x dif y = pi $

*题 B2*：$integral.double_Sigma z dif x dif y$，$Sigma: z = sqrt(1 - x^2 - y^2)$，取上侧。

*解*：第二类面积分。*不乘* $sqrt(dots)$，上侧取正：

$ integral.double_Sigma z dif x dif y = integral.double_D sqrt(1 - x^2 - y^2) dif x dif y $

极坐标：$= integral_0^(2pi) dif theta integral_0^1 sqrt(1 - r^2) r dif r = 2pi dot 1/3 = (2pi)/3$

#warning-box[
  *对比*：
  - $integral.double z dif S = pi$（乘了 $1/sqrt(dots)$，恰好和 $z$ 中的 $sqrt(dots)$ 抵消了）
  - $integral.double z dif x dif y = (2pi)/3$（直接代入，不乘额外因子）
  - *结果不同*！因为 $dif S != dif x dif y$
]

===== 对比组 C：闭合 vs 非闭合，该不该用公式

*题 C1*：$integral.cont_L y^2 dif x + x^2 dif y$，$L$ 为单位圆逆时针。

*解*：闭合 → 用格林公式。$P = y^2, Q = x^2$

$ (partial Q)/(partial x) - (partial P)/(partial y) = 2x - 2y $

$ integral.cont_L = integral.double_D (2x - 2y) dif x dif y $

利用对称性：$D$ 关于 $x, y$ 都对称，$2x$ 和 $-2y$ 都是奇函数 → $= 0$

*题 C2*：$integral_L y^2 dif x + x^2 dif y$，$L$ 为从 $(1, 0)$ 到 $(0, 1)$ 的上半圆弧。

*解*：*非闭合*，不能直接用格林公式。

方法1（直接参数化）：$x = cos t, y = sin t, quad t: 0 -> pi/2$

$ = integral_0^(pi/2) [sin^2 t (-sin t) + cos^2 t (cos t)] dif t = integral_0^(pi/2) (cos^3 t - sin^3 t) dif t = 2/3 - 2/3 = 0 $

方法2（补线用格林）：补一条从 $(0,1)$ 到 $(1,0)$ 的直线段 $L_1$，使 $L + L_1$ 闭合，再用格林公式减去 $L_1$ 的贡献。

#tip-box[
  *选择标准*：
  - 闭合曲线/曲面 → 优先考虑格林/高斯/斯托克斯
  - 非闭合 → 直接参数化，或补线/补面使其闭合再用公式
]

===== 对比组 D：二重积分 vs 第一类面积分

*题 D1*：求 $integral.double_D sqrt(1 - x^2 - y^2) dif x dif y$，$D: x^2 + y^2 <= 1$。

*解*：*二重积分*。积分域是平面圆盘 $D$。

极坐标：$= integral_0^(2pi) dif theta integral_0^1 sqrt(1 - r^2) r dif r = 2pi dot 1/3 = (2pi)/3$

几何意义：上半球面 $z = sqrt(1 - x^2 - y^2)$ 下方的体积（半球体积 $= (2pi)/3$）。

*题 D2*：求上半球面 $Sigma: x^2 + y^2 + z^2 = 1, z >= 0$ 的面积。

*解*：*第一类面积分*：$integral.double_Sigma 1 dif S$。

$ = integral.double_D 1 / sqrt(1 - x^2 - y^2) dif x dif y = integral_0^(2pi) dif theta integral_0^1 r / sqrt(1 - r^2) dif r = 2pi $

#warning-box[
  *对比*：
  - 题 D1：$integral.double_D sqrt(1 - x^2 - y^2) dif x dif y = (2pi)/3$（求体积，不乘 $sqrt(dots)$）
  - 题 D2：$integral.double_Sigma dif S = integral.double_D 1/sqrt(dots) dif x dif y = 2pi$（求面积，要乘 $sqrt(dots)$）
  - 被积函数变了！$dif S = sqrt(dots) dif x dif y$ 中的 $sqrt(dots)$ 是面积元素的一部分
]

===== 对比组 E：格林公式 vs 直接算

*题 E1*：$integral.cont_L (x + y) dif x + (x - y) dif y$，$L$ 为 $x^2 + y^2 = 4$ 逆时针。

*解*：格林公式。$(partial Q)/(partial x) - (partial P)/(partial y) = 1 - 1 = 0$ → $integral.cont_L = 0$

格林公式一步搞定！如果直接参数化，要算 $integral_0^(2pi) [dots]$ 一大堆三角函数。

*题 E2*：$integral_L (x + y) dif x + (x - y) dif y$，$L$ 为从 $(2, 0)$ 到 $(0, 2)$ 的圆弧。

*解*：$(partial Q)/(partial x) - (partial P)/(partial y) = 0$ → 积分与路径无关！

所以换成沿直线 $x + y = 2$（从 $(2,0)$ 到 $(0,2)$）：$x = 2-t, y = t, t: 0 -> 2$

$ = integral_0^2 [(2 - t + t)(-1) + (2 - t - t)(1)] dif t = integral_0^2 (-2 + 2 - 2t) dif t = integral_0^2 (-2t) dif t = -4 $

#tip-box[
  *要点*：先检查 $(partial Q)/(partial x) - (partial P)/(partial y)$。若为 $0$ 且区域单连通：
  - 闭合 → 直接 $= 0$
  - 非闭合 → 换一条最简单的路径算（通常选直线段）
]

===== 对比组 F：高斯公式 vs 投影法

*题 F1*：$integral.surf_Sigma x^2 dif y dif z + y^2 dif z dif x + z^2 dif x dif y$，$Sigma$ 为球面 $x^2+y^2+z^2=a^2$ 外侧。

*解*：闭曲面 → 高斯公式。

$ (partial P)/(partial x) + (partial Q)/(partial y) + (partial R)/(partial z) = 2x + 2y + 2z $

$ integral.surf_Sigma = integral.triple_Omega (2x + 2y + 2z) dif V $

对称性：$integral.triple_Omega x dif V = integral.triple_Omega y dif V = integral.triple_Omega z dif V = 0$（奇函数在对称域上积分为 $0$）

$ = 0 $

*题 F2*：$integral.double_Sigma z^2 dif x dif y$，$Sigma$ 为半球面 $z = sqrt(a^2 - x^2 - y^2)$，取上侧。

*解*：*非闭合*，不能直接用高斯。用投影法：

$ = integral.double_D (a^2 - x^2 - y^2) dif x dif y quad (D: x^2 + y^2 <= a^2, "上侧取正") $

极坐标：$= integral_0^(2pi) dif theta integral_0^a (a^2 - r^2) r dif r = 2pi [a^2 r^2/2 - r^4/4]_0^a = pi a^4 / 2$

也可以补底面 $Sigma_1: z = 0, x^2 + y^2 <= a^2$ 取下侧，用高斯公式：

$integral.surf_(Sigma + Sigma_1) = integral.triple_Omega 2z dif V$，再减去 $Sigma_1$ 上的贡献（$z = 0$ → 贡献为 $0$）。

===== 对比组 G：$integral.double_Sigma f dif S$ 中利用对称性

*题 G1*：$integral.double_Sigma x^2 dif S$，$Sigma$ 为球面 $x^2 + y^2 + z^2 = a^2$。

*解*：球面关于 $x, y, z$ 完全对称，所以

$ integral.double_Sigma x^2 dif S = integral.double_Sigma y^2 dif S = integral.double_Sigma z^2 dif S $

三者相加：$integral.double_Sigma (x^2 + y^2 + z^2) dif S = a^2 integral.double_Sigma dif S = a^2 dot 4pi a^2 = 4pi a^4$

所以 $integral.double_Sigma x^2 dif S = (4pi a^4) / 3$

#tip-box[
  *对称性技巧*：球面上 $x^2 = y^2 = z^2 = 1/3 (x^2 + y^2 + z^2)$，锥面/柱面等轴对称曲面上 $x^2 = y^2$。第一类积分可以大量使用对称性！
]

*题 G2*：$integral.double_Sigma x^2 dif y dif z$，$Sigma$ 为球面 $x^2+y^2+z^2=a^2$ 外侧。

*解*：第二类面积分。能用对称性吗？

$ integral.double_Sigma x^2 dif y dif z = integral.double_Sigma y^2 dif z dif x = integral.double_Sigma z^2 dif x dif y quad ("轮换对称性") $

三者相加 $= integral.surf_Sigma (x^2 dif y dif z + y^2 dif z dif x + z^2 dif x dif y)$，就是题 F1 的结果 $= 0$。

所以 $integral.double_Sigma x^2 dif y dif z = 0$。

#warning-box[
  *注意*：第二类面积分的对称性和第一类不同！第一类利用 $x^2 dif S = y^2 dif S$，第二类利用轮换对称 $x^2 dif y dif z = y^2 dif z dif x$（坐标也要一起轮换）。
]

===== 对比组 H：奇点处理

*题 H1*：$integral.cont_L (-y dif x + x dif y) / (x^2 + y^2)$，$L$ 为单位圆逆时针。

*解*：$P = -y/(x^2+y^2), Q = x/(x^2+y^2)$。

验证 $(partial Q)/(partial x) - (partial P)/(partial y) = 0$（在 $(0,0)$ 以外成立），但原点是*奇点*！

原点在 $L$ 内部 → *不能直接用格林公式*说结果为 $0$。

直接参数化：$x = cos t, y = sin t, t in [0, 2pi]$

$ = integral_0^(2pi) ((-sin t)(-sin t) + (cos t)(cos t)) / 1 dif t = integral_0^(2pi) 1 dif t = 2pi $

*题 H2*：$integral.cont_L (-y dif x + x dif y) / (x^2 + y^2)$，$L$ 为 $(x-3)^2 + y^2 = 1$ 逆时针。

*解*：同样的被积函数，但 $L$ 围的区域不包含原点 → 区域内 $(partial Q)/(partial x) = (partial P)/(partial y)$ 处处成立 → *可以*用格林公式。

$ integral.cont_L = integral.double_D 0 dif x dif y = 0 $

#warning-box[
  *同样的被积函数，不同的结果*！关键在于*奇点是否在积分域内部*：
  - 奇点在里面 → 不能用格林公式，必须直接算或挖洞
  - 奇点在外面 → 可以用格林公式，$= 0$
]

===== 对比组 I：补面技巧

*题 I1*：$integral.double_Sigma x dif y dif z + y dif z dif x + z^2 dif x dif y$，$Sigma$ 为 $z = sqrt(1 - x^2 - y^2)$（上半球面），取上侧。

*解*：非闭合 → 补底面 $Sigma_1: z = 0, x^2 + y^2 <= 1$（取下侧，即法向量朝 $z$ 轴负方向）。

$Sigma + Sigma_1$ 构成闭曲面，用高斯公式：

$ (partial P)/(partial x) + (partial Q)/(partial y) + (partial R)/(partial z) = 1 + 1 + 2z = 2 + 2z $

$ integral.surf_(Sigma + Sigma_1) = integral.triple_Omega (2 + 2z) dif V $

$Omega$ 为上半球体。$integral.triple_Omega 2 dif V = 2 dot 2/3 pi = (4pi)/3$

$integral.triple_Omega 2z dif V$：球坐标 $= 2 integral_0^(2pi) dif phi integral_0^(pi/2) integral_0^1 r cos theta dot r^2 sin theta dif r dif theta dif phi = 2 dot 2pi dot 1/2 dot 1/4 = pi/2$

$integral.surf = (4pi)/3 + pi/2 = (11pi)/6$

再算 $Sigma_1$ 上的贡献：$z = 0$，法向量朝下（$cos gamma < 0$），取下侧。

$integral.double_(Sigma_1) x dif y dif z + y dif z dif x + z^2 dif x dif y$

$Sigma_1$ 垂直于 $z$ 轴 → $dif y dif z = 0, dif z dif x = 0$（投影到 $y O z$ 面和 $z O x$ 面为 $0$），$z^2 = 0$

所以 $integral.double_(Sigma_1) = 0$

最终 $integral.double_Sigma = (11pi)/6 - 0 = (11pi)/6$

#tip-box[
  *补面做题套路*：
  1. 补一个面使曲面闭合
  2. 用高斯公式算闭曲面的积分
  3. 再单独算补面的积分
  4. 原面积分 $=$ 闭曲面积分 $-$ 补面积分
]

=== 方法选择决策树总结

#note-box[
  *第一步：判断积分类型*
  - 积分域是平面区域 $D$ → 二重积分
  - 积分域是空间区域 $Omega$ → 三重积分
  - 积分域是曲线 $L$，微元 $dif s$ → 第一类线积分
  - 积分域是曲线 $L$，微元 $dif x, dif y$ → 第二类线积分
  - 积分域是曲面 $Sigma$，微元 $dif S$ → 第一类面积分
  - 积分域是曲面 $Sigma$，微元 $dif y dif z$ 等 → 第二类面积分

  *第二步：选计算策略*
  - 第一类线积分 → 参数化，乘 $sqrt(x'^2 + y'^2)$
  - 第二类线积分：
    - 闭合 + 平面 → *格林公式*
    - 闭合 + 空间 → *斯托克斯公式*
    - $(partial P)/(partial y) = (partial Q)/(partial x)$ → 与路径无关，换简单路径或用端点值
    - 其他 → 直接参数化
  - 第一类面积分 → 投影，乘 $sqrt(1 + z_x^2 + z_y^2)$，积极利用对称性
  - 第二类面积分：
    - 闭合 → *高斯公式*
    - 非闭合 → 投影法，或补面后用高斯
  - 二重/三重积分 → 选合适坐标系（极坐标/柱坐标/球坐标）

  *第三步：检查*
  - 第一类：结果应 $>= 0$（当 $f >= 0$ 时）
  - 第二类：结果可正可负，检查方向/侧是否正确
  - 用公式前检查：闭合？单连通？无奇点？
]

== 无穷级数

== 常微分方程
