# API 接口文档

## 柬埔寨 Telegram Mini App 社交电商平台

> **文档版本**：V2.0  
> **编制日期**：2026 年 6 月 9 日
> **V2 变更**：新增 POST /auth/admin-login（用户名密码登录）；移除商家入驻/登录 API；新增 /admin/products 和 /admin/orders 路由  
> **Base URL**：`https://api.shop.xinhua-tech.kh/api/v1`  
> **协议**：HTTPS only  
> **内容格式**：`application/json`（文件上传除外）  
> **字符编码**：UTF-8  
> **对应文档**：系统架构设计说明书.md · 数据库设计说明书.md  
> **Swagger 地址**：`https://api.shop.xinhua-tech.kh/api-docs`（部署后自动生成）

---

## 目录

- [一、通用约定](#一通用约定)
- [二、认证与授权](#二认证与授权)
- [三、用户模块](#三用户模块)
- [四、商品模块](#四商品模块)
- [五、购物车模块](#五购物车模块)
- [六、订单模块](#六订单模块)
- [七、支付模块](#七支付模块)
- [八、商家模块](#八商家模块)
- [九、优惠券模块](#九优惠券模块)
- [十、文件上传模块](#十文件上传模块)
- [十一、平台运营模块](#十一平台运营模块)
- [十二、Webhook 回调](#十二webhook-回调)
- [十三、公共接口](#十三公共接口)
- [十四、错误码速查表](#十四错误码速查表)
- [十五、接口调用示例（前端）](#十五接口调用示例前端)

---

## 一、通用约定

### 1.1 请求规范

| 项目 | 约定 |
|------|------|
| **Base URL** | `https://api.shop.xinhua-tech.kh/api/v1` |
| **协议** | HTTPS（HTTP 请求将被 Nginx 301 重定向到 HTTPS） |
| **请求头** | `Content-Type: application/json`（上传除外） |
| **认证头** | `Authorization: Bearer <JWT_TOKEN>` |
| **语言头** | `Accept-Language: km` / `en` / `zh`（不传默认 `km`） |
| **请求体大小** | ≤ 2MB（Nginx 限制，超出返回 413） |

### 1.2 响应格式

```json
// ✅ 成功响应
{
  "success": true,
  "data": {
    // 响应数据（可以是对象、数组、null）
  },
  "meta": {
    // 分页信息（仅列表接口返回）
    "total": 156,
    "page": 1,
    "limit": 20,
    "total_pages": 8,
    "has_next": true
  }
}

// ❌ 错误响应
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "ទំនិញនេះមានសល់តែ 3 ប៉ុណ្ណោះ",
    "details": {
      // 可选的详细错误信息（字段级别校验错误）
      "product_id": "库存仅剩 3 件",
      "quantity": "请求数量超过库存"
    }
  }
}
```

### 1.3 HTTP 状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| `200` | 成功 | GET、PUT、部分 POST 操作成功 |
| `201` | 已创建 | POST 创建资源成功 |
| `204` | 无内容 | DELETE 成功（无响应体） |
| `400` | 请求参数错误 | 校验失败、业务规则不满足 |
| `401` | 未认证 | Token 缺失、过期、无效 |
| `403` | 无权限 | 非资源所有者、角色权限不足 |
| `404` | 未找到 | 资源不存在 |
| `409` | 冲突 | 重复操作、库存冲突 |
| `410` | 已失效 | 资源已过期/已下架 |
| `429` | 请求过于频繁 | 触发 Rate Limit |
| `500` | 服务器内部错误 | 不可预期的错误 |
| `503` | 服务不可用 | 外部依赖（支付/物流）暂不可用 |

### 1.4 分页约定

```bash
# 请求
GET /api/v1/products?page=1&limit=20

# 参数说明
page   = 1      # 页码，从 1 开始，默认 1
limit  = 20     # 每页数量，默认 20，最大 100

# 响应
{
  "success": true,
  "data": [ /* 当前页数据 */ ],
  "meta": {
    "total": 156,        // 总记录数
    "page": 1,           // 当前页码
    "limit": 20,         // 每页条数
    "total_pages": 8,    // 总页数 = ceil(total / limit)
    "has_next": true     // 是否有下一页（最后一页为 false）
  }
}
```

### 1.5 时间格式

所有时间字段返回 **ISO 8601 格式**（UTC 时区），前端自行转换为本地时间（UTC+7）。

```json
{
  "created_at": "2026-06-05T08:30:00.000Z",
  "paid_at": "2026-06-05T08:32:15.000Z"
}
```

---

## 二、认证与授权

### 2.1 认证流程

```
消费者                         后端                        Telegram
  │                              │                            │
  │  打开 Mini App                │                            │
  │  (TG 自动注入 initData)       │                            │
  │                              │                            │
  │  POST /auth/telegram         │                            │
  │  { initData }                │                            │
  │ ───────────────────────────► │                            │
  │                              │  校验 initData 签名          │
  │                              │  (HMAC-SHA256 + Bot Token)  │
  │                              │                            │
  │  返回 { token, user }         │                            │
  │ ◄─────────────────────────── │                            │
  │                              │                            │
  │  后续请求附带 Token            │                            │
  │  Authorization: Bearer xxx   │                            │
  │ ───────────────────────────► │  校验 JWT → 放行/拒绝        │
```

### 2.2 Token 机制

| 项目 | 说明 |
|------|------|
| **Token 类型** | JWT（JSON Web Token） |
| **签发算法** | HS256 |
| **有效期** | 24 小时（`exp` 声明） |
| **Payload** | `{ user_id, telegram_id, role, iat, exp }` |
| **刷新** | Token 过期后，前端用 `POST /auth/refresh` 刷新（需旧 Token 未过期 30 天） |
| **存储** | 前端存在 `localStorage`（Mini App 中如被清除则重新登录） |

### 2.3 Token 角色

| 角色 | `role` 值 | 权限范围 |
|------|-----------|----------|
| 消费者 | `user` | 浏览商品、下单、管理自己的订单和地址 |
| 商家 | `merchant` | 管理本店商品和订单、查看本店数据 |
| 管理员 | `admin` | 审核商家、查看全平台数据、系统配置 |

---

### 接口 1：Telegram 一键登录

```
POST /auth/telegram
```

**说明**：Mini App 打开时调用，用 Telegram initData 完成用户认证。首次登录自动创建账号。

**请求头**：

| 参数 | 值 | 必填 |
|------|-----|------|
| `Content-Type` | `application/json` | 是 |

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `init_data` | `string` | 是 | Telegram WebApp.initData 原始字符串 |

**请求示例**：

```json
{
  "init_data": "query_id=AAFf...&user=%7B%22id%3A123456%7D&auth_date=1717594200&hash=abc123..."
}
```

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "telegram_id": 123456789,
      "first_name": "Sopheap",
      "last_name": "Kong",
      "username": "sopheap_k",
      "phone": null,
      "language": "km",
      "avatar_url": "https://t.me/i/userpic/320/sopheap_k.jpg",
      "is_new_user": true,
      "created_at": "2026-06-05T08:30:00.000Z"
    }
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `VALIDATION_ERROR` | `init_data` 为空或格式不正确 |
| `401` | `INVALID_INIT_DATA` | initData 签名校验失败（可能伪造或 Bot Token 不一致） |
| `401` | `INIT_DATA_EXPIRED` | `auth_date` 超过 24 小时，需重新打开 Mini App |

---

### 接口 2：刷新 Token

```
POST /auth/refresh
```

**说明**：JWT 即将过期时，用旧的（未完全过期的）Token 换取新 Token。旧 Token 过期 30 天内均可刷新。

**请求头**：

| 参数 | 值 | 必填 |
|------|-----|------|
| `Authorization` | `Bearer <旧Token>` | 是 |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...（新Token）",
    "expires_at": "2026-06-06T08:30:00.000Z"
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `401` | `TOKEN_EXPIRED` | 旧 Token 已过期超过 30 天，需重新登录 |
| `401` | `TOKEN_BLACKLISTED` | Token 已被加入黑名单（用户主动退出登录或账号被禁用） |

---

### 接口 3：退出登录

```
POST /auth/logout
```

**说明**：将当前 Token 加入黑名单，使其立即失效。

**请求头**：

| 参数 | 值 | 必填 |
|------|-----|------|
| `Authorization` | `Bearer <Token>` | 是 |

**成功响应** `200`：

```json
{
  "success": true,
  "data": { "message": "已退出登录" }
}
```

---

## 三、用户模块

### 3.1 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/users/me` | 获取当前用户信息 | JWT |
| `PUT` | `/users/me/profile` | 更新用户资料 | JWT |
| `GET` | `/users/me/addresses` | 获取收货地址列表 | JWT |
| `POST` | `/users/me/addresses` | 新增收货地址 | JWT |
| `PUT` | `/users/me/addresses/{id}` | 编辑收货地址 | JWT |
| `DELETE` | `/users/me/addresses/{id}` | 删除收货地址 | JWT |

---

### 接口 4：获取当前用户信息

```
GET /users/me
```

**说明**：返回当前登录用户的完整信息。

**请求头**：

| 参数 | 值 | 必填 |
|------|-----|------|
| `Authorization` | `Bearer <Token>` | 是 |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "telegram_id": 123456789,
    "first_name": "Sopheap",
    "last_name": "Kong",
    "username": "sopheap_k",
    "phone": "+85512345678",
    "language": "km",
    "avatar_url": "https://t.me/i/userpic/320/sopheap_k.jpg",
    "status": "active",
    "address_count": 2,
    "coupon_count": 3,
    "order_count": 12,
    "created_at": "2026-06-01T08:00:00.000Z"
  }
}
```

---

### 接口 5：更新用户资料

```
PUT /users/me/profile
```

**说明**：更新手机号和语言偏好。姓名由 Telegram 管理，不可自行修改。

**请求头**：

| 参数 | 值 | 必填 |
|------|-----|------|
| `Authorization` | `Bearer <Token>` | 是 |

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | `string` | 否 | 手机号，+855 格式（如 `+85512345678`） |
| `language` | `string` | 否 | 偏好语言：`km` / `en` / `zh` |

**请求示例**：

```json
{
  "phone": "+85512345678",
  "language": "en"
}
```

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "+85512345678",
    "language": "en"
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `VALIDATION_ERROR` | 手机号格式不正确（需 +855 开头 + 8-9 位数字） |
| `400` | `PHONE_ALREADY_EXISTS` | 手机号已被其他用户绑定 |

---

### 接口 6：获取收货地址列表

```
GET /users/me/addresses
```

**说明**：返回当前用户的收货地址列表，默认地址排在第一位。

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "id": "addr-uuid-001",
      "recipient_name": "Sopheap Kong",
      "phone": "+85512345678",
      "province": "Phnom Penh",
      "district": "Chamkarmon",
      "detail": "No. 123, Street 456, Sangkat BKK1",
      "is_default": true,
      "created_at": "2026-06-01T08:00:00.000Z"
    },
    {
      "id": "addr-uuid-002",
      "recipient_name": "Sopheap Kong",
      "phone": "+85587654321",
      "province": "Siem Reap",
      "district": "Svay Dangkum",
      "detail": "No. 456, Pub Street Area",
      "is_default": false,
      "created_at": "2026-06-03T10:00:00.000Z"
    }
  ]
}
```

---

### 接口 7：新增收货地址

```
POST /users/me/addresses
```

**说明**：新增一个收货地址。每人最多 10 个。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recipient_name` | `string` | 是 | 收件人姓名，≤ 100 字符 |
| `phone` | `string` | 是 | 收件人手机号，+855 格式 |
| `province` | `string` | 是 | 省/直辖市，≤ 50 字符 |
| `district` | `string` | 是 | 区/县，≤ 50 字符 |
| `detail` | `string` | 是 | 详细地址（街道、门牌号），≤ 200 字符 |
| `is_default` | `boolean` | 否 | 是否设为默认地址，默认 `false` |

**请求示例**：

```json
{
  "recipient_name": "Sopheap Kong",
  "phone": "+85512345678",
  "province": "Phnom Penh",
  "district": "Chamkarmon",
  "detail": "No. 123, Street 456, Sangkat BKK1",
  "is_default": true
}
```

**成功响应** `201`：

```json
{
  "success": true,
  "data": {
    "id": "addr-uuid-003",
    "recipient_name": "Sopheap Kong",
    "phone": "+85512345678",
    "province": "Phnom Penh",
    "district": "Chamkarmon",
    "detail": "No. 123, Street 456, Sangkat BKK1",
    "is_default": true,
    "created_at": "2026-06-05T09:00:00.000Z"
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `VALIDATION_ERROR` | 字段校验失败（`details` 中列出具体字段） |
| `400` | `ADDRESS_LIMIT_REACHED` | 已达到 10 个地址上限 |

---

### 接口 8：编辑收货地址

```
PUT /users/me/addresses/{id}
```

**说明**：编辑已有地址。字段含义同新增接口，所有字段均可选。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 地址 ID |

**请求体**：同新增接口，所有字段可选。

**成功响应** `200`：同新增接口返回结构。

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `404` | `NOT_FOUND` | 地址不存在 |
| `403` | `FORBIDDEN` | 地址不属于当前用户 |

---

### 接口 9：删除收货地址

```
DELETE /users/me/addresses/{id}
```

**说明**：删除一个收货地址。如果删除的是默认地址，系统会自动将最新添加的地址设为默认。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 地址 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": { "message": "地址已删除" }
}
```

---

## 四、商品模块

### 4.1 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/products` | 商品列表（筛选+搜索+分页+排序） | 无 |
| `GET` | `/products/{id}` | 商品详情 | 无 |
| `GET` | `/products/categories` | 品类列表 | 无 |

---

### 接口 10：商品列表

```
GET /products
```

**说明**：获取商品列表。支持按品类筛选、关键词搜索、价格排序。消费者端最高频查询。

**查询参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | `integer` | 否 | `1` | 页码，从 1 开始 |
| `limit` | `integer` | 否 | `20` | 每页数量，最大 100 |
| `category` | `string` | 否 | — | 品类：`fashion` / `beauty` / `electronics` / `home` |
| `q` | `string` | 否 | — | 搜索关键词（支持高棉语/英语/中文模糊搜索） |
| `sort` | `string` | 否 | `newest` | 排序：`newest` / `price_asc` / `price_desc` / `popular` |

**请求示例**：

```bash
# 时尚品类 + 价格从低到高 + 第 1 页
GET /api/v1/products?category=fashion&sort=price_asc&page=1&limit=20

# 搜索"连衣裙"（高棉语）
GET /api/v1/products?q=រ៉ូប&lang=km

# 热门商品
GET /api/v1/products?sort=popular&limit=10
```

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "id": "prod-uuid-001",
      "name": "រ៉ូប ពណ៌ក្រហម",
      "price_usd": 29.99,
      "price_khr": 120000,
      "thumbnail": "https://cdn.xxx.com/products/demo-1_thumb.webp",
      "merchant_name": "សុភាព ហ្វេសិន",
      "category": "fashion",
      "sales_count": 156,
      "created_at": "2026-06-01T08:00:00.000Z"
    },
    {
      "id": "prod-uuid-002",
      "name": "អាវយឺត ពណ៌ស",
      "price_usd": 12.50,
      "price_khr": 50000,
      "thumbnail": "https://cdn.xxx.com/products/demo-2_thumb.webp",
      "merchant_name": "សុភាព ហ្វេសិន",
      "category": "fashion",
      "sales_count": 89,
      "created_at": "2026-06-03T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "total_pages": 8,
    "has_next": true
  }
}
```

**说明**：
- `name` 字段返回的内容语言取决于请求头 `Accept-Language`（`km` 返回高棉语名，`en` 返回英语名，`zh` 返回中文名）
- `thumbnail` 取 `images` 数组的第一张缩略图
- 仅返回 `status=active` 且 `stock > 0` 的在售商品

---

### 接口 11：商品详情

```
GET /products/{id}
```

**说明**：获取单个商品的完整信息，包括多语言描述、所有图片、规格选项。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 商品 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "id": "prod-uuid-001",
    "merchant": {
      "id": "merchant-uuid-001",
      "name": "សុភាព ហ្វេសិន"
    },
    "name_km": "រ៉ូប ពណ៌ក្រហម",
    "name_en": "Red Dress",
    "name_zh": "红色连衣裙",
    "description_km": "សំលៀកបំពាក់ធ្វើពីក្រណាត់មានគុណភាពខ្ពស់ ...",
    "description_en": "High quality fabric dress suitable for casual and formal occasions ...",
    "description_zh": "采用优质面料制成的连衣裙，适合休闲和正式场合 ...",
    "price_usd": 29.99,
    "price_khr": 120000,
    "stock": 50,
    "images": [
      {
        "url": "https://cdn.xxx.com/products/demo-1.webp",
        "thumb_url": "https://cdn.xxx.com/products/demo-1_thumb.webp",
        "width": 800,
        "height": 800,
        "sort_order": 0
      },
      {
        "url": "https://cdn.xxx.com/products/demo-1b.webp",
        "thumb_url": "https://cdn.xxx.com/products/demo-1b_thumb.webp",
        "width": 800,
        "height": 800,
        "sort_order": 1
      }
    ],
    "specs": [
      {
        "name_km": "ពណ៌",
        "name_en": "Color",
        "values": [
          {
            "value_km": "ក្រហម",
            "value_en": "Red",
            "stock": 20,
            "price_usd": 29.99,
            "price_khr": 120000
          },
          {
            "value_km": "ខៀវ",
            "value_en": "Blue",
            "stock": 15,
            "price_usd": 32.99,
            "price_khr": 132000
          },
          {
            "value_km": "ស",
            "value_en": "White",
            "stock": 0,
            "price_usd": 29.99,
            "price_khr": 120000
          }
        ]
      },
      {
        "name_km": "ទំហំ",
        "name_en": "Size",
        "values": [
          { "value_km": "S", "value_en": "S", "stock": 10 },
          { "value_km": "M", "value_en": "M", "stock": 25 },
          { "value_km": "L", "value_en": "L", "stock": 15 }
        ]
      }
    ],
    "category": "fashion",
    "sales_count": 156,
    "created_at": "2026-06-01T08:00:00.000Z"
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `404` | `NOT_FOUND` | 商品不存在 |
| `410` | `PRODUCT_INACTIVE` | 商品已下架（前端可根据此码展示"已下架"页面） |

---

### 接口 12：品类列表

```
GET /products/categories
```

**说明**：获取所有可用品类及其图标。

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "code": "fashion",
      "name_km": "សំលៀកបំពាក់",
      "name_en": "Fashion",
      "name_zh": "时尚",
      "icon_url": "https://cdn.xxx.com/icons/fashion.svg",
      "product_count": 520
    },
    {
      "code": "beauty",
      "name_km": "គ្រឿងសម្អាង",
      "name_en": "Beauty",
      "name_zh": "美妆",
      "icon_url": "https://cdn.xxx.com/icons/beauty.svg",
      "product_count": 310
    },
    {
      "code": "electronics",
      "name_km": "គ្រឿងអេឡិចត្រូនិច",
      "name_en": "Electronics",
      "name_zh": "电子",
      "icon_url": "https://cdn.xxx.com/icons/electronics.svg",
      "product_count": 145
    },
    {
      "code": "home",
      "name_km": "គ្រឿងសង្ហារិម",
      "name_en": "Home",
      "name_zh": "家居",
      "icon_url": "https://cdn.xxx.com/icons/home.svg",
      "product_count": 88
    }
  ]
}
```

---

## 五、购物车模块

### 5.1 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/cart` | 查看购物车 | JWT |
| `POST` | `/cart/items` | 添加商品到购物车 | JWT |
| `PUT` | `/cart/items/{id}` | 修改购物车商品数量 | JWT |
| `DELETE` | `/cart/items/{id}` | 删除购物车商品 | JWT |
| `DELETE` | `/cart` | 清空购物车 | JWT |

### 5.2 购物车数据说明

- 购物车数据存储在 **Redis**（`cart:{user_id}`），与后端同步，不受 Mini App localStorage 清除影响
- 购物车按商家分组展示
- 每次进入购物车时，自动校验库存并调整数量（库存不足标记为"库存不足"）
- 未登录用户的购物车存本地 localStorage，登录后与后端购物车合并（同商品数量相加）

---

### 接口 13：查看购物车

```
GET /cart
```

**说明**：返回当前用户的购物车内容，按商家分组，显示商品最新价格和库存。

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "merchant_id": "merchant-uuid-001",
        "merchant_name": "សុភាព ហ្វេសិន",
        "items": [
          {
            "id": "cart-item-uuid-001",
            "product_id": "prod-uuid-001",
            "product_name": "រ៉ូប ពណ៌ក្រហម",
            "thumbnail": "https://cdn.xxx.com/products/demo-1_thumb.webp",
            "spec": { "color": "ក្រហម", "size": "M" },
            "price_usd": 29.99,
            "price_khr": 120000,
            "quantity": 2,
            "max_quantity": 20,
            "stock_status": "ok",
            "subtotal_usd": 59.98
          },
          {
            "id": "cart-item-uuid-002",
            "product_id": "prod-uuid-003",
            "product_name": "ស្បែកជើង ស្បែក",
            "thumbnail": "https://cdn.xxx.com/products/demo-3_thumb.webp",
            "spec": { "size": "42" },
            "price_usd": 45.00,
            "price_khr": 180000,
            "quantity": 1,
            "max_quantity": 1,
            "stock_status": "low_stock",
            "stock_warning": "仅剩 1 件",
            "subtotal_usd": 45.00
          }
        ]
      },
      {
        "merchant_id": "merchant-uuid-002",
        "merchant_name": "ស្រីស្អាត សម្រស់",
        "items": [
          {
            "id": "cart-item-uuid-003",
            "product_id": "prod-uuid-010",
            "product_name": "ក្រែម លាបមុខ",
            "thumbnail": "https://cdn.xxx.com/products/demo-10_thumb.webp",
            "spec": null,
            "price_usd": 15.50,
            "price_khr": 62000,
            "quantity": 3,
            "max_quantity": 50,
            "stock_status": "ok",
            "subtotal_usd": 46.50
          }
        ]
      }
    ],
    "summary": {
      "total_items": 3,
      "total_usd": 151.48,
      "total_khr": 606000
    }
  }
}
```

**字段说明**：

| 字段 | 说明 |
|------|------|
| `stock_status` | `ok` = 库存充足 / `low_stock` = 库存紧张 / `out_of_stock` = 已售罄 |
| `max_quantity` | 当前可购买的最大数量（不超过库存），此时不允许再 + |
| `stock_warning` | 库存紧张时的三语提示文本 |

---

### 接口 14：添加商品到购物车

```
POST /cart/items
```

**说明**：将商品加入购物车。同一商品+同一规格 → 数量累加（不新增行）。不同规格 → 新增行。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `product_id` | `string` (UUID) | 是 | 商品 ID |
| `quantity` | `integer` | 是 | 数量，≥ 1，≤ 当前库存 |
| `spec` | `object` | 否 | 所选规格，如 `{"color":"ក្រហម","size":"M"}` |

**请求示例**：

```json
{
  "product_id": "prod-uuid-001",
  "quantity": 2,
  "spec": { "color": "ក្រហម", "size": "M" }
}
```

**成功响应** `201`：

```json
{
  "success": true,
  "data": {
    "id": "cart-item-uuid-001",
    "product_id": "prod-uuid-001",
    "quantity": 2,
    "cart_total_items": 5
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `INSUFFICIENT_STOCK` | 请求数量超过库存 |
| `404` | `NOT_FOUND` | 商品不存在 |
| `410` | `PRODUCT_INACTIVE` | 商品已下架 |

---

### 接口 15：修改购物车商品数量

```
PUT /cart/items/{id}
```

**说明**：修改购物车中某件商品的数量。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 购物车条目 ID |

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `quantity` | `integer` | 是 | 新数量，≥ 1，≤ 当前库存 |

**请求示例**：

```json
{
  "quantity": 3
}
```

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "id": "cart-item-uuid-001",
    "quantity": 3,
    "subtotal_usd": 89.97
  }
}
```

---

### 接口 16：删除购物车商品

```
DELETE /cart/items/{id}
```

**说明**：从购物车中删除一件商品。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 购物车条目 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "message": "已从购物车移除",
    "cart_total_items": 4
  }
}
```

---

### 接口 17：清空购物车

```
DELETE /cart
```

**说明**：一键清空当前用户的所有购物车商品。

**成功响应** `200`：

```json
{
  "success": true,
  "data": { "message": "购物车已清空" }
}
```

---

## 六、订单模块

### 6.1 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/orders` | 创建订单 | JWT |
| `GET` | `/orders` | 我的订单列表 | JWT |
| `GET` | `/orders/{id}` | 订单详情 | JWT |
| `POST` | `/orders/{id}/cancel` | 取消订单 | JWT |
| `POST` | `/orders/{id}/confirm` | 确认收货 | JWT |

### 6.2 订单状态说明

| 状态值 | 前端显示标签 | 颜色 | 可执行操作 |
|--------|-------------|------|-----------|
| `pending_payment` | 待付款 | 🟠 橙色 | 去支付、取消订单 |
| `paid` | 已付款 | 🔵 蓝色 | 查看（等待商家发货） |
| `shipped` | 已发货 | 🟢 绿色 | 确认收货、查看物流 |
| `completed` | 已完成 | ⚫ 灰色 | 查看（不可操作） |
| `cancelled` | 已取消 | 🔴 红色 | 查看（不可操作） |

---

### 接口 18：创建订单

```
POST /orders
```

**说明**：提交订单。这是整个平台最核心的接口，涉及库存预占、优惠券校验、价格计算等逻辑，全部在同一数据库事务中完成。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `items` | `array` | 是 | 商品列表，至少 1 件 |
| `items[].product_id` | `string` (UUID) | 是 | 商品 ID |
| `items[].quantity` | `integer` | 是 | 购买数量，≥ 1 |
| `items[].spec` | `object` | 否 | 所选规格 |
| `shipping_address_id` | `string` (UUID) | 是 | 收货地址 ID |
| `coupon_id` | `string` (UUID) | 否 | 使用的优惠券 ID |
| `payment_method` | `string` | 是 | 支付方式：`khqr` / `aba_pay` / `wing_pay` / `cod` |
| `notes` | `string` | 否 | 用户备注，≤ 500 字符 |

**请求示例**：

```json
{
  "items": [
    {
      "product_id": "prod-uuid-001",
      "quantity": 1,
      "spec": { "color": "ក្រហម", "size": "M" }
    },
    {
      "product_id": "prod-uuid-003",
      "quantity": 2
    }
  ],
  "shipping_address_id": "addr-uuid-001",
  "coupon_id": "coupon-uuid-001",
  "payment_method": "khqr",
  "notes": "请尽量下午送达"
}
```

**成功响应** `201`：

```json
{
  "success": true,
  "data": {
    "id": "order-uuid-001",
    "order_number": "ORD-20260605-A1B2C3",
    "status": "pending_payment",
    "payment_method": "khqr",
    "payment_timeout": "2026-06-05T08:45:00.000Z",
    "total_usd": 54.99,
    "total_khr": 220000,
    "discount_usd": 5.00,
    "shipping_fee_usd": 0,
    "item_count": 3,
    "created_at": "2026-06-05T08:30:00.000Z"
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `VALIDATION_ERROR` | 参数校验失败 |
| `400` | `INSUFFICIENT_STOCK` | 某商品库存不足，`details` 中标明具体商品和可用库存 |
| `400` | `INVALID_COUPON` | 优惠券无效、已过期或已使用 |
| `400` | `COUPON_MIN_SPEND` | 订单金额未达到优惠券最低消费门槛 |
| `404` | `NOT_FOUND` | 收货地址或商品不存在 |
| `409` | `DUPLICATE_ORDER` | 重复下单（同一用户短时间内相同内容的订单） |

---

### 接口 19：我的订单列表

```
GET /orders
```

**说明**：返回当前用户的订单列表，支持按状态筛选和分页。

**查询参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `status` | `string` | 否 | — | 状态筛选：`pending_payment` / `paid` / `shipped` / `completed` / `cancelled`，不传返回全部 |
| `page` | `integer` | 否 | `1` | 页码 |
| `limit` | `integer` | 否 | `20` | 每页数量，最大 50 |

**请求示例**：

```bash
# 查看所有待付款订单
GET /api/v1/orders?status=pending_payment&page=1&limit=20
```

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid-001",
      "order_number": "ORD-20260605-A1B2C3",
      "status": "pending_payment",
      "payment_method": "khqr",
      "total_usd": 54.99,
      "total_khr": 220000,
      "item_count": 3,
      "thumbnail": "https://cdn.xxx.com/products/demo-1_thumb.webp",
      "merchant_name": "សុភាព ហ្វេសិន",
      "created_at": "2026-06-05T08:30:00.000Z"
    },
    {
      "id": "order-uuid-002",
      "order_number": "ORD-20260604-D4E5F6",
      "status": "shipped",
      "payment_method": "aba_pay",
      "total_usd": 29.99,
      "total_khr": 120000,
      "item_count": 1,
      "thumbnail": "https://cdn.xxx.com/products/demo-3_thumb.webp",
      "merchant_name": "ស្រីស្អាត សម្រស់",
      "created_at": "2026-06-04T15:20:00.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "total_pages": 1,
    "has_next": false
  }
}
```

---

### 接口 20：订单详情

```
GET /orders/{id}
```

**说明**：返回单个订单的完整信息，包括商品清单、收货地址快照、支付信息、物流信息和订单时间线。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 订单 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "id": "order-uuid-001",
    "order_number": "ORD-20260605-A1B2C3",
    "status": "shipped",
    "payment_method": "khqr",
    "payment_status": "success",

    "items": [
      {
        "product_id": "prod-uuid-001",
        "product_name": "រ៉ូប ពណ៌ក្រហម",
        "thumbnail": "https://cdn.xxx.com/products/demo-1_thumb.webp",
        "spec": { "color": "ក្រហម", "size": "M" },
        "quantity": 1,
        "price_usd": 29.99,
        "price_khr": 120000,
        "subtotal_usd": 29.99
      }
    ],

    "shipping_address": {
      "recipient_name": "Sopheap Kong",
      "phone": "+85512345678",
      "province": "Phnom Penh",
      "district": "Chamkarmon",
      "detail": "No. 123, Street 456, Sangkat BKK1"
    },

    "logistics": {
      "company": "J&T Express",
      "tracking_number": "JT123456789",
      "tracking_url": "https://www.jtexpress.com.kh/track/JT123456789",
      "estimated_delivery": "2026-06-10"
    },

    "coupon": {
      "title": "$5 OFF",
      "discount_usd": 5.00
    },

    "price_breakdown": {
      "subtotal_usd": 59.99,
      "discount_usd": 5.00,
      "shipping_fee_usd": 0,
      "total_usd": 54.99,
      "total_khr": 220000
    },

    "timeline": [
      { "status": "pending_payment", "label": "订单已创建", "time": "2026-06-05T08:30:00.000Z" },
      { "status": "paid", "label": "支付成功", "time": "2026-06-05T08:32:15.000Z" },
      { "status": "shipped", "label": "商家已发货", "time": "2026-06-05T14:00:00.000Z" }
    ],

    "actions": {
      "can_cancel": false,
      "can_confirm": true,
      "can_reorder": false
    },

    "created_at": "2026-06-05T08:30:00.000Z"
  }
}
```

**字段说明**：

| 字段 | 说明 |
|------|------|
| `shipping_address` | 下单时的收货地址**快照**，后续用户修改地址不影响此订单 |
| `logistics` | 商家发货后才返回，未发货时为 `null` |
| `price_breakdown` | 价格明细：小计 - 优惠券 + 运费 = 实付 |
| `timeline` | 订单状态变化时间线，按时间倒序 |
| `actions` | 当前订单状态允许的操作（前端据此显示/隐藏按钮） |

---

### 接口 21：取消订单

```
POST /orders/{id}/cancel
```

**说明**：取消待付款的订单。取消后释放库存、退还优惠券。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 订单 ID |

**请求体**（可选）：

```json
{
  "reason": "不想买了"
}
```

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "order_number": "ORD-20260605-A1B2C3",
    "status": "cancelled",
    "cancelled_at": "2026-06-05T08:35:00.000Z"
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `ORDER_CANNOT_CANCEL` | 订单状态不允许取消（只有 `pending_payment` 可取消） |

---

### 接口 22：确认收货

```
POST /orders/{id}/confirm
```

**说明**：消费者收到货物后确认收货，订单变为已完成状态。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 订单 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "order_number": "ORD-20260604-D4E5F6",
    "status": "completed",
    "completed_at": "2026-06-05T10:00:00.000Z"
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `ORDER_CANNOT_CONFIRM` | 只有 `shipped` 状态可确认收货 |

---

## 七、支付模块

### 7.1 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/payments/khqr` | 生成 KHQR 支付二维码 | JWT |
| `POST` | `/payments/aba_pay` | 发起 ABA Pay 支付 | JWT |
| `POST` | `/payments/wing_pay` | 发起 Wing Pay 支付 | JWT |
| `GET` | `/payments/status/{orderId}` | 查询支付状态 | JWT |

---

### 接口 23：生成 KHQR 支付二维码

```
POST /payments/khqr
```

**说明**：为指定订单生成 KHQR 支付二维码。消费者用银行 App（ABA Mobile、ACLEDA、Wing 等）扫码完成支付。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `order_id` | `string` (UUID) | 是 | 订单 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "order_number": "ORD-20260605-A1B2C3",
    "qr_image_url": "https://cdn.xxx.com/qr/khqr-xxx.png",
    "qr_data": "000201010212...",
    "amount_usd": 54.99,
    "amount_khr": 220000,
    "expires_at": "2026-06-05T08:45:00.000Z",
    "supported_banks": [
      { "name": "ABA Bank", "icon": "https://cdn.xxx.com/banks/aba.png" },
      { "name": "ACLEDA Bank", "icon": "https://cdn.xxx.com/banks/acleda.png" },
      { "name": "Wing Bank", "icon": "https://cdn.xxx.com/banks/wing.png" }
    ]
  }
}
```

**说明**：

- `qr_image_url`：前端直接展示此二维码图片
- `qr_data`：KHQR 标准的原始数据字符串（可传给原生 App 直接打开扫码）
- `expires_at`：二维码有效期与订单支付超时时间一致（15 分钟）
- 前端应每 **3 秒**轮询一次 `GET /payments/status/{orderId}` 检测支付状态

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `404` | `NOT_FOUND` | 订单不存在 |
| `400` | `ORDER_ALREADY_PAID` | 订单已支付 |
| `400` | `ORDER_CANCELLED` | 订单已取消 |
| `503` | `PAYMENT_SERVICE_UNAVAILABLE` | Bakong 支付服务暂不可用，建议换支付方式 |

---

### 接口 24：发起 ABA Pay 支付

```
POST /payments/aba_pay
```

**说明**：为指定订单生成 ABA Pay Deep Link，跳转 ABA Mobile App 付款。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `order_id` | `string` (UUID) | 是 | 订单 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "order_number": "ORD-20260605-A1B2C3",
    "deeplink_url": "abapay://payment?token=xxx...",
    "web_fallback_url": "https://pay.ababank.com/...",
    "amount_usd": 54.99,
    "expires_at": "2026-06-05T08:45:00.000Z"
  }
}
```

**说明**：

- `deeplink_url`：前端使用 `WebApp.openLink(deeplink_url)` 打开 ABA App
- 如果设备未安装 ABA App，前端使用 `web_fallback_url` 在浏览器中打开网页版支付
- 支付结果通过 **Webhook 回调** 异步通知后端，前端仍需轮询支付状态

---

### 接口 25：发起 Wing Pay 支付

```
POST /payments/wing_pay
```

**说明**：为指定订单生成 Wing Pay Deep Link。

**请求体**：同 ABA Pay 接口。

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "order_number": "ORD-20260605-A1B2C3",
    "deeplink_url": "wingpay://payment?token=xxx...",
    "amount_usd": 54.99,
    "expires_at": "2026-06-05T08:45:00.000Z"
  }
}
```

---

### 接口 26：查询支付状态

```
GET /payments/status/{orderId}
```

**说明**：查询订单的支付状态。前端在支付页轮询此接口，检测支付是否完成。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `orderId` | `string` (UUID) | 订单 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "order_number": "ORD-20260605-A1B2C3",
    "payment_status": "success",
    "order_status": "paid",
    "paid_at": "2026-06-05T08:32:15.000Z"
  }
}
```

**状态说明**：

| `payment_status` | 含义 | 前端行为 |
|------------------|------|----------|
| `pending` | 等待支付 | 继续轮询 |
| `processing` | 支付处理中 | 继续轮询 |
| `success` | 支付成功 | 跳转支付成功页 |
| `failed` | 支付失败 | 显示失败原因，允许重新支付 |

---

## 八、商家模块

### 8.1 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/merchants/register` | 商家入驻申请 | 无 |
| `GET` | `/merchants/dashboard` | 商家数据看板 | JWT (merchant) |
| `GET` | `/merchants/products` | 商家商品列表 | JWT (merchant) |
| `POST` | `/merchants/products` | 上架商品 | JWT (merchant) |
| `PUT` | `/merchants/products/{id}` | 编辑商品 | JWT (merchant) |
| `POST` | `/merchants/products/{id}/toggle` | 上架/下架商品 | JWT (merchant) |
| `GET` | `/merchants/orders` | 商家订单列表 | JWT (merchant) |
| `GET` | `/merchants/orders/{id}` | 商家订单详情 | JWT (merchant) |
| `POST` | `/merchants/orders/{id}/ship` | 确认发货 | JWT (merchant) |

---

### 接口 27：商家入驻申请

```
POST /merchants/register
```

**说明**：提交商家入驻申请。提交后需等待平台审核。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name_km` | `string` | 是 | 店铺名称（高棉语），≤ 200 字符 |
| `name_en` | `string` | 否 | 店铺名称（英语），≤ 200 字符 |
| `owner_name` | `string` | 是 | 店主姓名，≤ 100 字符 |
| `phone` | `string` | 是 | 联系电话，+855 格式 |
| `address` | `string` | 是 | 店铺地址 |
| `category` | `string` | 是 | 主营品类：`fashion` / `beauty` / `electronics` / `home` / `other` |
| `description` | `string` | 否 | 店铺简介 |

**请求示例**：

```json
{
  "name_km": "ហាង សំលៀកបំពាក់ សុភាព",
  "name_en": "Sopheap Fashion",
  "owner_name": "Sopheap Kong",
  "phone": "+85512345678",
  "address": "No. 123, Street 456, BKK1, Phnom Penh",
  "category": "fashion",
  "description": "ហាងលក់សំលៀកបំពាក់ទាន់សម័យ"
}
```

**成功响应** `201`：

```json
{
  "success": true,
  "data": {
    "id": "merchant-uuid-003",
    "status": "pending",
    "message": "申请已提交，预计 1-3 个工作日内审核完成",
    "created_at": "2026-06-05T09:00:00.000Z"
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `VALIDATION_ERROR` | 必填字段缺失或格式错误 |
| `400` | `PHONE_ALREADY_EXISTS` | 该手机号已提交过申请（同一手机号在待审核状态下不可重复提交） |

---

### 接口 28：商家数据看板

```
GET /merchants/dashboard
```

**说明**：返回商家的经营数据概览。

**查询参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `period` | `string` | 否 | `7d` | 统计周期：`7d` / `30d` |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "today": {
      "order_count": 12,
      "revenue_usd": 359.70,
      "revenue_khr": 1439000,
      "pending_orders": 3
    },
    "trend": [
      { "date": "2026-05-30", "order_count": 8, "revenue_usd": 240.00 },
      { "date": "2026-05-31", "order_count": 15, "revenue_usd": 450.00 },
      { "date": "2026-06-01", "order_count": 10, "revenue_usd": 299.90 },
      { "date": "2026-06-02", "order_count": 14, "revenue_usd": 420.00 },
      { "date": "2026-06-03", "order_count": 11, "revenue_usd": 330.00 },
      { "date": "2026-06-04", "order_count": 9, "revenue_usd": 270.00 },
      { "date": "2026-06-05", "order_count": 12, "revenue_usd": 359.70 }
    ],
    "top_products": [
      { "product_id": "prod-uuid-001", "product_name": "រ៉ូប ពណ៌ក្រហម", "sales_count": 45 },
      { "product_id": "prod-uuid-003", "product_name": "ស្បែកជើង ស្បែក", "sales_count": 32 },
      { "product_id": "prod-uuid-005", "product_name": "ខោខូវប៊យ", "sales_count": 28 }
    ],
    "order_status_distribution": {
      "pending_payment": 3,
      "paid": 5,
      "shipped": 8,
      "completed": 120,
      "cancelled": 15
    }
  }
}
```

---

### 接口 29：商家商品列表

```
GET /merchants/products
```

**说明**：返回当前商家自己的商品列表。

**查询参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `status` | `string` | 否 | — | 状态筛选：`draft` / `active` / `inactive` / `sold_out`，不传返回全部 |
| `page` | `integer` | 否 | `1` | 页码 |
| `limit` | `integer` | 否 | `20` | 每页数量 |

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "id": "prod-uuid-001",
      "name": "រ៉ូប ពណ៌ក្រហម",
      "thumbnail": "https://cdn.xxx.com/products/demo-1_thumb.webp",
      "price_usd": 29.99,
      "price_khr": 120000,
      "stock": 50,
      "status": "active",
      "sales_count": 45,
      "created_at": "2026-06-01T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 35,
    "page": 1,
    "limit": 20,
    "total_pages": 2,
    "has_next": true
  }
}
```

---

### 接口 30：商家上架商品

```
POST /merchants/products
```

**说明**：商家新增一个商品。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name_km` | `string` | 是 | 商品名称（高棉语），≤ 300 字符 |
| `name_en` | `string` | 否 | 商品名称（英语） |
| `name_zh` | `string` | 否 | 商品名称（中文） |
| `description_km` | `string` | 否 | 商品描述（高棉语） |
| `description_en` | `string` | 否 | 商品描述（英语） |
| `description_zh` | `string` | 否 | 商品描述（中文） |
| `price_usd` | `number` | 是 | USD 价格，> 0，最多 2 位小数 |
| `price_khr` | `integer` | 是 | KHR 价格（整数），> 0 |
| `stock` | `integer` | 是 | 库存数量，≥ 0 |
| `category` | `string` | 是 | 品类 |
| `image_ids` | `array` | 是 | 已上传图片的 ID 数组（先调上传接口得到图片 ID） |
| `specs` | `array` | 否 | 规格定义 |
| `status` | `string` | 否 | `active`（立即上架，默认）或 `draft`（保存草稿） |

**请求示例**：

```json
{
  "name_km": "រ៉ូប ពណ៌ក្រហម",
  "name_en": "Red Dress",
  "name_zh": "红色连衣裙",
  "description_km": "សំលៀកបំពាក់ធ្វើពីក្រណាត់មានគុណភាពខ្ពស់",
  "description_en": "High quality fabric dress",
  "description_zh": "采用优质面料制成的连衣裙",
  "price_usd": 29.99,
  "price_khr": 120000,
  "stock": 50,
  "category": "fashion",
  "image_ids": ["img-uuid-001", "img-uuid-002"],
  "specs": [
    {
      "name_km": "ពណ៌",
      "name_en": "Color",
      "values": [
        { "value_km": "ក្រហម", "value_en": "Red", "stock": 20, "price_usd": 29.99 },
        { "value_km": "ខៀវ", "value_en": "Blue", "stock": 15, "price_usd": 32.99 }
      ]
    }
  ],
  "status": "active"
}
```

**成功响应** `201`：

```json
{
  "success": true,
  "data": {
    "id": "prod-uuid-050",
    "name_km": "រ៉ូប ពណ៌ក្រហម",
    "status": "active",
    "created_at": "2026-06-05T10:00:00.000Z"
  }
}
```

---

### 接口 31：编辑商品

```
PUT /merchants/products/{id}
```

**说明**：编辑已有商品信息。请求体字段同上架接口，所有字段均可选。

---

### 接口 32：上架/下架商品

```
POST /merchants/products/{id}/toggle
```

**说明**：切换商品的上架/下架状态。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 商品 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "id": "prod-uuid-001",
    "status": "inactive",
    "updated_at": "2026-06-05T10:05:00.000Z"
  }
}
```

**说明**：每次调用在 `active` ↔ `inactive` 之间切换。售罄（`sold_out`）状态不可通过此接口切换，补货后自动恢复 `active`。

---

### 接口 33：商家订单列表

```
GET /merchants/orders
```

**说明**：返回当前商家收到的订单列表。

**查询参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `status` | `string` | 否 | — | 状态筛选 |
| `start_date` | `string` | 否 | — | 起始日期 `YYYY-MM-DD` |
| `end_date` | `string` | 否 | — | 结束日期 `YYYY-MM-DD` |
| `q` | `string` | 否 | — | 搜索（订单号 / 收货人姓名） |
| `page` | `integer` | 否 | `1` | 页码 |
| `limit` | `integer` | 否 | `20` | 每页数量 |

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid-001",
      "order_number": "ORD-20260605-A1B2C3",
      "status": "paid",
      "total_usd": 54.99,
      "total_khr": 220000,
      "item_count": 3,
      "recipient_name": "Sopheap Kong",
      "payment_method": "khqr",
      "is_cod": false,
      "created_at": "2026-06-05T08:30:00.000Z"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "total_pages": 3,
    "has_next": true
  }
}
```

---

### 接口 34：商家订单详情

```
GET /merchants/orders/{id}
```

**说明**：返回单个订单的完整详情，含商品明细、收货地址、客户信息和全时间戳。商家只能查看归属自己店铺的订单。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 订单 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "id": "order-uuid-001",
    "order_number": "ORD-20260605-A1B2C3",
    "status": "paid",
    "payment_method": "khqr",
    "payment_status": "success",
    "total_usd": 54.99,
    "total_khr": 220000,
    "shipping_address": {
      "recipient_name": "Sopheap Kong",
      "phone": "+85512345678",
      "address": "Phnom Penh, Chamkarmon",
      "notes": "Leave at reception"
    },
    "items": [
      {
        "id": "item-uuid-001",
        "product_name": "ទឹកក្រូចដូង",
        "product_name_en": "Coconut Water",
        "thumbnail": "https://cdn.example.com/thumb1.jpg",
        "quantity": 2,
        "unit_price_usd": 2.50,
        "unit_price_khr": 10000,
        "total_price_usd": 5.00,
        "total_price_khr": 20000
      }
    ],
    "customer": {
      "name": "Sopheap Kong",
      "phone": "+85512345678",
      "telegram_id": "12345678"
    },
    "created_at": "2026-06-05T08:30:00.000Z",
    "paid_at": "2026-06-05T08:32:15.000Z",
    "shipped_at": null,
    "completed_at": null,
    "cancelled_at": null
  }
}
```

