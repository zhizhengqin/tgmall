<!-- 首页 — 商品浏览主入口 -->
<template>
  <div class="home-page">
    <!-- 顶部搜索栏 -->
    <header class="top-header">
      <div class="search-bar" @click="$router.push('/search')">
        <span class="search-icon">🔍</span>
        <span class="search-text">{{ $t('home.searchPlaceholder') }}</span>
      </div>
      <button class="lang-btn" @click="toggleLanguage">
        {{ langLabel }}
      </button>
    </header>

    <!-- Banner 轮播占位 -->
    <div class="banner-placeholder">
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
        {{ $t(`home.${cat.value}`) || cat.label }}
      </button>
    </div>

    <!-- 商品区域 -->
    <section class="product-section">
      <!-- 骨架屏 -->
      <LoadingSkeleton v-if="isLoading && products.length === 0" :count="6" />

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
import { useI18n } from 'vue-i18n';
import { useLanguageStore } from '@/stores/languageStore';
import { useTelegram } from '@/composables/useTelegram';
import { getProducts } from '@/api/products';
import ProductCard from '@/components/common/ProductCard.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import BottomNav from '@/components/common/BottomNav.vue';

const { locale } = useI18n();
const languageStore = useLanguageStore();
const { enableCloseConfirmation } = useTelegram();

// 开启 Mini App 关闭确认
enableCloseConfirmation();

// 品类列表
const categories = [
  { value: 'all', label: '全部' },
  { value: 'fashion', label: '时尚' },
  { value: 'beauty', label: '美妆' },
  { value: 'electronics', label: '电子' },
  { value: 'home', label: '家居' },
];

// 响应式状态
const activeCategory = ref('all');
const products = ref([]);
const page = ref(1);
const hasMore = ref(true);
const isLoading = ref(false);

// 语言切换
const langOptions = { km: 'ភាសាខ្មែរ', en: 'EN', zh: '中文' };
const langOrder = ['km', 'en', 'zh'];
const langLabel = computed(() => langOptions[locale.value] || 'KM');

function toggleLanguage() {
  const idx = langOrder.indexOf(locale.value);
  const next = langOrder[(idx + 1) % 3];
  locale.value = next;
  languageStore.setLanguage(next);
  // 切换语言后重新加载（商品名称语言跟随 Accept-Language 头）
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
      products.value = res.data;
    } else {
      products.value.push(...res.data);
    }

    hasMore.value = res.meta.hasNext;
    page.value += 1;
  } catch (err) {
    console.error('加载商品失败:', err);
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
.lang-btn {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--fg);
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
.loading-more,
.no-more {
  text-align: center;
  padding: var(--space-xl);
  font-size: 13px;
  color: var(--muted);
}
</style>
