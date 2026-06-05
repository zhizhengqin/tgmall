// 购物车状态管理
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useCartStore = defineStore('cart', () => {
  const items = ref([]);

  const totalItems = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0));
  const totalUsd = computed(() => items.value.reduce((sum, i) => sum + i.priceUsd * i.quantity, 0));

  function addItem(productId, quantity = 1, spec = {}, priceUsd = 0, productName = '', thumbnail = '') {
    const existing = items.value.find(
      (i) => i.productId === productId && JSON.stringify(i.spec) === JSON.stringify(spec),
    );
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.value.push({ productId, quantity, spec, priceUsd, productName, thumbnail });
    }
  }

  function removeItem(productId, spec) {
    items.value = items.value.filter(
      (i) => !(i.productId === productId && JSON.stringify(i.spec) === JSON.stringify(spec)),
    );
  }

  function updateQuantity(productId, quantity, spec) {
    const item = items.value.find(
      (i) => i.productId === productId && JSON.stringify(i.spec) === JSON.stringify(spec),
    );
    if (item) item.quantity = Math.max(1, quantity);
  }

  function clear() {
    items.value = [];
  }

  return { items, totalItems, totalUsd, addItem, removeItem, updateQuantity, clear };
});
