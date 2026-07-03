<!-- 购物车页 — Sprint 2 -->
<template>
  <div class="page">
    <h2 class="page-title">{{ $t('cart.title') }}</h2>

    <div v-if="loading">{{ $t('common.loading') }}</div>

    <div v-else-if="!groups.length" class="empty-cart">
      <p>{{ $t('cart.empty') }}</p>
      <router-link to="/" class="go-shop">{{ $t('cart.goShopping') }}</router-link>
    </div>

    <div v-else>
      <div v-for="group in groups" :key="group.merchantId" class="merchant-group">
        <p class="merchant-name">{{ group.merchantName }}</p>
        <div v-for="item in group.items" :key="item.id" class="cart-item">
          <input type="checkbox" :checked="isChecked(item.id)" @change="toggleCheck(item.id)" class="item-check" />
          <img :src="item.thumbnail" class="item-thumb" loading="lazy" decoding="async" />
          <div class="item-body">
            <p class="item-name">{{ item.productName }}</p>
            <p class="item-spec" v-if="item.spec">{{ specStr(item.spec) }}</p>
            <div class="item-price-row">
              <PriceDisplay :priceUsd="item.priceUsd" :priceKhr="item.priceKhr" sm />
              <div class="qty-spinner">
                <button @click="decreaseQty(item)">−</button>
                <span>{{ item.quantity }}</span>
                <button @click="increaseQty(item)">+</button>
              </div>
            </div>
            <p v-if="item.stockStatus === 'low_stock'" class="stock-warn">{{ $t('cart.stockLeft', { count: item.maxQuantity }) }}</p>
            <p v-if="item.stockStatus === 'insufficient'" class="stock-warn">{{ $t('cart.insufficient', { count: item.maxQuantity }) }}</p>
          </div>
        </div>
      </div>

      <div class="cart-footer">
        <label class="select-all"><input type="checkbox" :checked="allChecked" @change="toggleAll" /> {{ $t('cart.selectAll') }}</label>
        <div class="footer-right">
          <span class="total-label">{{ $t('cart.total') }}</span>
          <PriceDisplay :priceUsd="checkedTotalUsd" :priceKhr="checkedTotalKhr" />
          <button class="checkout-btn" @click="goCheckout" :disabled="checkedIds.length === 0">
            {{ $t('cart.checkoutCount', { count: checkedIds.length }) }}
          </button>
        </div>
      </div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getCart, updateCartItem, removeCartItem } from '@/api/cart';
import { useCartStore } from '@/stores/cartStore';
import PriceDisplay from '@/components/common/PriceDisplay.vue';
import BottomNav from '@/components/common/BottomNav.vue';

const router = useRouter();
const cartStore = useCartStore();
const groups = ref([]);
const loading = ref(true);
const checkedIds = ref([]);

const allChecked = computed(() => {
  const totalItems = groups.value.reduce((s, g) => s + g.items.length, 0);
  return totalItems > 0 && checkedIds.value.length === totalItems;
});

const checkedTotalUsd = computed(() => {
  let sum = 0;
  for (const g of groups.value) {
    for (const i of g.items) {
      if (checkedIds.value.includes(i.productId)) sum += i.subtotalUsd;
    }
  }
  return Math.round(sum * 100) / 100;
});

const checkedTotalKhr = computed(() => {
  let sum = 0;
  for (const g of groups.value) {
    for (const i of g.items) {
      if (checkedIds.value.includes(i.productId)) sum += i.priceKhr * i.quantity;
    }
  }
  return sum;
});

function isChecked(id) { return checkedIds.value.includes(id); }
function toggleCheck(id) {
  const idx = checkedIds.value.indexOf(id);
  if (idx >= 0) checkedIds.value.splice(idx, 1);
  else checkedIds.value.push(id);
}
function toggleAll() {
  if (allChecked.value) { checkedIds.value = []; return; }
  const ids = [];
  for (const g of groups.value) for (const i of g.items) ids.push(i.id);
  checkedIds.value = ids;
}

async function decreaseQty(item) {
  if (item.quantity <= 1) {
    if (confirm($t('cart.confirmRemove'))) {
      await removeCartItem(item.id);
      await loadCart();
    }
    return;
  }
  try { await updateCartItem(item.id, { quantity: item.quantity - 1 }); }
  catch { item.quantity = Math.max(1, item.quantity); }
}

async function increaseQty(item) {
  if (item.quantity >= item.maxQuantity) return;
  try { await updateCartItem(item.id, { quantity: item.quantity + 1 }); }
  catch { item.quantity = Math.min(item.maxQuantity, item.quantity); }
}

async function loadCart() {
  loading.value = true;
  try {
    const res = await getCart();
    groups.value = res.data.groups || [];
    cartStore.items = groups.value.flatMap(g => g.items);
  } catch { groups.value = []; }
  loading.value = false;
}

function goCheckout() {
  if (checkedIds.value.length === 0) return;
  // 将选中商品信息存入 localStorage 供结算页使用
  const items = [];
  for (const g of groups.value) {
    for (const i of g.items) {
      if (checkedIds.value.includes(i.id)) {
        items.push({ productId: i.productId, quantity: i.quantity, spec: i.spec, priceUsd: i.priceUsd, priceKhr: i.priceKhr, productName: i.productName, thumbnail: i.thumbnail, merchantId: i.merchantId, merchantName: i.merchantName });
      }
    }
  }
  localStorage.setItem('checkout_items', JSON.stringify(items));
  router.push('/checkout');
}

function specStr(spec) {
  return Object.values(spec || {}).join(' / ');
}

onMounted(loadCart);
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: var(--space-lg); padding-bottom: 120px; min-height: 100vh; background: var(--bg); }
.page-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
.empty-cart { text-align: center; padding: 80px 0; color: var(--muted); }
.go-shop { display: inline-block; margin-top: 12px; padding: 10px 32px; background: var(--accent); color: #fff; border-radius: var(--radius-sm); text-decoration: none; font-weight: 600; }
.merchant-group { margin-bottom: 16px; }
.merchant-name { font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
.cart-item { display: flex; gap: 12px; background: var(--surface); border-radius: var(--radius-md); padding: 12px; margin-bottom: 8px; border: 1px solid var(--border); align-items: flex-start; }
.item-check { margin-top: 4px; width: 18px; height: 18px; }
.item-thumb { width: 80px; height: 80px; border-radius: var(--radius-sm); object-fit: cover; background: oklch(96% 0.003 90); }
.item-body { flex: 1; min-width: 0; }
.item-name { font-size: 13px; font-weight: 600; line-height: 1.6; }
.item-spec { font-size: 11px; color: var(--muted); margin: 4px 0; }
.item-price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.qty-spinner { display: flex; align-items: center; gap: 0; border: 1px solid var(--border); border-radius: 4px; }
.qty-spinner button { width: 28px; height: 28px; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.qty-spinner span { width: 28px; text-align: center; font-size: 13px; font-weight: 600; }
.stock-warn { font-size: 11px; color: var(--accent-red); margin-top: 4px; }
.cart-footer { position: fixed; bottom: var(--nav-height); left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--max-width); display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--surface); border-top: 1px solid var(--border); z-index: 40; padding-bottom: calc(12px + env(safe-area-inset-bottom)); }
.select-all { font-size: 13px; display: flex; align-items: center; gap: 6px; }
.footer-right { display: flex; align-items: center; gap: 12px; }
.total-label { font-size: 12px; color: var(--muted); }
.checkout-btn { padding: 10px 24px; border-radius: var(--radius-sm); background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; }
.checkout-btn:disabled { opacity: 0.4; }
</style>
