<!-- 订单列表 -->
<template>
  <div class="page">
    <h2 class="page-title">{{ $t('orders.title') }}</h2>

    <!-- 状态 Tab -->
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: activeTab === tab.value }" @click="switchTab(tab.value)">
        {{ $t(`orders.status.${tab.value || 'all'}`) }}
      </button>
    </div>

    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

    <div v-else-if="!orders.length" class="empty">{{ $t('orders.empty') }}</div>

    <div v-else>
      <div v-for="o in orders" :key="o.id" class="order-card" @click="goDetail(o.id)">
        <div class="oc-header">
          <span class="oc-number">{{ o.orderNumber }}</span>
          <span class="oc-status" :class="statusClass(o.status)">{{ $t(`orders.status.${o.status}`) }}</span>
        </div>
        <div class="oc-body">
          <img :src="o.thumbnail" class="oc-thumb" />
          <div class="oc-info">
            <p class="oc-merchant">{{ o.merchantName }}</p>
            <p class="oc-count">{{ $t('orders.itemCount', { count: o.itemCount }) }}</p>
            <p class="oc-price">${{ o.totalUsd }}</p>
          </div>
        </div>
        <div class="oc-footer">
          <span class="oc-time">{{ formatDate(o.createdAt) }}</span>
          <button v-if="o.status === 'pending_payment'" class="btn-pay-sm" @click.stop="goPay(o)">{{ $t('orders.goPay') }}</button>
        </div>
      </div>

      <p v-if="!hasMore && orders.length" class="no-more">{{ $t('common.noMore') }}</p>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLanguageStore } from '@/stores/languageStore';
import { getOrders } from '@/api/orders';
import BottomNav from '@/components/common/BottomNav.vue';

const router = useRouter();
const { t, locale } = useI18n();
const languageStore = useLanguageStore();

const tabs = [
  { value: '', labelKey: 'all' },
  { value: 'pending_payment', labelKey: 'pending_payment' },
  { value: 'confirmed', labelKey: 'confirmed' },
  { value: 'paid', labelKey: 'paid' },
  { value: 'shipped', labelKey: 'shipped' },
  { value: 'completed', labelKey: 'completed' },
];
const activeTab = ref('');
const orders = ref([]);
const loading = ref(true);
const hasMore = ref(true);
const page = ref(1);

function statusClass(s) {
  const map = { pending_payment: 's-pending', confirmed: 's-confirmed', paid: 's-paid', shipped: 's-shipped', completed: 's-done', cancelled: 's-cancel' };
  return map[s] || '';
}
function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const lang = locale.value;
  if (lang === 'zh') return date.toLocaleDateString('zh-CN');
  if (lang === 'km') return date.toLocaleDateString('km-KH');
  return date.toLocaleDateString('en-US');
}

function goDetail(id) { router.push(`/orders/${id}`); }

function goPay(order) {
  router.push({
    name: 'Payment',
    query: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      amountUsd: order.totalUsd,
      amountKhr: order.totalKhr || Math.round(order.totalUsd * 4000),
    },
  });
}

async function switchTab(val) { activeTab.value = val; page.value = 1; orders.value = []; hasMore.value = true; await loadOrders(); }
async function loadOrders() {
  loading.value = true;
  try {
    const params = { page: page.value, limit: 20 };
    if (activeTab.value) params.status = activeTab.value;
    const res = await getOrders(params);
    orders.value = res.data;
    hasMore.value = res.meta.has_next;
  } catch { orders.value = []; }
  loading.value = false;
}

// 语言切换后重新加载
watch(() => languageStore.current, () => {
  loadOrders();
});

onMounted(loadOrders);
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: var(--space-lg); padding-bottom: 100px; min-height: 100vh; background: var(--bg); }
.page-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab { flex-shrink: 0; font-size: 13px; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); white-space: nowrap; }
.tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.loading { text-align: center; padding: 40px 0; color: var(--muted); font-size: 13px; }
.empty { text-align: center; padding: 80px 0; color: var(--muted); }
.order-card { display: block; background: var(--surface); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); text-decoration: none; color: inherit; cursor: pointer; }
.oc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.oc-number { font-size: 12px; color: var(--muted); font-family: monospace; }
.oc-status { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
.s-pending { color: var(--accent); background: oklch(64% 0.16 82 / 0.1); }
.s-confirmed { color: oklch(50% 0.14 205); background: oklch(58% 0.16 200 / 0.1); }
.s-paid { color: var(--accent-blue); background: oklch(58% 0.16 255 / 0.1); }
.s-shipped { color: var(--accent-green); background: oklch(58% 0.16 155 / 0.1); }
.s-done { color: var(--muted); background: oklch(90% 0.005 95); }
.s-cancel { color: var(--accent-red); background: oklch(52% 0.20 24 / 0.1); }
.oc-body { display: flex; gap: 12px; }
.oc-thumb { width: 64px; height: 64px; border-radius: var(--radius-sm); object-fit: cover; }
.oc-info { flex: 1; }
.oc-merchant { font-size: 13px; font-weight: 600; }
.oc-count { font-size: 12px; color: var(--muted); margin: 4px 0; }
.oc-price { font-size: 15px; font-weight: 700; color: var(--accent-red); }
.oc-footer { margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.oc-time { font-size: 11px; color: var(--muted); }
.btn-pay-sm { padding: 6px 14px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 600; border: none; cursor: pointer; white-space: nowrap; }
.btn-pay-sm:active { opacity: 0.8; }
.no-more { text-align: center; padding: 20px; color: var(--muted); font-size: 13px; }
</style>
