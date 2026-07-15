# TG Mall 小商城演示操作手册

> **文档版本**：V1.0  
> **更新日期**：2026-07-15  
> **系统地址**：https://tgmall-production.up.railway.app  
> **管理后台**：https://tgmall-production.up.railway.app/admin  
> **适用对象**：面向客户/投资方的运营/产品演示人员、内部新员工培训  
> **演示时长**：约 25–35 分钟（可根据受众关注点裁剪）  
> **演示账号**：admin / admin123

---

## 1. 演示前准备

### 1.1 环境与账号

| 项目           | 内容                                                 | 备注                                                     |
| ------------ | -------------------------------------------------- | ------------------------------------------------------ |
| 生产地址         | https://tgmall-production.up.railway.app           | 已部署最新代码与演示数据                                           |
| Telegram Bot | @xhzmall_bot                                       | 客户用手机 Telegram 搜索进入                                    |
| 管理后台         | https://tgmall-production.up.railway.app/admin/    | 用电脑浏览器打开                                               |
| 管理员账号        | admin                                              | 默认密码 `admin123`（可通过 Railway 环境变量 `ADMIN_PASSWORD` 自定义） |
| 演示城市         | 金边（Phnom Penh）/ 暹粒（Siem Reap）/ 西哈努克（Sihanoukville） | 优先用金边，数据最完整                                            |

### 1.2 演示数据速查

| 数据类型   | 数量   | 示例                                               |
| ------ | ---- | ------------------------------------------------ |
| 商品     | 12 个 | 男士运动跑鞋 $18.50、无线蓝牙耳机 $28、家用安防摄像头 $45 等           |
| 商品分类   | 5 个  | 时尚 / 美妆 / 电子 / 家居 / 食品                           |
| 商品标签   | 5 个  | 新品 / 热销 / 特惠 / 爆款 / 精选                           |
| Banner | 3 张  | 本周特价 / 全场低至 5 折 / 金边免费配送                         |
| 限时专区   | 3 个  | 蓝牙耳机 $19.90、哑光口红 $8.50、咖啡豆 $7.50                 |
| 优惠券    | 4 张  | 满 $20 减 $5 / 满 $15 9 折 / 满 $50 减 $10 / 满 $10 免运费 |
| 订单     | 8 个  | 覆盖待付款 / 已付款 / 已确认 / 已发货 / 已完成 / 已取消              |
| 用户     | 3 个  | Sopheap / 李华 / Sreyneang（用于订单展示）                 |
| 反馈工单   | 3 条  | 高棉语 / 中文 / 英文各一条                                 |

### 1.3 设备与网络

- 准备一台 **iPhone/Android** 演示手机，已登录 Telegram。
- 电脑打开管理后台，方便两边对照演示。
- 建议提前 5 分钟打开首页和后台，确认网络通畅。
- 如客户没有 Telegram，可改用浏览器直接访问 `https://tgmall-production.up.railway.app` 体验 H5 版（部分功能受限）。

---

## 2. 演示总览

### 2.1 系统角色与模块

TG Mall 采用**公司自营模式**，包含两大核心模块：

| 模块                    | 角色   | 核心能力                                        |
| --------------------- | ---- | ------------------------------------------- |
| **Telegram Mini App** | 消费者  | 浏览商品、加购下单、选择支付方式、查看订单、领取优惠券、提交反馈            |
| **Admin 运营后台**        | 平台运营 | 商品管理、订单处理、库存调整、优惠券运营、Banner/分类/城市配置、用户与反馈管理 |

### 2.2 推荐演示顺序与时长

| 顺序  | 环节              | 时长   | 目的       |
| --- | --------------- | ---- | -------- |
| 1   | 进入商城 + 首页浏览     | 5 分钟 | 建立第一印象   |
| 2   | 商品详情 + 加购       | 4 分钟 | 展示购物体验   |
| 3   | 购物车 + 结算 + 下单   | 5 分钟 | 展示交易闭环   |
| 4   | 订单追踪 + 优惠券 + 收藏 | 3 分钟 | 展示用户粘性   |
| 5   | 后台登录 + 看板       | 3 分钟 | 展示运营视角   |
| 6   | 商品管理 + 订单管理     | 6 分钟 | 展示核心运营能力 |
| 7   | 运营配置 + 库存/优惠券   | 4 分钟 | 展示灵活性    |
| 8   | 用户/反馈管理 + 系统设置  | 2 分钟 | 展示完整闭环   |

