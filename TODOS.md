# TODOS

> 最后更新: 2026-07-10 | 新增：演示环境支付全链路模拟改造

---

## 🔄 演示环境改造 — 支付全链路模拟（进行中）

> 目标：补齐 mock 模式下的支付回调链路，使全流程（浏览→下单→支付→订单完成→通知）在演示中流畅可跑。
> 设计文档：`~/.gstack/projects/telegrammall/qinzz-main-design-20260710-160811.md`
> 测试计划：`~/.gstack/projects/telegrammall/qinzz-main-eng-review-test-plan-20260710-163038.md`

### T1 (P1) 🔴 统一 provider 命名

- **做什么**：把 `payment.service.js` 里 `handlePaymentCallback` 的 `verifyFns.bakong` 改成 `verifyFns.khqr`，同时保留 `bakong` 兼容键（防止真实回调受影响）
- **文件**：`tgmall-api/src/services/payment.service.js`（约第 315 行）
- **为什么**：前端和订单用的都是 `khqr`，只有这个内部字典用 `bakong`，不统一容易搞混导致 bug
- **验证**：跑 `npm test -- --testPathPattern=payment`，现有测试全部通过

### T2 (P1) 🔴 新增 mock-confirm 接口

- **做什么**：新建一个 `POST /api/v1/payments/mock-confirm` 接口。只在演示模式下存在（生产环境连路由都不注册）。收到请求后构造一个假的支付回调，调用现有的 `handlePaymentCallback` 完成支付
- **文件**：
  - `tgmall-api/src/routes/payment.routes.js` — 加路由（用 `if (config.paymentMockMode)` 包起来）
  - `tgmall-api/src/controllers/payment.controller.js` — 加控制器函数 `mockConfirmPayment`
  - `tgmall-api/src/validators/payment.schema.js` — 加 Zod 校验（orderId 是 UUID、provider 是枚举）
- **注意**：控制器里要把前端传来的 `provider: 'khqr'` 转成 `'bakong'` 再传给 `handlePaymentCallback`（等 T1 做完之后就不需要了）
- **验证**：写单元测试覆盖：正常支付 ✅、订单不存在 ❌、已支付 ❌、已取消 ❌

### T3 (P0) 🔴🔴 映射单元测试（最高优先级）

- **做什么**：写一个测试，模拟调用 mock-confirm 传 `provider: 'khqr'`，确认内部正确映射为 `bakong`
- **文件**：`tgmall-api/tests/unit/payment-service-uncovered.test.js`
- **为什么**：如果映射错了，演示时点"确认支付"会报错"未知支付渠道"，直接翻车
- **验证**：这个测试必须先写，先看到它失败，再写 T1/T2 的代码让它通过

### T4 (P2) 🟡 前端 — 支付页加"模拟支付"按钮

- **做什么**：在 `PaymentPage.vue` 里，每种支付方式（KHQR / ABA Pay / Wing Pay）旁边加一个"模拟支付"按钮。点击后弹出一个确认卡片（三种支付方式共用同一个卡片样式，只换名字和图标）
- **卡片功能**：
  - 显示商户名、订单号、金额（美元+瑞尔）
  - "确认支付"按钮 → 调 mock-confirm 接口 → 成功后跳转支付成功页
  - "取消"按钮 → 关闭卡片，回到支付方式页
  - 点击确认后按钮变灰（防止双击）
- **文件**：`tgmall-miniapp/src/views/PaymentPage.vue`
- **验证**：浏览器里手动走一遍完整流程

### T5 (P2) 🟡 前端 — 新增 API 函数

- **做什么**：在已有的 `payments.js` 文件里加一个 `mockConfirmPayment` 函数，调用后端的 mock-confirm 接口
- **文件**：`tgmall-miniapp/src/api/payments.js`（已存在，加函数即可）
- **验证**：和 T4 联调

### T6 (P3) 🟢 三语翻译

