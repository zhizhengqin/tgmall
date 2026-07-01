# Railway 部署实施方案

## TG Mall — 柬埔寨 Telegram Mini App 电商平台

> **文档版本**：V1.0  
> **编制日期**：2026 年 6 月 6 日  
> **适用对象**：无服务器运维经验的小白开发者  
> **预计耗时**：30-45 分钟（首次）  
> **费用**：约 $5/月（Railway Hobby 计划）  

---

## 目录

- [零、前置知识：我要做什么？](#零前置知识我要做什么)
- [一、准备工作（一次性，5 分钟）](#一准备工作一次性5-分钟)
- [二、创建 Railway 项目（5 分钟）](#二创建-railway-项目5-分钟)
- [三、添加数据库和缓存（5 分钟）](#三添加数据库和缓存5-分钟)
- [四、配置环境变量（10 分钟）](#四配置环境变量10-分钟)
- [五、部署项目（5 分钟）](#五部署项目5-分钟)
- [六、配置 Telegram Mini App（5 分钟）](#六配置-telegram-mini-app5-分钟)
- [七、手机测试验证（5 分钟）](#七手机测试验证5-分钟)
- [八、日常维护](#八日常维护)
- [九、故障排查](#九故障排查)
- [十、架构解释：为什么这样部署？](#十架构解释为什么这样部署)

---

## 零、前置知识：我要做什么？

### 用大白话说

你现在有一份代码在 GitHub 上（就是你电脑里这个 TG Mall 项目）。你想在手机上通过 Telegram 打开你的小程序进行测试。

**问题**：Telegram 要求小程序的网址必须是 HTTPS（就是浏览器地址栏带锁的那种），你电脑上的 `localhost` 不行。

**解决方案**：把代码部署到 Railway（一个云服务平台）。Railway 会自动给你一个 HTTPS 网址，你把这个网址填到 Telegram 里就行了。

### 部署后的效果

```
用户在 Telegram 打开你的 Bot
        ↓
     Mini App 加载
        ↓
  https://xxx.up.railway.app  ← Railway 提供的 HTTPS 网址
        ↓
  ┌─────────────────────────┐
  │  Nginx（门卫）           │
  │  /        → 前端页面     │
  │  /api/    → 后端 API     │
  └─────────────────────────┘
        ↓
  Node.js 后端 ←→ PostgreSQL（数据库）
               ←→ Redis（缓存）
```

### 你需要准备的东西

| 准备项 | 说明 | 去哪儿弄 |
|--------|------|----------|
| GitHub 账号 | 代码托管 | github.com 免费注册 |
| Railway 账号 | 云部署平台 | railway.com 用 GitHub 登录 |
| Telegram Bot Token | 机器人密钥 | @BotFather 创建 |
| 一张信用卡 | Railway 需要绑定 | 用于月费扣款，Hobby 计划 $5/月 |

---

## 一、准备工作（一次性，5 分钟）

### 1.1 确认代码已推送到 GitHub

打开浏览器，访问：`https://github.com/zhizhengqin/tgmall`

确认能看到以下文件（说明代码推送成功）：
- ✅ `Dockerfile.railway`（Railway 部署文件）
- ✅ `railway.toml`（Railway 配置文件）
- ✅ `tgmall-api/`（后端代码目录）
- ✅ `tgmall-miniapp/`（小程序前端目录）

### 1.2 注册 Railway 账号

1. 打开浏览器，访问：https://railway.com
2. 点击右上角 **"Login"**
3. 选择 **"Login with GitHub"**（用 GitHub 账号登录）
4. 授权 Railway 访问你的 GitHub 仓库

**为什么要用 GitHub 登录？**  
Railway 需要读取你的 GitHub 仓库来部署代码。GitHub 登录是最安全的方式，Railway 不会拿到你的 GitHub 密码。

### 1.3 绑定信用卡

1. 登录 Railway 后，点击左下角 **Settings（设置）**
2. 选择 **"Billing"（账单）**
3. 点击 **"Add Payment Method"（添加支付方式）**
4. 输入信用卡信息

**为什么要绑卡？**  
Railway 的免费计划已经取消了。Hobby 计划每月 $5，包含了 500 小时的运行时间。测试阶段 $5 够用。

> 💡 **省钱技巧**：不测试的时候可以在 Railway 上点 "Sleep" 暂停服务，就不计费了。

### 1.0 我 Railway 上已经部署了别的项目，有影响吗？

**完全没有影响，放心部署。**

Railway 的隔离机制是这样的：

```
你的 Railway 账号
├── 项目 A：paygo（已部署）    ← 独立运行，互不干扰
│   ├── Web 服务
│   ├── PostgreSQL A           ← 数据库 A，只属于 paygo
│   └── Redis A                ← 缓存 A，只属于 paygo
│
└── 项目 B：tgmall（新部署）   ← 独立运行，互不干扰
    ├── Web 服务
    ├── PostgreSQL B           ← 数据库 B，只属于 tgmall
    └── Redis B                ← 缓存 B，只属于 tgmall
```

**四条隔离保证：**

| 维度 | 说明 |
|------|------|
| 数据隔离 | tgmall 的数据库和 paygo 的数据库是**两个完全独立的 PostgreSQL 实例**，表和数据不会混在一起 |
| 网络隔离 | 两个项目分配不同的子域名（`xxx.up.railway.app`），互不冲突 |
| 环境变量隔离 | 每个项目有自己独立的 Variables 设置，`JWT_SECRET` 和 `BOT_TOKEN` 不会串 |
| 费用隔离 | Railway 按服务数量计费，两个 Web 服务 = 两份费用 |

**你唯一需要注意的是费用：**

| 项目 | 服务数 | 预估月费 |
|------|--------|----------|
| paygo（已部署） | Web + PG + Redis ？| 视已有配置 |
| tgmall（新部署） | Web + PG + Redis | ~$5/月 |
| **合计** | | **两个项目费用独立计算** |

> 💡 **建议**：两个项目不同时测试。不用的那个在 Railway 上点 "Sleep"，暂停计费。

**你已有的 paygo 经验反而是优势：**
- ✅ 你不需要重新注册 Railway 账号
- ✅ 你不需要重新绑信用卡
- ✅ 你熟悉 Railway 的界面布局
- ✅ 你知道怎么查看日志、怎么重启服务

---

## 二、创建 Railway 项目（5 分钟）

### 2.1 新建项目

1. Railway 首页 → 点击蓝色大按钮 **"New Project"**

### 2.2 选择部署方式

1. 选择 **"Deploy from GitHub repo"**

### 2.3 选择仓库

1. 在搜索框输入 `tgmall`
2. 选择 `zhizhengqin/tgmall`
3. Railway 会自动读取项目中的 `railway.toml`，识别为一个 Web 服务

### 2.4 观察项目面板

此时你会看到项目页面，中间是一个服务卡片。

**先不要点 Deploy！** 我们还需要添加数据库。

<details>
<summary>点击展开：程序员的解释</summary>

`railway.toml` 告诉 Railway：
- `dockerfilePath = "Dockerfile.railway"` → 用这个文件构建 Docker 镜像
- `healthcheckPath = "/api/v1/health"` → 每 30 秒检查这个接口，如果挂了就自动重启
- `restartPolicyType = "ON_FAILURE"` → 只有崩溃时才重启，不浪费运行时间

Docker 镜像是什么？你可以理解为一个"打包好的运行环境"——里面包含了 Node.js、Nginx、你的代码、所有依赖，像一个迷你虚拟机。
</details>

---

## 三、添加数据库和缓存（5 分钟）

### 3.1 添加 PostgreSQL（数据库）

1. 在项目面板，点击右上角 **"+ New"** 按钮
2. 选择 **"Database"** → 选择 **"Add PostgreSQL"**
3. 等待 1-2 分钟，PostgreSQL 卡片出现

**自动发生的事情**（你不需要手动做）：
- ✅ Railway 创建了一个 PostgreSQL 数据库
- ✅ 自动生成一个连接地址，存入 `DATABASE_URL` 环境变量
- ✅ 自动生成一个公网可访问的连接地址 `DATABASE_PUBLIC_URL`

### 3.2 添加 Redis（缓存）

1. 同样点击 **"+ New"** → **"Database"** → **"Add Redis"**
2. 等待 1-2 分钟，Redis 卡片出现

**自动发生的事情**：
- ✅ Railway 创建了一个 Redis 实例
- ✅ 自动生成 `REDIS_URL` 环境变量

### 3.3 检查服务列表

添加完成后，项目面板应该有 3 个卡片：

```
┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
│  tgmall (Web)   │  │  PostgreSQL  │  │    Redis     │
│  状态：待部署    │  │  状态：运行中  │  │  状态：运行中  │
└─────────────────┘  └──────────────┘  └──────────────┘
```

<details>
<summary>点击展开：PostgreSQL 和 Redis 是什么？</summary>

- **PostgreSQL**：一个专业数据库。你的商品信息、用户数据、订单记录都存在这里。
- **Redis**：一个高速缓存。用于临时数据存储——比如购物车内容、支付超时计时、防止重复下单的锁。
- 为什么需要它们？没有数据库，你的小程序就记不住任何东西。每次重启数据就没了。
</details>

---

## 四、配置环境变量（10 分钟）

### 4.1 什么是环境变量？

环境变量就是"配置参数"。你的代码里写了 `process.env.JWT_SECRET`，意思是"从环境变量读取 JWT 密钥"。在 Railway 上设置环境变量，代码就能读取到这些值。

### 4.2 打开环境变量设置

1. 点击 `tgmall` Web 服务卡片
2. 顶部菜单选择 **"Variables"（变量）**
3. 点击 **"New Variable"** 逐个添加

### 4.3 需要添加的变量清单

#### 4.3.1 获取 MINI_APP_URL（你的公网地址）

部署完成后 Railway 会分配一个域名，但在配置环境变量时需要先占位。**可以先部署一次拿到域名后再回来补上**，或者按以下方式处理：

1. 先随便填一个占位值（如 `https://placeholder.up.railway.app`）
2. 完成首次部署后，在 Railway → tgmall 服务 → Settings → Public Networking 找到真实域名
3. 复制真实域名，回到 Variables 修改 `MINI_APP_URL`
4. 重新部署一次（Railway 会自动检测修改并重新部署）

**MINI_APP_URL 的作用**：
- Bot 菜单按钮点击后打开的网址
- 扫码进入 Mini App 时跳转的目标地址
- Telegram Mini App 必须通过这个 HTTPS 地址加载

#### 数据库和缓存（自动注入，检查即可）

| 变量名 | 来源 | 状态 |
|--------|------|------|
| `DATABASE_URL` | 添加 PostgreSQL 时自动 | 已有 ✅ |
| `REDIS_URL` | 添加 Redis 时自动 | 已有 ✅ |

#### 必须手动添加的变量

| 变量名 | 值 | 说明 | 怎么获取 |
|--------|-----|------|----------|
| `BOT_TOKEN` | `123456:ABCdef...` | Telegram Bot Token | 看下方 4.4 |
| `BOT_USERNAME` | `xhzmall_bot` | Telegram Bot 用户名（不含@） | 看下方 4.4 |
| `MINI_APP_URL` | `https://xxx.up.railway.app` | Mini App 公网地址 | 看下方 4.3.1 |
| `JWT_SECRET` | `a1b2c3d4...` | JWT 签名密钥 | 看下方 4.5 |
| `ADMIN_PASSWORD` | `your-secure-password` | 默认管理员 `admin` 的登录密码 | 看下方 4.6 |
| `NODE_ENV` | `production` | 生产模式 | 直接填写 |

> ⚠️ **重要**：`BOT_TOKEN` 直接控制着你的 Telegram Bot，**绝对不要**分享给别人或在公开场合展示。

#### 可选添加的变量（支付相关，开发阶段可不填）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `BAKONG_WEBHOOK_SECRET` | `随机字符串` | Bakong KHQR 支付回调签名密钥 |
| `ABA_PAY_SECRET` | `随机字符串` | ABA Pay 支付回调签名密钥 |
| `WING_PAY_SECRET` | `随机字符串` | Wing Pay 支付回调签名密钥 |

> 💡 这三个支付密钥在**接入真实支付前不需要配置**。当前开发阶段使用模拟支付模式，不影响部署和测试。

#### 不需要手动添加的变量

| 变量名 | 说明 |
|--------|------|
| `PORT` | Railway 自动注入，Nginx 监听用，**不要手动设置** |
| `DATABASE_URL` | 添加 PostgreSQL 时自动生成 |
| `REDIS_URL` | 添加 Redis 时自动生成 |

### 4.4 获取 BOT_TOKEN 和 BOT_USERNAME

#### 获取 BOT_TOKEN

1. 在 Telegram 搜索 **@BotFather**（注意是带勾的官方账号）
2. 发送命令 `/mybots`
3. 点击你的 Bot 名称
4. 点击 **"API Token"**
5. 你会收到一串类似 `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` 的字符
6. 复制整串，粘贴到 Railway 的 `BOT_TOKEN` 变量中

> 如果还没有 Bot，发 `/newbot` 给 BotFather，按提示创建。

#### 获取 BOT_USERNAME

你的 Bot 用户名就是 Telegram 上的 `@xxx_bot` 形式，**不带 @ 符号**。

例如你的 Bot 是 `@xhzmall_bot`，那 `BOT_USERNAME` 就填：
```
xhzmall_bot
```

**为什么要填这个？** 代码需要知道 Bot 用户名来生成扫码链接（`https://t.me/xhzmall_bot?startapp=...`）。

### 4.5 生成随机密钥

打开电脑的 **终端（Terminal）**，运行以下命令：

```bash
# 生成 JWT_SECRET（32 位随机字符串）
openssl rand -hex 32
```

输出类似：`a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a`

再运行一次，生成第二组：

```bash
openssl rand -hex 16
```

输出类似：`f1a2b3c4d5e6f7a8`

**分配密钥：**

| 变量 | 用哪个 |
|------|--------|
| `JWT_SECRET` | 32 位那个（第一组） |
| `BAKONG_WEBHOOK_SECRET` | 16 位那个（第二组） |
| `ABA_PAY_SECRET` | 随便再生成一个 16 位的 |
| `WING_PAY_SECRET` | 随便再生成一个 16 位的 |

**为什么要随机生成？—— JWT 签名密钥的作用**

JWT 签名密钥就像**一个私人印章**。后端签发 Token 时盖章，验证 Token 时核对印章。没有这个密钥的人，无法伪造 Token。

以你的项目为例，用户登录后发生了什么：

```
用户打开 Mini App
    │
    ▼
POST /api/v1/auth/telegram
    │
    ▼
后端签发 JWT Token（用 JWT_SECRET 签名）
  ┌─────────────────────────────────────┐
  │ Token = 头部.载荷.签名               │
  │                                     │
  │ 头部:  {"alg":"HS256"}              │
  │ 载荷:  {"userId":"xxx","role":"user"}│
  │ 签名:  HMAC-SHA256(头部+载荷, 密钥)  │  ← JWT_SECRET 在这里用
  └─────────────────────────────────────┘
    │
    ▼
返回给前端。之后每个 API 请求都带上：
  Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

验证时，后端用同样的 JWT_SECRET 重新计算签名，和 Token 中的签名比对：
- **相等** → 信任 Token 里的 userId 和 role → 允许访问
- **不等** → Token 被篡改过 → 401 拒绝

**如果密钥太弱会发生什么：**

| 场景 | 后果 |
|------|------|
| JWT_SECRET 为空 | 攻击者可以用 `undefined` 自签 Token，role 写 `admin`，**直接成为管理员** |
| JWT_SECRET = "my-secret" | 攻击者尝试 100 个常见弱密钥，猜对一个就能伪造成任何人 |
| JWT_SECRET = 32 位随机 | 需要尝试 2^256 次，**物理上不可能破解** |

**类比**：JWT_SECRET 就像你家门锁的钥匙。如果钥匙是 "1234"（弱密码），小偷试几次就进来了。如果是随机生成的 256 位密钥，就等于一把无法复制的锁。

### 4.6 设置管理员密码

管理后台使用用户名 `admin` + 密码登录。`ADMIN_PASSWORD` 是默认管理员账号的密码来源：

1. 在 Railway 项目 → Variables 里添加 `ADMIN_PASSWORD`。
2. 填写一个**强密码**（建议 16 位以上，包含大小写字母、数字和符号）。
3. 首次部署时，种子脚本（`prisma/seed.js`）会自动创建默认管理员用户 `admin`，并使用 `ADMIN_PASSWORD` 的 bcrypt 哈希作为密码。

> ⚠️ **重要**：`ADMIN_PASSWORD` 直接决定谁能进入管理后台。请使用强密码，且**不要**在公开场合展示。
> 
> 如果忘记密码，只需在 Railway Variables 中修改 `ADMIN_PASSWORD` 的值，然后重新部署；种子脚本会在启动时更新 `admin` 用户的密码哈希。

### 4.7 全部添加完成后的样子

Railway Variables 页面应该类似：

```
DATABASE_URL           postgresql://postgres:xxx@xxx.railway.internal:5432/railway
REDIS_URL              redis://default:xxx@xxx.railway.internal:6379
BOT_TOKEN              1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
BOT_USERNAME           xhzmall_bot
MINI_APP_URL           https://tgmall-production-xxxx.up.railway.app
JWT_SECRET             a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a
ADMIN_PASSWORD         your-secure-password
NODE_ENV               production

# 可选：支付密钥（接入真实支付前可不填）
BAKONG_WEBHOOK_SECRET  f1a2b3c4d5e6f7a8
ABA_PAY_SECRET         g1a2b3c4d5e6f7a8
WING_PAY_SECRET        h1a2b3c4d5e6f7a8
```

---

## 五、部署项目（5 分钟）

### 5.1 首次部署

1. 点击 `tgmall` Web 服务卡片
2. 顶部菜单选择 **"Deployments"（部署）**
3. 如果还没有自动开始，点击 **"Deploy"** 按钮

### 5.2 观察部署过程

点击部署后，你会看到日志输出。正常流程：

```
[1/5] Building Docker image...       ← 构建镜像（3-5 分钟）
[2/5] Running Prisma Migration...    ← 创建数据库表
[3/5] Starting supervisord...        ← 启动进程管理
[4/5] Starting Node.js...            ← 启动后端
[5/5] Starting Nginx...              ← 启动 Web 服务器
✅ Deploy successful!
```

**等待 3-5 分钟**。第一次构建会比较慢（需要下载依赖），后续部署会快很多（Railway 有缓存）。

### 5.3 验证部署成功

1. 部署完成后，在 Railway → tgmall 服务 → **Settings** → **Public Networking**
2. 复制显示的域名，类似：`tgmall-production-xxxx.up.railway.app`
3. 在浏览器打开：`https://你的域名.up.railway.app/api/v1/health`
4. 如果看到 `{"status":"ok","timestamp":"..."}` → 部署成功！
5. 同时检查 Railway Variables，把真实域名更新到 `MINI_APP_URL` 中

### 5.4 重新部署（更新 MINI_APP_URL 后）

如果你之前用占位值填了 `MINI_APP_URL`，现在拿到了真实域名：

1. Railway → tgmall 服务 → **Variables**
2. 修改 `MINI_APP_URL` 为真实域名
3. Railway 会自动检测到变量变化并重新部署
4. 等待 2-3 分钟，再次访问健康检查接口确认

### 5.4 生成自定义域名（可选）

Railway 的默认域名比较长，你可以设置一个短的：

1. 服务 Settings → **"Public Networking"**
2. 在 **"Custom Domain"** 部分输入你想要的名字
3. Railway 会给你一个完整域名

<details>
<summary>点击展开：部署过程发生了什么？</summary>

1. Railway 读取 `Dockerfile.railway`
2. 执行 4 个构建阶段：
   - 安装后端依赖 + 生成 Prisma 代码
   - 构建 Mini App 前端（Vue → HTML/JS/CSS）
   - 构建管理员后台
   - 组装 Nginx + Node.js + 所有静态文件到最终镜像
3. 启动容器后，`railway-start.sh` 先运行数据库迁移，然后同时启动 Nginx 和 Node.js
4. Nginx 监听 8080 端口（Railway 对外暴露的端口），路由规则：
   - `/api/*` → 转发给 Node.js:3000
   - `/` → Mini App 前端页面
   - `/admin/*` → 管理员后台
</details>

---

## 六、配置 Telegram Mini App（5 分钟）

### 6.1 获取公网域名

1. 部署完成后，Railway → tgmall 服务 → **Settings**
2. 找到 **Public Networking** 区域
3. 复制显示的域名，类似：
   ```
   https://tgmall-production-xxxx.up.railway.app
   ```
4. 把这个域名填到 Railway Variables 的 `MINI_APP_URL` 中（如果之前填的是占位值）

### 6.2 设置 Bot 菜单按钮（API 自动配置）

**好消息**：代码已自动处理！

API 启动时会自动调用 `setChatMenuButton`，所有用户打开你的 Bot 都会看到底部固定按钮：

```
┌─────────────────────────────────┐
│  🛒 ចូលទៅហាង  ← 底部固定菜单按钮    │
└─────────────────────────────────┘
```

点击后直接进入 Mini App，无需手动在 BotFather 中配置。

> ⚠️ 如果菜单按钮没有自动出现，可以在 BotFather 中手动设置：Bot Settings → Menu Button → Configure menu button，URL 填入你的 `MINI_APP_URL`。

### 6.3 生成扫码进入的二维码

#### 扫码链接格式

你的扫码链接就是 Telegram 的 Direct Link：

```
https://t.me/xhzmall_bot?startapp=shop
```

#### 生成 QR 码

**快速验证**：把链接贴到 [qr-code-generator.com](https://www.qr-code-generator.com/) 生成 QR 码，打印测试。

**代码自动生成**（管理员后台功能）：
```js
import QRCode from 'qrcode';

// 生成平台推广二维码
const shopUrl = 'https://t.me/xhzmall_bot?startapp=shop';
const qrImage = await QRCode.toDataURL(shopUrl);
// qrImage → base64 图片，下载打印
```

### 6.4 用户扫码后的体验

| 扫码方式 | 效果 |
|---------|------|
| **Telegram 内置扫码** | ✅ 直接打开 Mini App，最佳体验 |
| **微信/相机扫码** | 跳转浏览器 → 提示"在 Telegram 中打开" → 进入 Bot → 点底部按钮 |
| **长按 QR 码识别** | 大部分手机支持，自动跳转 Telegram |

**最推荐**：引导用户**在 Telegram 内长按扫码** 或 **用 Telegram 的扫码功能扫描**。

### 6.5 柬埔寨线下推广物料模板

平台推广 QR 码：

```
┌─────────────────────────────┐
│                             │
│      [QR 码图片]             │
│                             │
│   📱 សឺមើកដើម្បីបើកហាង        │
│      扫码进入商城             │
│                             │
│   🛒 TG Mall - ទំនិញគុណភាព │
│                             │
└─────────────────────────────┘
```

---

## 七、手机测试验证（5 分钟）

### 7.1 手机打开 Mini App

1. 打开手机上的 **Telegram App**（iOS 或 Android）
2. 搜索你的 Bot 名称
3. 点击底部的菜单按钮（"🛒 打开商城"）
4. Mini App 应该在你手机上打开了！

### 7.2 验证清单

| 功能 | 怎么测 | 期望结果 |
|------|--------|----------|
| 首页加载 | 打开 Mini App | 看到商品列表，有图片和价格 |
| 商品详情 | 点击一个商品 | 跳转详情页，有名称/价格/库存 |
| 登录 | 查看是否自动登录 | 不应报错（Telegram 自动注入 initData） |
| 加购 | 点击"加入购物车" | 底部购物车数量 +1 |
| 结算 | 进入购物车 → 结算 | 跳转结算页 |
| 下单 | 填写地址 → 提交 | 跳转支付页或结果页 |

### 7.3 管理员后台测试

1. 先用管理员 Token 登录管理员后台
2. 访问：`https://你的域名.up.railway.app/admin/`
3. 输入管理员 JWT Token → 登录 → 看到看板

### 7.4 手机调试技巧

如果 Mini App 有 bug，可以在手机上看日志：

1. **iOS**：Telegram Settings → 拉到最下面 → 快速点 10 次 "Telegram" 版本号 → 开启调试模式
2. **Android**：Telegram 聊天中输入 `tg://debug` 打开调试
3. 重新打开 Mini App，长按屏幕 → **"Copy Mini App Link"** 或 **"Reload"**

---

## 八、日常维护

### 8.1 更新代码

你本地改了代码，怎么更新到 Railway？

```bash
# 1. 提交代码
git add .
git commit -m "feat: 描述你的改动"
git push origin main

# 2. Railway 自动检测到新 commit → 自动重新部署
# 你不需要在 Railway 上点任何按钮！
```

### 8.2 查看日志

1. Railway → 点击 tgmall 服务
2. 顶部菜单选择 **"Logs"**
3. 点击 **"Deploy Logs"** 查看部署日志
4. 点击 **"Runtime Logs"** 查看运行日志（类似 `console.log` 输出）

### 8.3 暂停服务（省钱）

不测试的时候可以暂停，不计费：

1. Railway → 服务 Settings
2. 点击 **"Sleep"** 按钮
3. 下次需要时点击 **"Wake"** 恢复

### 8.4 数据库备份

Railway 每天自动备份 PostgreSQL。如果要手动备份：

1. Railway → PostgreSQL 卡片
2. 顶部菜单 **"Backups"**
3. 点击 **"Create Backup"**

---

## 九、故障排查

### 部署失败

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| 构建超时 | npm install 太慢 | Railway → Settings → 增加 Build Timeout |
| Prisma migrate 失败 | 数据库连接不对 / OpenSSL 缺失 | 检查 `DATABASE_URL` 是否自动注入；确认 Dockerfile 安装了 `openssl` |
| 容器启动后立即崩溃 | 环境变量缺失（BOT_TOKEN/JWT_SECRET 等） | 检查日志中的 `❌ 缺少必要的环境变量:` 提示 |
| healthcheck 失败 | Nginx 未启动 / Node.js 崩溃 | 看 Runtime Logs 找 `ReferenceError` 或 `nginx` 错误 |
| Node.js 循环崩溃重启 | Prisma OpenSSL 问题 | 确认 Dockerfile 有 `RUN apk add --no-cache openssl libc6-compat` |
| 端口冲突 | Railway PORT=3000 与 Node.js 冲突 | 代码已修复（Node.js 监听 3001，Nginx 监听 PORT），更新代码重新部署 |

### Mini App 打不开

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| 白屏 | JavaScript 报错 | 检查浏览器/F12 控制台 |
| 一直转圈 | API 调用失败 | 检查 Railway 日志中 API 是否有请求 |
| "Bot 未配置" | BotFather URL 填错了 | 确认 URL 用 `https://` 开头 |

### 检查服务是否在运行

```bash
# 在终端中运行（替换成你的 Railway 域名）
curl https://你的域名.up.railway.app/api/v1/health
```

如果返回 `{"status":"ok"}`，说明服务正常。

---

## 十、架构解释：为什么这样部署？

### 10.1 为什么用 Railway 而不是自己买服务器？

| 对比 | Railway | 自己买 VPS |
|------|---------|-----------|
| 部署方式 | GitHub Push 自动 | 手动 SSH + 命令行 |
| HTTPS | 自动配置 | 手动申请 SSL 证书 |
| 数据库 | 一键添加 | 手动安装配置 |
| 监控和重启 | 自动 | 需要额外配置 |
| 适合人群 | 个人开发者/小团队 | 有运维经验的团队 |

**Railway 帮小白解决了最难的三个问题**：HTTPS 证书、数据库运维、自动重启。

### 10.2 为什么单容器而不是多容器？

```
单容器方案（我们现在用的）：
┌──────────────────────────────────────┐
│  Railway 容器                         │
│  ┌────────┐  ┌──────────────────────┐ │
│  │ Nginx  │  │  Node.js API (3000)  │ │
│  │ (8080) │  │  + Prisma            │ │
│  │ + 前端 │  │                      │ │
│  └────────┘  └──────────────────────┘ │
└──────────────────────────────────────┘

多容器方案（生产环境推荐）：
┌─────────┐  ┌─────────┐  ┌─────────┐
│ 前端 CDN │  │ API 服务 │  │ 数据库  │
│ (免费)   │  │ ($5/月)  │  │ ($5/月) │
└─────────┘  └─────────┘  └─────────┘
```

**为什么现在用单容器？**
- 只需要一个 Railway 服务 = $5/月
- 部署简单，一个人就能搞定
- 测试阶段访问量不大，一个容器完全够

**什么时候需要多容器？**
- 日活用户超过 1000 人
- 前端需要 CDN 加速（柬埔寨用户网络较慢）
- 需要独立扩容 API 服务

### 10.3 Dockerfile.railway 的 4 个阶段

```
Stage 1: api-build     → 安装后端依赖 + 生成 Prisma 代码
Stage 2: miniapp-build → npm ci + vite build → dist/
Stage 3: admin-build   → npm ci + vite build → dist/
Stage 4: 最终镜像       → Nginx + Node.js + 所有 dist/
```

**为什么分阶段？** 每个阶段可以并行缓存。如果只改了后端代码，前端阶段会直接用缓存，构建速度从 8 分钟降到 2 分钟。

### 10.4 Nginx 的角色

```
用户请求 → Nginx (8080) → 判断 URL 路径
                          ├── /api/*    → 转发 Node.js:3000
                          ├── /admin/   → 静态文件
                          └── /         → Mini App 前端
```

Nginx 在这里是一个"门卫"——根据 URL 路径，把请求分发到正确的处理者。它比 Node.js 更擅长处理静态文件（HTML/JS/CSS/图片），性能高出 10 倍以上。

### 10.5 环境变量 vs 硬编码

```javascript
// ❌ 硬编码在代码中（危险！）
const BOT_TOKEN = '123456:abcdef';

// ✅ 从环境变量读取（安全）
const BOT_TOKEN = process.env.BOT_TOKEN;
```

**为什么？** 如果 Bot Token 写在代码里，任何人看到你的 GitHub 仓库就能获得你的 Bot 控制权。环境变量存储在 Railway 的设置中，不会出现在代码里，即使仓库是公开的也不会泄露。

---

## 附录：Railway 资源限制

| 资源 | Hobby 计划 ($5/月) | Pro 计划 ($20/月) |
|------|-------------------|-------------------|
| 运行时间 | 500 小时/月 | 无限 |
| 内存 | 512 MB | 2 GB |
| CPU | 0.5 vCPU | 1 vCPU |
| 构建时间 | 100 分钟/月 | 200 分钟/月 |
| PostgreSQL | 1 GB 存储 | 10 GB 存储 |
| Redis | 128 MB | 1 GB |
| 适合 | 开发测试 | 小规模生产 |

---

*部署顺利！有任何问题随时问。*
