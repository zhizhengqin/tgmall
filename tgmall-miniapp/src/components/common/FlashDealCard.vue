<!-- 限时特价横滑卡片 -->
<template>
  <router-link :to="`/product/${deal.productId}`" class="flash-card">
    <div class="card-img-wrap">
      <img
        v-if="deal.product?.images?.[0]?.url"
        :src="deal.product.images[0].url"
        :alt="productName"
        class="card-img"
        loading="lazy"
        decoding="async"
        @error="imgFail = true"
      />
      <div v-if="imgFallback" class="card-img-fallback">{{ productName.charAt(0) }}</div>
      <div class="countdown-tag" v-if="timeLeft">{{ timeLeft }}</div>
    </div>
    <div class="card-body">
      <h4 class="card-name">{{ productName }}</h4>
      <div class="card-price">
        <span class="orig-price">${{ origUsd }}</span>
        <span class="deal-price">${{ deal.dealPriceUsd }}</span>
      </div>
      <div class="card-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <span class="progress-text">{{ $t('product.sales') }} {{ deal.soldCount }}</span>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  deal: { type: Object, required: true },
});

const { locale, t } = useI18n();
const imgFail = ref(false);
const now = ref(Date.now());
let timer = null;

onMounted(() => {
  timer = setInterval(() => { now.value = Date.now(); }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const productName = computed(() => {
  const p = props.deal.product || {};
  if (locale.value === 'km') return p.nameKm || p.nameEn || '';
  if (locale.value === 'en') return p.nameEn || p.nameKm || '';
  return p.nameZh || p.nameEn || p.nameKm || '';
});

const imgFallback = computed(() => imgFail.value || !props.deal.product?.images?.[0]?.url);

const origUsd = computed(() => {
  const p = props.deal.product;
  return p ? Number(p.priceUsd).toFixed(2) : '0.00';
});

const progressPct = computed(() => {
  if (!props.deal.dealStock) return 0;
  return Math.min(100, Math.round((props.deal.soldCount / props.deal.dealStock) * 100));
});

const timeLeft = computed(() => {
  if (!props.deal.endAt) return null;
  const end = new Date(props.deal.endAt).getTime();
  const diff = end - now.value;
  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  const d = t('time.day');
  const h = t('time.hour');
  const m = t('time.minute');
  const s = t('time.second');

  if (days > 0) {
    return `${days}${d}${pad(hours)}${h}${pad(mins)}${m}${pad(secs)}${s}`;
  }
  if (hours > 0) {
    return `${hours}${h}${pad(mins)}${m}${pad(secs)}${s}`;
  }
  return `${mins}${m}${pad(secs)}${s}`;
});

function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}
</script>

<style scoped>
.flash-card {
  flex-shrink: 0;
  width: 150px;
  background: var(--surface, #fff);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  text-decoration: none;
  color: inherit;
  transition: transform .2s;
}
.flash-card:active { transform: scale(.97); }

.card-img-wrap {
  position: relative;
  aspect-ratio: 1;
  background: var(--bg, #fafaf8);
  overflow: hidden;
}
.card-img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.card-img-fallback {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; font-weight: 700;
  color: var(--muted, #7a7670);
  background: var(--bg, #fafaf8);
}
.countdown-tag {
  position: absolute; top: 4px; left: 4px;
  background: var(--accent-red, #c43a30);
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.card-body { padding: 8px; }
.card-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-price {
  display: flex; align-items: baseline; gap: 6px; margin-bottom: 6px;
}
.orig-price {
  font-size: 12px;
  text-decoration: line-through;
  color: var(--muted, #7a7670);
}
.deal-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--accent-red, #c43a30);
}

.card-progress {
  display: flex; flex-direction: column; gap: 3px;
}
.progress-bar {
  height: 4px;
  background: var(--bg, #f0f0f0);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent-red, #c43a30);
  border-radius: 2px;
  transition: width .4s;
}
.progress-text {
  font-size: 11px;
  color: var(--muted, #7a7670);
}
</style>
