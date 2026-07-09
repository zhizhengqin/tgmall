<!-- 首页 — 商品浏览主入口 -->
<template>
  <div class="home-page">
    <!-- 顶部搜索栏 -->
    <header class="top-header">
      <div class="city-entry" @click="$router.push('/cities')">
        <span class="city-name">{{ cityName(cityStore.currentCity) }}</span>
        <span class="city-arrow">▼</span>
      </div>
      <div class="search-bar" @click="$router.push('/search')">
        <span class="search-icon">🔍</span>
        <span class="search-text">{{ $t('home.searchPlaceholder') }}</span>
      </div>
      <!-- 三语切换按钮 -->
      <div class="lang-switcher">
        <button
          v-for="lang in langList"
          :key="lang.code"
          class="lang-btn"
          :class="{ active: locale === lang.code }"
          @click="switchLanguage(lang.code)"
        >
          {{ lang.label }}
        </button>
      </div>
    </header>

    <!-- 登录引导横幅（未登录用户可见，24h 关闭） -->
    <div class="login-banner" v-if="showLoginBanner" @click="goLogin">
      <img v-if="loginBannerImage" :src="loginBannerImage" class="login-banner-img" alt="login banner" />
      <span v-else class="login-banner-text">🔐 {{ $t('home.loginBanner') }}</span>
      <button class="login-banner-close" @click.stop="dismissLoginBanner">✕</button>
    </div>

    <!-- Banner 轮播 -->
    <div class="banner-wrap" v-if="banners.length > 0">
      <div class="banner-track" :style="trackStyle" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
        <div v-for="banner in banners" :key="banner.id" class="banner-slide" @click="onBannerClick(banner)">
          <img
            v-if="!bannerLoadFailed[banner.id]"
            :src="banner.imageUrl"
            :alt="bannerTitle(banner)"
            class="banner-img"
            loading="lazy"
            decoding="async"
            @error="bannerLoadFailed[banner.id] = true"
          />
          <div v-else class="banner-fallback">
            <span class="banner-fallback-text">{{ bannerTitle(banner) }}</span>
          </div>
        </div>
      </div>
      <div class="banner-dots" v-if="banners.length > 1">
        <span v-for="(_, i) in banners" :key="i" :class="{ active: currentBanner === i }"></span>
      </div>
    </div>
    <div v-else class="banner-placeholder">
      <div class="banner-content">
        <span class="banner-icon">🇰🇭</span>
        <span>TG Mall — ទិញទំនិញតាម Telegram</span>
      </div>
    </div>

    <!-- 品类横滑 -->
    <div class="category-scroll">
      <button
        v-for="cat in categories"
        :key="cat.value"
        class="cat-btn"
        :class="{ active: activeCategory === cat.value }"
        @click="switchCategory(cat.value)"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 限时特价横滑区 -->
    <div class="flash-deal-section" v-if="flashDeals.length > 0">
      <div class="flash-deal-header">
        <h3 class="flash-deal-title">⚡ 限时特价</h3>
      </div>
      <div class="flash-deal-scroll">
        <FlashDealCard v-for="deal in flashDeals" :key="deal.id" :deal="deal" />
      </div>
    </div>

    <!-- 商品区域 -->
    <section class="product-section">
      <!-- 骨架屏 -->
      <LoadingSkeleton v-if="isLoading && products.length === 0" :count="6" />

      <!-- 加载错误 -->
      <div v-else-if="loadError" class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-title">{{ $t('common.loadError') }}</div>
        <div class="error-desc">{{ loadError }}</div>
        <button class="retry-btn" @click="refreshProducts">
          {{ $t('common.retry') }}
        </button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="products.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">{{ $t('home.noProducts') }}</div>
        <div class="empty-desc">{{ $t('home.comingSoon') }}</div>
      </div>

      <!-- 商品双列网格 -->
      <div v-else class="product-grid">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :id="product.id"
          :name="product.name"
          :price-usd="product.priceUsd"
          :price-khr="product.priceKhr"
          :thumbnail="product.thumbnail"
          :merchant-name="product.merchantName"
          :stock="product.stock"
          :sales-count="product.salesCount"
          :likes-count="product.likesCount"
          :sku-count="product.skuCount"
          :is-favorited="product.isFavorited"
          :tags="product.tags"
          :show-quick-add="true"
        />
      </div>

      <!-- 加载更多中 -->
      <div v-if="isLoading && products.length > 0" class="loading-more">
        {{ $t('common.loading') }}
      </div>

      <!-- 全部加载完毕 -->
      <div v-if="!hasMore && products.length > 0" class="no-more">
        {{ $t('common.noMore') }}
      </div>
    </section>

    <!-- 底部购物车条 -->
    <MiniCartBar />

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLanguageStore } from '@/stores/languageStore';
import { useCityStore } from '@/stores/cityStore.js';
import { useUserStore } from '@/stores/userStore';
import { useTelegram } from '@/composables/useTelegram';
import { useShopConfig } from '@/composables/useShopConfig.js';
import { getProducts } from '@/api/products';
import ProductCard from '@/components/common/ProductCard.vue';
import FlashDealCard from '@/components/common/FlashDealCard.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import MiniCartBar from '@/components/common/MiniCartBar.vue';
import BottomNav from '@/components/common/BottomNav.vue';
import { getFlashDeals, getLoginBanner } from '@/api/shopConfig';