**错误响应**：

| HTTP | error.code | 说明 |
|------|------------|------|
| `404` | `NOT_FOUND` | 订单不存在或不属于当前商家 |

---

### 接口 35：确认发货

```
POST /merchants/orders/{id}/ship
```

**说明**：商家对已付款订单确认发货，填写物流信息。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 订单 ID |

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `logistics_company` | `string` | 是 | 物流公司名称 |
| `tracking_number` | `string` | 是 | 物流运单号 |

**请求示例**：

```json
{
  "logistics_company": "J&T Express",
  "tracking_number": "JT123456789"
}
```

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "order_number": "ORD-20260605-A1B2C3",
    "status": "shipped",
    "logistics": {
      "company": "J&T Express",
      "tracking_number": "JT123456789"
    },
    "shipped_at": "2026-06-05T14:00:00.000Z"
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `ORDER_CANNOT_SHIP` | 只有 `paid` 状态的订单可以发货 |

---

## 九、优惠券模块

### 9.1 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/coupons` | 可领取优惠券列表 | JWT |
| `POST` | `/coupons/{id}/claim` | 领取优惠券 | JWT |
| `GET` | `/users/me/coupons` | 我的优惠券 | JWT |

---

### 接口 36：可领取优惠券列表

```
GET /coupons
```

