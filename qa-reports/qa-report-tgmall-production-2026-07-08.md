# QA Report — TG Mall 全流程 PRD/Backlog 覆盖检查

**Target:** https://tgmall-production.up.railway.app  
**Date:** 2026-07-08  
**Branch:** main  
**Tester:** Claude Code /qa 流程 + 代码静态分析 + 自动化测试  

---

## 执行摘要

本次 QA 依据 `项目文档/产品需求文档_PRD.md` 与 `项目文档/用户故事清单_Backlog.md`，对 TG Mall 小程序端、后端 API、管理后台进行全流程覆盖检查，并同步修复了当前主分支上 4 个已确认的代码缺陷。

### P0 修复状态（后续会话）

| P0 项 | 状态 | Commit | 说明 |
|---|---|---|---|
| P0-04 COD confirmed 状态 | ✅ 已修复 | `2db22c1` | 增加 confirmed Tab/样式，confirmOrder 支持 COD paid → completed |
| P0-05 JWT 24h | ✅ 已修复 | `2db22c1` | 默认 `JWT_EXPIRES_IN` 改为 `24h` |
| P0-06 SMS 真实网关 | ✅ 已修复 | `6e5a00a` | 抽象 SMS provider，接入 Twilio，保留 mock |
| P0-07 itemCount 计算 | ✅ 已修复 | `2db22c1` | 使用 quantity 求和 |
| P0-08 订单详情字段 | ✅ 已修复 | `2db22c1` | 返回 priceBreakdown/timeline/logistics/商品名称缩略图 |
| P0-09 COD 确认收货 | ✅ 已修复 | `2db22c1` | confirmOrder 允许 COD paid 状态确认 |
| P0-10 结算后端快照 | ✅ 已修复 | `ef46848` | 新增 `/cart/checkout-preview`，移除 localStorage 依赖 |
| P0-02 ABA/Wing 验签 | ⚠️ 部分修复 | `28fe16f` | 真实模式使用 HMAC-SHA256；需按 provider 文档最终校准 |
| P0-01 Telegram openInvoice | ✅ 已修复 | 待提交 | 后端 invoice 创建 + webhook，前端 openInvoice 调用 |
| P0-03 SKU 模型 | ✅ 已修复 | 待提交 | 新增 ProductSku 表；cart/order/admin 全流程按 SKU 计算价格库存 |

### 健康基线

| 检查项 | 结果 |
|---|---|
| Mini App 单元测试 | **50 / 50 通过** |
| 后端 API 单元测试 | **251 / 251 通过** |
| Mini App 构建 | **成功** |
| 管理后台构建 | **成功** |
| 生产环境健康检查 | **200 OK /health 正常** |

### 本会话已修复的缺陷

| 缺陷 | 文件 | 状态 | Commit |
|---|---|---|---|
| ProductDetail 加购提示 `t is not defined` | `tgmall-miniapp/src/views/ProductDetail.vue` | 已修复 | `1b33cba` |
| 购物车勾选合计恒为 0 | `tgmall-miniapp/src/views/CartPage.vue` | 已修复 | `a5b9f93` |
| CategoryPage 在 jsdom 中 `localStorage.getItem` 崩溃 | `tgmall-miniapp/src/views/CategoryPage.vue` | 已修复 | `17c4336` |
| CheckoutPage 合计单测断言错误 | `tgmall-miniapp/tests/unit/CheckoutPage.test.js` | 已修复 | `17c4336` |
| CategoryPage 测试与当前侧边栏设计不匹配 | `tgmall-miniapp/tests/unit/CategoryPage.test.js` | 已重写 | `17c4336` |

---

## P0 — 阻塞级缺口（必须在上线前解决）

### P0-01 支付未使用 Telegram 原生支付接口
- **状态：** ✅ 已修复
- **需求/问题：** PRD 要求通过 `Telegram.WebApp.openInvoice` 调起原生支付；当前为自定义支付页。
- **预期：** Checkout 调用 `openInvoice`，通过 `invoiceClosed` 获取结果。
- **修复：**
  - 后端新增 `POST /payments/telegram_invoice`：调用 Bot API `createInvoiceLink` 生成 invoice URL；新增 `POST /webhooks/telegram` 处理 `pre_checkout_query` 与 `successful_payment`。
  - 前端 `PaymentPage.vue` 增加 Telegram Invoice 模板与 `openTelegramInvoice` / `fetchTelegramInvoice`；`CheckoutPage.vue` 与 `PaymentPage.vue` 均支持 `telegram_invoice` 支付方式。
  - 新增 `tgmall-api/src/integrations/telegram_payments.js`、单元测试 `telegram-payments.test.js`。
