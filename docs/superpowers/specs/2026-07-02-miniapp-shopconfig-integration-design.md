# miniapp 运营配置接入设计（MVP）

## 背景

admin 后台与 API 已完成运营配置能力：Banner、品类、城市、配送规则、客服账号。miniapp 侧已封装 `src/api/shopConfig.js`，但用户界面仍使用硬编码数据。本设计把首页和分类页里最显眼的运营位替换为动态配置数据。

## 目标

- 首页 Banner 轮播展示后台配置的生效 Banner。
- 首页品类横滑和分类页网格展示后台配置的启用品类。
- 支持高棉/英文/中文三语切换显示名称。
- 加载失败时提供静默降级，不打断用户浏览。

## 范围

**本次接入（MVP）**

| 页面 | 改动点 | API |
|---|---|---|
| 首页 `HomePage.vue` | Banner 占位符 → 轮播 | `GET /banners?city=phnom_penh` |
| 首页 `HomePage.vue` | 硬编码品类 → 动态 pills | `GET /categories` |
| 分类页 `CategoryPage.vue` | 硬编码网格 → 动态网格 | `GET /categories` |

**不在本次范围**

- 城市选择器（后续迭代接入 `GET /cities`）。
- 结算页按城市计算配送费（后续接入 `GET /delivery-rules/:cityCode`）。
- 个人中心客服入口（后续接入 `GET /customer-services/default`）。

## 数据映射

### Banner

```json
{
  "id": 1,
  "title_km": "...",
  "title_en": "...",
  "title_zh": "...",
  "image_url": "https://cdn.example.com/banner.jpg",
  "link_type": "product",
  "link_target": "prod-123",
  "sort_order": 1
}
```

UI 使用字段：

- 标题：按当前 locale 取 `title_km` / `title_en` / `title_zh`，回退到 `title_km`。
- 图片：`image_url`。
- 点击：`link_type` + `link_target`。

### Category

```json
{
  "code": "fashion",
  "name_km": "...",
  "name_en": "...",
  "name_zh": "...",
  "icon_url": "https://cdn.example.com/icon.png",
  "sort_order": 1
}
```

UI 使用字段：

- 名称：按当前 locale 取 `name_km` / `name_en` / `name_zh`，回退到 `name_km`。
- 图标：首页 pills 目前只显示文字，分类页网格优先显示 `icon_url`，缺失时使用 emoji 占位。
- 跳转：首页点击后按 `code` 过滤商品；分类页点击后跳首页并带 `?category={code}`。

## 架构与组件

### 新增 `useShopConfig` composable

路径：`tgmall-miniapp/src/composables/useShopConfig.js`

职责：

- 统一加载 Banner 和品类。
- 维护 `loading` / `error` / `data` 状态。
- 提供 `reload()` 方法。

```js
const banners = ref([]);
const categories = ref([]);
const loading = ref(false);
const error = ref(null);

async function load({ city = 'phnom_penh' } = {}) {
  loading.value = true;
  error.value = null;
  try {
    const [bRes, cRes] = await Promise.all([
      getBanners(city),
      getCategories(),
    ]);
    banners.value = bRes.data || [];
    categories.value = cRes.data || [];
  } catch (err) {
    error.value = err;
    console.error('加载运营配置失败:', err);
  } finally {
    loading.value = false;
  }
}
```

### 首页 `HomePage.vue`

- 引入 `useShopConfig` 并在 `onMounted` 调用 `load()`。
- 新增 Banner 轮播组件（可内联在页面内，不拆新文件），实现：
  - 横向滑动切换。
  - 底部圆点指示器；单张图不显示指示器。
  - 自动轮播可选（本次不做，减少复杂度）。
- 品类横滑使用 API 返回的品类列表，仍保留 `all` 作为第一个选项。

### 分类页 `CategoryPage.vue`

- 引入 `useShopConfig`。
- 网格展示 API 品类；有 `icon_url` 显示图片，无则使用固定 emoji 占位。

## 错误处理与降级

- Banner 加载失败：显示原有渐变占位，不打断用户。
- 品类加载失败：
  - 首页保留最小兜底列表 `['all', 'fashion', 'beauty', 'electronics', 'home']`，仍使用现有 `$t('home.{code}')` i18n key 显示名称。
  - 分类页显示空状态 + 重试按钮。
- 所有错误仅 `console.error`，不弹 Toast。

## Banner 点击行为

| `link_type` | 行为 |
|---|---|
| `product` | `router.push(`/product/${link_target}`)` |
| `category` | `router.push({ path: '/', query: { category: link_target } })` |
| `url` | `window.Telegram.WebApp.openLink(link_target)`（无 Telegram 环境则 `window.open`） |
| 其他/空 | 静默不跳转 |

## 测试

- 单元测试：`useShopConfig` composable
  - mock `shopConfig.js` 的 `getBanners` 和 `getCategories`。
  - 验证加载中状态、成功后的数据、失败后的 `error` 与降级数据。
- 手动验证：
  - 切换 km/en/zh，检查 Banner 标题和品类名称。
  - 后台禁用/启用某个品类，miniapp 刷新后对应显示变化。
  - 断网/失败情况下页面不白屏。

## 验收标准

- [ ] 首页 Banner 展示后台配置的生效 Banner 图片。
- [ ] 首页品类横滑与分类页网格展示后台配置的启用品类。
- [ ] 三语切换时名称按当前语言显示。
- [ ] API 失败时首页不白屏，仍可使用核心功能。
- [ ] `useShopConfig` 单元测试通过。