### 2.3 核心闭环流程图

```
消费者端：首页 → 搜索/分类 → 商品详情 → 加购 → 购物车 → 结算 → 支付 → 订单追踪
                    ↑_________________________________________________↓
                                        优惠券 / 收藏 / 客服反馈

运营后台：商品上架 → 库存管理 → 订单处理 → 发货 → 售后/反馈
              ↑________↓
        Banner / 分类 / 城市 / 优惠券 / 平台配置
```

---

## 3. 消费者端演示（Telegram Mini App）

> 环境：Telegram Mini App（移动端适配 · 默认高棉语 · 支持 Km/中/En 三语切换）  
> 截图以中文界面为主，便于国内团队和客户阅读。

### 3.1 进入商城

1. 在 Telegram 顶部搜索框输入 `@xhzmall_bot`。
2. 点击进入 Bot 聊天窗口，点击底部按钮 **「🛒 ចូលទៅហាង」** 进入 Mini App。

**讲解点**：

- “这是基于 Telegram 的电商小程序，用户无需下载独立 App。”
- “打开速度快，适合柬埔寨 Telegram 用户的使用习惯。”

### 3.2 首页与城市选择

首次进入会弹出城市选择，选择 **金边（Phnom Penh）** 后进入首页。首页包含：

- **顶部**：城市选择器、搜索栏、语言切换按钮（Km/中/En）
- **Banner 区**：轮播促销广告
- **品类横滑**：时尚 / 美妆 / 电子 / 家居 / 食品
- **限时专区**：促销商品横滑
- **商品双列网格**：商品列表（WebP 图片 + 双币种价格）

![首页](demo-guide/screenshots/miniapp/01-homepage.png)

点击顶部品类标签可筛选不同分类商品。下图展示切换到「饮料」品类后的效果：

![品类切换](demo-guide/screenshots/miniapp/02-homepage-category-switched.png)

**讲解点**：

- “所有价格都同时显示 USD 和 KHR，方便本地消费者。”
- “城市会影响 Banner、运费和起送金额，后台可配置。”
- “界面支持高棉语、中文、英语一键切换。”

### 3.3 商品浏览与搜索

#### 分类浏览

底部导航点击「分类」进入分类页，按品类树浏览商品，支持左侧一级分类 + 右侧二级分类布局：

![分类页](demo-guide/screenshots/miniapp/05-category-page.png)

#### 搜索商品

点击首页顶部搜索栏进入搜索页，输入关键词（如 "water"）可实时搜索匹配商品：

![搜索页](demo-guide/screenshots/miniapp/09-search-page.png)

![搜索结果](demo-guide/screenshots/miniapp/10-search-results.png)

**讲解点**：

- “分类和排序支持后台配置，网格/列表偏好会自动记住。”
- “搜索支持商品名称多语言匹配。”

### 3.4 商品详情与加购

点击任意商品卡片进入详情页，包含：

- **图片轮播**：左右滑动查看多张商品图
- **价格信息**：USD/KHR 双币种实时显示
- **商品标签**：新品、热卖、折扣等标签
- **规格选择**：尺寸/口味等 SKU 选择（如适用）
- **三语切换**：详情页支持高棉语/英语/中文切换
- **数量调节**：加减按钮控制购买数量
- **收藏按钮**：❤️ 添加/取消收藏

![商品详情](demo-guide/screenshots/miniapp/03-product-detail.png)

选择规格和数量后，点击「加入购物车」。成功加入后，底部导航购物车图标会出现角标提示：

![已加入购物车](demo-guide/screenshots/miniapp/payment-03-product-added.png)

**讲解点**：

- “规格和库存是联动的，不同颜色/尺码价格可不同。”
- “商品标签、库存预警都在后台统一配置。”
- “商品名称和描述支持中、柬、英三语。”

### 3.5 购物车与结算

底部导航点击「购物车」查看已加入商品，支持修改数量、删除商品、查看合计金额：

![购物车](demo-guide/screenshots/miniapp/06-cart-page.png)

