<!-- 商品卡片 — 双列网格 / 列表行展示 + 快捷加购 -->
<template>
  <div class="product-card" :class="{ 'card-list': layout === 'list' }">
    <router-link :to="`/product/${id}`" class="card-link">
      <div class="card-image">
        <img
          :src="thumbnail || placeholder"
          :alt="name"
          loading="lazy"
          @error="onImageError"
        />
        <span v-if="stockLabel" class="stock-badge">{{ stockLabel }}</span>
      </div>
      <div class="card-body">
        <div v-if="tags && tags.length" class="tag-row">
          <span v-for="(tag, i) in tags" :key="i" class="tag-chip" :style="{ color: tag.color, background: tag.bg }">
            {{ tagDisplay(tag) }}
          </span>
        </div>
        <h3 class="card-name">{{ name }}</h3>
        <p class="card-merchant">{{ merchantName }}</p>
        <div v-if="salesCount > 0 || likesCount > 0" class="card-stats">
          <span v-if="salesCount > 0">{{ $t('product.sales') }} {{ salesCount }}</span>
          <span v-if="likesCount > 0" class="likes">❤️ {{ likesCount }}</span>
        </div>
        <PriceDisplay :price-usd="priceUsd" :price-khr="priceKhr" sm />
      </div>
    </router-link>

    <!-- 快捷加购按钮 -->
    <button
      v-if="showQuickAdd"
      class="quick-add-btn"
      :class="{ added: addAnimating }"
      :disabled="stock <= 0 || adding"
      @click.prevent.stop="quickAdd"
    >
      <span v-if="!addAnimating">+</span>
      <span v-else>✓</span>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { addToCart } from '@/api/cart';
import { useCartStore } from '@/stores/cartStore';
import PriceDisplay from './PriceDisplay.vue';

const router = useRouter();
const { locale, t } = useI18n();
const cartStore = useCartStore();

const props = defineProps({
  id: { type: String, required: true },
  name: { type: String, required: true },
  priceUsd: { type: Number, required: true },
  priceKhr: { type: Number, required: true },
  thumbnail: { type: String, default: '' },
  merchantName: { type: String, default: '' },
  stock: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 },
  likesCount: { type: Number, default: 0 },
  skuCount: { type: Number, default: 0 },
  tags: { type: Array, default: () => [] },
  layout: { type: String, default: 'grid' },
  showQuickAdd: { type: Boolean, default: false },
});

const emit = defineEmits(['cart-updated']);

const adding = ref(false);
const addAnimating = ref(false);

async function quickAdd() {
  if (props.stock <= 0 || adding.value) return;

  // 多规格商品跳详情选规格
  if (props.skuCount > 1) {
    router.push(`/product/${props.id}`);
    return;
  }

  adding.value = true;
  try {
    await addToCart({ product_id: props.id, quantity: 1 });
    // 同步更新本地购物车状态，使底部导航徽标立即刷新
    cartStore.addItem(props.id, 1, {}, props.priceUsd, props.name, props.thumbnail);
    addAnimating.value = true;
    emit('cart-updated');
    setTimeout(() => { addAnimating.value = false; }, 800);
  } catch {
    // 加购失败不阻塞浏览
  } finally {
    adding.value = false;
  }
}

function tagDisplay(tag) {
  const map = { km: 'textKm', en: 'textEn', zh: 'textZh' };
  const key = map[locale.value] || 'textKm';
  return tag[key] || tag.textKm;
}

const stockLabel = computed(() => {
  if (props.stock === 0) return null;
  if (props.stock <= 5) return t('product.stockLeft', { count: props.stock });
  return null;
});

const placeholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="%23e8e6e2"><rect width="400" height="400"/><text x="200" y="210" text-anchor="middle" fill="%237a7670" font-size="14">No Image</text></svg>';

function onImageError(e) {
  e.target.src = placeholder;
}
</script>

<style scoped>
.product-card {
  position: relative;
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  overflow: hidden;
  transition: transform 0.15s ease;
}

.card-link {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
}
.product-card:active { transform: scale(0.98); }

.card-image {
  position: relative;
  aspect-ratio: 1;
  background: oklch(96% 0.003 90);
  overflow: hidden;
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.stock-badge {
  position: absolute;
  bottom: var(--space-sm);
  left: var(--space-sm);
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: oklch(52% 0.20 24 / 0.9);
  color: #fff;
}
.card-body {
  padding: var(--space-sm) var(--space-md) var(--space-md);
}
.tag-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.tag-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  line-height: 1.6;
}
.card-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--fg);
}
.card-merchant {
  font-size: 11px;
  color: var(--muted);
  margin: 4px 0 6px;
}
.card-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 6px;
}
.card-stats .likes {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* 列表模式 */
.product-card.card-list .card-link {
  flex-direction: row;
}
.product-card.card-list .card-image {
  width: 120px;
  flex-shrink: 0;
  aspect-ratio: 1;
}
.product-card.card-list .card-body {
  flex: 1;
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.product-card.card-list .card-name {
  -webkit-line-clamp: 3;
  font-size: 14px;
}

/* 快捷加购按钮 */
.quick-add-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  border: none;
  font-size: 24px;
  font-weight: 300;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
  transition: all 0.25s ease;
}
.quick-add-btn:active {
  transform: scale(0.9);
}
.quick-add-btn:disabled {
  background: var(--border);
  color: var(--muted);
  cursor: not-allowed;
  box-shadow: none;
}
.quick-add-btn.added {
  background: #22c55e;
  transform: scale(1.1);
}
</style>
