# Sprint 7：运营体验增强 — 设计文档

> **文档版本**：V1.0 | **编制日期**：2026-07-03 | **对应 Backlog**：S2-21, S5-06, S5-07 + 优惠券后台

## 1. 目标

4 条 Story，~20 点：商品标签、收藏商品、客服反馈工单、优惠券后台管理。

| Story | 估点 | 核心交付 |
|-------|------|---------|
| S2-21 商品标签与销量 | 5pt | Product +tags JSON, admin 标签配置, Mini App 标签展示 |
| S5-07 收藏商品 | 5pt | Wishlist 模型, toggle/list/remove API, Mini App 收藏 UI |
| S5-06 客服反馈工单 | 5pt | FeedbackTicket 模型, 意见反馈表单, Admin 工单管理 |
| 优惠券后台管理 | 5pt | Admin 优惠券 CRUD API + CouponsPage 管理界面 |

## 2. 数据库变更

### 2.1 Product 表扩展

```prisma
tags  Json  @default("[]") @map("tags") @db.JsonB
// 格式: [{ textKm, textEn, textZh, color, bg }]
```

### 2.2 Wishlist 新表

```prisma
model Wishlist {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  productId String   @map("product_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@unique([userId, productId])
  @@index([userId, createdAt])
  @@map("wishlist")
}
```

### 2.3 FeedbackTicket 新表

```prisma
model FeedbackTicket {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  content    String    @db.Text
  images     Json      @default("[]") @db.JsonB
  status     String    @default("pending") @db.VarChar(20) // pending | resolved
  resolvedAt DateTime? @map("resolved_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  @@index([status, createdAt])
  @@map("feedback_tickets")
}
```

## 3. API 设计

### 3.1 收藏

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/wishlist/toggle` | `{productId}` → 切换收藏状态 | auth |
| GET | `/wishlist` | 收藏列表（分页） | auth |
| DELETE | `/wishlist/:productId` | 取消收藏 | auth |

product API 扩展：列表/详情返回 `isFavorited: boolean`（auth 时），`tags: [...]`。

### 3.2 反馈工单

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/feedback` | `{content, images}` → 提交反馈 | auth |
| GET | `/admin/feedback` | 工单列表（分页+筛选） | admin |

### 3.3 优惠券后台

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/admin/coupons` | 优惠券列表 | admin |
| POST | `/admin/coupons` | 创建优惠券 | admin |
| PUT | `/admin/coupons/:id` | 编辑优惠券 | admin |
| PATCH | `/admin/coupons/:id/status` | 启用/停用 | admin |

### 3.4 Admin 商品标签扩展

PUT `/admin/products/:id` 支持 `tags` 字段。

## 4. 前端变更

### Mini App
- **ProductCard.vue**: 渲染 tags
- **ProductDetail.vue**: tags + 心形收藏按钮（toggleWishlist + isFavorited）
- **ProfilePage.vue**: 新增「我的收藏」+「意见反馈」入口
- **WishlistPage.vue** (新): 收藏列表，商品卡片 + 取消收藏 + 加购
- **FeedbackPage.vue** (新): 意见反馈表单

### Admin
- **CouponsPage.vue** (新): 表格 + 创建/编辑弹窗
- **FeedbackPage.vue** (新): 工单列表 + 标记已处理
- **ProductFormPage.vue**: 追加标签编辑
- **Sidebar.vue**: 新增「优惠券」「工单反馈」导航

## 5. 预设标签模板

| key | km | en | zh | color | bg |
|-----|----|----|----|-------|-----|
| new | មកដល់ | NEW | 新品 | #fff | #2563eb |
| sale | បញ្ចុះតម្លៃ | SALE | 特价 | #fff | #c43a30 |
| best | លក់ដាច់ | BEST | 热卖 | #fff | #c4932a |
| free_ship | ដឹកឥតគិត | FREE SHIP | 包邮 | #fff | #16a34a |
