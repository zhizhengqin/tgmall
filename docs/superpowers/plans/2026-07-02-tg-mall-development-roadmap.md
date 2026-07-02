# TG Mall 开发路线图（重新规划）

> **版本**：V1.0
> **日期**：2026-07-02
> **依据**：产品需求文档 PRD V2.1、MoSCoW 优先级矩阵、用户故事清单 Backlog V1.1
> **当前代码基线**：`worktree-admin-shop-config`（运营配置后台 + API 已就绪，Mini App 接入待补齐）

---

## 一、当前状态总览

### 1.1 已完成（可工作）

| 端 | 模块 | 关键文件 | 状态 |
|---|---|---|---|
| 后端 API | Telegram 一键登录 | `auth.controller.js` / `auth.service.js` / `telegram.js` | ✅ 完整 |
| 后端 API | 商品浏览/搜索 | `product.controller.js` / `product.service.js` | ✅ 完整 |
| 后端 API | 购物车 | `cart.controller.js` / `cart.service.js` | ✅ 完整 |
| 后端 API | 下单与库存预占 | `order.controller.js` / `order.service.js` | ✅ 完整 |
| 后端 API | KHQR 支付 | `payment.controller.js` / `payment.service.js` / `webhook.routes.js` | ✅ 完整 |
| 后端 API | 订单中心 | `order.controller.js` list/detail/cancel/confirm | ✅ 完整 |
| 后端 API | 优惠券（用户侧） | `coupon.controller.js` / `coupon.service.js` | ✅ 完整 |
| 后端 API | 地址管理 | `address.controller.js` / `address.service.js` | ✅ 完整 |
| 后端 API | 运营配置 Admin + 公开接口 | `shopConfig.controller.js` / `service.js` / `routes.js` | ✅ 完整 |
| 后端 API | 管理员登录 | `adminAuth.controller.js` / `service.js` | ✅ 完整 |
| 后端 API | Bot 通知 | `notification.service.js` / `integrations/telegram.js` | ✅ 完整 |
| 后端 API | 订单超时取消 Job | `jobs/orderExpiry.js` | ✅ 完整 |
| 管理后台 | 登录/看板/商品/订单 | `LoginPage.vue` / `DashboardPage.vue` / `ProductsPage.vue` / `OrdersPage.vue` | ✅ 完整 |
| 管理后台 | 运营配置页面 | `BannersPage.vue` / `CategoriesPage.vue` / `CitiesPage.vue` / `DeliveryRulesPage.vue` / `CustomerServicesPage.vue` | ✅ 完整 |
| Mini App | 首页/分类/搜索/商品详情 | `HomePage.vue` / `CategoryPage.vue` / `SearchPage.vue` / `ProductDetail.vue` | ✅ 可工作，但首页 Banner/品类仍为硬编码 |
| Mini App | 购物车/结算/支付 | `CartPage.vue` / `CheckoutPage.vue` / `PaymentPage.vue` | ✅ 可工作，但 ABA/Wing 为占位，配送费写死 |
| Mini App | 订单/个人中心/优惠券 | `OrderList.vue` / `OrderDetail.vue` / `ProfilePage.vue` / `CouponCenter.vue` | ✅ 可工作 |
| 基础设施 | 数据库/Redis/CI/CD | `prisma/schema.prisma`、GitHub Actions、Railway 部署 | ✅ 已就绪 |

### 1.2 明显缺口

| 类别 | 缺口 | 影响 |
|---|---|---|
| **P0 支付** | ABA Pay、Wing Pay 仅有前端占位，无后端真实 deep link 与回调 | PRD P0 验收无法通过 |
| **P0 运营配置消费** | Mini App 未调用 `api/shopConfig.js`，首页 Banner/品类硬编码，结算页配送费写死 | 后台配置无法触达用户 |
| **P0 库存管理后台** | 仅有订单触发库存变更，无库存预警、盘点调整、变更日志页面 | 运营无法主动管理库存 |
| **P1 登录体系** | 无手机号/密码/验证码登录、忘记密码 | 非 Telegram 用户或 Token 过期场景体验差 |
| **P1 城市定位** | 无城市选择页、无定位授权、结算页未按城市展示起送金额/运费 | 不同城市配送规则不生效 |
| **P1 客服与反馈** | 无联系客服入口、无反馈表单/工单 | 用户无法反馈问题 |
| **P1 收藏商品** | 无 `Favorite` 模型、无收藏页面 | 用户无法收藏 |
| **P1 优惠券后台** | 用户可领券，但后台无优惠券创建/编辑/发放页面 | 运营无法配置优惠券 |
| **P1 商品标签** | 无标签模型与管理页面 | 无法给商品打运营标签 |
| **债务** | 仍保留 V1 多商户代码（`tgmall-merchant`、`merchant.service.js` 入驻/审核接口） | 与公司自营模式矛盾，需清理 |

---

## 二、重新规划原则

1. **先补齐 P0 验收缺口**：ABA/Wing 真实支付、运营配置在 Mini App 落地、库存管理后台。
2. **再补 P1 体验**：手机号登录、城市选择、客服反馈、收藏、优惠券后台、商品标签。
3. **坚决不做 P2**：钱包、红包、积分、邀请有礼等二期功能本期不碰。
4. **清理技术债务**：Sprint 5 专门处理 V1 商户代码清理、审计日志、集成测试。
5. **每个 Sprint 产出可 Demo**：不允许纯基础设施 Sprint，必须有关键用户价值交付。

---

## 三、新版路线图

### Sprint 4 续：Mini App 运营配置落地（当前，约 1 周）