**说明**：返回当前用户可领取的优惠券列表（排除已领取过的和已领完的）。

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "id": "coupon-uuid-001",
      "title": "បញ្ចុះតម្លៃ $5",
      "type": "fixed",
      "type_label": "满减券",
      "value": 5.00,
      "value_label": "减 $5.00",
      "min_spend": 20.00,
      "remaining": 85,
      "end_date": "2026-07-05T23:59:59.000Z",
      "days_left": 30,
      "is_claimed": false
    },
    {
      "id": "coupon-uuid-002",
      "title": "10% OFF",
      "type": "discount",
      "type_label": "折扣券",
      "value": 10.00,
      "value_label": "9 折",
      "min_spend": 30.00,
      "remaining": 180,
      "end_date": "2026-08-04T23:59:59.000Z",
      "days_left": 60,
      "is_claimed": true
    }
  ]
}
```

---

### 接口 37：领取优惠券

```
POST /coupons/{id}/claim
```

**说明**：领取一张优惠券。每人每券限领一次。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 优惠券 ID |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "message": "领取成功",
    "coupon": {
      "id": "coupon-uuid-001",
      "title": "បញ្ចុះតម្លៃ $5",
      "end_date": "2026-07-05T23:59:59.000Z"
    }
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `COUPON_SOLD_OUT` | 已全部被领完 |
| `400` | `COUPON_ALREADY_CLAIMED` | 已领取过此券 |
| `400` | `COUPON_EXPIRED` | 优惠券已过期 |
| `404` | `NOT_FOUND` | 优惠券不存在 |

---

### 接口 38：我的优惠券

```
GET /users/me/coupons
```

**说明**：返回当前用户已领取的优惠券。

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | `string` | 否 | `unused`（默认）/ `used` / `expired` |

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "id": "user-coupon-uuid-001",
      "coupon_id": "coupon-uuid-001",
      "title": "បញ្ចុះតម្លៃ $5",
      "type": "fixed",
      "value": 5.00,
      "min_spend": 20.00,
      "status": "unused",
      "end_date": "2026-07-05T23:59:59.000Z",
      "received_at": "2026-06-05T09:30:00.000Z"
    }
  ]
}
```

