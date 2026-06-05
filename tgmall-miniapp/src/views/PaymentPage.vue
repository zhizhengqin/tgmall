<!-- 支付页 — KHQR / ABA Pay / Wing Pay / COD -->
<template>
  <div class="page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button class="back-btn" @click="handleBack" aria-label="Back">&#8592;</button>
      <h1>{{ pageTitle }}</h1>
      <div class="lang-switch">
        <button :class="{ active: isKm }" @click="setLang('km')">ប្រ</button>
        <button :class="{ active: isZh }" @click="setLang('zh')">中</button>
        <button :class="{ active: isEn }" @click="setLang('en')">EN</button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="pageState === 'loading'" class="loading-state">
      <div class="spinner"></div>
      <p>{{ $t('common.loading') }}</p>
    </div>

    <!-- KHQR 支付主体 -->
    <template v-else-if="paymentMethod === 'khqr' && pageState !== 'loading'">
      <!-- 订单摘要 -->
      <div class="order-summary">
        <div class="order-id">{{ orderNumber || `#${orderId}` }}</div>
        <PriceDisplay v-if="amountUsd > 0" :priceUsd="amountUsd" :priceKhr="amountKhr || amountUsd * 4000" />
      </div>

      <!-- 倒计时 -->
      <div class="timer-bar">
        <span class="timer-icon">&#9201;</span>
        <span class="timer-text">{{ $t('payment.timeLeft') }}</span>
        <span class="timer-count" :class="{ urgent: timeLeft <= 300 }">{{ formattedTime }}</span>
      </div>

      <!-- QR 码区域 -->
      <div class="qr-section">
        <template v-if="pageState === 'qr-loading'">
          <div class="qr-loading-spinner"></div>
          <p class="qr-loading-text">{{ $t('payment.qrLoading') }}</p>
        </template>

        <template v-else-if="pageState === 'qr-error'">
          <div class="qr-error-icon">&#9888;</div>
          <p class="qr-error-text">{{ $t('payment.qrError') }}</p>
          <button class="btn btn-outline btn-sm" @click="generateQR">{{ $t('common.retry') }}</button>
        </template>

        <template v-else>
          <!-- QR 二维码展示 -->
          <div class="qr-code">
            <img v-if="qrImageUrl" :src="qrImageUrl" alt="KHQR" class="qr-image" />
            <svg v-else class="qr-placeholder-svg" width="160" height="160" viewBox="0 0 160 160" aria-label="KHQR">
              <rect x="5" y="5" width="150" height="150" rx="8" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <rect x="15" y="15" width="45" height="45" rx="4" fill="currentColor" opacity="0.3"/>
              <rect x="22" y="22" width="31" height="31" rx="2" fill="var(--surface)"/>
              <rect x="100" y="15" width="45" height="45" rx="4" fill="currentColor" opacity="0.3"/>
              <rect x="107" y="22" width="31" height="31" rx="2" fill="var(--surface)"/>
              <rect x="15" y="100" width="45" height="45" rx="4" fill="currentColor" opacity="0.3"/>
              <rect x="22" y="107" width="31" height="31" rx="2" fill="var(--surface)"/>
              <circle cx="80" cy="30" r="3" fill="currentColor" opacity="0.3"/>
              <circle cx="95" cy="50" r="3" fill="currentColor" opacity="0.3"/>
              <circle cx="70" cy="60" r="3" fill="currentColor" opacity="0.3"/>
              <circle cx="85" cy="75" r="3" fill="currentColor" opacity="0.3"/>
              <circle cx="60" cy="90" r="3" fill="currentColor" opacity="0.3"/>
              <circle cx="100" cy="100" r="3" fill="currentColor" opacity="0.3"/>
              <circle cx="75" cy="115" r="3" fill="currentColor" opacity="0.3"/>
              <circle cx="90" cy="130" r="3" fill="currentColor" opacity="0.3"/>
            </svg>
          </div>
          <p class="qr-hint">{{ $t('payment.scanQr') }}</p>

          <!-- 支持的银行 -->
          <div v-if="supportedBanks.length" class="bank-section">
            <p class="bank-label">{{ $t('payment.supportedBanks') }}</p>
            <div class="bank-icons">
              <div v-for="bank in supportedBanks" :key="bank.name" class="bank-icon" :title="bank.name">
                <img v-if="bank.icon" :src="bank.icon" :alt="bank.name" class="bank-icon-img" />
                <span v-else class="bank-icon-fallback">&#127974;</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="btn btn-outline" @click="switchPaymentMethod">
          {{ $t('payment.changeMethod') }}
        </button>
        <button class="btn btn-primary" @click="handleCancelOrder">
          {{ $t('payment.cancelOrder') }}
        </button>
      </div>
    </template>

    <!-- ABA Pay / Wing Pay 重定向页 -->
    <template v-else-if="(paymentMethod === 'aba_pay' || paymentMethod === 'wing_pay') && pageState !== 'loading'">
      <div class="redirect-section">
        <div class="redirect-icon">&#128230;</div>
        <h2 class="redirect-title">{{ $t('payment.redirecting') }}</h2>
        <p class="redirect-hint">{{ $t('payment.redirectHint') }}</p>
        <button class="btn btn-primary redirect-btn" @click="openPaymentApp">
          {{ $t('payment.openApp') }}
        </button>
        <button class="btn btn-outline redirect-btn" @click="switchPaymentMethod">
          {{ $t('payment.changeMethod') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createKHQRPayment, getPaymentStatus } from '@/api/payments';
import { cancelOrder } from '@/api/orders';
import { useLanguageStore } from '@/stores/languageStore';
import PriceDisplay from '@/components/common/PriceDisplay.vue';

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const langStore = useLanguageStore();

// ── 路由参数 ──
const orderId = ref(route.query.orderId || '');
const orderNumber = ref(route.query.orderNumber || '');
const paymentMethod = ref(route.query.paymentMethod || 'khqr');
const amountUsd = ref(Number(route.query.amountUsd) || 0);
const amountKhr = ref(Number(route.query.amountKhr) || 0);

// ── 语言 ──
const isKm = computed(() => langStore.current === 'km');
const isEn = computed(() => langStore.current === 'en');
const isZh = computed(() => langStore.current === 'zh');
function setLang(lang) { langStore.setLanguage(lang); locale.value = lang; }

// ── 页面标题 ──
const titleKeys = {
  khqr: 'payment.khqrTitle',
  aba_pay: 'payment.abaPayTitle',
  wing_pay: 'payment.wingPayTitle',
  cod: 'payment.codTitle',
};
const pageTitle = computed(() => t(titleKeys[paymentMethod.value] || 'payment.khqrTitle'));

// ── 页面状态 ──
const pageState = ref('loading'); // loading | qr-loading | qr-error | qr-ready | polling
const qrImageUrl = ref('');
const qrData = ref('');
const supportedBanks = ref([]);
const expiresAt = ref(null);

// ── 倒计时 ──
const timeLeft = ref(15 * 60);
let timerInterval = null;
let pollInterval = null;

const formattedTime = computed(() => {
  const mins = Math.floor(timeLeft.value / 60);
  const secs = timeLeft.value % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
});

// ── 初始化 ──
onMounted(async () => {
  if (!orderId.value) {
    router.replace('/orders');
    return;
  }

  if (paymentMethod.value === 'cod') {
    router.replace({
      name: 'PaymentResult',
      query: {
        status: 'cod',
        orderId: orderId.value,
        orderNumber: orderNumber.value,
        amountUsd: amountUsd.value,
        amountKhr: amountKhr.value,
      },
    });
    return;
  }

  if (paymentMethod.value === 'aba_pay' || paymentMethod.value === 'wing_pay') {
    pageState.value = 'ready';
    setTimeout(() => openPaymentApp(), 1000);
    startTimer();
    return;
  }

  // KHQR: 生成二维码
  await generateQR();
  startTimer();
});

// ── 生成 KHQR 二维码 ──
async function generateQR() {
  pageState.value = 'qr-loading';
  try {
    const res = await createKHQRPayment(orderId.value);
    const data = res.data;
    qrImageUrl.value = data.qrImageUrl || '';
    qrData.value = data.qrData || '';
    supportedBanks.value = data.supportedBanks || [];
    expiresAt.value = data.expiresAt ? new Date(data.expiresAt) : null;

    if (expiresAt.value) {
      const remaining = Math.floor((expiresAt.value - Date.now()) / 1000);
      if (remaining > 0 && remaining < timeLeft.value) {
        timeLeft.value = remaining;
      }
    }

    pageState.value = 'qr-ready';
    startPolling();
  } catch (err) {
    console.error('生成 KHQR 失败:', err);
    const errMsg = err?.response?.data?.error?.message || '';
    if (errMsg.includes('已支付') || errMsg.includes('已取消') || errMsg.includes('超时')) {
      router.replace({
        name: 'PaymentResult',
        query: {
          status: errMsg.includes('已支付') ? 'success' : 'timeout',
          orderId: orderId.value,
          orderNumber: orderNumber.value,
          amountUsd: amountUsd.value,
          amountKhr: amountKhr.value,
          reason: errMsg,
        },
      });
      return;
    }
    pageState.value = 'qr-error';
  }
}

// ── 倒计时 ──
function startTimer() {
  timerInterval = setInterval(() => {
    if (timeLeft.value <= 0) {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
      handleTimeout();
      return;
    }
    timeLeft.value--;
  }, 1000);
}

// ── 支付状态轮询（每 3 秒） ──
function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const res = await getPaymentStatus(orderId.value);
      const data = res.data;
      if (data.paymentStatus === 'success') {
        clearInterval(timerInterval);
        clearInterval(pollInterval);
        router.replace({
          name: 'PaymentResult',
          query: {
            status: 'success',
            orderId: orderId.value,
            orderNumber: data.orderNumber || orderNumber.value,
            amountUsd: data.amountUsd || amountUsd.value,
            amountKhr: amountKhr.value,
            paidAt: data.paidAt,
          },
        });
      } else if (data.paymentStatus === 'failed') {
        clearInterval(timerInterval);
        clearInterval(pollInterval);
        router.replace({
          name: 'PaymentResult',
          query: {
            status: 'failed',
            orderId: orderId.value,
            orderNumber: data.orderNumber || orderNumber.value,
            amountUsd: data.amountUsd || amountUsd.value,
            amountKhr: amountKhr.value,
            reason: data.failureReason || '',
          },
        });
      }
      // pending / processing: 继续轮询
    } catch (err) {
      console.error('轮询支付状态失败:', err);
    }
  }, 3000);
}