**目标**：让后台配置的 Banner、品类、城市、配送规则真正在 Mini App 生效。

**任务**：

1. 首页 Banner 轮播（调用 `GET /banners?city=phnom_penh`）。
2. 首页品类横滑 + 分类页网格（调用 `GET /categories`）。
3. 城市选择页 + 城市状态管理（调用 `GET /cities`）。
4. 结算页按城市展示真实配送费、起送金额与差额提示（调用 `GET /delivery-rules/:cityCode`）。
5. 个人中心「联系客服」入口（调用 `GET /customer-services/default`）。
6. `useShopConfig` composable 单元测试。

**验收**：运营在后台改 Banner/品类，Mini App 刷新后可见；不同城市结算页显示不同运费。

---

### Sprint 5：支付闭环 + 库存管理后台（约 2 周）

**目标**：补齐 P0 支付缺口，让运营能管理库存。

**任务**：

1. ABA Pay 后端 deep link 生成接口与回调处理。
2. Wing Pay 后端 deep link 生成接口与回调处理。
3. Mini App `PaymentPage.vue` 替换 ABA/Wing 占位跳转，支持真实 deep link。
4. 管理后台库存管理页：库存列表、预警阈值、手动调整、变更日志。
5. 商品自动下架（库存 = 0）。
6. 清理 V1 多商户遗留代码（`tgmall-merchant`、入驻/审核接口）。

**验收**：ABA Pay / Wing Pay 真实支付成功并更新订单状态；后台库存调整后订单创建使用最新库存。

---

### Sprint 6：手机号登录与城市体验（约 2 周）

**目标**：解决登录单一、城市无感知的体验问题。

**任务**：

1. 短信验证码服务接入（Twilio/本地短信网关）。
2. 手机号注册/登录/密码登录后端接口。
3. 忘记密码重置流程。
4. Mini App 登录页（Telegram / 手机号 / 密码 Tab 切换）。
5. 首次启动定位授权 + 城市选择页。
6. 城市切换后刷新首页 Banner、配送规则、起送金额。

**验收**：非 Telegram 环境可用手机号登录；切换城市后运费与 Banner 按城市生效。

---

### Sprint 7：运营体验增强（约 2 周）

**目标**：补齐 P1 运营工具与用户粘性功能。

**任务**：

1. 商品标签模型 + 后台标签管理 + 商品打标。
2. 商品卡片显示标签与销量。
3. 收藏商品：模型、API、商品详情收藏按钮、个人中心「我的收藏」。
4. 优惠券后台：创建/编辑/发放/统计。
5. 客服反馈：反馈表单 + 图片上传 + 后台工单列表。
6. 个人中心「关于我们」与隐私政策静态页。

**验收**：运营可创建优惠券并查看领取数据；用户可收藏/取消收藏；后台可处理用户反馈。

---

### Sprint 8：Alpha 打磨与上线准备（约 2 周）

**目标**：达到 Alpha 上线标准。

**任务**：

1. 全站三语文案验收与补漏。
2. 双币种价格显示全页面检查。
3. 高棉语 UI 截断/溢出检查。
4. 3G 弱网真机测试 + 低端安卓机测试。
5. 性能压测（100 并发下单）。
6. 安全扫描（npm audit + OWASP）。
7. 集成测试补充（订单/支付/库存关键链路）。
8. 回滚方案文档与演练。

**验收**：PRD 中所有 P0 验收标准通过；UAT 签字。

---

## 四、关键决策与风险

| 决策 | 方案 | 风险 |
|---|---|---|
| ABA/Wing Pay 实现 | 后端生成 deep link + 跳转 App + 回调更新订单 | 银行 API 文档与沙箱接入可能耗时；需预留缓冲 |
| 城市定位 | 首次授权 + 手动选择，默认金边 | Telegram WebView 定位 API 兼容性需测试 |
| 短信服务 | 优先 Twilio，备选本地网关 | 柬埔寨本地短信网关接入时间不确定 |
| 图片上传 | 二期再做，本期后台仍用图片 URL | 运营需要自行上传 CDN，增加运营门槛 |
| V1 商户代码 | Sprint 5 清理，不保留兼容性分支 | 需确认无外部系统依赖这些接口 |

---

## 五、资源假设

- 团队：2 名全栈开发 + 1 名产品/测试（兼职）。
- 速率：每个 2 周 Sprint 完成 20-25 故事点。
- 总工期：从当前算起约 9 周到达 Alpha 上线（含当前 Sprint 4 续）。

---

## 六、下一步行动

1. **立即启动 Sprint 4 续**：按本计划 Sprint 4 任务执行，本周内完成 Mini App 运营配置接入。
2. **确认支付渠道**：联系 ABA Bank / Wing 获取正式 API 文档与沙箱账号。
3. **确认短信服务商**：开通 Twilio 柬埔寨号码或本地短信网关账号。
4. **清理商户代码前评审**：召开 15 分钟技术评审，确认 `merchantRouter` 无外部依赖后再删除。

---

## 七、与原 Backlog 的差异说明

- **Sprint 4 扩展**：原计划 Sprint 4 第 11 周结束，当前发现 Mini App 运营配置消费未完成，因此 Sprint 4 续 1 周。
- **支付后移**：原计划 ABA/Wing Pay 在 Sprint 3 完成，实际当前仍有缺口，放到 Sprint 5。
- **手机号登录后移**：原计划 Sprint 2，因 P0 交易链路优先，调整到 Sprint 6。
- **P2 功能全部冻结**：钱包、红包、积分、邀请有礼本期不做，避免资源分散。