- **涉及文件：** `tgmall-miniapp/src/views/PaymentPage.vue`、`tgmall-miniapp/src/views/CheckoutPage.vue`、`tgmall-miniapp/src/api/payments.js`、`tgmall-miniapp/src/locales/{km,en,zh}.json`、`tgmall-api/src/integrations/telegram_payments.js`、`tgmall-api/src/services/payment.service.js`、`tgmall-api/src/controllers/payment.controller.js`、`tgmall-api/src/routes/payment.routes.js`、`tgmall-api/src/routes/webhook.routes.js`、`tgmall-api/src/validators/payment.schema.js`、`tgmall-api/src/validators/order.schema.js`、`tgmall-api/tests/unit/telegram-payments.test.js`
- **注意：** 生产环境需配置 `TELEGRAM_PAYMENTS_PROVIDER_TOKEN`；柬埔寨本地支付方式（KHQR/ABA/Wing）能否通过 Telegram Payments 接入仍需业务确认。

### P0-02 ABA Pay / Wing Pay 真实回调未验签
- **状态：** ⚠️ 已接入 HMAC-SHA256 占位，需按 provider 文档校准
- **需求/问题：** 生产环境必须校验支付服务商回调签名，防止伪造支付成功。
- **预期：** 真实模式下按 ABA / Wing 文档验证签名/HMAC。
- **实际（修复前）：** `aba_pay.js` / `wing_pay.js` 的 `verifySignature` 在真实模式直接返回 `false`，会拒绝所有真实回调。
- **修复：** 真实模式改为基于 `ABA_PAY_SECRET` / `WING_PAY_SECRET` 的 HMAC-SHA256；未配置 secret 时拒绝。
- **涉及文件：** `tgmall-api/src/integrations/aba_pay.js`、`tgmall-api/src/integrations/wing_pay.js`、`tgmall-api/src/services/payment.service.js`
- **建议：** 拿到 ABA / Wing 官方回调文档后，替换签名字符串拼接逻辑为精确格式。

### P0-03 购物车/订单未按 SKU 组合计算价格与库存
- **状态：** ✅ 已修复
- **需求/问题：** 多规格商品必须按选中规格组合匹配 `ProductSku` 的价格与库存。
- **预期：** 加购/结算时解析 `skuId`，校验并扣减 SKU 库存。
- **修复：**
  - 新增 `ProductSku` 模型与迁移 `20260709000000_add_product_skus`，为历史商品创建默认/单规格 SKU 并回刷 `order_items.sku_id`。
  - `cart.service.js`：`addCartItem`/`enrichCartItem` 解析 SKU，购物车存储 `skuId`；结算预览按 SKU 价格/库存计算。
  - `order.service.js`：`createOrder` 按 SKU 价格计算小计，事务内扣减 SKU 库存，`OrderItem` 记录 `skuId`。
  - `product.service.js`：`getProductById` 返回 `skus` 列表。
  - `merchant.service.js`：创建/编辑商品时同步生成/更新 SKU（支持无规格 DEFAULT SKU 与单规格 SKU）。
  - 小程序 `ProductDetail.vue`：按 SKU 解析价格/库存，加购携带 `sku_id`；`CheckoutPage.vue` 下单携带 `sku_id`。
  - 管理后台 `ProductFormPage.vue`：保存时转换 snake_case 字段，修复此前表单字段与后端 schema 不一致的问题。
  - 更新 `cart.schema.js` 与 `order.schema.js` 允许 `sku_id`。
- **涉及文件：** `tgmall-api/prisma/schema.prisma`、`tgmall-api/prisma/migrations/20260709000000_add_product_skus/migration.sql`、`tgmall-api/src/services/cart.service.js`、`tgmall-api/src/services/order.service.js`、`tgmall-api/src/services/product.service.js`、`tgmall-api/src/services/merchant.service.js`、`tgmall-api/src/validators/cart.schema.js`、`tgmall-api/src/validators/order.schema.js`、`tgmall-miniapp/src/views/ProductDetail.vue`、`tgmall-miniapp/src/views/CheckoutPage.vue`、`tgmall-admin/src/pages/ProductFormPage.vue`