// ── 支付超时处理 ──
function handleTimeout() {
  router.replace({
    name: 'PaymentResult',
    query: {
      status: 'timeout',
      orderId: orderId.value,
      orderNumber: orderNumber.value,
      amountUsd: amountUsd.value,
      amountKhr: amountKhr.value,
    },
  });
}

// ── 打开支付 App ──
function openPaymentApp() {
  const tg = window.Telegram?.WebApp;
  const appLinks = {
    aba_pay: 'https://abapay.aba.com.kh/',
    wing_pay: 'https://www.wingmoney.com.kh/',
  };
  const url = appLinks[paymentMethod.value];
  if (url) {
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }
}

// ── 切换支付方式 ──
function switchPaymentMethod() {
  clearInterval(timerInterval);
  clearInterval(pollInterval);
  router.back();
}

// ── 取消订单 ──
async function handleCancelOrder() {
  if (!confirm(t('payment.cancelOrder') + '?')) return;
  try {
    await cancelOrder(orderId.value, '用户取消');
  } catch (e) {
    console.error('取消订单失败:', e);
  }
  clearInterval(timerInterval);
  clearInterval(pollInterval);
  router.replace({
    name: 'PaymentResult',
    query: {
      status: 'cancelled',
      orderId: orderId.value,
      orderNumber: orderNumber.value,
    },
  });
}

