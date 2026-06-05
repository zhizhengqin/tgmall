<!-- 结算页 — Sprint 2 -->
<template>
  <div class="page">
    <div class="header">
      <button @click="$router.back()">←</button>
      <h2>确认订单</h2>
    </div>

    <div v-if="!items.length" class="empty">请先选择商品</div>

    <template v-else>
      <!-- 收货地址 -->
      <div class="section" @click="showAddressPicker = true">
        <div v-if="selectedAddress" class="address-card">
          <p class="addr-name">{{ selectedAddress.recipient_name }} {{ selectedAddress.phone }}</p>
          <p class="addr-detail">{{ selectedAddress.province }} {{ selectedAddress.district }} {{ selectedAddress.detail }}</p>
        </div>
        <p v-else class="add-addr">+ 添加收货地址</p>
      </div>

      <!-- 商品清单 -->
      <div class="section">
        <div v-for="item in items" :key="item.productId" class="item-row">
          <img :src="item.thumbnail" class="item-img" />
          <div class="item-info">
            <p class="item-name">{{ item.productName }}</p>
            <p class="item-spec" v-if="item.spec">{{ specStr(item.spec) }}</p>
            <p class="item-price">${{ item.priceUsd }} × {{ item.quantity }}</p>
          </div>
        </div>
      </div>

      <!-- 优惠券 -->
      <div class="section" @click="showCouponPicker = true">
        <span>优惠券</span>
        <span class="right-arrow">{{ selectedCoupon ? selectedCoupon.title : '选择优惠券' }} ›</span>
      </div>

      <!-- 支付方式 -->
      <div class="section">
        <p class="section-label">支付方式</p>
        <div class="payment-options">
          <button v-for="pm in paymentMethods" :key="pm.value" class="pm-btn" :class="{ active: paymentMethod === pm.value }" @click="paymentMethod = pm.value">
            {{ pm.label }}
          </button>
        </div>
      </div>

      <!-- 价格明细 -->
      <div class="section price-breakdown">
        <div class="pb-row"><span>商品总价</span><span>${{ subtotal.toFixed(2) }}</span></div>
        <div class="pb-row" v-if="discount > 0"><span>优惠券</span><span class="discount">-${{ discount.toFixed(2) }}</span></div>
        <div class="pb-row"><span>配送费</span><span>免运费</span></div>
        <div class="pb-row total"><span>合计</span><PriceDisplay :priceUsd="total" :priceKhr="totalKhr" /></div>
      </div>

      <!-- 提交按钮 -->
      <button class="submit-btn" @click="submitOrder" :disabled="!selectedAddress || submitting">
        {{ submitting ? '提交中...' : `提交订单 · $${total.toFixed(2)}` }}
      </button>
    </template>

    <!-- 地址选择弹窗 -->
    <div v-if="showAddressPicker" class="modal-mask" @click.self="showAddressPicker = false">
      <div class="modal">
        <h3>选择收货地址</h3>
        <div v-for="a in addresses" :key="a.id" class="addr-option" :class="{ selected: selectedAddress?.id === a.id }" @click="selectAddress(a)">
          <p>{{ a.recipient_name }} {{ a.phone }}</p>
          <p class="addr-sub">{{ a.province }} {{ a.district }} {{ a.detail }}</p>
        </div>
        <button class="add-new" @click="showAddressForm = true">+ 新增地址</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAddresses } from '@/api/addresses';
import { getMyCoupons } from '@/api/coupons';
import { createOrder } from '@/api/orders';
import PriceDisplay from '@/components/common/PriceDisplay.vue';

const router = useRouter();
const items = ref(JSON.parse(localStorage.getItem('checkout_items') || '[]'));
const addresses = ref([]);
const selectedAddress = ref(null);
const coupons = ref([]);
const selectedCoupon = ref(null);
const paymentMethod = ref('khqr');
const showAddressPicker = ref(false);
const showCouponPicker = ref(false);
const showAddressForm = ref(false);
const submitting = ref(false);

const paymentMethods = [
  { value: 'khqr', label: 'KHQR 扫码' },
  { value: 'aba_pay', label: 'ABA Pay' },
  { value: 'wing_pay', label: 'Wing Pay' },
  { value: 'cod', label: '货到付款' },
];

