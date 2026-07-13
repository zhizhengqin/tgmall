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
        <PriceDisplay v-if="amountUsd > 0" :priceUsd="amountUsd" :priceKhr="amountKhr || amountUsd * exchangeRate" />
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

      <!-- Mock 模拟支付按钮 -->
      <div v-if="pageState === 'qr-ready' && showMock" class="mock-section">
        <button class="btn btn-mock" data-test="mock-confirm-btn" @click="handleMockConfirmOpen">
          {{ $t('payment.mockPayKhqr') }}
        </button>
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
    <template v-else-if="paymentMethod === 'aba_pay' || paymentMethod === 'wing_pay'">
      <!-- 加载中 -->
      <div v-if="pageState === 'loading' || pageState === 'deep-link-loading'" class="loading-state">
        <div class="spinner"></div>
        <p>{{ $t('common.loading') }}</p>
      </div>

      <!-- Deep Link 就绪 -->
      <div v-else-if="pageState === 'deep-link-ready'" class="redirect-section">
        <div class="redirect-icon">&#128230;</div>
        <h2 class="redirect-title">{{ $t('payment.redirecting') }}</h2>
        <p class="redirect-hint">{{ $t('payment.redirectHint') }}</p>
        <button class="btn btn-primary redirect-btn" @click="openPaymentApp(deepLinkUrl)">
          {{ $t('payment.openApp') }}
        </button>

        <!-- Mock 模拟支付按钮 -->
        <button v-if="showMock" class="btn btn-mock" data-test="mock-confirm-btn" @click="handleMockConfirmOpen">
          {{ $t('payment.mockPay') }}
        </button>

        <button class="btn btn-outline redirect-btn" @click="switchPaymentMethod">
          {{ $t('payment.changeMethod') }}
        </button>
      </div>

      <!-- Deep Link 失败 -->
      <div v-else-if="pageState === 'deep-link-error'" class="redirect-section">
        <div class="redirect-icon">&#9888;</div>
        <h2 class="redirect-title">{{ $t('payment.deepLinkError') }}</h2>
        <p class="redirect-hint">{{ $t('payment.deepLinkErrorHint') }}</p>
        <button class="btn btn-primary redirect-btn" @click="fetchDeepLink">
          {{ $t('common.retry') }}
        </button>
        <button class="btn btn-outline redirect-btn" @click="switchPaymentMethod">
          {{ $t('payment.changeMethod') }}
        </button>
      </div>
    </template>

    <!-- Telegram Invoice 支付页 -->
    <template v-else-if="paymentMethod === 'telegram_invoice'">
      <div class="redirect-section">
        <div class="redirect-icon">💳</div>
        <h2 class="redirect-title">{{ $t('payment.telegramInvoiceTitle') }}</h2>
        <p class="redirect-hint">{{ $t('payment.telegramInvoiceHint') }}</p>
        <button class="btn btn-primary redirect-btn" @click="openTelegramInvoice">
          {{ $t('payment.openInvoice') }}
        </button>
        <button class="btn btn-outline redirect-btn" @click="switchPaymentMethod">
          {{ $t('payment.changeMethod') }}
        </button>
      </div>
    </template>

    <!-- Mock 确认支付卡片（全屏覆盖） -->
    <div v-if="showMockConfirm" class="mock-overlay" data-test="mock-confirm-card">
      <div class="mock-card">
        <div class="mock-card-icon">💳</div>
        <h3 class="mock-card-title">{{ $t('payment.mockConfirmTitle') }}</h3>
        <p class="mock-card-desc">{{ $t('payment.mockConfirmDesc') }}</p>
        <p v-if="mockConfirmError" class="mock-card-error" data-test="mock-error-msg">{{ mockConfirmError }}</p>
        <div class="mock-card-actions">
          <button
            class="btn btn-outline"
            data-test="mock-cancel-btn"
            @click="handleMockCancel"
            :disabled="mockConfirmLoading"
          >
            {{ $t('payment.mockCancelBtn') }}
          </button>
          <button
            class="btn btn-primary"
            data-test="mock-confirm-submit"
            @click="handleMockConfirmSubmit"
            :disabled="mockConfirmLoading"
          >
            {{ mockConfirmLoading ? $t('payment.mockProcessing') : $t('payment.mockConfirmBtn') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { createKHQRPayment, createABAPayPayment, createWingPayPayment, createTelegramInvoicePayment, getPaymentStatus, mockConfirmPayment } from '@/api/payments';
import { getRuntimeConfig } from '@/api/config';
import { cancelOrder } from '@/api/orders';
import { useLanguageStore } from '@/stores/languageStore';
import { useShopConfig } from '@/composables/useShopConfig.js';
import PriceDisplay from '@/components/common/PriceDisplay.vue';

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const langStore = useLanguageStore();
const { exchangeRate } = useShopConfig();

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
  telegram_invoice: 'payment.telegramInvoiceTitle',
  cod: 'payment.codTitle',
};
const pageTitle = computed(() => t(titleKeys[paymentMethod.value] || 'payment.khqrTitle'));

// ── 页面状态 ──
const pageState = ref('loading'); // loading | qr-loading | qr-error | qr-ready | polling
const qrImageUrl = ref('');
const qrData = ref('');
const supportedBanks = ref([]);
const expiresAt = ref(null);
const deepLinkUrl = ref('');
const invoiceUrl = ref('');

// ── Mock 确认支付 ──
const backendMockEnabled = ref(false);
const paymentIsMock = ref(false);
// 仅开发环境、后端运行时配置开启或当前支付响应标记 isMock 时才显示模拟支付控件
const showMock = computed(() => import.meta.env.DEV || backendMockEnabled.value || paymentIsMock.value);
const showMockConfirm = ref(false);
const mockConfirmLoading = ref(false);
const mockConfirmError = ref('');

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
  // 并行拉取后端运行时配置，不阻塞支付主流程
  getRuntimeConfig()
    .then((cfgRes) => {
      backendMockEnabled.value = !!cfgRes.data?.paymentMockMode;
    })
    .catch((err) => {
      console.warn('拉取运行时配置失败:', err);
      backendMockEnabled.value = false;
    });

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
    await fetchDeepLink();
    startTimer();
    return;
  }

  if (paymentMethod.value === 'telegram_invoice') {
    await fetchTelegramInvoice();
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
    paymentIsMock.value = data.isMock || false;

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

// ── 获取 Deep Link ──
async function fetchDeepLink() {
  pageState.value = 'deep-link-loading';
  try {
    const apiFn = paymentMethod.value === 'aba_pay'
      ? createABAPayPayment
      : createWingPayPayment;
    const res = await apiFn(orderId.value);
    const data = res.data;
    deepLinkUrl.value = data.deepLink || data.universalLink || '';
    paymentIsMock.value = data.isMock || false;
    pageState.value = 'deep-link-ready';
    // 自动打开银行 App
    setTimeout(() => openPaymentApp(deepLinkUrl.value), 1000);
    // 开始轮询支付状态（回调是共享的）
    startPolling();
  } catch (err) {
    console.error('获取 Deep Link 失败:', err);
    pageState.value = 'deep-link-error';
  }
}

// ── 打开支付 App ──
function openPaymentApp(url) {
  if (!url) return;
  const tg = window.Telegram?.WebApp;
  if (tg?.openLink) {
    tg.openLink(url);
  } else {
    window.open(url, '_blank');
  }
}

// ── 获取 Telegram Invoice 链接 ──
async function fetchTelegramInvoice() {
  pageState.value = 'loading';
  try {
    const res = await createTelegramInvoicePayment(orderId.value);
    invoiceUrl.value = res.data.invoiceUrl || '';
    pageState.value = 'invoice-ready';
    // 在 Telegram 环境中自动打开
    if (window.Telegram?.WebApp?.openInvoice && invoiceUrl.value) {
      openTelegramInvoice();
    }
  } catch (err) {
    console.error('获取 Telegram Invoice 失败:', err);
    pageState.value = 'deep-link-error';
  }
}

// ── 调起 Telegram 原生支付 ──
function openTelegramInvoice() {
  const tg = window.Telegram?.WebApp;
  if (!tg?.openInvoice) {
    openPaymentApp(invoiceUrl.value);
    return;
  }
  if (!invoiceUrl.value) return;

  tg.openInvoice(invoiceUrl.value, (result) => {
    const status = typeof result === 'string' ? result : result?.status;
    if (status === 'paid') {
      router.replace({
        name: 'PaymentResult',
        query: {
          status: 'success',
          orderId: orderId.value,
          orderNumber: orderNumber.value,
          amountUsd: amountUsd.value,
          amountKhr: amountKhr.value,
        },
      });
    } else if (status === 'cancelled' || status === 'failed') {
      // 用户取消或支付失败，保持当前页并继续轮询兜底
      startPolling();
    } else {
      // pending / unknown：启动轮询
      startPolling();
    }
  });
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

// ── Mock 确认支付 ──
function handleMockConfirmOpen() {
  showMockConfirm.value = true;
  mockConfirmError.value = '';
}

function handleMockCancel() {
  showMockConfirm.value = false;
  mockConfirmError.value = '';
}

async function handleMockConfirmSubmit() {
  mockConfirmLoading.value = true;
  mockConfirmError.value = '';
  try {
    const res = await mockConfirmPayment(orderId.value, paymentMethod.value);
    clearInterval(timerInterval);
    clearInterval(pollInterval);
    router.replace({
      name: 'PaymentResult',
      query: {
        status: 'success',
        orderId: orderId.value,
        orderNumber: res.data?.orderNumber || orderNumber.value,
        amountUsd: amountUsd.value,
        amountKhr: amountKhr.value,
        isMock: 'true',
      },
    });
  } catch (err) {
    if (err?.response?.status === 404) {
      mockConfirmError.value = t('payment.mockNotEnabled');
    } else {
      mockConfirmError.value = err?.response?.data?.message || err?.message || t('payment.mockFailed');
    }
  } finally {
    mockConfirmLoading.value = false;
  }
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

/* ── Mock 模拟支付按钮 ── */
.mock-section {
  padding: 0 16px 12px;
}
.btn-mock {
  width: 100%;
  padding: 14px 0;
  border-radius: var(--radius-md);
  font-size: 14px; font-weight: 700;
  cursor: pointer; border: 2px dashed var(--accent);
  background: rgba(196, 147, 42, 0.06);
  color: var(--accent);
  transition: all 0.15s;
  min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center;
}
.btn-mock:active { opacity: 0.8; transform: scale(0.98); }

/* ── Mock 确认覆盖层 ── */
.mock-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
  animation: overlayIn 0.2s ease;
}
@keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }

.mock-card {
  background: var(--surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  width: 100%;
  max-width: var(--max-width);
  padding: 32px 20px 24px;
  text-align: center;
  animation: slideUp 0.25s ease;
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.mock-card-icon { font-size: 48px; margin-bottom: 12px; }
.mock-card-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.mock-card-desc { font-size: 13px; color: var(--muted); margin-bottom: 16px; line-height: 1.5; }

.mock-card-error {
  font-size: 13px; color: var(--accent-red);
  background: rgba(196, 58, 48, 0.06);
  padding: 10px 16px; border-radius: var(--radius-sm);
  margin-bottom: 16px;
}

.mock-card-actions {
  display: flex; gap: 10px;
  padding-top: 8px;
}
.mock-card-actions .btn { flex: 1; }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
</style>
