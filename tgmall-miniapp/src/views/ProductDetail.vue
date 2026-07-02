<!-- 商品详情页 — Sprint 2 -->
<template>
  <div class="page" v-if="product">
    <!-- 图片轮播 -->
    <div class="image-gallery">
      <div class="gallery-track" ref="galleryRef" @scroll="onGalleryScroll">
        <img v-for="(img, i) in product.images" :key="i" :src="img.url" :alt="product.nameKm" class="gallery-img" @click="openLightbox(i)" />
      </div>
      <div class="gallery-dots" v-if="product.images.length > 1">
        <span v-for="(_, i) in product.images" :key="i" :class="{ active: currentImage === i }" />
      </div>
    </div>

    <!-- 商品信息 -->
    <div class="product-info">
      <div class="price-row">
        <PriceDisplay :priceUsd="currentPriceUsd" :priceKhr="currentPriceKhr" />
        <div class="price-actions">
          <button class="fav-btn" :class="{ active: isFavorited }" @click="toggleFavorite">
            {{ isFavorited ? '❤️' : '🤍' }}
          </button>
          <span class="sales-badge" v-if="product.salesCount > 0">{{ $t('product.sales') }} {{ product.salesCount }}</span>
        </div>
      </div>

      <!-- 标签 -->
      <div v-if="product.tags && product.tags.length" class="tag-row">
        <span v-for="(tag, i) in product.tags" :key="i" class="tag-chip" :style="{ color: tag.color, background: tag.bg }">
          {{ tagDisplay(tag) }}
        </span>
      </div>

      <h1 class="product-name">{{ displayName }}</h1>
      <p class="merchant-name">{{ displayMerchant }}</p>

      <!-- 规格选择 -->
      <div v-for="spec in product.specs" :key="spec.nameEn" class="spec-group">
        <label class="spec-label">{{ specDisplayName(spec) }}</label>
        <div class="spec-values">
          <button v-for="val in spec.values" :key="val.valueEn"
            class="spec-btn"
            :class="{ active: selectedSpecs[spec.nameEn] === val.valueEn, disabled: val.stock === 0 }"
            @click="selectSpec(spec.nameEn, val)"
          >
            {{ specDisplayValue(val) }}
            <span v-if="val.stock === 0" class="soldout-chip">{{ $t('product.soldOut') }}</span>
          </button>
        </div>
      </div>

      <!-- 数量 -->
      <div class="quantity-row">
        <span class="spec-label">{{ $t('cart.quantity') }}</span>
        <div class="quantity-spinner">
          <button class="qty-btn" @click="quantity = Math.max(1, quantity - 1)">−</button>
          <span class="qty-value">{{ quantity }}</span>
          <button class="qty-btn" @click="quantity = Math.min(maxQuantity, quantity + 1)">+</button>
        </div>
        <span class="stock-hint" v-if="maxQuantity <= 5">{{ $t('product.stockLeft', { count: maxQuantity }) }}</span>
      </div>

      <!-- 描述 -->
      <div class="description-section">
        <div class="desc-tabs">
          <button v-for="lang in descLangs" :key="lang.code" class="desc-tab" :class="{ active: descLang === lang.code }" @click="descLang = lang.code">{{ lang.label }}</button>
        </div>
        <p class="desc-text">{{ displayDescription }}</p>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-actions">
      <button class="btn-cart" @click="handleAddToCart" :disabled="!canBuy">
        {{ canBuy ? $t('product.addToCart') : $t('product.soldOut') }}
      </button>
      <button class="btn-buy" @click="handleBuyNow" :disabled="!canBuy">{{ $t('product.buyNow') }}</button>
    </div>

    <button class="back-btn" @click="$router.back()">←</button>
  </div>

  <div v-else-if="loading" class="loading-page">{{ $t('common.loading') }}</div>
  <div v-else class="error-page">{{ $t('product.notFound') }}</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getProductById } from '@/api/products';
