# 设计文档：运营配置后台 + Mini App 接入

> **项目**：TG Mall — 柬埔寨 Telegram Mini App 电商平台  
> **版本**：方案 A（实用闭环）  
> **日期**：2026-07-02  
> **范围**：Banner 管理、品类管理、城市配送规则、客服账号配置，并同步接入消费者 Mini App

---

## 1. 背景与目标

### 1.1 背景

当前代码已完成核心交易链路（登录、商品、购物车、订单、支付），但运营配置能力尚未落地：

- `tgmall-admin/src/pages/SettingsPage.vue` 仍是占位页。
- 首页 Banner、分类网格、配送规则、客服账号均为硬编码或未实现。
- 数据库中缺少 `categories`、`banners`、`cities`、`delivery_rules`、`customer_services` 等配置表。

### 1.2 目标

本轮实现 Sprint 4 Alpha 所需的运营配置能力：

1. 运营人员可通过管理后台配置 Banner、品类、城市配送规则、客服账号。
2. 消费者端 Mini App 动态读取这些配置，实现首页 Banner/分类、分类页、结算页运费/起送金额、个人中心客服入口。
3. 保持与现有数据库和代码的兼容性，**不处理** `Merchant` 表/商家后台清理（独立任务）。

---

## 2. 范围边界

### 2.1 本轮包含

- 新增数据库表：`categories`、`banners`、`cities`、`delivery_rules`、`customer_services`。
- 后端 Admin CRUD API 与公开消费者 API。
- `tgmall-admin` 运营配置页面（Element Plus）。
- `tgmall-miniapp` 首页 Banner/分类、分类页、结算页运费/起送、个人中心客服接入。
- 后端单元测试覆盖核心计算逻辑。

### 2.2 本轮不包含

- 用户反馈工单系统（只配客服账号，不做反馈表单）。
- 限时/低价专区、商品标签、侧边栏二级分类。
- `/upload/image` 文件上传服务：Banner/品类图标先用 URL 方式，由运营先上传到 CDN/R2 再贴链接。
- `products.category` 外键化改造：继续用 `VARCHAR` code 弱关联，避免牵动搜索/订单链路。
- `Merchant` 表与 `tgmall-merchant` 清理。

---

## 3. 数据模型

### 3.1 新增表

#### `categories` — 品类

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `code` | `VARCHAR(50)` | **PK** | — | 唯一编码，如 `fashion` |
| `name_km` | `VARCHAR(100)` | `NOT NULL` | — | 高棉语名称 |
| `name_en` | `VARCHAR(100)` | — | `NULL` | 英语名称 |
| `name_zh` | `VARCHAR(100)` | — | `NULL` | 中文名称 |
| `icon_url` | `TEXT` | — | `NULL` | 图标 URL |
| `sort_order` | `INTEGER` | `NOT NULL` | `0` | 排序，越小越靠前 |
| `status` | `VARCHAR(20)` | `NOT NULL` | `'active'` | `active` / `inactive` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 更新时间 |

#### `banners` — Banner

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | `UUID` | **PK** | `gen_random_uuid()` | 唯一 ID |
| `title_km` | `VARCHAR(200)` | `NOT NULL` | — | 高棉语标题 |
| `title_en` | `VARCHAR(200)` | — | `NULL` | 英语标题 |
| `title_zh` | `VARCHAR(200)` | — | `NULL` | 中文标题 |
| `image_url` | `TEXT` | `NOT NULL` | — | 图片 URL |
| `link_type` | `VARCHAR(20)` | `NOT NULL` | — | `product` / `category` / `url` |
| `link_target` | `VARCHAR(255)` | `NOT NULL` | — | 目标 ID 或 URL |
| `city_code` | `VARCHAR(50)` | — | `NULL` | 仅对指定城市生效；`NULL` 表示全平台 |
| `sort_order` | `INTEGER` | `NOT NULL` | `0` | 排序 |
| `status` | `VARCHAR(20)` | `NOT NULL` | `'active'` | `active` / `inactive` |
| `start_at` | `TIMESTAMPTZ` | — | `NULL` | 生效开始时间 |
| `end_at` | `TIMESTAMPTZ` | — | `NULL` | 生效结束时间 |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 更新时间 |

#### `cities` — 城市

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `code` | `VARCHAR(50)` | **PK** | — | 唯一编码，如 `phnom_penh` |
| `name_km` | `VARCHAR(100)` | `NOT NULL` | — | 高棉语名称 |
| `name_en` | `VARCHAR(100)` | — | `NULL` | 英语名称 |
| `name_zh` | `VARCHAR(100)` | — | `NULL` | 中文名称 |
| `sort_order` | `INTEGER` | `NOT NULL` | `0` | 排序 |
| `status` | `VARCHAR(20)` | `NOT NULL` | `'active'` | `active` / `inactive` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 更新时间 |