商品默认全选，底部显示合计金额。确认商品后点击「去结算」：

![购物车已全选](demo-guide/screenshots/miniapp/payment-05-cart-selected.png)

**讲解点**：

- “优惠券按最低消费自动过滤，选择后实时计算优惠。”
- “配送费和免运费门槛按城市后台配置。”

### 3.6 下单与支付（KHQR / COD）

确认订单页展示收货地址、商品清单、配送费、优惠券和支付方式：

![确认订单](demo-guide/screenshots/miniapp/payment-06-checkout.png)

若当前用户还没有收货地址，系统会引导新增地址。下图展示地址选择弹窗：

![选择收货地址](demo-guide/screenshots/miniapp/payment-07-checkout-address.png)

本次演示选择 **KHQR** 扫码支付，点击「提交订单」：

![KHQR 支付页](demo-guide/screenshots/miniapp/payment-08-payment-khqr.png)

在 Demo 模式下，页面显示「模拟扫码支付」按钮，点击即可模拟用户完成扫码支付：

![模拟支付确认](demo-guide/screenshots/miniapp/payment-09-mock-confirm.png)

模拟支付确认后，系统调用支付回调完成订单状态更新，跳转到支付成功页：

![支付成功](demo-guide/screenshots/miniapp/payment-10-success.png)

**讲解点**：

- “目前支持 KHQR 扫码、ABA Pay、Wing Pay、Telegram 支付和 COD 四种支付方式。”
- “线上支付会跳转对应支付页面；COD 由后台确认后发货。”
- “Demo 模式可安全演示完整支付闭环，不影响真实资金。”

> **安全说明**：Demo 模式使用独立的 `/api/v1/auth/demo-login` 端点登录，仅在 `PAYMENT_MOCK_MODE=true` 时启用；生产环境不会注册该路由，真实 Telegram 登录仍通过 `/api/v1/auth/telegram` 进行 HMAC-SHA256 签名校验。

### 3.7 订单追踪与优惠券

支付完成后进入「我的订单」页，可看到刚支付的订单状态：

![订单列表](demo-guide/screenshots/miniapp/payment-11-orders.png)

底部导航点击「我的」进入个人中心，可查看我的订单、收藏夹、优惠券入口、地址管理、客服反馈：

![个人中心](demo-guide/screenshots/miniapp/07-profile-page.png)

进入优惠券中心可查看平台发放的可领取优惠券：

![优惠券中心](demo-guide/screenshots/miniapp/12-coupons-page.png)

**讲解点**：

- “订单状态全链路可追踪，后台可手动推进状态。”
- “优惠券可在后台创建，支持固定金额、百分比、免运费等类型。”
- “收藏功能提升复购率。”

### 3.8 个人中心与客服反馈

消费者可通过手机号（+855 格式）+ 密码登录，也支持手机号 + 短信验证码登录：

![登录页](demo-guide/screenshots/miniapp/08-login-page.png)

在个人中心点击「客服」可跳转 Telegram 客服账号 `@xhzmall_support`，点击「意见反馈」可提交反馈工单。

**讲解点**：

- “Telegram 用户一键授权，无需注册，降低流失。”
- “客服入口直连 Telegram，符合本地用户习惯。”
- “反馈工单可在后台统一处理。”

### 3.9 底部导航总览

底部固定导航栏包含 5 个入口：

| 图标  | 导航项 | 路由          |
| --- | --- | ----------- |
| 🏠  | 首页  | `/`         |
| 🗂️ | 分类  | `/category` |
| 🛒  | 购物车 | `/cart`     |
| 📋  | 订单  | `/orders`   |
| 👤  | 我的  | `/profile`  |

![底部导航](demo-guide/screenshots/miniapp/13-bottom-nav.png)

---

## 4. 运营后台演示（Admin）

> 访问地址：https://tgmall-production.up.railway.app/admin  
> 后台界面语言可通过右上角 **中 / ខ / EN** 一键切换。

### 4.1 登录后台

电脑浏览器打开管理后台，进入登录页面：

![Admin 登录页](demo-guide/screenshots/admin/01-login.png)

输入管理员用户名和密码后点击登录：

![Admin 登录 - 填写凭证](demo-guide/screenshots/admin/02-login-filled.png)

**讲解点**：