// ── 返回按钮 ──
function handleBack() {
  clearInterval(timerInterval);
  clearInterval(pollInterval);
  router.back();
}

// ── 离开清理 ──
onUnmounted(() => {
  clearInterval(timerInterval);
  clearInterval(pollInterval);
});
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
  position: sticky;
  top: 0;
  z-index: 100;
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
.top-bar h1 {
  font-size: 15px; font-weight: 600; flex: 1;
  letter-spacing: -0.02em;
}
.lang-switch {
  display: flex; gap: 2px;
  background: var(--bg); border-radius: var(--radius-sm);
  padding: 2px; border: 1px solid var(--border);
}
.lang-switch button {
  width: 32px; height: 26px;
  border: none; background: transparent;
  border-radius: 6px; font-size: 11px; font-weight: 600;
  cursor: pointer; color: var(--muted);
  min-width: 32px; min-height: 26px;
  max-height: 26px;
}
.lang-switch button.active { background: var(--accent); color: #fff; }

/* ── 加载状态 ── */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--muted);
}
.spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── 订单摘要 ── */
.order-summary {
  background: var(--surface);
  padding: 20px 16px;
  border-bottom: 1px solid var(--border);
  text-align: center;
}
.order-id {
  font-size: 12px; color: var(--muted);
  font-family: ui-monospace, SF Mono, monospace;
  margin-bottom: 8px;
}