#### `delivery_rules` — 城市配送规则

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | `UUID` | **PK** | `gen_random_uuid()` | 唯一 ID |
| `city_code` | `VARCHAR(50)` | **FK → cities(code), UNIQUE, NOT NULL** | — | 一个城市一条规则 |
| `min_order_amount_usd` | `DECIMAL(10,2)` | `NOT NULL` | `4.00` | 起送金额 |
| `shipping_fee_usd` | `DECIMAL(10,2)` | `NOT NULL` | `1.00` | 基础配送费 |
| `free_shipping_threshold_usd` | `DECIMAL(10,2)` | `NOT NULL` | `0` | 满额免邮门槛；`0` 表示不启用 |
| `estimated_delivery_days` | `INTEGER` | `NOT NULL` | `2` | 预计送达天数 |
| `status` | `VARCHAR(20)` | `NOT NULL` | `'active'` | `active` / `inactive` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 更新时间 |

#### `customer_services` — 客服账号

| 字段 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | `UUID` | **PK** | `gen_random_uuid()` | 唯一 ID |
| `name_km` | `VARCHAR(100)` | `NOT NULL` | — | 高棉语名称 |
| `name_en` | `VARCHAR(100)` | — | `NULL` | 英语名称 |
| `name_zh` | `VARCHAR(100)` | — | `NULL` | 中文名称 |
| `telegram_username` | `VARCHAR(100)` | `NOT NULL` | — | Telegram 用户名，不含 `@` |
| `phone` | `VARCHAR(20)` | — | `NULL` | 客服电话 |
| `work_hours` | `VARCHAR(100)` | — | `NULL` | 工作时间文案 |
| `is_default` | `BOOLEAN` | `NOT NULL` | `false` | 是否默认客服 |
| `sort_order` | `INTEGER` | `NOT NULL` | `0` | 排序 |
| `status` | `VARCHAR(20)` | `NOT NULL` | `'active'` | `active` / `inactive` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 创建时间 |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | `NOW()` | 更新时间 |

### 3.2 不改造的表

- `products.category` 继续为 `VARCHAR(50)`，应用层保证引用的 `code` 存在于 `categories`。
- `orders.shipping_fee_usd` 已存在，默认 `0`，创建订单时按 `delivery_rules` 计算写入。

---

## 4. 后端 API 设计

### 4.1 管理后台接口（需 `role=admin` JWT）

#### 品类

```
GET    /admin/categories          # 列表（分页/搜索）
POST   /admin/categories          # 创建
PUT    /admin/categories/:code    # 编辑
POST   /admin/categories/:code/toggle  # 启用/禁用
```

#### Banner

```
GET    /admin/banners
POST   /admin/banners
PUT    /admin/banners/:id
POST   /admin/banners/:id/toggle
```

#### 城市

```
GET    /admin/cities
POST   /admin/cities
PUT    /admin/cities/:code
POST   /admin/cities/:code/toggle
```

#### 配送规则

```
GET    /admin/delivery-rules
PUT    /admin/delivery-rules/:cityCode   # 按城市创建或更新
POST   /admin/delivery-rules/:id/toggle
```

创建城市时，自动创建一条默认 `delivery_rules` 记录（默认值见数据模型）。

#### 客服账号

```
GET    /admin/customer-services
POST   /admin/customer-services
PUT    /admin/customer-services/:id
POST   /admin/customer-services/:id/toggle
POST   /admin/customer-services/:id/set-default
```

### 4.2 消费者公开接口

```
GET /banners?city=phnom_penh      # 当前城市生效的 Banner 列表
GET /categories                   # 启用的品类列表
GET /cities                       # 启用的城市列表
GET /delivery-rules/:cityCode     # 指定城市配送规则
GET /customer-services/default    # 默认客服账号
```

响应格式沿用项目统一格式：

```json
{
  "success": true,
  "data": [...]
}
```

---

## 5. Admin UI 设计

### 5.1 页面结构

改造 `tgmall-admin`：

- `SettingsPage.vue` 改为配置中心入口，包含 4 个卡片入口。
- 新增页面：
  - `BannersPage.vue`
  - `CategoriesPage.vue`
  - `CitiesPage.vue`
  - `DeliveryRulesPage.vue`
  - `CustomerServicesPage.vue`
- `Sidebar.vue` 增加“运营配置”分组，入口：Banner、品类、城市配送、客服。
- `router/index.js` 增加路由：
  - `/settings/banners`
  - `/settings/categories`
  - `/settings/cities`
  - `/settings/delivery-rules`
  - `/settings/customer-services`

### 5.2 通用交互

- 列表页：Element Plus `el-table`，支持搜索、分页、状态标签、启用/禁用按钮。
- 表单页：`el-dialog` 弹窗表单，包含三语输入框。
- 排序：列表内直接显示 `sort_order`，先不做拖拽排序（超出本轮范围）。
- Banner 图片：表单中贴 URL，列表显示缩略图预览。