- “后台支持用户名密码登录和管理员手机号 OTP 登录。”
- “后续可配置二级权限，区分运营、客服、财务角色。”

### 4.2 数据看板

登录后进入数据看板，可查看平台关键运营指标：订单统计、收入趋势、热门商品等：

![数据看板](demo-guide/screenshots/admin/03-dashboard.png)

**讲解点**：

- “看板数据实时更新，帮助运营快速掌握业务状态。”
- “库存预警商品会高亮提醒，避免超卖。”

### 4.3 商品管理（含三语名称）

左侧菜单进入「商品管理」，可查看所有商品列表。商品名称列同时展示高棉语（主标题）+ 英语/中文（副标题）：

![商品管理](demo-guide/screenshots/admin/04-products.png)

切换后台界面语言后，商品名称的三语展示保持不变：

| 语言  | 截图                                            |
| --- | --------------------------------------------- |
| 中文  | ![商品管理（中文）](qa-guides/admin-products-zh.png)  |
| 英文  | ![商品管理（英文）](qa-guides/admin-products-en.png)  |
| 高棉语 | ![商品管理（高棉语）](qa-guides/admin-products-km.png) |

点击「编辑」可修改商品三语名称、价格、库存、规格、图片等：

![编辑商品](qa-guides/admin-product-edit.png)

**讲解点**：

- “商品支持多规格、多语言、多图展示。”
- “运营人员可同时对照中、柬、英三语名称，避免信息不一致。”
- “库存预警值可设置，低于阈值会在看板提醒。”

### 4.4 库存管理

库存管理页可查看各商品 SKU 的当前库存量，支持库存调整操作和库存变动日志查询：

![库存管理](demo-guide/screenshots/admin/12-inventory.png)

移动端查看同样完整展示三语名称与库存信息：

![库存管理（移动端）](qa-guides/admin-inventory-mobile.png)

**讲解点**：

- “所有库存变更都有日志记录，便于追溯。”
- “支持定期盘点，对比系统库存与实际库存。”

### 4.5 订单管理（筛选、发货、导出）

「订单管理」页展示所有订单，支持按状态筛选（待付款、已付款、配送中、已完成、已取消），可查看订单详情和更新订单状态：

![订单管理](demo-guide/screenshots/admin/05-orders.png)

最新修复后的订单管理页面支持三语状态标签和移动端卡片布局：

| 语言  | 截图                                                 |
| --- | -------------------------------------------------- |
| 中文  | ![订单管理（中文）](qa-guides/admin-orders-zh-v2.png)      |
| 英文  | ![订单管理（英文）](qa-guides/admin-orders-en-v2.png)      |
| 高棉语 | ![订单管理（高棉语）](qa-guides/admin-orders-km-v2.png)     |
| 移动端 | ![订单管理（移动端）](qa-guides/admin-orders-mobile-v2.png) |

点击订单行「详情」进入订单详情页，可查看商品清单、收货地址、支付信息，并填写物流公司和运单号进行发货：

![订单详情（中文）](qa-guides/admin-order-detail-zh.png)

**讲解点**：

- “订单状态支持手动推进，COD 订单确认后发货。”
- “订单数据可导出 CSV，方便财务对账。”
- “后台支持中/柬/英三语，状态标签已按当前语言本地化。”

### 4.6 优惠券管理

支持创建和管理优惠券——满减券、折扣券、免运费券，设置有效期和使用条件：

![优惠券管理](demo-guide/screenshots/admin/07-coupons.png)

修复后的优惠券页面同样支持三语状态标签和移动端适配：

| 语言       | 截图                                                 |
| -------- | -------------------------------------------------- |
| 中文       | ![优惠券（中文）](qa-guides/admin-coupons-zh-v2.png)      |
| 英文       | ![优惠券（英文）](qa-guides/admin-coupons-en-v2.png)      |
| 高棉语      | ![优惠券（高棉语）](qa-guides/admin-coupons-km-v2.png)     |
| 新增弹窗（中文） | ![新增优惠券（中文）](qa-guides/admin-coupon-create-zh.png) |

**讲解点**：

- “优惠券可针对全平台或特定城市发放。”
- “领取与使用数据可实时查看。”

### 4.7 运营配置（Banner / 分类 / 城市 / 配送）