- **做什么**：给模拟支付卡片上的文字（"模拟支付"、"确认支付"、"取消"、"这是模拟支付，用于演示"等）加到三个语言文件里
- **文件**：`tgmall-miniapp/src/locales/km.json`、`en.json`、`zh.json`
- **数量**：每个语言约 10 个 key
- **验证**：切换三种语言，确认卡片文字正确显示

### T7 (P2) 🟡 后端 — API 响应加 isMock 字段

- **做什么**：在 `createKHQRPayment`、`createABAPayPayment`、`createWingPayPayment` 三个函数的返回值里加一个 `isMock: true/false` 字段，前端根据这个字段决定要不要显示"模拟支付"按钮
- **文件**：`tgmall-api/src/services/payment.service.js`
- **验证**：调支付接口，确认返回的 JSON 里有 `isMock` 字段

---

## ✅ 已交付 Sprint 回顾

| Sprint | 交付内容 | 状态 |
|--------|---------|------|
| Sprint 4 续 | Banner/品类/城市/配送规则动态加载 + 客服入口 | ✅ |
| Sprint 5 | ABA Pay + Wing Pay Deep Link、库存管理后台（预警/调整/盘点/日志） | ✅ |
| Sprint 6 | 手机号登录/密码登录/忘记密码、城市 GPS 定位 + 手动切换 | ✅ |
| Sprint 7 | 收藏 + 客服反馈工单 + 优惠券后台 + 商品标签 | ✅ |
| Sprint 8 | 三语 100% 清零、高棉语行高修复、双币种全覆盖、npm audit fix、Zod 测试 61 条、图片懒加载、CSO 审计、部署文档 | ✅ |

---

## P0 缺口（上线前应补齐）

### ✅ 自动确认收货（7 天到期）— 已实现
- **来源:** Backlog S3-12 AC3
- **实现:** `jobs/orderAutoComplete.js` — 每天凌晨 3:00 执行
  - 在线支付 `shipped` + `shippedAt > 7d` → `completed` + `completedAt`
  - COD `paid` + `paidAt > 7d` → `completed` + `completedAt`
- **测试:** 7 个新测试用例，216 total green
- **注册:** `index.js` 中已启动 `startOrderAutoCompleteJob()`

---

## 🚨 2026-07-03 审计新增 — 待修复 P0/P1 缺陷

> 来源：PRD/Backlog/MoSCoW 代码审计 + 三端（Mini App / Admin / API）子代理审查

### P0 — 阻塞上线（立即修复）

| 编号 | 问题 | 位置 | 影响 | 状态 |
|------|------|------|------|------|
| BUG-01 | Admin 路由导入错误 | `tgmall-api/src/routes/tag.routes.js`<br>`tgmall-api/src/routes/systemConfig.routes.js` | `authenticate`/`requireAdmin` 不存在，应用启动可能崩溃 | ✅ 已修复 |
| BUG-02 | 通知控制器使用错误字段 | `tgmall-api/src/controllers/notification.controller.js:9` | `req.user.id` 应为 `req.user.userId`，用户查不到通知 | ✅ 已修复 |
| BUG-03 | 订单 CSV 导出引用不存在字段 | `tgmall-api/src/services/order.service.js:446-455` | `shippingContact`/`shippingPhone` 不在 Order 模型，导出失败 | ✅ 已修复 |
| BUG-04 | 库存扣减无行级锁 | `tgmall-api/src/services/order.service.js:36-44` | 跨用户并发可超卖 | ✅ 已修复 |
| BUG-05 | 支付回调统一用 Bakong 验签 | `tgmall-api/src/services/payment.service.js:264` | ABA/Wing 回调可被伪造 | ✅ 已修复 |
| BUG-06 | 回调未校验金额 | `tgmall-api/src/services/payment.service.js:290-330` | 小额支付回调可冒充高价订单成功 | ✅ 已修复 |
| BUG-07 | 幂等标记在事务内设置 | `tgmall-api/src/services/payment.service.js:328` | 事务回滚后真实回调被拦截，订单 stuck | ✅ 已修复 |
| BUG-08 | COD 状态机错误 | `tgmall-api/src/services/order.service.js:188` / `collectCodPayment` | 创建即 paid，收款确认直接 completed，对账失真 | ✅ 已修复 |
| BUG-09 | `/go` 落地页 XSS | `tgmall-api/src/app.js` | `ref`/`user-agent` 直接拼 HTML | ✅ 已修复 |