const { locale, t } = useI18n();
const languageStore = useLanguageStore();
const cityStore = useCityStore();
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const { enableCloseConfirmation } = useTelegram();
const { banners, categories: apiCategories, cities: shopCities, load } = useShopConfig();

// 开启 Mini App 关闭确认
enableCloseConfirmation();

// 登录引导横幅 — 24h 关闭逻辑
const LOGIN_BANNER_KEY = 'loginBannerDismissedAt';
function isBannerDismissedIn24h() {
  const ts = localStorage.getItem(LOGIN_BANNER_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < 24 * 60 * 60 * 1000;
}
const loginBannerDismissed = ref(isBannerDismissedIn24h());
const loginBannerImage = ref('');
const showLoginBanner = computed(() => !userStore.isLoggedIn && !loginBannerDismissed.value);

async function fetchLoginBanner() {
  try {
    const res = await getLoginBanner();
    loginBannerImage.value = res.data?.image || '';
  } catch { /* ignore — fallback to text banner */ }
}
function dismissLoginBanner() {
  localStorage.setItem(LOGIN_BANNER_KEY, Date.now().toString());
  loginBannerDismissed.value = true;
}
function goLogin() {
  router.push('/login');
}

// 品类列表（接入后台配置，保留 all 为第一个选项）
const categories = computed(() => [
  { value: 'all', label: t('home.all') },
  ...(apiCategories.value || []).map(c => ({
    value: c.code,
    label: c[`name${locale.value.charAt(0).toUpperCase() + locale.value.slice(1)}`] || c.nameKm || c.code,
  })),
]);

// 语言列表（三语并排显示）
const langList = [
  { code: 'zh', label: '中' },
  { code: 'km', label: 'ខ' },
  { code: 'en', label: 'EN' },
];

// 响应式状态
const activeCategory = ref('all');
const products = ref([]);
const page = ref(1);
const hasMore = ref(true);
const isLoading = ref(false);
const loadError = ref('');
const flashDeals = ref([]);
const currentBanner = ref(0);
const touchStartX = ref(0);
const touchMoveDistance = ref(0);
const bannerLoadFailed = reactive({});
const SWIPE_THRESHOLD = 40;
const CLICK_MOVE_THRESHOLD = 10;

// 监听 URL 分类参数，支持 Banner category 跳转时自动切换品类
watch(
  () => route.query.category,
  (newCategory) => {
    const cat = Array.isArray(newCategory) ? newCategory[0] : newCategory || 'all';
    if (activeCategory.value === cat) return;
    activeCategory.value = cat;
    refreshProducts();
  }
);

const trackStyle = computed(() => ({
  transform: `translateX(-${currentBanner.value * 100}%)`,
}));

function bannerTitle(banner) {
  const key = `title${locale.value.charAt(0).toUpperCase() + locale.value.slice(1)}`;
  return banner[key] || banner.titleKm || '';
}

function cityName(city) {
  const key = `name${locale.value.charAt(0).toUpperCase() + locale.value.slice(1)}`;
  return city[key] || city.nameKm || city.code;
}

function onTouchStart(e) {
  touchStartX.value = e.touches[0].clientX;
  touchMoveDistance.value = 0;
}

function onTouchMove(e) {
  const distance = Math.abs(e.touches[0].clientX - touchStartX.value);
  if (distance > touchMoveDistance.value) {
    touchMoveDistance.value = distance;
  }
}

function onTouchEnd(e) {
  const diff = touchStartX.value - e.changedTouches[0].clientX;
  if (Math.abs(diff) < SWIPE_THRESHOLD) return;
  if (diff > 0 && currentBanner.value < banners.value.length - 1) {
    currentBanner.value += 1;
  } else if (diff < 0 && currentBanner.value > 0) {
    currentBanner.value -= 1;
  }
}

function onBannerClick(banner) {
  if (touchMoveDistance.value > CLICK_MOVE_THRESHOLD) return;
  if (!banner.linkType || !banner.linkTarget) return;
  if (banner.linkType === 'product') {
    router.push(`/product/${banner.linkTarget}`);
  } else if (banner.linkType === 'category') {
    router.push({ path: '/', query: { category: banner.linkTarget } });
  } else if (banner.linkType === 'url') {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openLink) tg.openLink(banner.linkTarget);
    else window.open(banner.linkTarget, '_blank');
  }
}