#### Banner 配置

配置首页轮播 Banner——上传图片、设置跳转链接（商品/分类/外部链接）、排序和启用状态：

![Banner 配置](demo-guide/screenshots/admin/08-banners.png)

#### 品类配置

管理商品分类（如食品、饮料、日用品等），支持多语言名称、排序和图标：

![品类配置](demo-guide/screenshots/admin/09-categories.png)

#### 城市管理

配置配送城市和配送费用规则，支持按城市设置不同的运费标准：

![城市管理](demo-guide/screenshots/admin/10-cities.png)

#### 平台设置

全局平台参数配置：平台名称、联系方式、支付方式（KHQR/ABA Pay/Wing Pay/COD）开关等：

![平台设置](demo-guide/screenshots/admin/11-platform.png)

**讲解点**：

- “首页所有模块都可在后台配置，无需改代码。”
- “城市配送规则灵活，支持不同城市的差异化运营。”

### 4.8 用户与反馈管理

「用户管理」页可查看注册用户列表，包括用户基本信息、注册时间、订单数量等。修复后的表头正确区分「名」与「姓」：

| 语言  | 截图                                                |
| --- | ------------------------------------------------- |
| 中文  | ![用户管理（中文）](qa-guides/admin-users-zh-v2.png)      |
| 英文  | ![用户管理（英文）](qa-guides/admin-users-en-v2.png)      |
| 高棉语 | ![用户管理（高棉语）](qa-guides/admin-users-km-v2.png)     |
| 移动端 | ![用户管理（移动端）](qa-guides/admin-users-mobile-v2.png) |

「工单反馈」页可查看用户提交的反馈，支持按状态筛选、标记已处理、查看反馈图片：

| 语言  | 截图                                                   |
| --- | ---------------------------------------------------- |
| 中文  | ![工单反馈（中文）](qa-guides/admin-feedback-zh-v2.png)      |
| 英文  | ![工单反馈（英文）](qa-guides/admin-feedback-en-v2.png)      |
| 高棉语 | ![工单反馈（高棉语）](qa-guides/admin-feedback-km-v2.png)     |
| 移动端 | ![工单反馈（移动端）](qa-guides/admin-feedback-mobile-v2.png) |

**讲解点**：

- “用户数据与订单、收藏、反馈关联，形成完整画像。”
- “反馈工单可分配给客服跟进，状态已本地化展示。”

### 4.9 移动端后台查看

Admin 后台已做移动端适配，手机浏览器访问时表格自动切换为卡片布局。商品管理、库存管理、订单管理、用户管理、优惠券、工单反馈等页面均可在手机上查看和操作。

---

## 5. 端到端业务闭环

### 5.1 消费者下单 → 后台处理 → 发货 → 消费者收货

```
消费者：浏览商品 → 加购 → 结算 → 支付成功 → 查看订单（待发货）
                                  ↓
运营后台：收到新订单 → 确认订单 → 填写物流 → 发货
                                  ↓
消费者：订单状态变为「已发货」 → 确认收货 → 订单完成
```

演示时可选取一个 **COD 已确认** 订单，在后台点击「发货」，填写物流公司和运单号，状态即时变为「已发货」，再在消费者端展示订单状态更新。

### 5.2 运营配置 → 前端展示 → 营销转化

```
运营后台：配置 Banner / 分类 / 城市 / 优惠券 / 商品标签
              ↓
Mini App：首页实时展示配置内容
              ↓
消费者：领取优惠券 → 下单使用 → 提升转化
```

演示时可在后台修改一个 Banner 或创建一张限时优惠券，然后在 Mini App 首页实时刷新查看效果。

---

## 6. 常见问题与应急预案

### 6.1 Mini App 端

| 问题           | 原因             | 应对                       |
| ------------ | -------------- | ------------------------ |
| Mini App 打不开 | Telegram 缓存或网络 | 重新进入 Bot 对话，再次点击按钮；或刷新页面 |
| 城市选择弹窗没出现    | 已选过城市          | 在「我的 → 城市」手动切换           |
| 手机号验证码收不到    | 短信通道未配置或运营商延迟  | 改用 Telegram 一键登录         |
| 真实支付无法跳转     | 支付通道未完全对接      | 用 COD 货到付款演示下单流程         |
| 图片加载慢        | CDN 或网络        | 提前说明“当前为演示环境，正式环境会优化图片”  |