---

## 十、文件上传模块

### 接口 39：上传图片

```
POST /upload/image
```

**说明**：商家上传商品图片。支持 JPG、PNG、WebP 格式，单张最大 5MB。后端自动压缩并生成 WebP + 缩略图。

**请求头**：

| 参数 | 值 | 必填 |
|------|-----|------|
| `Authorization` | `Bearer <Token>` | 是（商家角色） |
| `Content-Type` | `multipart/form-data` | 是 |

**请求体**（`multipart/form-data`）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | `file` | 是 | 图片文件（JPG / PNG / WebP），≤ 5MB |

**成功响应** `201`：

```json
{
  "success": true,
  "data": {
    "id": "img-uuid-001",
    "url": "https://cdn.shop.xinhua-tech.kh/products/img-uuid-001.webp",
    "thumb_url": "https://cdn.shop.xinhua-tech.kh/products/img-uuid-001_thumb.webp",
    "width": 800,
    "height": 800,
    "size_bytes": 45678
  }
}
```

**错误响应**：

| 状态码 | error.code | 说明 |
|--------|------------|------|
| `400` | `INVALID_FILE_TYPE` | 不支持的文件格式 |
| `400` | `FILE_TOO_LARGE` | 文件超过 5MB 限制 |
| `429` | `RATE_LIMITED` | 上传频率过高（同一 IP 10 次/分钟） |