### P0-04 COD 订单缺少“confirmed”确认状态
- **状态：** ✅ 已修复
- **需求/问题：** PRD 要求 COD 订单经平台确认后再发货。
- **预期：** 状态流：`pending` → `confirmed` → `shipped` → `completed`。
- **修复：** `OrderList.vue` 增加 `confirmed` Tab 与状态样式；`confirmOrder` 支持 COD 订单在 `paid` 状态下确认。
- **涉及文件：** `tgmall-miniapp/src/views/OrderList.vue`、`tgmall-api/src/services/order.service.js`

### P0-05 JWT 默认 2 小时过期，PRD 要求 24 小时
- **状态：** ✅ 已修复
- **需求/问题：** 用户会话应保持 24 小时有效。
- **修复：** `tgmall-api/src/config/index.js` 默认 `JWT_EXPIRES_IN` 改为 `'24h'`。
- **涉及文件：** `tgmall-api/src/config/index.js`、`tgmall-api/src/utils/jwt.js`

### P0-06 SMS 服务仅 mock，未接入真实网关
- **状态：** ✅ 已修复
- **需求/问题：** 手机号登录、绑定、重置密码需要真实短信 OTP。
- **修复：** 抽象 SMS provider 接口（mock / twilio），`sms.service.js` 统一通过 provider 发送；config 增加 Twilio 环境变量；新增 provider 与集成测试。
- **涉及文件：** `tgmall-api/src/services/sms.service.js`、`tgmall-api/src/integrations/sms/`、`tgmall-api/src/config/index.js`

### P0-07 订单列表 `itemCount` 查询错误
- **状态：** ✅ 已修复
- **需求/问题：** Backlog S3-04 要求列表显示商品数量/缩略图。
- **修复：** `getUserOrders` / `getOrders` 移除 `items: { take: 1 }`，`itemCount` 改为 `quantity` 求和。
- **涉及文件：** `tgmall-api/src/services/order.service.js`、`tgmall-api/src/services/merchant.service.js`

### P0-08 订单详情返回字段缺失
- **状态：** ✅ 已修复
- **需求/问题：** Backlog S3-05 要求展示状态时间线、物流、价格明细、商品名称/缩略图。
- **修复：** `getOrderById` 返回 `priceBreakdown`、`timeline`、`logistics`、item `productName`/`thumbnail` 等字段。
- **涉及文件：** `tgmall-miniapp/src/views/OrderDetail.vue`、`tgmall-api/src/services/order.service.js`

### P0-09 COD 订单支付后无法确认收货
- **状态：** ✅ 已修复
- **需求/问题：** Backlog S3-12 要求用户可确认收货。
- **修复：** `confirmOrder` 允许 COD 订单在 `paid` 状态下确认收货。
- **涉及文件：** `tgmall-api/src/services/order.service.js`、`tgmall-miniapp/src/views/OrderList.vue`、`OrderDetail.vue`

### P0-10 结算页基于 localStorage 购物车快照，非后端快照
- **状态：** ✅ 已修复
- **需求/问题：** 结算应基于当前购物车选中项的真实价格/库存。
- **修复：** 后端新增 `POST /cart/checkout-preview`；`CartPage` 通过 URL query 传递选中项；`CheckoutPage` 调用后端 preview 渲染；新增 `cart-service` 单元测试并更新 `CheckoutPage.test.js`。
- **涉及文件：** `tgmall-miniapp/src/views/CartPage.vue`、`tgmall-miniapp/src/views/CheckoutPage.vue`、`tgmall-api/src/services/cart.service.js`

---

## P1 — 高风险缺口（显著影响转化/运营）

### P1-01 Mini App 多处硬编码汇率 4000
- **状态：** ✅ 已修复
- **需求/问题：** 双币种应使用后端配置的汇率。
- **修复：**
  - 后端公开 `GET /exchange-rate`，复用 `systemConfig.getExchangeRate()`。
  - `cart.service.js` 运费/优惠券 KHR 换算改用实时汇率。
  - 小程序 `useShopConfig` 新增 `exchangeRate`，`App.vue` 启动时加载。
  - 替换 `CheckoutPage.vue`、`PaymentPage.vue`、`PaymentResult.vue`、`OrderList.vue` 中所有硬编码 `* 4000`。
