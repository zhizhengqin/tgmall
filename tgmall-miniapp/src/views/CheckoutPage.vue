<!-- 结算页 — Sprint 2 -->
<template>
  <div class="page">
    <div class="header">
      <button @click="$router.back()">←</button>
      <h2>{{ $t('checkout.confirmTitle') }}</h2>
    </div>

    <div v-if="previewLoading" class="loading">{{ $t('common.loading') }}</div>
    <div v-else-if="previewError" class="empty">{{ previewError }}</div>
    <div v-else-if="!items.length" class="empty">{{ $t('checkout.emptyCart') }}</div>

    <template v-else>
      <!-- 收货地址 -->
      <div class="section" @click="showAddressPicker = true">
        <div v-if="selectedAddress" class="address-card">
          <p class="addr-name">{{ selectedAddress.recipient_name }} {{ selectedAddress.phone }}</p>
          <p class="addr-detail">{{ selectedAddress.province }} {{ selectedAddress.district }} {{ selectedAddress.detail }}</p>
        </div>
        <p v-else class="add-addr">{{ $t('checkout.addAddress') }}</p>
      </div>

      <!-- 商品清单 -->
      <div class="section">
        <div v-for="item in items" :key="item.productId" class="item-row">
          <img :src="item.thumbnail" class="item-img" loading="lazy" decoding="async" />
          <div class="item-info">
            <p class="item-name">{{ item.productName }}</p>
            <p class="item-spec" v-if="item.spec">{{ specStr(item.spec) }}</p>
            <p class="item-price">${{ item.priceUsd }} × {{ item.quantity }}</p>
          </div>
        </div>
      </div>

      <!-- 优惠券 -->
      <div class="section" @click="showCouponPicker = true">
        <span>{{ $t('checkout.couponLabel') }}</span>
        <span class="right-arrow">{{ selectedCouponTitle || $t('checkout.selectCoupon') }} ›</span>
      </div>

      <!-- 支付方式 -->
      <div class="section">
        <p class="section-label">{{ $t('checkout.paymentMethod') }}</p>
        <div class="payment-options">
          <button v-for="pm in paymentMethods" :key="pm.value" class="pm-btn" :class="{ active: paymentMethod === pm.value }" @click="paymentMethod = pm.value">
            {{ pm.label }}
          </button>
        </div>
      </div>

      <!-- 价格明细 -->
      <div class="section price-breakdown">
        <div class="pb-row"><span>{{ $t('checkout.subtotal') }}</span><span>${{ subtotal.toFixed(2) }}</span></div>
        <div class="pb-row" v-if="discount > 0"><span>{{ $t('checkout.couponLabel') }}</span><span class="discount">-${{ discount.toFixed(2) }}</span></div>
        <div class="pb-row">
          <span>{{ $t('checkout.shippingFee') }}</span>
          <PriceDisplay v-if="shippingFee > 0" :priceUsd="shippingFee" :priceKhr="shippingFeeKhr" sm />
          <span v-else>{{ $t('checkout.freeShipping') }}</span>
        </div>
        <div v-if="shortfall > 0" class="pb-row shortfall">
          <span>{{ $t('checkout.minOrder') }}</span>
          <span>{{ $t('checkout.shortfall', { amount: formatPrice(shortfall), min: formatPrice(minOrderAmount) }) }}</span>
        </div>
        <div class="pb-row total"><span>{{ $t('checkout.total') }}</span><PriceDisplay :priceUsd="total" :priceKhr="totalKhr" /></div>
      </div>

      <!-- 提交按钮 -->
      <button class="submit-btn" @click="submitOrder" :disabled="!canSubmit">
        <template v-if="shortfall > 0">
          {{ $t('checkout.submitShortfall', { amount: formatPrice(shortfall) }) }}
        </template>
        <template v-else-if="submitting">
          {{ $t('checkout.submitting') }}
        </template>
        <template v-else>
          {{ $t('checkout.submit') }} · <PriceDisplay :priceUsd="total" :priceKhr="totalKhr" sm />
        </template>
      </button>
    </template>

    <!-- 地址选择弹窗 -->
    <div v-if="showAddressPicker" class="modal-mask" @click.self="showAddressPicker = false">
      <div class="modal">
        <template v-if="!showAddressForm">
          <h3>{{ $t('checkout.selectAddress') }}</h3>
          <div v-for="a in addresses" :key="a.id" class="addr-option" :class="{ selected: selectedAddress?.id === a.id }" @click="selectAddress(a)">
            <p>{{ a.recipient_name }} {{ a.phone }}</p>
            <p class="addr-sub">{{ a.province }} {{ a.district }} {{ a.detail }}</p>
          </div>
          <button class="add-new" @click="showAddressForm = true">{{ $t('checkout.addNewAddress') }}</button>
        </template>
        <template v-else>
          <h3>{{ $t('checkout.addNewAddress') }}</h3>
          <div class="form-fields">
            <label class="form-field">
              <span>{{ $t('profile.form.name') }}</span>
              <input v-model="addressForm.recipient_name" type="text" />
            </label>
            <label class="form-field">
              <span>{{ $t('profile.form.phone') }}</span>
              <input v-model="addressForm.phone" type="tel" placeholder="+855..." />
            </label>
            <label class="form-field">
              <span>{{ $t('profile.form.province') }}</span>
              <input v-model="addressForm.province" type="text" />
            </label>
            <label class="form-field">
              <span>{{ $t('profile.form.district') }}</span>
              <input v-model="addressForm.district" type="text" />
            </label>
            <label class="form-field">
              <span>{{ $t('profile.form.detail') }}</span>
              <textarea v-model="addressForm.detail" rows="2"></textarea>
            </label>
            <label class="form-field checkbox">
              <input v-model="addressForm.is_default" type="checkbox" />
              <span>{{ $t('profile.form.setDefault') }}</span>
            </label>
          </div>
          <div class="form-actions">
            <button class="btn-secondary" @click="showAddressForm = false">{{ $t('common.cancel') }}</button>
            <button class="btn-primary" :disabled="savingAddress" @click="saveAddress">{{ $t('common.save') }}</button>
          </div>
        </template>
      </div>
    </div>

    <!-- 优惠券选择弹窗 -->
    <div v-if="showCouponPicker" class="modal-mask" @click.self="showCouponPicker = false">
      <div class="modal">
        <h3>{{ $t('checkout.selectCoupon') }}</h3>
        <div v-if="!usableCoupons.length" class="empty-modal">{{ $t('coupons.noCoupons') }}</div>
        <div v-for="uc in usableCoupons" :key="uc.id" class="coupon-option" :class="{ selected: selectedCoupon?.id === uc.id }" @click="selectCoupon(uc)">
          <div class="coupon-left" :style="{ background: uc.coupon?.bg || 'var(--accent)' }">
            <span class="coupon-value">{{ couponValueText(uc.coupon) }}</span>
          </div>
          <div class="coupon-right">
            <p class="coupon-title">{{ couponTitle(uc.coupon) }}</p>
            <p class="coupon-meta">{{ $t('coupons.minSpend', { amount: `$${Number(uc.coupon?.minSpend || 0).toFixed(2)}` }) }} · {{ $t('coupons.validUntil', { date: formatDate(uc.coupon?.endDate) }) }}</p>
          </div>
        </div>
        <button v-if="selectedCoupon" class="add-new" @click="selectedCoupon = null; showCouponPicker = false">{{ $t('common.cancel') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getAddresses, createAddress } from '@/api/addresses';
import { getMyCoupons } from '@/api/coupons';
import { createOrder } from '@/api/orders';
import { checkoutPreview } from '@/api/cart';
import { useCityStore } from '@/stores/cityStore.js';
import PriceDisplay from '@/components/common/PriceDisplay.vue';

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const cityStore = useCityStore();

const itemIds = computed(() => {
  const raw = route.query.ids;
  return raw ? String(raw).split(',').filter(Boolean) : [];
});

const preview = ref(null);
const previewLoading = ref(false);
const previewError = ref('');
const addresses = ref([]);
const selectedAddress = ref(null);
const coupons = ref([]);
const selectedCoupon = ref(null);
const paymentMethod = ref('khqr');
const showAddressPicker = ref(false);
const showCouponPicker = ref(false);
const showAddressForm = ref(false);
const submitting = ref(false);
const savingAddress = ref(false);
const addressForm = ref({ recipient_name: '', phone: '', province: '', district: '', detail: '', is_default: false });

const paymentMethods = computed(() => [
  { value: 'khqr', label: t('payment.khqr') },
  { value: 'aba_pay', label: t('payment.abaPay') },
  { value: 'wing_pay', label: t('payment.wingPay') },
  { value: 'cod', label: t('payment.cod') },
]);

const items = computed(() => preview.value?.items || []);
const priceBreakdown = computed(() => preview.value?.priceBreakdown || {});
const subtotal = computed(() => priceBreakdown.value.subtotalUsd || 0);
const discount = computed(() => priceBreakdown.value.discountUsd || 0);
const shippingFee = computed(() => priceBreakdown.value.shippingFeeUsd || 0);
const shippingFeeKhr = computed(() => priceBreakdown.value.shippingFeeKhr || 0);
const minOrderAmount = computed(() => priceBreakdown.value.minOrderAmountUsd || 0);
const shortfall = computed(() => priceBreakdown.value.shortfallUsd || 0);
const total = computed(() => priceBreakdown.value.totalUsd || 0);
const totalKhr = computed(() => priceBreakdown.value.totalKhr || 0);

const usableCoupons = computed(() => {
  const now = new Date();
  return coupons.value.filter((uc) => {
    const c = uc.coupon;
    if (!c) return false;
    if (new Date(c.endDate) < now) return false;
    if (subtotal.value < Number(c.minSpend || 0)) return false;
    return true;
  });
});
const selectedCouponTitle = computed(() => {
  if (!selectedCoupon.value) return '';
  const c = selectedCoupon.value.coupon;
  if (!c) return '';
  return `${couponTitle(c)} ${couponValueText(c)}`;
});

function formatPrice(usd) {
  return `$${usd.toFixed(2)} / ៛${Math.round(usd * 4000).toLocaleString()}`;
}

const canSubmit = computed(() =>
  selectedAddress.value && !submitting.value && !previewLoading.value && shortfall.value <= 0 && items.value.length > 0
);

function selectAddress(a) { selectedAddress.value = a; showAddressPicker.value = false; }
function selectCoupon(uc) {
  selectedCoupon.value = uc;
  showCouponPicker.value = false;
  loadPreview();
}
function specStr(spec) { return Object.values(spec || {}).join(' / '); }

async function saveAddress() {
  if (!addressForm.value.recipient_name || !addressForm.value.phone || !addressForm.value.province || !addressForm.value.district || !addressForm.value.detail) {
    alert(t('checkout.formIncomplete'));
    return;
  }
  savingAddress.value = true;
  try {
    const res = await createAddress(addressForm.value);
    const newAddr = res.data;
    addresses.value.unshift(newAddr);
    selectAddress(newAddr);
    addressForm.value = { recipient_name: '', phone: '', province: '', district: '', detail: '', is_default: false };
    showAddressForm.value = false;
  } catch (e) {
    alert(t('checkout.saveAddressFailed') + ': ' + (e?.response?.data?.error?.message || t('checkout.networkError')));
  }
  savingAddress.value = false;
}

function couponTitle(c) {
  if (!c) return '';
  if (locale.value === 'en') return c.titleEn || c.titleKm || '';
  if (locale.value === 'zh') return c.titleZh || c.titleKm || '';
  return c.titleKm || '';
}
function couponValueText(c) {
  if (!c) return '';
  return c.type === 'fixed' ? `-$${Number(c.value).toFixed(2)}` : `-${c.value}%`;
}
function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (locale.value === 'zh') return date.toLocaleDateString('zh-CN');
  if (locale.value === 'km') return date.toLocaleDateString('km-KH');
  return date.toLocaleDateString('en-US');
}