### 6.2 管理后台端

| 问题           | 原因              | 应对                                       |
| ------------ | --------------- | ---------------------------------------- |
| 后台登录失败       | 密码错误            | 联系技术负责人确认 Railway 环境变量 `ADMIN_PASSWORD`  |
| 页面显示 raw key | 多语言键缺失          | 刷新页面；如持续出现，联系开发团队补充 locale               |
| 表格列错位        | 浏览器缩放           | 恢复 100% 缩放或更换浏览器                         |
| 数据与脚本不一致     | seed 被重复运行或部分覆盖 | 以实际页面展示为准，必要时重新运行 `npm run db:seed:demo` |

### 6.3 演示环境特殊说明

- **Demo 支付模式**：当前演示环境已开启 `PAYMENT_MOCK_MODE=true`，可使用模拟支付安全走通 KHQR 流程。
- **地址与订单**：若演示过程中出现地址保存后订单未生成的情况，请使用后台预置的演示订单继续展示订单管理流程。
- **三语内容**：部分商品/分类可能仅填写了高棉语名称，英文/中文留空时会按缺省规则隐藏，属于正常现象。

---

## 7. 附录

### 7.1 截图索引表

#### Mini App 商城页面

| 章节  | 文件名                                         | 说明        |
| --- | ------------------------------------------- | --------- |
| 3.2 | `miniapp/01-homepage.png`                   | 首页        |
| 3.2 | `miniapp/02-homepage-category-switched.png` | 首页 - 品类切换 |
| 3.4 | `miniapp/03-product-detail.png`             | 商品详情      |
| 3.3 | `miniapp/05-category-page.png`              | 分类页       |
| 3.5 | `miniapp/06-cart-page.png`                  | 购物车       |
| 3.7 | `miniapp/07-profile-page.png`               | 个人中心      |
| 3.8 | `miniapp/08-login-page.png`                 | 登录页       |
| 3.3 | `miniapp/09-search-page.png`                | 搜索页       |
| 3.3 | `miniapp/10-search-results.png`             | 搜索结果      |
| 3.7 | `miniapp/11-city-select.png`                | 城市选择      |
| 3.7 | `miniapp/12-coupons-page.png`               | 优惠券中心     |
| 3.9 | `miniapp/13-bottom-nav.png`                 | 底部导航      |

#### 消费者支付全流程（Demo 模式）

| 章节  | 文件名                                       | 说明       |
| --- | ----------------------------------------- | -------- |
| 3.6 | `miniapp/payment-01-homepage.png`         | 首页浏览     |
| 3.6 | `miniapp/payment-02-product-detail.png`   | 商品详情     |
| 3.6 | `miniapp/payment-03-product-added.png`    | 已加入购物车   |
| 3.6 | `miniapp/payment-04-cart.png`             | 购物车      |
| 3.6 | `miniapp/payment-05-cart-selected.png`    | 购物车已全选   |
| 3.6 | `miniapp/payment-06-checkout.png`         | 确认订单     |
| 3.6 | `miniapp/payment-07-checkout-address.png` | 选择/新增地址  |
| 3.6 | `miniapp/payment-08-payment-khqr.png`     | KHQR 支付页 |
| 3.6 | `miniapp/payment-09-mock-confirm.png`     | 模拟支付确认   |
| 3.6 | `miniapp/payment-10-success.png`          | 支付成功     |
| 3.7 | `miniapp/payment-11-orders.png`           | 订单列表     |

#### Admin 后台通用截图

| 章节  | 文件名                         | 说明        |
| --- | --------------------------- | --------- |
| 4.1 | `admin/01-login.png`        | 登录页       |
| 4.1 | `admin/02-login-filled.png` | 登录 - 已填写  |
| 4.2 | `admin/03-dashboard.png`    | 数据看板      |
| 4.3 | `admin/04-products.png`     | 商品管理      |
| 4.5 | `admin/05-orders.png`       | 订单管理      |
| 4.8 | `admin/06-users.png`        | 用户管理      |
| 4.6 | `admin/07-coupons.png`      | 优惠券管理     |
| 4.7 | `admin/08-banners.png`      | Banner 配置 |
| 4.7 | `admin/09-categories.png`   | 品类配置      |
| 4.7 | `admin/10-cities.png`       | 城市管理      |
| 4.7 | `admin/11-platform.png`     | 平台设置      |
| 4.4 | `admin/12-inventory.png`    | 库存管理      |