---

## 十一、平台运营模块

### 11.1 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `POST` | `/admin/merchants/{id}/approve` | 审核通过商家 | JWT (admin) |
| `POST` | `/admin/merchants/{id}/reject` | 审核驳回商家 | JWT (admin) |
| `GET` | `/admin/dashboard` | 平台数据大盘 | JWT (admin) |
| `GET` | `/admin/merchants` | 商家列表 | JWT (admin) |
| `GET` | `/admin/users` | 用户列表 | JWT (admin) |

### 11.2 管理员认证说明

管理员使用独立的账号密码 + OTP 登录（非 Telegram 登录）。管理接口需要 `role=admin` 的 JWT Token。

---

### 接口 40：审核通过商家

```
POST /admin/merchants/{id}/approve
```

**说明**：通过商家的入驻申请，商家状态变为 `active`，可以登录后台。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 商家 ID |

**请求体**（可选）：

```json
{
  "commission_rate": 3.0
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `commission_rate` | `number` | 否 | 自定义佣金率（默认使用系统默认值 3.0），范围 0-20 |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "id": "merchant-uuid-003",
    "status": "active",
    "commission_rate": 3.0,
    "approved_at": "2026-06-05T10:00:00.000Z"
  }
}
```

**说明**：审核通过后自动触发 Telegram Bot 通知（"恭喜！您的店铺审核已通过"）。