import { addToCart } from '@/api/cart';
import { toggleWishlist } from '@/api/wishlist';
import PriceDisplay from '@/components/common/PriceDisplay.vue';

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

const product = ref(null);
const loading = ref(true);
const isFavorited = ref(false);
const selectedSpecs = ref({});
const quantity = ref(1);
const currentImage = ref(0);
const descLang = ref('km');

const descLangs = [
  { code: 'km', label: 'ភាសាខ្មែរ' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
];

// 当前选中规格对应的价格和库存
const currentSkuInventory = computed(() => {
  if (!product.value?.specs?.length) return product.value?.stock || 0;
  let stock = product.value.stock;
  for (const spec of product.value.specs) {
    const sel = selectedSpecs.value[spec.nameEn];
    if (sel) {
      const val = spec.values.find((v) => v.valueEn === sel);
      if (val?.stock !== undefined) stock = Math.min(stock, val.stock);
    }
  }
  return stock;
});

const maxQuantity = computed(() => Math.min(currentSkuInventory.value, 99));
const canBuy = computed(() => maxQuantity.value > 0);

const currentPriceUsd = computed(() => {
  if (!product.value?.specs?.length) return product.value?.priceUsd || 0;
  for (const spec of product.value.specs) {
    const sel = selectedSpecs.value[spec.nameEn];
    if (sel) {
      const val = spec.values.find((v) => v.valueEn === sel);
      if (val?.priceUsd) return val.priceUsd;
    }
  }
  return product.value?.priceUsd || 0;
});

const currentPriceKhr = computed(() => {
  if (!product.value?.specs?.length) return product.value?.priceKhr || 0;
  for (const spec of product.value.specs) {
    const sel = selectedSpecs.value[spec.nameEn];
    if (sel) {
      const val = spec.values.find((v) => v.valueEn === sel);
      if (val?.priceKhr) return val.priceKhr;
    }
  }
  return product.value?.priceKhr || 0;
});

const displayName = computed(() => {
  if (!product.value) return '';
  const map = { km: 'nameKm', en: 'nameEn', zh: 'nameZh' };
  return product.value[map[locale.value]] || product.value.nameKm;
});

const displayMerchant = computed(() => {
  if (!product.value?.merchant) return '';
  return locale.value === 'en' ? product.value.merchant.nameEn || product.value.merchant.name : product.value.merchant.name;
});

const displayDescription = computed(() => {
  if (!product.value) return '';
  const map = { km: 'descriptionKm', en: 'descriptionEn', zh: 'descriptionZh' };
  return product.value[map[descLang.value]] || product.value.descriptionKm || '';
});

function specDisplayName(spec) {
  const map = { km: 'nameKm', en: 'nameEn' };
  return spec[map[locale.value]] || spec.nameEn;
}
function specDisplayValue(val) {
  const map = { km: 'valueKm', en: 'valueEn' };
  return val[map[locale.value]] || val.valueEn;
}

function tagDisplay(tag) {
  const map = { km: 'textKm', en: 'textEn', zh: 'textZh' };
  const key = map[locale.value] || 'textKm';
  return tag[key] || tag.textKm;
}

async function toggleFavorite() {
  try {
    const res = await toggleWishlist(product.value.id);
    isFavorited.value = res.data.isFavorited;
  } catch (e) {
    // 未登录等场景静默失败
    console.error('toggle wishlist failed:', e);
  }
}

function selectSpec(specName, val) {
  if (val.stock === 0) return;
  selectedSpecs.value = { ...selectedSpecs.value, [specName]: val.valueEn };
  quantity.value = 1;
}

function onGalleryScroll() {
  const el = document.querySelector('.gallery-track');
  if (!el) return;
  currentImage.value = Math.round(el.scrollLeft / el.clientWidth);
}

function openLightbox(i) { currentImage.value = i; }

async function handleAddToCart() {
  if (!canBuy.value) return;
  try {
    const spec = {};
    for (const s of product.value.specs || []) {
      const val = selectedSpecs.value[s.nameEn];
      if (val) spec[s.nameEn] = val;
    }
    await addToCart({ product_id: product.value.id, quantity: quantity.value, spec });
    alert(t('cart.added'));
  } catch (e) {
    alert(t('cart.addFailed') + ': ' + (e?.response?.data?.error?.message || t('checkout.networkError')));
  }
}

async function handleBuyNow() {
  await handleAddToCart();
  router.push('/cart');
}

onMounted(async () => {
  try {
    const res = await getProductById(route.params.id);
    product.value = res.data;
    isFavorited.value = res.data.isFavorited || false;
    // 初始化默认规格
    if (res.data.specs?.length) {
      for (const spec of res.data.specs) {
        const inStock = spec.values.find((v) => v.stock !== 0);
        if (inStock) selectedSpecs.value[spec.nameEn] = inStock.valueEn;
      }
    }
  } catch {
    product.value = null;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding-bottom: 80px; position: relative; background: var(--bg); }
.back-btn { position: fixed; top: 12px; left: 12px; z-index: 10; width: 36px; height: 36px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.image-gallery { position: relative; background: var(--surface); }
.gallery-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
.gallery-track::-webkit-scrollbar { display: none; }
.gallery-img { width: 100%; flex-shrink: 0; aspect-ratio: 1; object-fit: cover; scroll-snap-align: start; }
.gallery-dots { display: flex; justify-content: center; gap: 6px; padding: 8px; }
.gallery-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--border); }
.gallery-dots span.active { background: var(--accent); }
.product-info { padding: var(--space-lg); }
.price-row { display: flex; align-items: center; justify-content: space-between; }
.price-actions { display: flex; align-items: center; gap: 10px; }
.fav-btn { background: none; border: none; font-size: 22px; cursor: pointer; padding: 0; line-height: 1; transition: transform 0.15s; }
.fav-btn:active { transform: scale(1.2); }
.sales-badge { font-size: 12px; color: var(--muted); }
.tag-row { display: flex; gap: 6px; margin: 8px 0; flex-wrap: wrap; }
.tag-chip { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; line-height: 1.5; }
.product-name { font-size: 18px; font-weight: 700; margin: 8px 0; line-height: 1.6; }
.merchant-name { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
.spec-group { margin-bottom: 16px; }
.spec-label { font-size: 13px; font-weight: 600; color: var(--muted); display: block; margin-bottom: 8px; }
.spec-values { display: flex; gap: 8px; flex-wrap: wrap; }
.spec-btn { padding: 8px 18px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 13px; background: var(--surface); position: relative; }
.spec-btn.active { border-color: var(--accent); color: var(--accent); font-weight: 600; }
.spec-btn.disabled { opacity: 0.4; }
.soldout-chip { font-size: 10px; color: var(--accent-red); position: absolute; top: -6px; right: -4px; background: var(--surface); padding: 0 4px; }
.quantity-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.quantity-spinner { display: flex; align-items: center; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.qty-btn { width: 36px; height: 36px; font-size: 18px; display: flex; align-items: center; justify-content: center; }
.qty-value { width: 40px; text-align: center; font-weight: 600; }
.stock-hint { font-size: 12px; color: var(--accent-red); }
.description-section { margin-top: 20px; }
.desc-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
.desc-tab { font-size: 12px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--border); }
.desc-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.desc-text { font-size: 14px; line-height: 1.7; color: var(--fg); }
.bottom-actions { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); padding: 12px 16px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: var(--surface); border-top: 1px solid var(--border); display: flex; gap: 12px; z-index: 50; }
.btn-cart { flex: 1; padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent); background: var(--surface); color: var(--accent); font-size: 15px; font-weight: 600; }
.btn-buy { flex: 1; padding: 14px; border-radius: var(--radius-sm); background: var(--accent); color: #fff; font-size: 15px; font-weight: 600; }
.btn-cart:disabled, .btn-buy:disabled { opacity: 0.4; }
.loading-page, .error-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; color: var(--muted); font-size: 14px; }
</style>