- **涉及文件：** `tgmall-api/src/routes/shopConfig.routes.js`、`tgmall-api/src/controllers/shopConfig.controller.js`、`tgmall-api/src/services/cart.service.js`、`tgmall-miniapp/src/api/shopConfig.js`、`tgmall-miniapp/src/composables/useShopConfig.js`、`tgmall-miniapp/src/App.vue`、`tgmall-miniapp/src/views/CheckoutPage.vue`、`tgmall-miniapp/src/views/PaymentPage.vue`、`tgmall-miniapp/src/views/PaymentResult.vue`、`tgmall-miniapp/src/views/OrderList.vue`

### P1-02 空购物车时 MiniCartBar 隐藏
- **状态：** ✅ 已修复
- **需求/问题：** PRD 要求浮层购物车始终可见。
- **修复：** 移除根节点 `v-if`，购物车为空时展示空态图标 + “购物车是空的”提示 + “继续购物”入口，并补充灰显样式。
- **涉及文件：** `tgmall-miniapp/src/components/common/MiniCartBar.vue`

### P1-03 ProductDetail 引用已不存在的 merchant 对象
- **状态：** ✅ 已修复
- **需求/问题：** 商品详情应显示商家/品牌名。
- **修复：** `displayMerchant` 固定返回 `"TG Mall"`，与平台自营模式一致。
- **涉及文件：** `tgmall-miniapp/src/views/ProductDetail.vue`

### P1-04 Telegram BackButton 已注册但从未显示
- **状态：** ✅ 已修复
- **需求/问题：** 非根页面应显示原生返回按钮。
- **修复：**
  - `useTelegram.js` 增加 SDK 初始化单例守卫，暴露 `init/showBackButton/hideBackButton`；`BackButton.onClick` 仅注册一次。
  - `router/index.js` 为非 Tab 页面（ProductDetail/Search/CitySelect/Login/ResetPassword/Wishlist/CouponCenter/Feedback/Checkout/Payment/PaymentResult/OrderDetail/About/Privacy/Terms）添加 `meta: { showBackButton: true }`。
  - `App.vue` 在检测到 Telegram SDK 后调用 `initTelegram()`，并通过 `router.afterEach` 与 `router.isReady()` 根据当前路由显隐原生返回按钮。
- **涉及文件：** `tgmall-miniapp/src/composables/useTelegram.js`、`tgmall-miniapp/src/router/index.js`、`tgmall-miniapp/src/App.vue`

### P1-05 搜索页缺少热门搜索 + debounce 400ms
- **状态：** ✅ 已修复
- **需求/问题：** PRD 要求热门搜索标签和 300ms 防抖。
- **修复：**
  - 后端新增 `HotSearch` 模型、迁移、CRUD service/controller/route 与公开 `GET /hot-searches`。
  - 管理后台新增「热门搜索词」页面 `/settings/hot-searches`、侧边栏与设置首页入口。
  - 小程序 `SearchPage.vue` 防抖改为 300ms，空关键词时展示热门搜索标签云，点击直接搜索。
- **涉及文件：** `tgmall-api/prisma/schema.prisma`、`tgmall-api/prisma/migrations/20260709000001_add_hot_searches/migration.sql`、`tgmall-api/src/services/shopConfig.service.js`、`tgmall-api/src/controllers/shopConfig.controller.js`、`tgmall-api/src/routes/shopConfig.routes.js`、`tgmall-api/src/validators/shopConfig.schema.js`、`tgmall-admin/src/api/index.js`、`tgmall-admin/src/router/index.js`、`tgmall-admin/src/components/layout/Sidebar.vue`、`tgmall-admin/src/pages/SettingsPage.vue`、`tgmall-admin/src/pages/HotSearchesPage.vue`、`tgmall-miniapp/src/api/shopConfig.js`、`tgmall-miniapp/src/views/SearchPage.vue`、`tgmall-miniapp/src/locales/{km,en,zh}.json`

### P1-06 分类页缺少价格区间筛选
- **状态：** ✅ 已修复
- **需求/问题：** PRD 要求在分类内按价格筛选。
- **修复：**
  - 后端 `GET /products` 新增 `min_price`/`max_price` 参数，并在 `product.service.js` 中追加 `priceUsd { gte/lte }` 过滤。
  - 新增 `product.schema.js` 与 route 层 query 校验。
  - 小程序 `CategoryPage.vue` 在排序栏上方增加 Min/Max USD 输入框，400ms debounce，支持清除。
  - 补充三语 `filter.*` i18n 文案。