async function loadPreview() {
  if (!itemIds.value.length) return;
  previewLoading.value = true;
  previewError.value = '';
  try {
    const res = await checkoutPreview({
      item_ids: itemIds.value,
      city_code: cityStore.currentCity.code,
      coupon_id: selectedCoupon.value?.id,
    });
    preview.value = res.data;
  } catch (e) {
    previewError.value = e?.response?.data?.error?.message || t('checkout.networkError');
    preview.value = null;
  }
  previewLoading.value = false;
}

async function submitOrder() {
  if (!selectedAddress.value) return;
  submitting.value = true;
  try {
    const res = await createOrder({
      items: items.value.map(i => ({ product_id: i.productId, quantity: i.quantity, spec: i.spec })),
      shipping_address_id: selectedAddress.value.id,
      coupon_id: selectedCoupon.value?.coupon?.id,
      payment_method: paymentMethod.value,
    });
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
    alert(t('checkout.orderFailed') + ': ' + (e?.response?.data?.error?.message || t('checkout.networkError')));
  }
  submitting.value = false;
}

onMounted(async () => {
  if (!itemIds.value.length) return;
  try {
    const res = await getAddresses();
    addresses.value = res.data;
    if (res.data.length) selectedAddress.value = res.data.find(a => a.is_default) || res.data[0];
  } catch {}
  try {
    const res = await getMyCoupons('unused');
    coupons.value = res.data;
  } catch {}
  await loadPreview();
});

