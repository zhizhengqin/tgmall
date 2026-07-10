<!-- 支付结果页 — 成功 / 失败 / 超时 / COD / 已取消 -->
<template>
  <div class="page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button v-if="showBack" class="back-btn" @click="$router.back()" aria-label="Back">&#8592;</button>
      <h1 v-else>{{ $t('app.name') }}</h1>
    </div>

    <!-- 加载中 -->
    <div v-if="!ready" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- 结果内容 -->
    <div v-else class="result-page">
      <!-- 图标 -->
      <div class="result-icon" v-html="statusIcon"></div>

      <!-- 标题 -->
      <h2 class="result-title" :style="{ color: statusColor }">{{ statusTitle }}</h2>

      <!-- 订单信息 -->
      <div class="order-info" v-if="orderId || orderNumber">
        <p v-if="orderNumber" class="order-number">{{ orderNumber }}</p>
        <p v-else-if="orderId" class="order-number">{{ orderId }}</p>
        <div v-if="amountUsd > 0" class="result-amount">
          <PriceDisplay :priceUsd="amountUsd" :priceKhr="amountKhr || amountUsd * exchangeRate" />
        </div>
      </div>

      <!-- 描述 -->
      <p class="result-desc">{{ statusDesc }}</p>

      <!-- 失败原因 -->
      <p v-if="reason" class="failure-reason">{{ reason }}</p>

      <!-- 操作按钮 -->
      <div class="result-actions">
        <!-- 成功 / COD -->
        <template v-if="status === 'success' || status === 'cod'">
          <button class="btn btn-outline" @click="$router.push('/')">
            {{ $t('payment.continueShop') }}
          </button>
          <button class="btn btn-success" @click="$router.push('/orders')">
            {{ $t('payment.viewOrder') }}
          </button>
        </template>

        <!-- 失败 -->
        <template v-if="status === 'failed'">
          <button class="btn btn-primary" @click="retryPayment">
            {{ $t('payment.retryPay') }}
          </button>
          <button class="btn btn-outline" @click="backToCheckout">
            {{ $t('payment.methodChanged') }}
          </button>
        </template>

        <!-- 超时 -->
        <template v-if="status === 'timeout'">
          <button class="btn btn-outline" @click="$router.push('/orders')">
            {{ $t('payment.goOrders') }}
          </button>
          <button class="btn btn-primary" @click="$router.push('/')">
            {{ $t('payment.goHome') }}
          </button>
        </template>

        <!-- 已取消 -->
        <template v-if="status === 'cancelled'">
          <button class="btn btn-primary" @click="$router.push('/')">
            {{ $t('payment.goHome') }}
          </button>
          <button class="btn btn-outline" @click="$router.push('/orders')">
            {{ $t('payment.goOrders') }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useShopConfig } from '@/composables/useShopConfig.js';
import PriceDisplay from '@/components/common/PriceDisplay.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { exchangeRate } = useShopConfig();

// ── 路由参数 ──
const status = ref(route.query.status || 'success');
const orderId = ref(route.query.orderId || '');
const orderNumber = ref(route.query.orderNumber || '');
const amountUsd = ref(Number(route.query.amountUsd) || 0);
const amountKhr = ref(Number(route.query.amountKhr) || 0);
const reason = ref(route.query.reason || '');
const ready = ref(false);

onMounted(() => {
  if (!status.value) {
    router.replace('/orders');
    return;
  }
  ready.value = true;
});

const showBack = computed(() => ['failed', 'cancelled'].includes(status.value));

const statusConfig = computed(() => {
  const configs = {
    success: {
      icon: '&#10003;',
      color: 'var(--accent-green)',
      titleKey: 'payment.paySuccess',
      descKey: 'payment.paySuccessDesc',
    },
    failed: {
      icon: '&#10007;',
      color: 'var(--accent-red)',
      titleKey: 'payment.payFailed',
      descKey: 'payment.payFailedDesc',
    },
    timeout: {
      icon: '&#9200;',
      color: 'var(--accent-red)',
      titleKey: 'payment.payTimeout',
      descKey: 'payment.payTimeoutDesc',
    },
    cancelled: {
      icon: '&#10007;',
      color: 'var(--muted)',
      titleKey: 'payment.payTimeout',
      descKey: 'payment.payTimeoutDesc',
    },
    cod: {
      icon: '&#10003;',
      color: 'var(--accent-green)',
      titleKey: 'payment.codPlaced',
      descKey: 'payment.codDesc',
    },
  };
  return configs[status.value] || configs.success;
});

const statusIcon = computed(() => statusConfig.value.icon);
const statusColor = computed(() => statusConfig.value.color);
const statusTitle = computed(() => t(statusConfig.value.titleKey));
const statusDesc = computed(() => t(statusConfig.value.descKey));

// ── 重试支付 ──
function retryPayment() {
  router.push({
    name: 'Payment',
    query: {
      orderId: orderId.value,
      orderNumber: orderNumber.value,
      paymentMethod: 'khqr',
      amountUsd: amountUsd.value,
      amountKhr: amountKhr.value,
    },
  });
}

// ── 回到结算页切换方式 ──
function backToCheckout() {
  router.back();
}
</script>

<style scoped>
.page {
  max-width: var(--max-width);
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

/* ── 顶部导航栏 ── */
.top-bar {
  background: var(--surface);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}
.back-btn {
  width: 36px; height: 36px;
  border: none; background: var(--bg);
  border-radius: 50%; cursor: pointer;
  display: grid; place-items: center;
  font-size: 18px; color: var(--fg);
  min-width: 36px; min-height: 36px;
  max-height: 36px;
}
.top-bar h1 { font-size: 15px; font-weight: 600; }

/* ── 加载状态 ── */
.loading-state {
  flex: 1;
  display: flex; align-items: center; justify-content: center;
}
.spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 结果页 ── */
.result-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  text-align: center;
}
.result-icon {
  font-size: 72px;
  margin-bottom: 16px;
  line-height: 1;
}
.result-title {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 12px;
  letter-spacing: -0.02em;
}
.order-info {
  margin-bottom: 8px;
}
.order-number {
  font-size: 12px;
  color: var(--muted);
  font-family: ui-monospace, SF Mono, monospace;
  margin-bottom: 8px;
}
.result-amount {
  margin-bottom: 12px;
}
.result-desc {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 8px;
  line-height: 1.7;
  max-width: 300px;
}
.failure-reason {
  font-size: 13px;
  color: var(--accent-red);
  margin-bottom: 16px;
  padding: 8px 16px;
  background: oklch(95% 0.03 24);
  border-radius: var(--radius-sm);
  max-width: 300px;
  word-break: break-all;
}

/* ── 按钮区域 ── */
.result-actions {
  display: flex; gap: 10px;
  width: 100%; max-width: 320px;
  margin-top: 20px;
}
.btn {
  flex: 1; padding: 14px 0;
  border-radius: var(--radius-md);
  font-size: 14px; font-weight: 700;
  cursor: pointer; border: none;
  transition: all 0.15s;
  text-align: center;
  min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center;
}
.btn:active { opacity: 0.9; transform: scale(0.97); }
.btn-outline {
  background: var(--bg);
  border: 1.5px solid var(--border);
  color: var(--fg);
}
.btn-primary {
  background: var(--accent);
  color: #fff;
}
.btn-success {
  background: var(--accent-green);
  color: #fff;
}
</style>