// 切换语言
function switchLanguage(lang) {
  if (locale.value === lang) return;
  locale.value = lang;
  languageStore.setLanguage(lang);
  // 切换语言后重新加载商品
  refreshProducts();
}

// 切换品类
async function switchCategory(category) {
  if (activeCategory.value === category) return;
  activeCategory.value = category;
  refreshProducts();
}

// 加载商品数据
async function fetchProducts(reset = false) {
  if (isLoading.value || (!hasMore.value && !reset)) return;
  isLoading.value = true;
  loadError.value = '';

  if (reset) {
    page.value = 1;
    products.value = [];
    hasMore.value = true;
  }

  try {
    const params = { page: page.value, limit: 20, sort: 'newest' };
    if (activeCategory.value && activeCategory.value !== 'all') params.category = activeCategory.value;

    const res = await getProducts(params);

    if (reset) {
      products.value = res.data || [];
    } else {
      products.value.push(...(res.data || []));
    }

    hasMore.value = res.meta?.hasNext ?? false;
    page.value += 1;
  } catch (err) {
    console.error('loadProducts failed:', err);
    loadError.value = err.response?.data?.error?.message || err.message || t('checkout.networkError');
  } finally {
    isLoading.value = false;
  }
}

function refreshProducts() {
  fetchProducts(true);
}

async function loadFlashDeals() {
  try {
    const res = await getFlashDeals(cityStore.currentCode || 'phnom_penh');
    flashDeals.value = res.data || [];
  } catch { /* 专区加载失败不影响首页主体 */ }
}

// 无限滚动
function handleScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  if (scrollHeight - scrollTop - clientHeight < 200) {
    fetchProducts();
  }
}

onMounted(() => {
  // 同步 vue-i18n locale 和 languageStore（处理首次加载）
  if (locale.value !== languageStore.current) {
    locale.value = languageStore.current;
  }
  // 从 URL 参数读取分类（从分类页跳转过来）
  const categoryFromUrl = Array.isArray(route.query.category) ? route.query.category[0] : route.query.category;
  if (categoryFromUrl && categoryFromUrl !== 'all') {
    activeCategory.value = categoryFromUrl;
  }
  // 并行加载运营配置与商品，并把城市列表同步到 cityStore
  load().then(() => {
    cityStore.setCities(shopCities.value);
  });
  // 尝试 GPS 定位匹配最近城市（仅在用户未手动选择时工作）
  cityStore.detectCityByGPS();
  fetchProducts(true);
  loadFlashDeals();
  fetchLoginBanner();
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: var(--bg);
}

/* 顶部搜索栏 */
.top-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface);
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
.search-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
}