---

## 6. Mini App 接入

### 6.1 首页 Banner

- 入口：`tgmall-miniapp/src/pages/HomePage.vue`
- 行为：进入首页时调用 `GET /banners?city={currentCity}`，最多展示 5 张，自动轮播。
- 点击跳转：
  - `link_type=product` → 跳转商品详情 `/products/:id`
  - `link_type=category` → 跳转分类页并带上 `category`
  - `link_type=url` → 使用 `WebApp.openLink(url)`

### 6.2 首页分类网格 + 分类页侧边栏

- 入口：`HomePage.vue` 分类网格、`CategoryPage.vue`
- 行为：用 `GET /categories` 替换硬编码分类。
- 显示规则：按 `sort_order` 升序，仅 `status=active`。

### 6.3 结算页运费与起送金额

- 入口：`CheckoutPage.vue`
- 行为：
  - 用户选择收货地址后，根据地址中的 `province`/`district` 匹配 `city_code`。
  - 调用 `GET /delivery-rules/:cityCode` 获取规则。
  - 计算运费：
    - 若 `subtotal_usd >= free_shipping_threshold_usd` 且门槛 > 0，则运费 0；
    - 否则运费 = `shipping_fee_usd`。
  - 校验起送：`subtotal_usd < min_order_amount_usd` 时，提交按钮禁用并提示差额。

### 6.4 个人中心客服入口

- 入口：`ProfilePage.vue`
- 行为：调用 `GET /customer-services/default`，点击“联系客服”跳转 `https://t.me/{telegram_username}`。

---

## 7. 关键业务规则

### 7.1 品类删除/禁用

- 删除：禁止删除仍有 `products` 引用的品类；必须先下架或迁移商品。
- 禁用：不影响已上架商品，但首页/分类页不再展示该品类入口。

### 7.2 城市禁用

- 至少保留 1 个启用城市（默认 `phnom_penh`）。
- 禁用城市后，该城市用户地址不可再用于下单（地址选择器过滤）。

### 7.3 配送规则默认值

- 创建城市时自动生成默认规则：`min_order_amount_usd=4.00`，`shipping_fee_usd=1.00`，`free_shipping_threshold_usd=0`，`estimated_delivery_days=2`。

### 7.4 客服默认账号

- 只能有一个 `is_default=true` 的启用客服账号；设置新的默认时，原默认自动取消。

### 7.5 Banner 生效规则

- `status=active`
- 当前时间在 `start_at` 与 `end_at` 之间（若设置了时间）
- `city_code` 为空或等于请求城市
- 按 `sort_order` 升序，最多返回 5 条

---

## 8. 测试策略

### 8.1 后端单元测试

覆盖以下核心逻辑：

- `deliveryRulesService.calculateShippingFee(subtotal, rule)`
- `deliveryRulesService.getActiveRuleByCity(cityCode)`
- `bannersService.listActiveBanners(cityCode, now)`
- `categoriesService.listActiveCategories()`
- `customerServicesService.getDefault()`
- 订单创建时运费计算集成测试

### 8.2 Admin UI 手动测试

- Banner/品类/城市/配送规则/客服 的增删改查与启用禁用。
- 表单校验：必填项、URL 格式、三语至少填一种。

### 8.3 Mini App 手动测试

- 首页 Banner 轮播与点击跳转
- 分类网格与分类页数据正确
- 结算页切换地址时运费/起送金额变化
- 个人中心联系客服跳转

---

## 9. 风险与依赖

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `products.category` 是字符串，删除品类可能导致引用悬空 | 中 | 应用层禁止删除有商品的品类；API 返回 `CATEGORY_HAS_PRODUCTS` 错误 |
| 结算页地址与城市匹配逻辑需覆盖“区/县”到“城市”的映射 | 中 | 地址表单城市选择使用 `/cities` 下拉，存储 `city_code`；老地址默认按 `province` 字符串兼容 |
| 图片 URL 方式运营体验差 | 低 | 下一轮实现 `/upload/image` |
| `Merchant` 表未清理，概念上与公司自营冲突 | 低 | 本轮不碰 `Merchant`，避免回归 |

---

## 10. 实现顺序建议

1. 数据库 Migration + Prisma schema 更新
2. Seed 数据（默认城市、默认客服、示例品类/Banner）
3. 后端 Service + Controller + Routes（Admin + 公开接口）
4. 后端单元测试
5. Admin UI 页面与路由
6. Mini App 接入（首页、分类、结算、个人中心）
7. 联调与手动验收

---

## 11. 参考文档

- `项目文档/产品需求文档_PRD.md` — F-C14、F-C15、F-C18、F-C23、F-C25、F-M06、F-M07、F-M08、F-M09、F-M10
- `项目文档/数据库设计说明书.md`
- `项目文档/API接口文档.md`
