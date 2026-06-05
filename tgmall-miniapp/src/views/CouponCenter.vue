<!-- 优惠券中心 — Sprint 2 -->
<template>
  <div class="page">
    <div class="header">
      <button @click="$router.back()">←</button>
      <h2>优惠券</h2>
    </div>

    <div v-if="loading">加载中...</div>

    <template v-else>
      <!-- 可领取 -->
      <div class="section" v-if="availableCoupons.length">
        <p class="section-title">可领取</p>
        <div v-for="c in availableCoupons" :key="c.id" class="coupon-card">
          <div class="cc-left">
            <p class="cc-value" v-if="c.type==='fixed'">${{ c.value }}</p>
            <p class="cc-value" v-else>{{ c.value }}%</p>
            <p class="cc-condition" v-if="Number(c.min_spend)>0">满 ${{ c.min_spend }}</p>
          </div>
          <div class="cc-right">
            <p class="cc-title">{{ c.title_km }}</p>
            <p class="cc-expire">有效期至 {{ formatDate(c.end_date) }}</p>
          </div>
          <button class="claim-btn" @click="handleClaim(c.id)">领取</button>
        </div>
      </div>

      <!-- 我的优惠券 -->
      <div class="section">
        <p class="section-title">我的优惠券</p>
        <div v-if="!myCoupons.length" class="empty">暂无优惠券</div>
        <div v-for="uc in myCoupons" :key="uc.id" class="coupon-card" :class="{ used: uc.status !== 'unused' }">
          <div class="cc-left">
            <p class="cc-value" v-if="uc.coupon?.type==='fixed'">${{ uc.coupon.value }}</p>
            <p class="cc-value" v-else>{{ uc.coupon?.value }}%</p>
          </div>
          <div class="cc-right">
            <p class="cc-title">{{ uc.coupon?.title_km }}</p>
            <p class="cc-expire">{{ uc.status === 'used' ? '已使用' : uc.status === 'expired' ? '已过期' : '有效期至 ' + formatDate(uc.coupon?.end_date) }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAvailableCoupons, claimCoupon, getMyCoupons } from '@/api/coupons';

const availableCoupons = ref([]);
const myCoupons = ref([]);
const loading = ref(true);

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }

async function handleClaim(id) {
  try { await claimCoupon(id); await loadData(); alert('领取成功!'); }
  catch (e) { alert(e?.response?.data?.error?.message || '领取失败'); }
}

async function loadData() {
  try {
    const [avail, mine] = await Promise.all([getAvailableCoupons(), getMyCoupons()]);
    availableCoupons.value = avail.data.filter(c => !mine.data.find(m => m.couponId === c.id));
    myCoupons.value = mine.data;
  } catch {}
  loading.value = false;
}

onMounted(loadData);
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: var(--space-lg); min-height: 100vh; background: var(--bg); }
.header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.header button { font-size: 18px; color: var(--accent); }
.header h2 { font-size: 16px; font-weight: 700; }
.section { margin-bottom: 24px; }
.section-title { font-size: 13px; color: var(--muted); font-weight: 600; margin-bottom: 12px; }
.empty { text-align: center; color: var(--muted); font-size: 13px; padding: 24px 0; }
.coupon-card { display: flex; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; margin-bottom: 10px; align-items: center; }
.coupon-card.used { opacity: 0.5; }
.cc-left { width: 70px; text-align: center; flex-shrink: 0; }
.cc-value { font-size: 20px; font-weight: 800; color: var(--accent-red); }
.cc-condition { font-size: 11px; color: var(--muted); }
.cc-right { flex: 1; }
.cc-title { font-size: 14px; font-weight: 600; }
.cc-expire { font-size: 11px; color: var(--muted); margin-top: 4px; }
.claim-btn { padding: 8px 16px; background: var(--accent); color: #fff; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; white-space: nowrap; }
</style>