const subtotal = computed(() => items.value.reduce((s, i) => s + i.priceUsd * i.quantity, 0));
const discount = computed(() => {
  if (!selectedCoupon.value) return 0;
  return selectedCoupon.value.type === 'fixed' ? selectedCoupon.value.value : Math.round(subtotal.value * selectedCoupon.value.value / 100 * 100) / 100;
});
const total = computed(() => Math.max(0, subtotal.value - discount.value));
const totalKhr = computed(() => Math.round(total.value * 4000));

function selectAddress(a) { selectedAddress.value = a; showAddressPicker.value = false; }
function specStr(spec) { return Object.values(spec || {}).join(' / '); }

async function submitOrder() {
  if (!selectedAddress.value) return;
  submitting.value = true;
  try {
    const res = await createOrder({
      items: items.value.map(i => ({ product_id: i.productId, quantity: i.quantity, spec: i.spec })),
      shipping_address_id: selectedAddress.value.id,
      coupon_id: selectedCoupon.value?.id,
      payment_method: paymentMethod.value,
    });
    localStorage.removeItem('checkout_items');
    // 下单成功后跳转到支付页
    const order = res.data;
    router.push({
      name: 'Payment',
      query: {
        orderId: order.id,
        orderNumber: order.order_number || order.orderNumber,
        paymentMethod: paymentMethod.value,
        amountUsd: order.total_usd || order.totalUsd || total.value,
        amountKhr: order.total_khr || order.totalKhr || totalKhr.value,
      },
    });
  } catch (e) {
    alert('下单失败: ' + (e?.response?.data?.error?.message || '网络错误'));
  }
  submitting.value = false;
}

onMounted(async () => {
  if (!items.value.length) return;
  try {
    const res = await getAddresses();
    addresses.value = res.data;
    if (res.data.length) selectedAddress.value = res.data.find(a => a.is_default) || res.data[0];
  } catch {}
  try {
    const res = await getMyCoupons('unused');
    coupons.value = res.data;
  } catch {}
});
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: var(--space-lg); padding-bottom: 120px; min-height: 100vh; background: var(--bg); }
.header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.header button { font-size: 18px; color: var(--accent); }
.header h2 { font-size: 16px; font-weight: 700; }
.empty { text-align: center; padding: 80px 0; color: var(--muted); }
.section { background: var(--surface); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; border: 1px solid var(--border); }
.address-card .addr-name { font-size: 14px; font-weight: 600; }
.address-card .addr-detail { font-size: 12px; color: var(--muted); margin-top: 4px; }
.add-addr { color: var(--accent); font-size: 14px; }
.item-row { display: flex; gap: 12px; margin-bottom: 12px; }
.item-img { width: 64px; height: 64px; border-radius: var(--radius-sm); object-fit: cover; }
.item-info { flex: 1; }
.item-name { font-size: 13px; font-weight: 600; }
.item-spec { font-size: 11px; color: var(--muted); }
.item-price { font-size: 13px; font-weight: 600; color: var(--accent-red); margin-top: 4px; }
.right-arrow { color: var(--muted); }
.section-label { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
.payment-options { display: flex; gap: 8px; flex-wrap: wrap; }
.pm-btn { padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 13px; background: var(--surface); }
.pm-btn.active { border-color: var(--accent); color: var(--accent); font-weight: 600; }
.price-breakdown { display: flex; flex-direction: column; gap: 8px; }
.pb-row { display: flex; justify-content: space-between; font-size: 13px; }
.pb-row.total { font-weight: 700; font-size: 15px; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px; }
.discount { color: var(--accent-red); }
.submit-btn { width: 100%; padding: 16px; border-radius: var(--radius-sm); background: var(--accent); color: #fff; font-size: 16px; font-weight: 700; margin-top: 16px; }
.submit-btn:disabled { opacity: 0.4; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 300; display: flex; align-items: flex-end; }
.modal { background: var(--surface); border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 24px; width: 100%; max-width: var(--max-width); max-height: 70vh; overflow-y: auto; }
.modal h3 { font-size: 15px; margin-bottom: 16px; }
.addr-option { padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 8px; }
.addr-option.selected { border-color: var(--accent); }
.addr-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
.add-new { color: var(--accent); font-size: 14px; margin-top: 8px; }
</style>