- **涉及文件：** `tgmall-miniapp/src/views/CategoryPage.vue`、`tgmall-api/src/controllers/product.controller.js`、`tgmall-api/src/services/product.service.js`、`tgmall-api/src/validators/product.schema.js`、`tgmall-api/src/routes/product.routes.js`、`tgmall-miniapp/src/locales/{km,en,zh}.json`

### P1-07 Profile 页缺少 About Us / Privacy Policy / Terms
- **状态：** ✅ 已修复
- **需求/问题：** PRD 要求法律/平台信息入口。
- **修复：**
  - 新增 `AboutPage.vue`、`PrivacyPage.vue`、`TermsPage.vue` 与可复用 `StaticInfoPage.vue`。
  - 路由注册 `/about`、`/privacy`、`/terms`，无需登录，显示原生返回按钮。
  - `ProfilePage.vue` 菜单增加「关于我们」「隐私政策」「服务条款」入口；三语文案通过 `legal.*` 段管理。
- **涉及文件：** `tgmall-miniapp/src/views/AboutPage.vue`、`tgmall-miniapp/src/views/PrivacyPage.vue`、`tgmall-miniapp/src/views/TermsPage.vue`、`tgmall-miniapp/src/components/common/StaticInfoPage.vue`、`tgmall-miniapp/src/views/ProfilePage.vue`、`tgmall-miniapp/src/router/index.js`、`tgmall-miniapp/src/locales/{km,en,zh}.json`

### P1-08 后台首页缺少今日新增 SKU 数与日期范围导出
- **需求/问题：** 运营需要监控新品与导出订单。
- **涉及文件：** `tgmall-admin/src/pages/DashboardPage.vue`、`OrdersPage.vue`
- **建议：** 新增聚合查询与 CSV 导出接口/UI。

### P1-09 通知服务未接入订单/支付流程
- **需求/问题：** 通知应可审计、可重试。
- **涉及文件：** `tgmall-api/src/services/notification.service.js`、`order.service.js`、`payment.service.js`
- **建议：** 统一通过 notification service 发送订单/支付事件通知。

### P1-10 ProductCard 未显示销量/收藏、快捷加购未处理多规格
- **状态：** ✅ 已修复
- **需求/问题：** 卡片应展示销量/收藏，多规格商品快捷加购应弹出规格选择。
- **修复：**
  - 后端 `listProducts` 返回字段补回 `stock`，新增 `skuCount`（active SKU 聚合）与 `likesCount`（收藏聚合）。
  - `ProductCard.vue` 新增 `salesCount`/`likesCount`/`skuCount` props，展示销量与收藏数。
  - 快捷加购逻辑改为：单 SKU 直接加购，多 SKU 跳转商品详情页选择规格。
  - `HomePage.vue`、`CategoryPage.vue` 显式透传新字段；`SearchPage.vue` 通过 `v-bind` 自动透传。
  - 补充 `product.likes` 三语文案。
- **涉及文件：** `tgmall-miniapp/src/components/common/ProductCard.vue`、`tgmall-miniapp/src/views/HomePage.vue`、`tgmall-miniapp/src/views/CategoryPage.vue`、`tgmall-miniapp/src/views/SearchPage.vue`、`tgmall-api/src/services/product.service.js`、`tgmall-miniapp/src/locales/{km,en,zh}.json`

### P1-11 限时秒杀倒计时缺少秒
- **状态：** ✅ 已修复
- **需求/问题：** PRD 要求显示天/时/分/秒。
- **修复：**
  - `FlashDealCard.vue` 增加 `now` ref 与 1 秒 `setInterval`，倒计时每秒刷新。
  - `timeLeft` 计算包含秒，并按天/时/分动态省略空单位。
  - 补充三语 `time.*` 单位文案。
- **涉及文件：** `tgmall-miniapp/src/components/common/FlashDealCard.vue`、`tgmall-miniapp/src/locales/{km,en,zh}.json`

