<!-- 首页 — 商品浏览主入口 -->
<template>
  <div class="home-page">
    <!-- 顶部搜索栏 -->
    <header class="top-header">
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

    <!-- Banner 轮播 -->
    <div class="banner-wrap" v-if="banners.length > 0">
      <div class="banner-track" :style="trackStyle" @touchstart="onTouchStart" @touchend="onTouchEnd">
        <div v-for="banner in banners" :key="banner.id" class="banner-slide" @click="onBannerClick(banner)">
          <img :src="banner.image_url" :alt="bannerTitle(banner)" class="banner-img" />
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

    <!-- 商品区域 -->
    <section class="product-section">
      <!-- 骨架屏 -->
      <LoadingSkeleton v-if="isLoading && products.length === 0" :count="6" />

      <!-- 加载错误 -->
      <div v-else-if="loadError" class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-title">{{ $t('common.loadError') || '加载失败' }}</div>
        <div class="error-desc">{{ loadError }}</div>
        <button class="retry-btn" @click="refreshProducts">
          {{ $t('common.retry') || '重试' }}
        </button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="products.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">{{ $t('home.noProducts') || '暂无商品' }}</div>
        <div class="empty-desc">{{ $t('home.comingSoon') || '商品正在上架中，请稍后再来' }}</div>
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

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLanguageStore } from '@/stores/languageStore';
import { useTelegram } from '@/composables/useTelegram';
import { useShopConfig } from '@/composables/useShopConfig.js';
import { getProducts } from '@/api/products';
import ProductCard from '@/components/common/ProductCard.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import BottomNav from '@/components/common/BottomNav.vue';

const { locale, t } = useI18n();
const languageStore = useLanguageStore();
const route = useRoute();
const router = useRouter();
const { enableCloseConfirmation } = useTelegram();
const { banners, categories: apiCategories, load } = useShopConfig();

// 开启 Mini App 关闭确认
enableCloseConfirmation();

// 品类列表（接入后台配置，保留 all 为第一个选项）
const categories = computed(() => [
  { value: 'all', label: t('home.all') || '全部' },
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
const currentBanner = ref(0);
const touchStartX = ref(0);

const trackStyle = computed(() => ({
  transform: `translateX(-${currentBanner.value * 100}%)`,
}));

function bannerTitle(banner) {
  return banner[`title_${locale.value}`] || banner.title_km || '';
}

function onTouchStart(e) {
  touchStartX.value = e.touches[0].clientX;
}

function onTouchEnd(e) {
  const diff = touchStartX.value - e.changedTouches[0].clientX;
  if (Math.abs(diff) < 40) return;
  if (diff > 0 && currentBanner.value < banners.value.length - 1) {
    currentBanner.value += 1;
  } else if (diff < 0 && currentBanner.value > 0) {
    currentBanner.value -= 1;
  }
}

function onBannerClick(banner) {
  if (!banner.link_type || !banner.link_target) return;
  if (banner.link_type === 'product') {
    router.push(`/product/${banner.link_target}`);
  } else if (banner.link_type === 'category') {
    router.push({ path: '/', query: { category: banner.link_target } });
  } else if (banner.link_type === 'url') {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.openLink) tg.openLink(banner.link_target);
    else window.open(banner.link_target, '_blank');
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
    console.error('加载商品失败:', err);
    loadError.value = err.response?.data?.error?.message || err.message || '网络错误';
  } finally {
    isLoading.value = false;
  }
}

function refreshProducts() {
  fetchProducts(true);
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
  const categoryFromUrl = route.query.category;
  if (categoryFromUrl && categoryFromUrl !== 'all') {
    activeCategory.value = categoryFromUrl;
  }
  // 并行加载运营配置与商品
  load();
  fetchProducts(true);
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
</style>