/* ── 倒计时 ── */
.timer-bar {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding: 14px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.timer-icon { font-size: 18px; }
.timer-text { font-size: 13px; color: var(--muted); }
.timer-count {
  font-size: 16px; font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--accent-red);
  min-width: 50px; text-align: center;
  font-family: ui-monospace, SF Mono, monospace;
}
.timer-count.urgent { animation: pulse 1s infinite; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ── QR 码区域 ── */
.qr-section {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 32px 20px;
  background: var(--surface);
  margin: 10px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  text-align: center;
}
.qr-code {
  width: 200px; height: 200px;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  display: grid; place-items: center;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}
.qr-image {
  width: 100%; height: 100%;
  object-fit: contain;
}
.qr-placeholder-svg {
  width: 160px; height: 160px;
  color: var(--fg);
}
.qr-hint {
  font-size: 13px; color: var(--muted);
  line-height: 1.6;
}

.qr-loading-spinner {
  width: 60px; height: 60px;
  border: 4px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
.qr-loading-text { font-size: 14px; color: var(--muted); }

.qr-error-icon { font-size: 48px; margin-bottom: 12px; }
.qr-error-text { font-size: 14px; color: var(--accent-red); margin-bottom: 16px; }

/* ── 银行图标 ── */
.bank-section { margin-top: 20px; }
.bank-label { font-size: 12px; color: var(--muted); margin-bottom: 10px; }
.bank-icons { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.bank-icon {
  width: 44px; height: 44px;
  border-radius: var(--radius-sm);
  background: var(--bg);
  display: grid; place-items: center;
  border: 1px solid var(--border);
  overflow: hidden;
}
.bank-icon-img { width: 32px; height: 32px; object-fit: contain; }
.bank-icon-fallback { font-size: 20px; }

/* ── 操作按钮 ── */
.action-buttons {
  padding: 16px;
  display: flex; gap: 10px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  margin-top: auto;
}
.btn {
  flex: 1; padding: 14px 0;
  border-radius: var(--radius-md);
  font-size: 14px; font-weight: 700;
  cursor: pointer; border: none;
  transition: all 0.15s;
  text-align: center; text-decoration: none;
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
.btn-sm {
  padding: 10px 20px;
  flex: none;
}

/* ── ABA Pay / Wing Pay 重定向页 ── */
.redirect-section {
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px 20px;
  text-align: center;
  gap: 16px;
}
.redirect-icon { font-size: 64px; }
.redirect-title { font-size: 18px; font-weight: 700; }
.redirect-hint { font-size: 14px; color: var(--muted); line-height: 1.6; }
.redirect-btn { max-width: 280px; width: 100%; }
</style>