#### QA 最新多语言/移动端截图

| 章节  | 文件名                                      | 说明        |
| --- | ---------------------------------------- | --------- |
| 4.3 | `qa-guides/admin-products-zh.png`        | 商品管理（中文）  |
| 4.3 | `qa-guides/admin-products-en.png`        | 商品管理（英文）  |
| 4.3 | `qa-guides/admin-products-km.png`        | 商品管理（高棉语） |
| 4.3 | `qa-guides/admin-products-mobile.png`    | 商品管理（移动端） |
| 4.3 | `qa-guides/admin-product-edit.png`       | 编辑商品      |
| 4.3 | `qa-guides/admin-product-add.png`        | 添加商品      |
| 4.4 | `qa-guides/admin-inventory-zh.png`       | 库存管理（中文）  |
| 4.4 | `qa-guides/admin-inventory-en.png`       | 库存管理（英文）  |
| 4.4 | `qa-guides/admin-inventory-km.png`       | 库存管理（高棉语） |
| 4.4 | `qa-guides/admin-inventory-mobile.png`   | 库存管理（移动端） |
| 4.5 | `qa-guides/admin-orders-zh-v2.png`       | 订单管理（中文）  |
| 4.5 | `qa-guides/admin-orders-en-v2.png`       | 订单管理（英文）  |
| 4.5 | `qa-guides/admin-orders-km-v2.png`       | 订单管理（高棉语） |
| 4.5 | `qa-guides/admin-orders-mobile-v2.png`   | 订单管理（移动端） |
| 4.5 | `qa-guides/admin-order-detail-zh.png`    | 订单详情（中文）  |
| 4.6 | `qa-guides/admin-coupons-zh-v2.png`      | 优惠券（中文）   |
| 4.6 | `qa-guides/admin-coupons-en-v2.png`      | 优惠券（英文）   |
| 4.6 | `qa-guides/admin-coupons-km-v2.png`      | 优惠券（高棉语）  |
| 4.6 | `qa-guides/admin-coupon-create-zh.png`   | 新增优惠券（中文） |
| 4.8 | `qa-guides/admin-users-zh-v2.png`        | 用户管理（中文）  |
| 4.8 | `qa-guides/admin-users-en-v2.png`        | 用户管理（英文）  |
| 4.8 | `qa-guides/admin-users-km-v2.png`        | 用户管理（高棉语） |
| 4.8 | `qa-guides/admin-users-mobile-v2.png`    | 用户管理（移动端） |
| 4.8 | `qa-guides/admin-feedback-zh-v2.png`     | 工单反馈（中文）  |
| 4.8 | `qa-guides/admin-feedback-en-v2.png`     | 工单反馈（英文）  |
| 4.8 | `qa-guides/admin-feedback-km-v2.png`     | 工单反馈（高棉语） |
| 4.8 | `qa-guides/admin-feedback-mobile-v2.png` | 工单反馈（移动端） |

### 7.2 相关文档链接

| 文档                 | 路径                                                        | 用途           |
| ------------------ | --------------------------------------------------------- | ------------ |
| 客户演示脚本             | `项目文档/客户演示脚本.md`                                          | 面向客户的口播脚本    |
| 用户操作手册             | `项目文档/用户操作手册.md`                                          | 面向终端消费者的操作说明 |
| 演示指导文档             | `项目文档/demo-guide/DEMO_GUIDE.md`                           | 内部技术演示指导     |
| 订单/用户/优惠券/工单反馈操作手册 | `项目文档/qa-guides/admin-remaining-pages-guide.md`           | 后台四模块详细操作    |
| 商品三语名称操作手册         | `项目文档/qa-guides/admin-products-trilingual-name-guide.md`  | 商品三语名称功能说明   |
| 库存管理操作手册           | `项目文档/qa-guides/admin-inventory-trilingual-name-guide.md` | 库存管理功能说明     |

---

*TG Mall 团队 · 2026*