### 2026-07-03 安全审计追加 — 高优先级

| 编号 | 问题 | 位置 | 影响 | 状态 |
|------|------|------|------|------|
| SEC-01 | 支付 Mock 模式在非 production 默认开启 | `tgmall-api/src/config/index.js:38` | Staging 等环境可被伪造回调 | ✅ 已修复 |
| SEC-02 | SMS 固定验证码 `123456` | `tgmall-api/src/services/sms.service.js:32` | 任意手机号可被登录/重置密码 | ✅ 已修复 |
| SEC-03 | 管理员 JWT 无法吊销 | `tgmall-api/src/services/adminAuth.service.js` | 禁用/改密后旧 Token 仍有效 | ✅ 已修复（需执行 prisma migrate dev 应用 schema 变更） |
| SEC-04 | 优惠券领取并发超发 | `tgmall-api/src/services/coupon.service.js:16-39` | 热门券发放量超过总量 | ✅ 已修复 |
| SEC-05 | CORS 生产环境仍信任 localhost | `tgmall-api/src/app.js:22-28` | CSRF-like 带凭证请求 | ✅ 已修复 |
| SEC-06 | 后台优惠券/平台设置无请求体验证 | `admin.controller.js` / `systemConfig.controller.js` | 脏数据/配置注入 | ✅ 已修复 |
| SEC-07 | 错误处理非生产环境泄漏栈跟踪 | `tgmall-api/src/middleware/errorHandler.js:30` | 路径/依赖信息泄露 | ✅ 已修复 |
| SEC-08 | 手动库存调整存在读-改竞争 | `tgmall-api/src/services/inventory.service.js` | 库存日志与实际不一致 | ✅ 已修复（adjustStock/checkInventory 内 SELECT FOR UPDATE） |
| SEC-09 | 订单取消状态竞争 | `tgmall-api/src/services/order.service.js:351-398` | 并发取消重复恢复库存 | ✅ 已修复（事务内读取 + updateMany 原子状态流转） |
| SEC-10 | `initData` 24h 有效期 | `tgmall-api/src/integrations/telegram.js:24` | 重放登录凭证 | ✅ 已修复（TTL 缩至 5 分钟 + Redis hash 重放保护） |
| SEC-11 | JWT 存在 localStorage | Mini App / Admin stores | XSS 场景下 Token 易被盗 | 🟡 部分缓解：Admin 改用 sessionStorage；JWT TTL 缩短至 2h；Mini App 需后续 httpOnly cookie 改造 |

### P1 — 体验/运营缺口（Sprint 内补齐）