---

### 接口 41：审核驳回商家

```
POST /admin/merchants/{id}/reject
```

**说明**：驳回商家入驻申请。必须填写驳回原因。

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | `string` (UUID) | 商家 ID |

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `reason` | `string` | 是 | 驳回原因，≤ 500 字符 |

**请求示例**：

```json
{
  "reason": "店铺名称与实际经营品类不符，请核实后重新提交"
}
```

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "id": "merchant-uuid-003",
    "status": "rejected",
    "reject_reason": "店铺名称与实际经营品类不符，请核实后重新提交",
    "rejected_at": "2026-06-05T10:00:00.000Z"
  }
}
```

---

### 接口 42：平台数据大盘

```
GET /admin/dashboard
```

**说明**：返回全平台的核心运营数据。

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `period` | `string` | 否 | `7d`（默认）/ `30d` |

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "today_summary": {
      "order_count": 125,
      "gmv_usd": 3749.50,
      "gmv_khr": 15000000,
      "new_users": 45,
      "new_merchants": 3,
      "payment_success_rate": 96.5
    },
    "trend": [
      { "date": "2026-05-30", "order_count": 98, "gmv_usd": 2940.00 },
      { "date": "2026-05-31", "order_count": 112, "gmv_usd": 3360.00 },
      { "date": "2026-06-01", "order_count": 105, "gmv_usd": 3150.00 },
      { "date": "2026-06-02", "order_count": 130, "gmv_usd": 3900.00 },
      { "date": "2026-06-03", "order_count": 118, "gmv_usd": 3540.00 },
      { "date": "2026-06-04", "order_count": 108, "gmv_usd": 3240.00 },
      { "date": "2026-06-05", "order_count": 125, "gmv_usd": 3749.50 }
    ],
    "top_merchants": [
      { "merchant_id": "merchant-uuid-001", "merchant_name": "សុភាព ហ្វេសិន", "gmv_usd": 1500.00 },
      { "merchant_id": "merchant-uuid-002", "merchant_name": "ស្រីស្អាត សម្រស់", "gmv_usd": 980.00 }
    ],
    "category_distribution": [
      { "category": "fashion", "gmv_usd": 1875.00, "percentage": 50 },
      { "category": "beauty", "gmv_usd": 750.00, "percentage": 20 }
    ]
  }
}
```

