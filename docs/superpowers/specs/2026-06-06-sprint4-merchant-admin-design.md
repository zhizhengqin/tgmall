# Sprint 4 设计文档 — 商家后台 + 运营后台 + 生产部署

**日期**：2026-06-06
**版本**：v0.1.0-design
**估点**：73 点

---

## 一、架构总览

```
tgmall (monorepo)
├── tgmall-api/          # 后端 API ✅
├── tgmall-miniapp/      # 消费者 Mini App ✅
├── tgmall-merchant/     # 新增：商家 Web 后台 (Vue 3 + Vite + Element Plus)
├── tgmall-admin/        # 新增：平台运营 Web 后台 (Vue 3 + Vite + Element Plus)
└── docker-compose.yml   # 扩展：Nginx 反向代理
```

**子域名：**
- `api.shop.xinhua-tech.kh` → tgmall-api:3000
- `merchant.shop.xinhua-tech.kh` → tgmall-merchant 静态文件
- `admin.shop.xinhua-tech.kh` → tgmall-admin 静态文件

---

## 二、商家后台（tgmall-merchant）

### 技术栈
- Vue 3 + Vite + Element Plus + Pinia
- 复用 tgmall-miniapp 的设计 token（柬埔寨金色系）
- JWT (role: merchant) 鉴权

### 页面（6 个）
| 页面 | 路由 | API |
|------|------|-----|
| LoginPage | `/login` | POST /merchants/login |
| DashboardPage | `/dashboard` | GET /merchants/dashboard |
| ProductsPage | `/products` | GET/POST /merchants/products |
| ProductFormPage | `/products/:id?` | POST/PUT /merchants/products + toggle |
| OrdersPage | `/orders` | GET /merchants/orders |
| OrderDetailPage | `/orders/:id` | GET /merchants/orders/:id + POST ship |

### 组件（3 组）
| 分组 | 组件 | 说明 |
|------|------|------|
| layout | Sidebar + TopBar | 左侧导航 + 顶部商家名/语言切换 |
| dashboard | StatCard + RevenueChart | 统计卡片 + 近7天收入 ECharts |
| orders | OrderTable + OrderStatusTag + ShipForm | 订单表格 + 状态标签 + 发货弹窗 |

### 布局
经典侧边栏：左侧 220px 固定导航 + 右侧自适应内容区
菜单：看板 / 商品管理 / 订单管理 / 设置（语言切换）

---

## 三、运营后台（tgmall-admin）

### 技术栈
与 merchant 相同：Vue 3 + Vite + Element Plus + Pinia

### 页面（6 个）
| 页面 | 路由 | API |
|------|------|-----|
| LoginPage | `/login` | JWT + adminAuth |
| DashboardPage | `/dashboard` | GET /admin/dashboard（新增） |
| MerchantsPage | `/merchants` | GET /admin/merchants（新增） |
| MerchantDetailPage | `/merchants/:id` | POST approve/reject（已有） |
| UsersPage | `/users` | GET /admin/users（新增） |
| SettingsPage | `/settings` | 系统配置（P2） |

### 组件（2 组）
| 分组 | 组件 | 说明 |
|------|------|------|
| dashboard | PlatformStatCard + TrendChart | GMV/商家数/用户数/订单数 + 增长趋势 |
| merchants | AuditTable + AuditDialog | 审核表格 + 通过/驳回弹窗 |

---

## 四、后端 API 扩展（tgmall-api）

### 新增接口

#### 4.1 商家看板增强 — `GET /merchants/dashboard`

在现有基础上新增字段：
```json
{
  "todayRevenue": 1250.50,
  "todayOrders": 23,
  "pendingShip": 8,
  "totalProducts": 42,
  "recent7DaysRevenue": [  // 新增：近7天每日收入
    { "date": "2026-05-30", "revenue": 1100.00, "orders": 18 },
    ...
  ],
  "lowStockAlerts": [       // 新增：库存预警
    { "productId": "uuid", "name": "Coconut Water", "stock": 3 }
  ]
}
```

#### 4.2 平台大盘 — `GET /admin/dashboard`

```json
{
  "gmvToday": 8500.00,
  "gmvThisMonth": 120000.00,
  "totalMerchants": 45,
  "pendingAudit": 7,
  "totalUsers": 3280,
  "totalOrders": 1560,
  "recent7DaysTrend": [
    { "date": "2026-05-30", "gmv": 8000, "orders": 130, "newUsers": 45 }
  ]
}
```

#### 4.3 商家列表（管理员）— `GET /admin/merchants`

```json
// Query: ?status=pending&page=1&limit=20
{
  "data": [
    { "id": "uuid", "nameKm": "សៀង ហាង", "phone": "+855...",
      "category": "食品饮料", "status": "pending", "createdAt": "..." }
  ],
  "meta": { "total": 45, "page": 1, "limit": 20 }
}
```

#### 4.4 用户列表（管理员）— `GET /admin/users`

```json
// Query: ?q=<search>&page=1&limit=20
{
  "data": [
    { "id": "uuid", "telegramId": "12345678", "firstName": "Sopheap",
      "phone": "+855...", "status": "active", "createdAt": "..." }
  ],
  "meta": { ... }
}
```

---

## 五、部署变更

### Docker Compose 扩展

```yaml
services:
  # ... 现有 postgres + redis

  api:
    build: ./tgmall-api
    ports: ["3000"]

  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - merchant-dist:/usr/share/nginx/html/merchant
      - admin-dist:/usr/share/nginx/html/admin
    depends_on: [api]

volumes:
  merchant-dist:
  admin-dist:
```

### Nginx 反向代理规则
```
server_name merchant.shop.xinhua-tech.kh → /usr/share/nginx/html/merchant
server_name admin.shop.xinhua-tech.kh    → /usr/share/nginx/html/admin
location /api/                           → proxy_pass http://api:3000/api/
```

---

## 六、时间线（2 周并行）

```
Week 1 (Day 1-5)
├── 商家后台：登录 + 看板 + 商品 + 订单
├── 运营后台：审核 + 大盘 + 用户
├── API 扩展：看板增强 + 大盘 + 商家列表 + 用户列表
└── 三语/双币种验收修复 (S4-07~08)

Week 2 (Day 6-10)
├── 性能优化 (S4-09~10)
├── 生产部署 (S4-11~12)
├── 种子数据 + 操作手册 (S4-13~15)
├── 回归测试 + 性能压测 (S4-16~17)
├── 安全扫描 (S4-18)
└── MVP 发布决策 (S4-19)
```

---

## 七、不涉及内容（NOT in scope）

- 营销推送系统（Sprint 5）
- AI 推荐引擎（Sprint 5）
- 物流 API 集成（Sprint 5）
- 移动端商家 App

---

## 八、风险

| 风险 | 缓解 |
|------|------|
| Element Plus 与设计 token 冲突 | 覆盖 Element Plus CSS 变量 |
| 商家登录 UX（桌面端 Telegram 登录） | 提供二维码 + deep link 双模式 |
| 两个后台并行开发代码重复 | 提取共享组件到 tgmall-shared |
| Nginx/SSL 配置复杂度 | 初期 HTTP only，SSL 用 CloudFlare 边缘 |

---

*Design spec written: 2026-06-06*