| 编号 | 问题 | 位置 | 影响 | 状态 |
|------|------|------|------|------|
| GAP-01 | Mini App 路由守卫缺失 | `tgmall-miniapp/src/router/index.js` | `requiresAuth` 未生效 | ✅ 已修复（beforeEach 检查 token，未登录跳转 /login?redirect=） |
| GAP-02 | 订单列表无分页加载 | `tgmall-miniapp/src/views/OrderList.vue` | 只能看第一页 | ✅ 已修复（IntersectionObserver 无限滚动，支持 meta.hasNext/has_next） |
| GAP-03 | Checkout 优惠券选择死按钮 | `tgmall-miniapp/src/views/CheckoutPage.vue` | 无法选择优惠券 | ✅ 已修复（优惠券弹窗，按最低消费/有效期过滤，提交 coupon_id） |
| GAP-04 | Checkout 新增地址死按钮 | `tgmall-miniapp/src/views/CheckoutPage.vue` | 无法在结算页添加地址 | ✅ 已修复（地址选择弹窗内嵌新增地址表单，保存后自动选中） |
| GAP-05 | 购物车未区分规格 | `tgmall-api/src/services/cart.service.js:42-58` | 同商品不同规格无法单独操作 | ✅ 已修复（cart item id = productId + specKey，前后端按 item.id 更新/删除） |
| GAP-06 | AuditLog 未写入 | `prisma/schema.prisma:225-236` | 无操作审计 | ✅ 已修复（新增 auditLog.service，平台设置/管理员操作已接入） |
| GAP-07 | 通知重试无 cron job | `src/services/notification.service.js` | 失败通知不重试 | ✅ 已修复（新增 notificationRetry job，每 5 分钟执行） |
| GAP-08 | 汇率硬编码 4000 | 多处 | 无法调整汇率 | ✅ 已修复（SystemSetting 支持 exchange_rate，order.service 读取配置） |
| GAP-09 | 后台 OTP 登录缺失 | `tgmall-admin/src/pages/LoginPage.vue` | 只有账号密码 | ✅ 已修复（AdminUser 新增 phone，/auth/admin-login/send-otp + /otp，登录页 Tab 切换） |
| GAP-10 | 商品 SKU/规格无后台 UI | `tgmall-admin/src/pages/ProductFormPage.vue` | 无法配置多规格 | ✅ 已修复（ProductFormPage 规格编辑器，支持规格名/值/价格/库存，校验同步更新） |
| GAP-11 | 商品标签库未接入商品表单 | `tgmall-admin/src/pages/ProductFormPage.vue` | 只能手动输入标签 | ✅ 已修复（加载标签库，点击选择，支持自定义标签，最多 6 个） |
| GAP-12 | 图片无上传压缩 | 全部后台表单 | 只能填 URL | ✅ 已修复（新增 /admin/upload/image + ImageUploader 组件，前端压缩后 base64 上传，ProductFormPage 已接入） |

---

## P1 缺口（消费者端体验增强）

### ✅ F-C16: 限时/低价专区 — 已实现
- **来源:** PRD §4.2、Backlog S2-19 AC4
- **实现:** commit `f0c7b3d`
  - **后端:** FlashDeal 模型 + CRUD API + 公开查询（城市+时间+库存过滤），13 个测试
  - **管理后台:** FlashDealsPage.vue — 商品选择 + 专区价格/库存/城市/时间 CRUD
  - **Mini App:** FlashDealCard 横滑卡片（专区价+倒计时+进度条），HomePage 品类栏下方展示

### ✅ F-C17: 登录引导横幅 — 已实现
- **来源:** PRD §4.2、Backlog S2-19 AC5
- **实现:** commit `e04fd7d`
  - HomePage 顶部搜索栏下方新增登录引导横幅
  - 检测 userStore.isLoggedIn 自动显隐
  - 关闭后 localStorage 记录时间戳，24h 内不再展示
  - 点击横幅跳转 /login，点击 ✕ 关闭
  - 三语 i18n: km/en/zh

### ✅ F-C18: 侧边栏分类导航 — 已实现
- **来源:** PRD §4.2、Backlog S2-20 AC1~AC2
- **实现:** commit `adef0ff`
  - 左侧 88px 一级分类侧边栏（emoji+标签，当前高亮金边+背景）
  - 右侧排序栏（最新/价格↑/价格↓/销量）+ 商品双列网格
  - 切换分类/排序自动重载，无限滚动

### ✅ F-C19: 列表/网格视图切换 — 已实现
- **来源:** PRD §4.2、Backlog S2-20 AC4
- **实现:** commit `7d44411`
  - ProductCard layout 属性支持 grid/list 两种模式
  - CategoryPage 排序栏右侧 ☰/⊞ 切换按钮
  - viewMode 偏好 localStorage 持久化