---

### 接口 43：商家列表（管理员）

```
GET /admin/merchants
```

**说明**：返回全平台商家列表，支持按状态筛选和搜索。

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `status` | `string` | 否 | `pending` / `active` / `suspended` / `rejected` |
| `q` | `string` | 否 | 搜索（店铺名称 / 手机号） |
| `page` | `integer` | 否 | 页码 |
| `limit` | `integer` | 否 | 每页数量 |

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "id": "merchant-uuid-001",
      "name_km": "សុភាព ហ្វេសិន",
      "name_en": "Sopheap Fashion",
      "owner_name": "Sopheap Kong",
      "phone": "+85512345678",
      "category": "fashion",
      "status": "active",
      "commission_rate": 3.0,
      "product_count": 35,
      "total_orders": 120,
      "created_at": "2026-06-01T08:00:00.000Z"
    }
  ],
  "meta": { "total": 200, "page": 1, "limit": 20, "total_pages": 10, "has_next": true }
}
```

---

### 接口 44：用户列表（管理员）

```
GET /admin/users
```

**说明**：返回全平台用户列表。

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `q` | `string` | 否 | 搜索（用户名 / 手机号 / Telegram ID） |
| `status` | `string` | 否 | `active` / `disabled` |
| `page` | `integer` | 否 | 页码 |
| `limit` | `integer` | 否 | 每页数量 |

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid-001",
      "telegram_id": 123456789,
      "first_name": "Sopheap",
      "last_name": "Kong",
      "username": "sopheap_k",
      "phone": "+85512345678",
      "language": "km",
      "status": "active",
      "order_count": 12,
      "total_spent_usd": 359.70,
      "created_at": "2026-06-01T08:00:00.000Z"
    }
  ],
  "meta": { "total": 5000, "page": 1, "limit": 20, "total_pages": 250, "has_next": true }
}
```