watch(() => cityStore.currentCity.code, () => {
  loadPreview();
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
.pb-row.shortfall { color: var(--accent-red); font-size: 13px; }
.submit-btn { width: 100%; padding: 16px; border-radius: var(--radius-sm); background: var(--accent); color: #fff; font-size: 16px; font-weight: 700; margin-top: 16px; }
.submit-btn:disabled { opacity: 0.4; }
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 300; display: flex; align-items: flex-end; }
.modal { background: var(--surface); border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 24px; width: 100%; max-width: var(--max-width); max-height: 70vh; overflow-y: auto; }
.modal h3 { font-size: 15px; margin-bottom: 16px; }
.addr-option { padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 8px; }
.addr-option.selected { border-color: var(--accent); }
.addr-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
.add-new { color: var(--accent); font-size: 14px; margin-top: 8px; }
.empty-modal { text-align: center; padding: 40px 0; color: var(--muted); font-size: 13px; }
.form-fields { display: flex; flex-direction: column; gap: 12px; }
.form-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.form-field span { color: var(--muted); }
.form-field input, .form-field textarea { padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 14px; background: var(--surface); }
.form-field.checkbox { flex-direction: row; align-items: center; gap: 8px; }
.form-field.checkbox input { width: auto; }
.form-actions { display: flex; gap: 12px; margin-top: 16px; }
.form-actions button { flex: 1; padding: 12px; border-radius: var(--radius-sm); border: none; font-size: 14px; cursor: pointer; }
.btn-primary { background: var(--accent); color: #fff; }
.btn-secondary { background: var(--surface); border: 1px solid var(--border); color: var(--fg); }
.coupon-option { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 8px; cursor: pointer; }
.coupon-option.selected { border-color: var(--accent); background: oklch(64% 0.16 82 / 0.05); }
.coupon-left { width: 56px; height: 56px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.coupon-value { font-size: 13px; font-weight: 700; }
.coupon-right { flex: 1; }
.coupon-title { font-size: 13px; font-weight: 600; }
.coupon-meta { font-size: 11px; color: var(--muted); margin-top: 4px; }
</style>
