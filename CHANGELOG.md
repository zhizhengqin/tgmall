# Changelog

## [0.2.0.0] - 2026-07-10

### Added

- **Telegram Invoice 支付** — Telegram 内嵌支付 (Stars/Invoice)，支持 `sendInvoice` 创建订单与 `preCheckoutQuery`/`successful_payment` 回调确认
- **SKU 价格库存模型 (ProductSku)** — 商品支持多规格 SKU（尺寸/颜色等），每个 SKU 独立价格与库存，订单扣减 SKU 级别库存
- **SMS 验证码服务** — 抽象 SMS Provider 接口，接入 Twilio 真实网关，支持 Mock 模式开发调试
- **后端结算快照** — `POST /cart/checkout` 替代 localStorage 计算，服务端实时评估库存/价格/运费/优惠券
- **S3/R2 图片上传** — `upload.service.js` 支持 sharp 转 WebP + Cloudflare R2/S3 上传，未配置 CDN 时回退本地磁盘
- **商品列表/详情 Redis 缓存** — 热门商品页 (page≤3) 5 分钟缓存，详情页 10 分钟缓存，商品写入/库存变化自动失效
- **地址关联城市模型** — 地址表单替换为城市选择器，`city_code` 匹配配送规则，`GET /addresses` 返回 `cityName`
- **通知服务接入订单/支付** — `notification.service.js` 统一管控 `created/paid/shipped` 通知，可审计可重试，消除重复发送
- **热门搜索词管理** — Admin 后台新增 HotSearchesPage，Mini App 搜索页实时加载热词
- **Profile 静态信息页** — 关于我们、隐私政策、服务条款静态页，支持三语
- **Admin 订单确认标签** — 订单列表新增 `confirmed` (待发货) 筛选标签页

### Changed

- **MiniCartBar 改进** — 购物车角标显示商品总件数，价格合计实时从后端刷新
- **CategoryPage 安全读取** — localStorage JSON 解析加 try-catch 防护
- **搜索防抖 300ms** — 减少无效 API 请求
- **Telegam BackButton 全局管控** — 路由切换时自动显示/隐藏原生返回按钮
- **购物车结算按 itemId 计算** — 解决选中项合计不准确的问题
- **价格筛选 UI 重构** — 双滑块范围选择，同时筛选 USD/KHR
- **商品卡片** — 增加销量/多规格信息展示
- **秒杀倒计时** — 精确到秒，到期自动下线
- **手机号 +855 校验** — 前端/后端双重校验柬埔寨格式
- **ABA/Wing Pay 真实验签** — HMAC-SHA256 签名验证占位，待合作方提供密钥后启用

### Fixed

- **购物车并发竞态** — Redis Lua 脚本替代 GET-SET 模式，增删改原子执行，清空购物车时删除 key
- **支付回调和幂等锁** — `await verifyFn` 异步验签不再被跳过，`SET NX` 替代 `GET` 实现原子幂等
- **SKU 并发超卖** — `SELECT FOR UPDATE` 锁 SKU 行，防止并发下单超卖
- **优惠券并发占用** — `updateMany({ where: { status: 'unused' } })` 原子标记已使用
- **订单取消库存恢复** — `cancelOrder` / `orderExpiry` 恢复 product + SKU 两级库存
- **汇率双币种一致性** — 结算时统一从后端汇率服务取值，USD/KHR 展示一致
- **ProductDetail i18n** — 修复未引入 `useI18n` 导致的 `t is not defined` 错误
- **CheckoutPage 合计断言** — 测试用例修复，购物车项合计计算正确

## [0.1.0.0] - 2026-07-02

### Added

- **运营配置后台系统** — 品类 (categories)、Banner、城市、配送规则、客服账号的后台管理页面与 API
- **首页 Banner 轮播** — Mini App 首页 Banner 从后台配置动态加载，支持城市定向与时间排期
- **首页品类导航** — 品类横向滚动导航从后台配置加载，点击跳转品类页
- **品类页商品网格** — 品类页使用后台配置的品类数据展示商品
- **城市选择** — 用户可选择配送城市（金边/暹粒），本地持久化
- **按城市配送规则** — 下单时根据用户选择的城市计算运费、起送金额、预计配送天数
- **双币种价格显示** — 结账页配送费用同时显示 USD 和 KHR
- **在线客服入口** — 个人中心页展示客服 Telegram 联系方式，从后台配置加载
- **三语支持** — 品类、Banner、城市、客服均支持高棉语/英语/中文
- **通知系统** — 新增 notifications 表，支持模板消息发送状态追踪
- **单元测试** — API 109 tests + Mini App 50 tests 全部通过

### Changed

- 地址新增 `city_code` 字段，关联城市表
- 商家种子数据改用 `upsert` 保证幂等
- CLAUDE.md 新增 gstack skill routing rules

### Fixed

- 修复分页 `take` 参数失效
- 修复城市切换并发锁
- 修复默认客服事务内存在性检查
- 修复 snake_case 到 camelCase 的输入映射
- 修复 Banner 轮播滑动守卫与 query 参数归一化
- 修复品类页静默加载与无障碍属性