---

## 十二、Webhook 回调

### 接口 45：支付回调（统一入口）

```
POST /webhooks/payment
```

**说明**：外部支付系统（Bakong / ABA Pay / Wing Pay）支付完成后回调通知平台。**此接口由支付服务商调用，非前端调用。**

**请求体**（不同支付服务商格式不同，统一处理后）：

```json
{
  "provider": "bakong",
  "transaction_id": "TXN-20260605-001",
  "order_number": "ORD-20260605-A1B2C3",
  "amount": 54.99,
  "currency": "USD",
  "status": "success",
  "paid_at": "2026-06-05T08:32:15.000Z",
  "signature": "sha256-hmac-signature-string"
}
```

**说明**：
- 后端使用对应支付服务商的 Secret Key 验证 `signature`
- 验证通过后更新订单支付状态
- 同一 `transaction_id` 的回调具有**幂等性**（重复回调只处理一次）
- 支付成功后自动加入 Bot 通知队列

**成功响应** `200`：

```json
{
  "success": true,
  "data": { "status": "processed" }
}
```

---

## 十三、公共接口

### 接口 46：健康检查

```
GET /health
```

**说明**：检查服务健康状态。供负载均衡器和监控系统调用。

**成功响应** `200`：

```json
{
  "status": "ok",
  "timestamp": "2026-06-05T08:30:00.000Z",
  "uptime_seconds": 86400,
  "checks": {
    "database": "connected",
    "redis": "connected",
    "s3": "reachable"
  }
}
```

---

### 接口 47：汇率查询

```
GET /utils/exchange-rate
```

**说明**：获取当前 USD → KHR 汇率。

**成功响应** `200`：

```json
{
  "success": true,
  "data": {
    "usd_to_khr": 4000,
    "updated_at": "2026-06-05T06:00:00.000Z"
  }
}
```

---

### 接口 48：柬埔寨省市列表

```
GET /utils/provinces
```

**说明**：获取柬埔寨所有省市及区县列表，供地址选择器使用。

**成功响应** `200`：

```json
{
  "success": true,
  "data": [
    {
      "code": "phnom_penh",
      "name_km": "ភ្នំពេញ",
      "name_en": "Phnom Penh",
      "districts": [
        { "code": "chamkarmon", "name_km": "ចំការមន", "name_en": "Chamkarmon" },
        { "code": "toul_kork", "name_km": "ទួលគោក", "name_en": "Toul Kork" },
        { "code": "bkk1", "name_km": "បឹងកេងកង", "name_en": "Boeung Keng Kang" }
      ]
    },
    {
      "code": "siem_reap",
      "name_km": "សៀមរាប",
      "name_en": "Siem Reap",
      "districts": [
        { "code": "svay_dangkum", "name_km": "ស្វាយដង្គំ", "name_en": "Svay Dangkum" }
      ]
    }
  ]
}
```

---

## 十四、错误码速查表

### 14.1 通用错误码

| HTTP | error.code | 默认消息（英语） |
|------|------------|-----------------|
| `400` | `VALIDATION_ERROR` | Validation failed |
| `401` | `UNAUTHORIZED` | Authentication required |
| `401` | `TOKEN_EXPIRED` | Token has expired |
| `401` | `TOKEN_BLACKLISTED` | Token has been revoked |
| `401` | `INVALID_INIT_DATA` | Invalid Telegram initData signature |
| `401` | `INIT_DATA_EXPIRED` | initData has expired |
| `403` | `FORBIDDEN` | Access denied |
| `404` | `NOT_FOUND` | Resource not found |
| `409` | `DUPLICATE_ORDER` | Duplicate order detected |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `INTERNAL_ERROR` | Internal server error |
| `503` | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

### 14.2 业务错误码

| HTTP | error.code | 说明 |
|------|------------|------|
| `400` | `INSUFFICIENT_STOCK` | 库存不足 |
| `400` | `PRODUCT_SOLD_OUT` | 商品已售罄 |
| `400` | `INVALID_COUPON` | 优惠券无效 |
| `400` | `COUPON_EXPIRED` | 优惠券已过期 |
| `400` | `COUPON_ALREADY_CLAIMED` | 已领取过此券 |
| `400` | `COUPON_SOLD_OUT` | 优惠券已被领完 |
| `400` | `COUPON_MIN_SPEND` | 未达到最低消费门槛 |
| `400` | `ORDER_NOT_PAYABLE` | 订单状态不支持支付 |
| `400` | `ORDER_CANNOT_CANCEL` | 订单状态不允许取消 |
| `400` | `ORDER_CANNOT_CONFIRM` | 订单状态不允许确认收货 |
| `400` | `ORDER_CANNOT_SHIP` | 订单状态不允许发货 |
| `400` | `ORDER_ALREADY_PAID` | 订单已支付 |
| `400` | `ORDER_CANCELLED` | 订单已取消 |
| `400` | `ADDRESS_LIMIT_REACHED` | 地址数量已达上限（10个） |
| `400` | `PHONE_ALREADY_EXISTS` | 手机号已被使用 |
| `400` | `INVALID_FILE_TYPE` | 不支持的图片格式 |
| `400` | `FILE_TOO_LARGE` | 图片超过大小限制 |
| `410` | `PRODUCT_INACTIVE` | 商品已下架 |

---

## 十五、接口调用示例（前端）

### 15.1 Axios 封装

```javascript
// api/index.js — 前端 API 请求层封装
import axios from 'axios';
import { useUserStore } from '@/stores/userStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,  // https://api.shop.xinhua-tech.kh/api/v1
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// 请求拦截器：自动附带 Token + 语言头
api.interceptors.request.use((config) => {
  const userStore = useUserStore();
  if (userStore.token) {
    config.headers.Authorization = `Bearer ${userStore.token}`;
  }
  config.headers['Accept-Language'] = userStore.language || 'km';
  return config;
});

// 响应拦截器：统一解包 + Token 自动刷新
api.interceptors.response.use(
  (response) => response.data,  // 只取 data 层
  async (error) => {
    // 401 → 尝试刷新 Token
    if (error.response?.status === 401 && !error.config._retry) {
      // ... Token 刷新逻辑（见系统架构设计说明书 4.4 节）
    }
    // 统一显示错误提示
    const msg = error.response?.data?.error?.message || '网络错误，请稍后重试';
    showToast(msg);
    return Promise.reject(error);
  }
);

export default api;
```

### 15.2 调用示例

```javascript
// 获取商品列表
import api from '@/api';

// GET 请求
const { data, meta } = await api.get('/products', {
  params: { category: 'fashion', sort: 'price_asc', page: 1, limit: 20 }
});

// POST 请求（创建订单）
const result = await api.post('/orders', {
  items: [
    { product_id: 'prod-uuid-001', quantity: 1, spec: { color: 'ក្រហម', size: 'M' } }
  ],
  shipping_address_id: 'addr-uuid-001',
  payment_method: 'khqr'
});

// POST 请求（KHQR 支付）
const payment = await api.post('/payments/khqr', {
  order_id: result.data.id
});

// 轮询支付状态
const pollTimer = setInterval(async () => {
  const status = await api.get(`/payments/status/${result.data.id}`);
  if (status.data.payment_status === 'success') {
    clearInterval(pollTimer);
    // 跳转支付成功页
  }
}, 3000);  // 每 3 秒查询一次
```

---

> **本文档是前后端开发的"合同"。前端按此调接口，后端按此实现。接口变更必须同步更新此文档和 Swagger 定义。**
>
> **Swagger 地址**：`https://api.shop.xinhua-tech.kh/api-docs`（部署后自动生成）  
> **Postman Collection**：`项目文档/postman-collection.json`（待生成）
>
> 文档状态：✅ 已发布 | 下次更新：接口变更时
