# Sprint 7：运营体验增强 — 实现计划

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax.

**Goal:** 商品标签展示、收藏商品、客服反馈工单、优惠券后台管理 — 4 条 Story，~20 点。

**Architecture:** 两条独立线 — (A) 消费者端：标签渲染 + 收藏 + 反馈表单；(B) 运营端：优惠券 CRUD + 工单处理。共享标签数据和 Wishlist/FeedbackTicket 模型。

**Tech Stack:** Node.js + Express + Prisma + PostgreSQL · Vue 3 + Vite · Pinia

## Global Constraints
- TDD：先写失败测试 → 最小实现 → 测试通过
- 三语支持 (km/en/zh)
- 统一账户模型
- 密码 bcrypt salt=10

---

### Task 1: Schema 迁移

**Files:** Modify `tgmall-api/prisma/schema.prisma`

- [ ] Product 模型追加 `tags Json @default("[]") @map("tags") @db.JsonB`
- [ ] 新增 Wishlist 模型
- [ ] 新增 FeedbackTicket 模型
- [ ] `npx prisma db push --accept-data-loss`
- [ ] 运行已有测试确认无回归
- [ ] Commit

### Task 2: Wishlist 服务 + 测试

**Files:** Create `src/services/wishlist.service.js`, `tests/unit/wishlist-service.test.js`

- [ ] toggleWishlist(userId, productId) → { isFavorited }
- [ ] listWishlist(userId, page, limit) → { items, total }
- [ ] removeWishlist(userId, productId)
- [ ] 单元测试 5 条
- [ ] Commit

### Task 3: Wishlist 控制器 + 路由

**Files:** Create `src/controllers/wishlist.controller.js`, `src/routes/wishlist.routes.js`, modify `src/routes/index.js`

- [ ] POST /wishlist/toggle
- [ ] GET /wishlist
- [ ] DELETE /wishlist/:productId
- [ ] Commit

### Task 4: Feedback 服务 + 测试

**Files:** Create `src/services/feedback.service.js`, `tests/unit/feedback-service.test.js`

- [ ] submitFeedback(userId, content, images)
- [ ] listFeedback(page, limit, status) — admin
- [ ] resolveTicket(id) — admin
- [ ] 单元测试 4 条
- [ ] Commit

### Task 5: Feedback 控制器 + 路由

**Files:** Create `src/controllers/feedback.controller.js`, `src/routes/feedback.routes.js`, modify `src/routes/index.js`

- [ ] POST /feedback (auth)
- [ ] GET /admin/feedback (admin)
- [ ] PATCH /admin/feedback/:id/resolve (admin)
- [ ] Commit

### Task 6: Coupon Admin 控制器/路由

**Files:** Modify `src/controllers/admin.controller.js`, `src/routes/admin.routes.js`

- [ ] GET /admin/coupons
- [ ] POST /admin/coupons
- [ ] PUT /admin/coupons/:id
- [ ] PATCH /admin/coupons/:id/status
- [ ] Commit

### Task 7: Product 服务增强（tags + isFavorited）

**Files:** Modify `src/services/product.service.js`, `src/controllers/admin.controller.js`

- [ ] listProducts / getProductById 返回 `tags` 字段
- [ ] auth 时查询 wishlist 返回 `isFavorited`
- [ ] Admin PUT /products/:id 支持 tags
- [ ] Commit

### Task 8: Mini App 前端 — ProductCard + ProductDetail + Wishlist

**Files:** Modify ProductCard.vue, ProductDetail.vue, Create WishlistPage.vue, Modify ProfilePage.vue, api

- [ ] ProductCard 渲染 tags
- [ ] ProductDetail 心形收藏按钮
- [ ] WishlistPage 收藏列表
- [ ] ProfilePage 新增入口
- [ ] wishlist API 函数
- [ ] i18n keys
- [ ] Commit

### Task 9: Mini App 前端 — FeedbackPage

**Files:** Create `views/FeedbackPage.vue`, modify ProfilePage.vue

- [ ] 意见反馈表单（文字 ≤500字 + 最多 3 张图）
- [ ] ProfilePage 新增反馈入口
- [ ] feedback API 函数
- [ ] i18n keys
- [ ] Commit

### Task 10: Admin 前端 — CouponsPage + FeedbackPage + ProductForm

**Files:** Create CouponsPage.vue, FeedbackPage.vue, modify ProductFormPage.vue, Sidebar.vue, router

- [ ] CouponsPage: 表格 + 创建/编辑弹窗 + 启用/停用
- [ ] FeedbackPage: 工单列表 + 查看详情 + 标记已处理
- [ ] ProductFormPage: 标签编辑
- [ ] Sidebar 新增导航
- [ ] Admin API 函数
- [ ] i18n keys
- [ ] Commit

### Task 11: 全量回归测试

- [ ] `npm test` — 所有测试通过
- [ ] 开发服务器启动验证
- [ ] Commit