### P1-12 地址/绑定手机号缺少 +855 客户端校验
- **状态：** ✅ 已修复
- **需求/问题：** PRD 要求柬埔寨手机号格式校验。
- **修复：**
  - 新建 `tgmall-miniapp/src/utils/phone.js`，共享 `PHONE_REGEX = /^\+855[1-9]\d{7,8}$/` 与 `isValidPhone`/`formatPhoneInput`。
  - 在 `LoginPage.vue`、`ResetPasswordPage.vue`、`ProfilePage.vue`（绑定手机与地址）、`CheckoutPage.vue` 的地址表单中应用该校验。
  - 统一后端 `address.schema.js` 的 regex 与 auth 一致。
- **涉及文件：** `tgmall-miniapp/src/utils/phone.js`、`tgmall-miniapp/src/views/LoginPage.vue`、`tgmall-miniapp/src/views/ResetPasswordPage.vue`、`tgmall-miniapp/src/views/ProfilePage.vue`、`tgmall-miniapp/src/views/CheckoutPage.vue`、`tgmall-api/src/validators/address.schema.js`

### P1-13 首页未实现下拉刷新
- **需求/问题：** Backlog S1-08 要求支持下拉刷新。
- **涉及文件：** `tgmall-miniapp/src/views/HomePage.vue`
- **建议：** 实现 pull-to-refresh。

### P1-14 商品图片上传未接入 S3/R2/CDN
- **需求/问题：** Backlog S1-14 要求上传至对象存储、压缩、WebP、CDN URL。
- **涉及文件：** `tgmall-api/src/services/upload.service.js`、`src/routes/upload.routes.js`
- **建议：** 接入 CloudFlare R2/S3，使用 sharp 压缩转 WebP。

### P1-15 商品列表/详情未加 Redis 缓存
- **需求/问题：** Backlog S1-07/S1-15 要求缓存。
- **涉及文件：** `tgmall-api/src/services/product.service.js`
- **建议：** 对高频接口加 Redis 缓存与失效策略。

### P1-16 地址未关联 City 模型，缺少三级联动
- **需求/问题：** Backlog S2-03 要求省/市/区三级联动。
- **涉及文件：** `tgmall-miniapp/src/views/ProfilePage.vue`、`tgmall-api/src/validators/address.schema.js`
- **建议：** 地址表关联 `cityId`，提供城市选择器。

### P1-17 发货字段名与 Backlog 不一致
- **需求/问题：** Backlog 要求字段 `logistics_company`，代码中为 `company`。
- **涉及文件：** `tgmall-api/src/validators/order.schema.js`、`tgmall-api/src/services/order.service.js`
- **建议：** 统一字段名。

---

## P2 — 中低风险/迭代优化

- **评价体系：** 未实现（Review 模型、API、UI）。
- **钱包/积分/红包：** 未实现。
- **收藏：** 缺少分享和移入购物车。
- **优惠券中心：** 缺少按最低金额/分类筛选。
- **售后退款：** 仅创建工单，未计算退款金额与支付逆向。
- **物流跟踪：** 无轨迹查询接口。
- **Telegram MainButton：** 未用于主要 CTA。
- **后台数据图表：** 未实现。
- **本地购物车合并：** 未登录用户无本地购物车及登录合并。
- **弱网兼容：** 无请求重试与离线提示。

---

## 测试与构建证据

```text
# Mini App 单元测试
Test Files  7 passed (7)
Tests       50 passed (50)

# 后端 API 测试
Test Suites 27 passed, 27 total
Tests       251 passed, 251 total

# Mini App 构建
✓ built in 731ms

# 管理后台构建
✓ built in 7.15s

# 生产健康检查
GET https://tgmall-production.up.railway.app/     → 200
GET https://tgmall-production.up.railway.app/api/v1/health → {"status":"ok"}
```

---

## 建议下一步

1. **立即处理 P0：** 支付接口改造、ABA/Wing 真实验签、SKU 级库存价格、COD 确认状态、JWT 24h、SMS 真实网关、订单列表/详情数据补齐、结算数据源统一。
2. **本会话修复已本地验证通过，但尚未部署到生产；** 建议推送并部署后，针对支付与订单流程做真机端到端回归。
3. **P1 按业务影响排序：** 先做汇率统一、MiniCartBar 常驻、搜索/分类体验、地址城市联动、商品图片 CDN。
4. **P2 排入后续 Sprint**，不阻塞 Alpha 上线。

---

*报告生成时间：2026-07-08*  
*对应 commit 范围：`1b33cba` .. `17c4336`*