.city-entry {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 var(--space-xs);
  cursor: pointer;
}

.city-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.city-arrow {
  font-size: 10px;
  color: var(--muted);
}

.search-icon { font-size: 14px; }
.search-text { font-size: 13px; color: var(--muted); }

/* 语言切换器 —— 三语并排 */
.lang-switcher {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.lang-btn {
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
  min-width: 32px;
}
.lang-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

/* 登录引导横幅 */
.login-banner {
  margin: var(--space-md) var(--space-lg) 0;
  padding: 12px 14px;
  background: linear-gradient(135deg, oklch(64% 0.16 82 / 0.12), oklch(64% 0.16 82 / 0.06));
  border: 1px solid oklch(64% 0.16 82 / 0.25);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background 0.2s;
}
.login-banner:active { background: oklch(64% 0.16 82 / 0.18); }
.login-banner-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
}
.login-banner-close {
  width: 28px; height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(0,0,0,.06);
  border: none;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.login-banner-close:active { background: rgba(0,0,0,.12); }
.login-banner-img {
  width: 100%;
  max-height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

/* Banner */
.banner-placeholder {
  margin: var(--space-lg);
  background: linear-gradient(135deg, oklch(64% 0.16 82 / 0.15), oklch(52% 0.20 24 / 0.1));
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  text-align: center;
}
.banner-icon { font-size: 24px; }
.banner-content { font-size: 14px; font-weight: 600; color: var(--fg); }

.banner-wrap {
  margin: var(--space-lg);
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  aspect-ratio: 16/7;
  background: var(--bg);
}
.banner-track {
  display: flex;
  height: 100%;
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1.2);
}
.banner-slide {
  min-width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.banner-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: linear-gradient(135deg, oklch(64% 0.16 82 / 0.2), oklch(52% 0.20 24 / 0.15));
  text-align: center;
}
.banner-fallback-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--fg);
  line-height: 1.4;
}
.banner-dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}
.banner-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  transition: all 0.3s;
}
.banner-dots span.active { background: #fff; width: 18px; border-radius: 3px; }

/* 品类横滑 */
.category-scroll {
  display: flex;
  gap: var(--space-sm);
  padding: 0 var(--space-lg) var(--space-md);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.category-scroll::-webkit-scrollbar { display: none; }
.cat-btn {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 16px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted);
  transition: all 0.2s;
}
.cat-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

/* 商品网格 */
.product-section {
  padding: 0 var(--space-lg);
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-md);
}

/* 错误状态 */
.error-state {
  text-align: center;
  padding: var(--space-xl) var(--space-lg);
}
.error-icon { font-size: 40px; margin-bottom: var(--space-md); }
.error-title { font-size: 16px; font-weight: 600; color: var(--fg); margin-bottom: var(--space-sm); }
.error-desc { font-size: 13px; color: var(--muted); margin-bottom: var(--space-lg); }
.retry-btn {
  font-size: 14px;
  font-weight: 600;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: var(--space-xl) var(--space-lg);
}
.empty-icon { font-size: 48px; margin-bottom: var(--space-md); }
.empty-title { font-size: 16px; font-weight: 600; color: var(--fg); margin-bottom: var(--space-sm); }
.empty-desc { font-size: 13px; color: var(--muted); }

.loading-more,
.no-more {
  text-align: center;
  padding: var(--space-xl);
  font-size: 13px;
  color: var(--muted);
}

/* 限时特价横滑区 */
.flash-deal-section {
  margin-bottom: var(--space-lg);
}
.flash-deal-header {
  padding: 0 var(--space-lg) var(--space-sm);
}
.flash-deal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--fg);
  margin: 0;
}
.flash-deal-scroll {
  display: flex;
  gap: var(--space-sm);
  padding: 0 var(--space-lg);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.flash-deal-scroll::-webkit-scrollbar { display: none; }
</style>