### ✅ F-C21 + F-C22: 快捷加购 + 底部购物车条 — 已实现
- **来源:** PRD §4.2、Backlog S3-21
- **实现:** commit `c25818c`
  - ProductCard 44x44px ⊕ 按钮（库存 0 灰显，加购成功 ✓ 动画）
  - MiniCartBar: 底部常驻（件数 badge + USD/KHR 合计 + 结算按钮），仅购物车非空时显示
  - HomePage + CategoryPage 均已引入，cart-updated 事件自动刷新

### ✅ F-C23: 最低起送金额 — 购物车条联动 — 已实现
- **实现:** commit `608364f`
  - MiniCartBar 加载城市配送规则，计算起送差额
  - 未达标显示"还差 $X 起送" + 按钮半透明"继续选购"
  - 已达标按钮高亮变红色"结算"

---

## P1 缺口（运营后台增强）

### ✅ 数据看板增强 (F-M04) — 已实现
- **来源:** PRD §4.3、Backlog S4-01/S4-02
- **实现:** commit `6e36428`
  - 后端新增 topProducts (TOP 10) + categorySales (品类销售额) + paymentSuccessRate
  - 前端新增支付成功率卡片 + 品类饼图 + TOP 10 表格

### ✅ 系统配置 — 平台级设置 (F-M06) — 已实现
- **来源:** PRD §4.3
- **实现:** commit `c27a2b6`
  - DB: SystemSetting 键值表 + AuditLog 审计日志表
  - PlatformSettingsPage: 商城名称/Logo/联系方式/维护模式/公告
  - AdminUsersPage: 管理员增删改/密码重置/启用禁用

### ✅ 用户管理增强 (S4-06) — 已实现
- **来源:** PRD §4.3、Backlog S4-06
- **实现:** commit `673c6d2`
  - 后端: GET /admin/users/:id (详情+订单数+消费) + POST /admin/users/:id/toggle
  - UsersPage: 状态标签 + 创建日期 + 禁用/启用按钮

### ✅ 商品标签独立管理页 (F-M08) — 已实现
- **来源:** PRD §4.3
- **实现:** commit `58122de`
  - DB: Tag 模型 (三语文本 + 颜色 + 背景色 + 排序)
  - TagsPage: 预览 + CRUD + el-color-picker

### ✅ 限时专区运营管理 (F-M07 补充) — 已在 F-C16 完成
- **实现:** commit `f0c7b3d`
  - FlashDealsPage: CRUD + 商品选择 + 价格/库存/城市/时间配置

### ✅ 订单 CSV 导出 — 已实现
- **来源:** Backlog S4-03 AC5
- **实现:** commit `673c6d2`
  - GET /admin/orders/export/csv (BOM UTF-8 + 状态/日期过滤)

### ✅ 登录引导横幅配置 (F-M07 补充) — 已实现
- **来源:** 与 F-C17 联动
- **实现:**
  - 后端: SystemSetting 新增 `login_banner_image` 字段 + `GET /login-banner` 公开端点
  - 管理后台: PlatformSettingsPage 新增「登录引导横幅图片 URL」配置
  - Mini App: HomePage 读取 API 配置，有图显图、无图显示默认文字横幅
  - 原有 24h localStorage 关闭逻辑不变

---

## Bug 修复

### ✅ `merchant.service.js` — `createProduct()` 已移除未定义的 `merchantId`
- **修复:** 从 `createProduct` 的 `prisma.product.create` data 对象中删除 `merchantId,` 行（Schema 中 Product 无此字段）
- **提交:** `bdffc65`（随 P1 补全一起提交）

### ✅ 优惠券管理端已迁移到 Service 层
- **修复:** `admin.controller.js` 中 4 个优惠券函数改为调用 `coupon.service.js` 的 `adminListCoupons`/`adminCreateCoupon`/`adminUpdateCoupon`/`adminToggleCouponStatus`
- **效果:** Controller 不再直接引用 `prisma` 和 `AppError`，架构一致性恢复
- **提交:** `bdffc65`（随 P1 补全一起提交）

