<!-- 收藏列表 -->
<template>
  <div class="page">
    <header class="page-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <h1>{{ $t('wishlist.title') }}</h1>
    </header>

    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

    <div v-else-if="items.length === 0" class="empty">
      <p class="empty-icon">💔</p>
      <p>{{ $t('wishlist.empty') }}</p>
      <router-link to="/" class="go-shop">{{ $t('wishlist.goShopping') }}</router-link>
    </div>

    <div v-else class="wishlist-grid">
      <div v-for="item in items" :key="item.id" class="wishlist-item">
        <router-link :to="`/product/${item.product.id}`" class="item-link">
          <img
            :src="item.product.images?.[0]?.thumb_url || item.product.images?.[0]?.url || placeholder"
            :alt="item.product.nameKm"
            class="item-thumb"
          />
          <div class="item-info">
            <p class="item-name">{{ displayName(item.product) }}</p>
            <PriceDisplay
              :price-usd="Number(item.product.priceUsd)"
              :price-khr="item.product.priceKhr"
              sm
            />
          </div>
        </router-link>
        <button class="remove-btn" @click="handleRemove(item.productId)">
          {{ $t('wishlist.remove') }}
        </button>
      </div>
    </div>

    <p v-if="hasMore" class="load-more" @click="loadMore">{{ $t('common.loadMore') }}</p>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { getWishlist, removeWishlist as removeWishlistApi } from '@/api/wishlist';
import PriceDisplay from '@/components/common/PriceDisplay.vue';
import BottomNav from '@/components/common/BottomNav.vue';

const { locale, t } = useI18n();
const items = ref([]);
const loading = ref(true);
const page = ref(1);
const hasMore = ref(false);

const placeholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="%23e8e6e2"><rect width="400" height="400"/><text x="200" y="210" text-anchor="middle" fill="%237a7670" font-size="14">No Image</text></svg>';

function displayName(product) {
  const map = { km: 'nameKm', en: 'nameEn', zh: 'nameZh' };
  return product[map[locale.value]] || product.nameKm;
}

async function loadWishlist(p = 1) {
  try {
    const res = await getWishlist(p, 20);
    if (p === 1) {
      items.value = res.data.items;
    } else {
      items.value.push(...res.data.items);
    }
    hasMore.value = items.value.length < res.data.total;
    page.value = p;
  } catch (e) {
    console.error('load wishlist failed:', e);
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  loadWishlist(page.value + 1);
}

async function handleRemove(productId) {
  try {
    await removeWishlistApi(productId);
    items.value = items.value.filter((i) => i.productId !== productId);
  } catch (e) {
    console.error('remove wishlist failed:', e);
  }
}

onMounted(() => { loadWishlist(); });
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: 0 var(--space-lg) 100px; min-height: 100vh; background: var(--bg); }
.page-header { display: flex; align-items: center; gap: 12px; padding: 16px 0; position: sticky; top: 0; background: var(--bg); z-index: 10; }
.page-header h1 { font-size: 18px; font-weight: 700; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.loading { text-align: center; padding: 60px 0; color: var(--muted); }
.empty { text-align: center; padding: 80px 0; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty p { color: var(--muted); margin-bottom: 16px; }
.go-shop { display: inline-block; padding: 10px 32px; border-radius: var(--radius-sm); background: var(--accent); color: #fff; text-decoration: none; font-weight: 600; }
.wishlist-grid { display: flex; flex-direction: column; gap: 12px; }
.wishlist-item { display: flex; align-items: center; gap: 12px; background: var(--surface); border-radius: var(--radius-md); padding: 12px; border: 1px solid var(--border); }
.item-link { display: flex; align-items: center; gap: 12px; flex: 1; text-decoration: none; color: inherit; min-width: 0; }
.item-thumb { width: 72px; height: 72px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; background: oklch(96% 0.003 90); }
.item-info { flex: 1; min-width: 0; }
.item-name { font-size: 13px; font-weight: 600; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.remove-btn { padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--muted); font-size: 12px; flex-shrink: 0; cursor: pointer; }
.load-more { text-align: center; padding: 16px; color: var(--accent); font-size: 13px; cursor: pointer; }
</style>
