# TODOS

## Sprint 4 续 — Mini App 运营配置落地 ✅
- ✅ 首页 Banner 轮播（调用 `GET /banners?city=`）
- ✅ 首页品类横滑 + 分类页网格（调用 `GET /categories`）
- ✅ 城市选择页 + 城市状态管理（调用 `GET /cities`）
- ✅ 结算页按城市展示真实配送费、起送金额与差额提示
- ✅ 个人中心「联系客服」入口（调用 `GET /customer-services/default`）
- ✅ `useShopConfig` composable 单元测试

## Sprint 5 — 支付闭环 + 库存管理后台

### ABA Pay / Wing Pay 真实对接
- **Priority:** P0 — ABA Pay 后端 deep link 生成接口与回调处理
- **Priority:** P0 — Wing Pay 后端 deep link 生成接口与回调处理
- **Priority:** P0 — Mini App `PaymentPage.vue` 替换 ABA/Wing 占位跳转，支持真实 deep link
- **Priority:** P0 — 支付回调验签 + 幂等处理

### 库存管理后台
- **Priority:** P0 — 管理后台库存管理页：库存列表、预警阈值、手动调整、变更日志
- **Priority:** P0 — 商品自动下架（库存 = 0）
- **Priority:** P0 — 库存 SELECT FOR UPDATE + 事务

### 技术债务
- **Priority:** P1 — 清理 V1 多商户遗留代码（`tgmall-merchant`、入驻/审核接口）

## Sprint 6 — 手机号登录 + 城市体验

### 登录体系
- **Priority:** P1 — 短信验证码服务接入（Twilio/本地短信网关）
- **Priority:** P1 — 手机号注册/登录/密码登录后端接口
- **Priority:** P1 — 忘记密码重置流程
- **Priority:** P1 — Mini App 登录页（Telegram / 手机号 / 密码 Tab 切换）

### 城市体验
- **Priority:** P1 — 首次启动定位授权 + 城市选择页优化
- **Priority:** P1 — 城市切换后刷新首页 Banner、配送规则、起送金额

## Sprint 7 — 运营体验增强

### 商品标签与收藏
- **Priority:** P1 — 商品标签模型（Tag）+ 后台标签管理 + 商品打标
- **Priority:** P1 — 商品卡片显示标签与销量
- **Priority:** P1 — 收藏商品：Favorite 模型、API、商品详情收藏按钮、个人中心「我的收藏」

### 优惠券后台
- **Priority:** P1 — 优惠券后台：创建/编辑/发放/统计

### 客服与反馈
- **Priority:** P1 — 客服反馈表单 + 图片上传 + 后台工单列表
- **Priority:** P1 — 个人中心「关于我们」与隐私政策静态页

### 安全加固
- **Priority:** P1 — 敏感数据（手机号）加密存储

## Sprint 8 — Alpha 打磨与上线

### 本地化与 UI
- **Priority:** P1 — 全站三语文案验收与补漏
- **Priority:** P1 — 双币种价格显示全页面检查
- **Priority:** P1 — 高棉语 UI 截断/溢出检查

### 性能与弱网
- **Priority:** P0 — 弱网环境适配：图片 WebP + CDN + 懒加载
- **Priority:** P1 — 首页骨架屏加载状态优化
- **Priority:** P1 — 3G 弱网真机测试 + 低端安卓机测试
- **Priority:** P1 — 性能压测（100 并发下单）

### 安全与质量
- **Priority:** P1 — 安全扫描（npm audit + OWASP）
- **Priority:** P1 — 集成测试补充（订单/支付/库存关键链路）
- **Priority:** P1 — 回滚方案文档与演练

### 运维
- **Priority:** P1 — CloudFlare CDN 配置
- **Priority:** P1 — Railway 部署配置完善

## P2 — 本期冻结
- 钱包/余额功能
- 红包/优惠券分享裂变
- 积分体系
- 邀请有礼
- 商品搜索增强

## Completed