---

## 技术债务

### 高优先级
- **✅ V1 商户代码清理 — 已完成:**
  - ~~`tgmall-api/src/services/merchant.service.js`: `registerMerchant`, `merchantLogin`, `merchantWebLogin`, `getDashboard`, `approveMerchant`, `rejectMerchant`~~ — 已删除（619→335 行，移除 6 个死函数）
  - ~~`tgmall-api/src/routes/merchant.routes.js`~~ — 已删除（未被任何文件引用）
  - ~~`tgmall-merchant/` 目录~~ — 已删除（仅 dist/node_modules，src 空目录）
  - ~~`tgmall-miniapp/src/locales/*.json` 中 `merchant` 命名空间~~ — 已删除（3 个 locale 文件，未见组件引用）
  - **额外修复:** `exportCsv` Controller 函数缺失导致 CSV 导出路由无效 → 已添加

### 中优先级
- **性能压测:** 100 并发下单、商品列表 P95 ≤ 500ms（Backlog S4-17，Sprint 8 推迟）
- **低端机兼容性测试:** 2GB RAM 安卓 + 3G 限速 1Mbps 真机验证（Backlog S4-10）
- **文件上传服务:** `routes/index.js` 有 `"后续 Sprint: upload"` 注释，商品图片目前通过 URL 填入，无实际文件上传端点
- **✅ 用户通知中心 — 已完成:** `GET /api/v1/notifications` 用户通知列表（auth + 分页），三层架构完整
- **通知发送统一化:** Controller 层直接调用 `telegram.js` 发通知，绕过了 `notification.service.js`（后者有更好的重试和记录机制）

### 低优先级
- **配送区域二级粒度:** 区/县级配送范围配置、特殊区域加价（PRD F-M09）
- **下单自动应用最优优惠券:** 结算时自动选择最优单券（Backlog S3-14）
- **✅ COD 收款确认 API — 已完成:** `POST /api/v1/admin/orders/{id}/collect-cod` — 管理员确认 COD 现金已收，手动完成订单
- **QA ISSUE-002:** console.error 中英混用
- **QA ISSUE-003:** esbuild/vite dev-dep 漏洞（非生产依赖）
- **✅ 订单状态 Tab — 已完成:** OrderList 已添加 "已取消" Tab

---

## P2 — 本期冻结（不纳入当前开发计划）

| 编号 | 功能 | 来源 |
|------|------|------|
| F-C26 | 钱包余额与充值（消费者端 + 管理后台 F-M12） | PRD §4.2 |
| F-C27 | 红包与代金券（消费者端 + 营销管理 F-M14） | PRD §4.2 |
| F-C28 | 积分签到/抽奖（消费者端 + 积分管理 F-M13） | PRD §4.2 |
| F-C29 | 邀请有礼（消费者端 + 营销管理 F-M14） | PRD §4.2 |
| — | 商品评价系统（评分+评价+图片+平台回复） | Backlog V2-01~03 |
| — | 限时秒杀 | Backlog V2-04 |
| — | 促销活动引擎（满减/满赠/多件折扣） | Backlog V2-05 |
| — | VIP 会员体系 | Backlog V2-06 |
| — | AI 商品推荐 | Backlog V2-07 |
| — | Telegram Channels 集成推广 | Backlog V2-08 |
| — | 批量导入商品（CSV/Excel） | Backlog V2-12 |

---

## 已完成 / 已验证存在

<details>
<summary>展开查看已验证的实现状态</summary>

