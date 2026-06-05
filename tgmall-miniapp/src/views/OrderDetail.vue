<!-- 订单详情 — Sprint 2 增强 -->
<template>
  <div class="page">
    <div class="header">
      <button @click="$router.back()">←</button>
      <h2>订单详情</h2>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <template v-else-if="order">
      <!-- 状态 + 订单号 -->
      <div class="status-bar" :class="statusClass(order.status)">
        <span>{{ statusLabel(order.status) }}</span>
        <span class="order-number">{{ order.orderNumber }}</span>
      </div>

      <!-- 收货地址 -->
      <div class="section">
        <p class="section-title">收货信息</p>
        <p class="recipient">{{ order.shippingAddress?.recipientName }} {{ order.shippingAddress?.phone }}</p>
        <p class="addr">{{ order.shippingAddress?.province }} {{ order.shippingAddress?.district }} {{ order.shippingAddress?.detail }}</p>
      </div>

      <!-- 商品清单 -->
      <div class="section">
        <p class="section-title">商品清单</p>
        <div v-for="item in order.items" :key="item.productId" class="item-row">
          <img :src="item.thumbnail || ''" class="item-img" />
          <div class="item-info">
            <p class="item-name">{{ item.productName }}</p>
            <p class="item-spec" v-if="item.spec && Object.keys(item.spec).length">{{ specStr(item.spec) }}</p>
            <p class="item-qty">×{{ item.quantity }}</p>
          </div>
          <p class="item-price">${{ Number(item.priceUsd).toFixed(2) }}</p>
        </div>
      </div>

      <!-- 价格明细（使用 priceBreakdown） -->
      <div class="section">
        <p class="section-title">价格明细</p>
        <div class="pb-row">
          <span>商品小计</span>
          <span>${{ Number(pb.subtotalUsd).toFixed(2) }}</span>
        </div>
        <div class="pb-row" v-if="Number(pb.discountUsd) > 0">
          <span>优惠券{{ order.coupon ? '（' + order.coupon.title + '）' : '' }}</span>
          <span class="discount">-${{ Number(pb.discountUsd).toFixed(2) }}</span>
        </div>
        <div class="pb-row">
          <span>配送费</span>
          <span>{{ Number(pb.shippingFeeUsd) > 0 ? '$' + Number(pb.shippingFeeUsd).toFixed(2) : '免运费' }}</span>
        </div>
        <div class="pb-row total">
          <span>实付</span>
          <span class="total-price">${{ Number(pb.totalUsd).toFixed(2) }}</span>
        </div>
      </div>

      <!-- 支付方式 -->
      <div class="section" v-if="order.paymentMethod">
        <p class="section-title">支付方式</p>
        <p>{{ paymentMethodLabel(order.paymentMethod) }}</p>
      </div>

      <!-- 物流信息（已发货时显示） -->
      <div class="section" v-if="order.logistics">
        <p class="section-title">物流信息</p>
        <div class="logistics-info">
          <p><span class="logi-label">物流公司</span> {{ order.logistics.company }}</p>
          <p><span class="logi-label">运单号</span> {{ order.logistics.trackingNumber }}</p>
          <p v-if="order.logistics.estimatedDelivery">
            <span class="logi-label">预计送达</span> {{ order.logistics.estimatedDelivery }}
          </p>
          <a v-if="order.logistics.trackingUrl" :href="order.logistics.trackingUrl" target="_blank" class="track-link">
            查看物流详情 →
          </a>
        </div>
      </div>

      <!-- 订单时间线 -->
      <div class="section" v-if="order.timeline?.length">
        <p class="section-title">订单进度</p>
        <div class="timeline">
          <div v-for="(step, idx) in order.timeline" :key="idx" class="tl-step" :class="{ active: idx === 0 }">
            <div class="tl-dot"></div>
            <div class="tl-content">
              <p class="tl-label">{{ step.label }}</p>
              <p class="tl-time">{{ formatTime(step.time) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <!-- 待付款：去支付 + 取消 -->
        <template v-if="order.status === 'pending_payment'">
          <button class="btn-pay" @click="goPay">去支付</button>
          <button class="btn-cancel" @click="handleCancel">取消订单</button>
        </template>
        <!-- 已发货：确认收货 -->
        <button v-if="order.status === 'shipped'" class="btn-confirm" @click="handleConfirm">确认收货</button>
        <!-- 已完成/已取消：无操作按钮 -->
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getOrderById, cancelOrder, confirmOrder } from '@/api/orders';

const route = useRoute();
const router = useRouter();
const order = ref(null);
const loading = ref(true);

// 价格明细计算：兼容新旧 API 格式
const pb = computed(() => {
  if (order.value?.priceBreakdown) {
    return order.value.priceBreakdown;
  }
  // fallback: 旧格式自行计算
  const total = Number(order.value?.totalUsd || 0);
  const discount = Number(order.value?.discountUsd || 0);
  return {
    subtotalUsd: total + discount,
    discountUsd: discount,
    shippingFeeUsd: 0,
    totalUsd: total,
    totalKhr: order.value?.totalKhr || 0,
  };
});

function statusLabel(s) {
  const map = { pending_payment: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
  return map[s] || s;
}
function statusClass(s) {
  const map = { pending_payment: 's-pending', paid: 's-paid', shipped: 's-shipped', completed: 's-done', cancelled: 's-cancel' };
  return map[s] || '';
}
function paymentMethodLabel(m) {
  const map = { khqr: 'KHQR 扫码支付', aba_pay: 'ABA Pay', wing_pay: 'Wing Pay', cod: '货到付款' };
  return map[m] || m;
}
function specStr(spec) { return Object.values(spec || {}).join(' / '); }
function formatTime(t) { return t ? new Date(t).toLocaleString('zh-CN') : ''; }

function goPay() {
  const o = order.value;
  const pb = o.priceBreakdown || {};
  router.push({
    name: 'Payment',
    query: {
      orderId: o.id,
      orderNumber: o.orderNumber,
      paymentMethod: o.paymentMethod,
      amountUsd: pb.totalUsd || o.totalUsd || 0,
      amountKhr: pb.totalKhr || o.totalKhr || 0,
    },
  });
}

async function handleCancel() {
  if (!confirm('确定取消订单？')) return;
  try {
    await cancelOrder(order.value.id, '用户取消');
    order.value.status = 'cancelled';
  } catch (e) {
    alert(e?.response?.data?.error?.message || '取消失败');
  }
}

async function handleConfirm() {
  if (!confirm('确定已收到货？')) return;
  try {
    await confirmOrder(order.value.id);
    order.value.status = 'completed';
  } catch (e) {
    alert(e?.response?.data?.error?.message || '操作失败');
  }
}

onMounted(async () => {
  try {
    const res = await getOrderById(route.params.id);
    order.value = res.data;
  } catch {
    order.value = null;
  }
  loading.value = false;
});
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: var(--space-lg); padding-bottom: 100px; min-height: 100vh; background: var(--bg); }
.header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.header button { font-size: 18px; color: var(--accent); background: none; border: none; cursor: pointer; }
.header h2 { font-size: 16px; font-weight: 700; }
.loading { text-align: center; padding: 80px 0; color: var(--muted); }

/* Status Bar */
.status-bar { padding: 12px 16px; border-radius: var(--radius-md); font-weight: 700; font-size: 15px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.status-bar .order-number { font-size: 11px; font-family: monospace; font-weight: 400; }
.s-pending { background: oklch(64% 0.16 82 / 0.1); color: var(--accent); }
.s-paid { background: oklch(58% 0.16 255 / 0.1); color: var(--accent-blue); }
.s-shipped { background: oklch(58% 0.16 155 / 0.1); color: var(--accent-green); }
.s-done { background: oklch(90% 0.005 95); color: var(--muted); }
.s-cancel { background: oklch(52% 0.20 24 / 0.1); color: var(--accent-red); }

/* Sections */
.section { background: var(--surface); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); }
.section-title { font-size: 13px; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
.recipient { font-size: 14px; font-weight: 600; }
.addr { font-size: 12px; color: var(--muted); margin-top: 4px; }

/* Items */
.item-row { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
.item-row:last-child { margin-bottom: 0; }
.item-img { width: 48px; height: 48px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
.item-info { flex: 1; min-width: 0; }
.item-name { font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-spec { font-size: 11px; color: var(--muted); }
.item-qty { font-size: 11px; color: var(--muted); }
.item-price { font-weight: 600; font-size: 14px; flex-shrink: 0; }

/* Price Breakdown */
.pb-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: var(--fg); }
.pb-row.total { font-weight: 700; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px; }
.discount { color: var(--accent-red); }
.total-price { color: var(--accent-red); font-size: 16px; }

/* Logistics */
.logistics-info p { font-size: 13px; margin-bottom: 6px; }
.logi-label { color: var(--muted); margin-right: 8px; font-size: 12px; }
.track-link { display: inline-block; margin-top: 4px; font-size: 13px; color: var(--accent); text-decoration: none; }

/* Timeline */
.timeline { padding-left: 4px; }
.tl-step { display: flex; gap: 10px; padding-bottom: 14px; position: relative; }
.tl-step:not(:last-child)::before { content: ''; position: absolute; left: 5px; top: 12px; bottom: 0; width: 1px; background: var(--border); }
.tl-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); margin-top: 4px; flex-shrink: 0; }
.tl-step.active .tl-dot { background: var(--accent); }
.tl-content { flex: 1; }
.tl-label { font-size: 13px; font-weight: 500; }
.tl-label { font-size: 13px; }
.tl-time { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* Actions */
.actions { display: flex; gap: 12px; margin-top: 20px; }
.btn-pay { flex: 1; padding: 14px; border-radius: var(--radius-sm); background: var(--accent); color: #fff; font-size: 15px; font-weight: 700; border: none; cursor: pointer; }
.btn-cancel { flex: 1; padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--accent-red); color: var(--accent-red); background: var(--surface); font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-confirm { flex: 1; padding: 14px; border-radius: var(--radius-sm); background: var(--accent-green); color: #fff; font-size: 14px; font-weight: 600; border: none; cursor: pointer; }
</style>
