<!-- 订单详情 — Sprint 2 -->
<template>
  <div class="page">
    <div class="header">
      <button @click="$router.back()">←</button>
      <h2>订单详情</h2>
    </div>

    <div v-if="loading">加载中...</div>

    <template v-else-if="order">
      <!-- 状态 -->
      <div class="status-bar" :class="statusClass(order.status)">
        {{ statusLabel(order.status) }}
      </div>

      <!-- 收货地址 -->
      <div class="section">
        <p class="section-title">收货信息</p>
        <p>{{ order.shippingAddress?.recipient_name }} {{ order.shippingAddress?.phone }}</p>
        <p class="addr">{{ order.shippingAddress?.province }} {{ order.shippingAddress?.district }} {{ order.shippingAddress?.detail }}</p>
      </div>

      <!-- 商品清单 -->
      <div class="section">
        <p class="section-title">商品清单</p>
        <div v-for="item in order.items" :key="item.id" class="item-row">
          <img :src="item.product?.images?.[0]?.thumb_url || ''" class="item-img" />
          <div class="item-info">
            <p>{{ item.productId }}</p>
            <p class="item-spec">×{{ item.quantity }}</p>
          </div>
          <p class="item-price">${{ Number(item.priceUsd).toFixed(2) }}</p>
        </div>
      </div>

      <!-- 价格明细 -->
      <div class="section">
        <div class="pb-row"><span>商品总价</span><span>${{ (Number(order.totalUsd) + Number(order.discountUsd)).toFixed(2) }}</span></div>
        <div class="pb-row" v-if="Number(order.discountUsd) > 0"><span>优惠券</span><span class="discount">-${{ Number(order.discountUsd).toFixed(2) }}</span></div>
        <div class="pb-row"><span>配送费</span><span>免运费</span></div>
        <div class="pb-row total"><span>实付</span><span class="total-price">${{ Number(order.totalUsd).toFixed(2) }}</span></div>
      </div>

      <!-- 物流 -->
      <div class="section" v-if="order.logisticsInfo">
        <p class="section-title">物流信息</p>
        <p>{{ order.logisticsInfo.company }} — {{ order.logisticsInfo.tracking_number }}</p>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <button v-if="order.status === 'pending_payment'" class="btn-cancel" @click="handleCancel">取消订单</button>
        <button v-if="order.status === 'shipped'" class="btn-confirm" @click="handleConfirm">确认收货</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getOrderById, cancelOrder, confirmOrder } from '@/api/orders';

const route = useRoute();
const router = useRouter();
const order = ref(null);
const loading = ref(true);

function statusLabel(s) {
  return { pending_payment: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' }[s] || s;
}
function statusClass(s) {
  return { pending_payment: 's-pending', paid: 's-paid', shipped: 's-shipped', completed: 's-done', cancelled: 's-cancel' }[s] || '';
}

async function handleCancel() {
  if (!confirm('确定取消订单?')) return;
  try { await cancelOrder(order.value.id, '用户取消'); order.value.status = 'cancelled'; }
  catch (e) { alert(e?.response?.data?.error?.message || '取消失败'); }
}

async function handleConfirm() {
  if (!confirm('确定已收到货?')) return;
  try { await confirmOrder(order.value.id); order.value.status = 'completed'; }
  catch (e) { alert(e?.response?.data?.error?.message || '操作失败'); }
}

onMounted(async () => {
  try {
    const res = await getOrderById(route.params.id);
    order.value = res.data;
  } catch {}
  loading.value = false;
});
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: var(--space-lg); min-height: 100vh; background: var(--bg); }
.header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.header button { font-size: 18px; color: var(--accent); }
.header h2 { font-size: 16px; font-weight: 700; }
.status-bar { padding: 12px 16px; border-radius: var(--radius-md); font-weight: 700; font-size: 15px; margin-bottom: 16px; text-align: center; }
.s-pending { background: oklch(64% 0.16 82 / 0.1); color: var(--accent); }
.s-paid { background: oklch(58% 0.16 255 / 0.1); color: var(--accent-blue); }
.s-shipped { background: oklch(58% 0.16 155 / 0.1); color: var(--accent-green); }
.s-done { background: oklch(90% 0.005 95); color: var(--muted); }
.s-cancel { background: oklch(52% 0.20 24 / 0.1); color: var(--accent-red); }
.section { background: var(--surface); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); }
.section-title { font-size: 13px; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
.addr { font-size: 12px; color: var(--muted); margin-top: 4px; }
.item-row { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
.item-img { width: 48px; height: 48px; border-radius: 4px; object-fit: cover; }
.item-info { flex: 1; font-size: 13px; }
.item-spec { font-size: 11px; color: var(--muted); }
.item-price { font-weight: 600; font-size: 14px; }
.pb-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
.pb-row.total { font-weight: 700; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px; }
.discount { color: var(--accent-red); }
.total-price { color: var(--accent-red); font-size: 16px; }
.actions { display: flex; gap: 12px; margin-top: 20px; }
.btn-cancel { flex: 1; padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent-red); color: var(--accent-red); background: var(--surface); font-size: 14px; font-weight: 600; }
.btn-confirm { flex: 1; padding: 14px; border-radius: var(--radius-sm); background: var(--accent-green); color: #fff; font-size: 14px; font-weight: 600; }
</style>
