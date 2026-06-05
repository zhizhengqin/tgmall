<!-- 订单列表 — Sprint 2 -->
<template>
  <div class="page">
    <h2 class="page-title">订单</h2>

    <!-- 状态 Tab -->
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: activeTab === tab.value }" @click="switchTab(tab.value)">
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading">加载中...</div>

    <div v-else-if="!orders.length" class="empty">暂无订单</div>

    <div v-else>
      <div v-for="o in orders" :key="o.id" class="order-card" @click="goDetail(o.id)">
        <div class="oc-header">
          <span class="oc-number">{{ o.orderNumber }}</span>
          <span class="oc-status" :class="statusClass(o.status)">{{ statusLabel(o.status) }}</span>
        </div>
        <div class="oc-body">
          <img :src="o.thumbnail" class="oc-thumb" />
          <div class="oc-info">
            <p class="oc-merchant">{{ o.merchantName }}</p>
            <p class="oc-count">共 {{ o.itemCount }} 件</p>
            <p class="oc-price">${{ o.totalUsd }}</p>
          </div>
        </div>
        <div class="oc-footer">
          <span class="oc-time">{{ formatDate(o.createdAt) }}</span>
          <button v-if="o.status === 'pending_payment'" class="btn-pay-sm" @click.stop="goPay(o)">去支付</button>
        </div>
      </div>

      <p v-if="!hasMore && orders.length" class="no-more">— 已经到底了 —</p>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getOrders } from '@/api/orders';
import BottomNav from '@/components/common/BottomNav.vue';

const router = useRouter();

const tabs = [
  { value: '', label: '全部' },
  { value: 'pending_payment', label: '待付款' },
  { value: 'paid', label: '已付款' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
];
const activeTab = ref('');
const orders = ref([]);
const loading = ref(true);
const hasMore = ref(true);
const page = ref(1);

function statusLabel(s) {
  const map = { pending_payment: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
  return map[s] || s;
}
function statusClass(s) {
  const map = { pending_payment: 's-pending', paid: 's-paid', shipped: 's-shipped', completed: 's-done', cancelled: 's-cancel' };
  return map[s] || '';
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }

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

onMounted(loadOrders);
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: var(--space-lg); padding-bottom: 100px; min-height: 100vh; background: var(--bg); }
.page-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; scrollbar-width: none; }
.tabs::-webkit-scrollbar { display: none; }
.tab { flex-shrink: 0; font-size: 13px; padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); white-space: nowrap; }
.tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.empty { text-align: center; padding: 80px 0; color: var(--muted); }
.order-card { display: block; background: var(--surface); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); text-decoration: none; color: inherit; cursor: pointer; }
.oc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.oc-number { font-size: 12px; color: var(--muted); font-family: monospace; }
.oc-status { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
.s-pending { color: var(--accent); background: oklch(64% 0.16 82 / 0.1); }
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