### P0 Must Have — 全部完成
- F-C01: Telegram 一键登录 ✅
- F-C02: 商品浏览与搜索 ✅（三语搜索、分页、分类筛选、排序）
- F-C03: 商品详情页 ✅（图片轮播、规格联动、三语描述、收藏按钮）
- F-C04: 购物车 ✅（Redis 后端同步、库存校验、全选/单选）
- F-C05: 下单结算 ✅（地址选择、优惠券、4 种支付方式、价格明细、起送金额校验）
- F-C06: KHQR/ABA/Wing/COD 支付 ✅（Deep Link + Mock/Real 双模式）
- F-C07: 订单追踪 ✅（状态 Tab、详情、物流、取消/确认收货）
- F-M01: 商品管理 ✅（CRUD + 三语 + 多图 + 规格 + 上下架）
- F-M02: 订单处理 ✅（列表 + 详情 + 发货操作）
- F-M03: 库存管理 ✅（预警、手动调整、盘点、CSV 导出、变更日志）
- F-S01: Bot 通知 ✅（下单/支付/发货通知消费者+运营，三语模板）
- F-S02: 三语言切换 ✅（vue-i18n、km/en/zh、后端 Accept-Language）
- F-S03: USD/KHR 双币种 ✅（PriceDisplay 组件、所有价格点覆盖）

### P1 Should Have — 已完成
- F-C08: 个人中心 ✅（资料、地址管理 CRUD、语言切换、客服入口）
- F-C09: 优惠券中心 ✅（可领取列表 + 我的优惠券 + 领取/使用）
- F-C10: 手机号登录 ✅（短信+密码双 Tab、+855 校验、60s 重发、5 次锁定）
- F-C11: 忘记密码 ✅（验证码重置、密码历史检查、tokenVersion 失效）
- F-C12: 定位与城市选择 ✅（GPS + Telegram 定位、手动切换、配送规则联动）
- F-C13: 首页搜索强化 ✅（常驻搜索栏 + 搜索页 + 历史搜索 + 防抖 400ms）
- F-C14: Banner 轮播 ✅（可配置、触摸滑动、按城市+时间生效、最多 5 张）
- F-C15: 分类图标网格 ✅（横滑图标入口、动态加载）
- F-C20: 商品标签与销量 ✅（最多 2 个标签、已售数、点赞/收藏数）
- F-C24: 收藏商品 ✅（详情页收藏、WishlistPage、取消收藏、下架标记）
- F-C25: 客服与反馈 ✅（客服入口 → Telegram 链接/电话、意见反馈表 + 图片）
- F-M04: 数据看板 ✅（基础版：GMV/用户/订单/7 天趋势图）
- F-M06: 系统配置 ✅（Banner/品类/城市/配送规则/客服账号 5 个子模块）
- F-M07: Banner 管理 ✅（CRUD + 跳转类型 + 城市+时间生效控制）
- F-M08: 商品标签 ✅（嵌入 ProductFormPage，三语+颜色+每个商品最多 6 个）
- F-M09: 配送规则 ✅（起送金额/运费/免邮门槛/预计送达天数，按城市配置）
- F-M10: 城市管理 ✅（CRUD + 经纬度 + 启用/禁用 + 排序）
- F-M11: 反馈管理 ✅（列表 + 状态筛选 + 标记已处理 + 图片预览）

### 补充的 P1 功能 — 已完成
- 管理员优惠券管理 ✅（CouponsPage: CRUD + 启用/停用）
- 管理员库存管理 ✅（InventoryPage: 预警/调整/盘点/CSV/变更日志）
- 支付结果页 ✅（PaymentResult: success/failed/timeout/cancelled/COD 五种状态）
- 重置密码页 ✅（ResetPasswordPage: 手机号→验证码→新密码）
- 过期订单 Cron Job ✅（`jobs/orderExpiry.js`: 每分钟取消超时订单 + 释放库存 + 退还优惠券）
- 支付对账 Cron Job ✅（`jobs/paymentReconciliation.js`: 每 5 分钟对账 + 补漏 webhook）
- 三语 i18n 文件完整 ✅（zh/en/km 各 270 行，18 个命名空间，结构一致）

</details>
