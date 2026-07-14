<template>
  <div class="page">
    <div class="main">
      <h1>{{ $t('dashboard.title') }}</h1>

      <!-- 指标卡片 -->
      <div class="stat-grid" data-testid="stat-grid">
        <el-card v-for="stat in statCards" :key="stat.label" shadow="hover" data-testid="stat-card">
          <div class="stat-card">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
          </div>
        </el-card>
      </div>

      <!-- 图表区：趋势 + 品类饼图 -->
      <div v-if="!isMobile" class="charts-section" data-testid="dashboard-charts">
        <el-row :gutter="20" style="margin-bottom: 20px">
          <el-col :span="14">
            <el-card>
              <template #header>{{ $t('dashboard.trend7d') }}</template>
              <v-chart :option="trendOpt" style="height: 300px" autoresize />
            </el-card>
          </el-col>
          <el-col :span="10">
            <el-card>
              <template #header>{{ t('dashboard.categorySales') }}</template>
              <v-chart v-if="data.categorySales?.length" :option="pieOpt" style="height: 300px" autoresize />
              <div v-else style="text-align: center; padding: 60px 0; color: #999">{{ t('common.noData') || '暂无数据' }}</div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- TOP 10 热销商品 -->
      <el-card>
        <template #header>{{ t('dashboard.topProducts') }}</template>
        <div v-if="(data.topProducts || []).length" class="table-wrap" data-testid="top-products-table">
          <el-table :data="data.topProducts || []" stripe size="small">
            <el-table-column type="index" width="50" label="#" />
            <el-table-column prop="name" :label="t('product.name')" min-width="180">
              <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 8px">
                  <img v-if="row.thumbnail" :src="row.thumbnail" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover" />
                  <span style="font-size: 13px">{{ row.nameZh || row.nameEn || row.nameKm }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="priceUsd" :label="t('product.price')" width="100">
              <template #default="{ row }">${{ Number(row.priceUsd).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="salesCount" :label="t('product.sales')" width="100" sortable />
          </el-table>
        </div>
        <div v-else style="text-align: center; padding: 40px; color: #999">{{ t('common.noData') || '暂无数据' }}</div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAdminDashboard } from '@/api';
import { useBreakpoint } from '@/composables/useBreakpoint';
import VChart from 'vue-echarts';
import 'echarts';
import km from '@/locales/km.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

const { isMobile } = useBreakpoint();

const msg = { km, en, zh };
const lang = localStorage.getItem('admin_lang') || 'km';
const t = (k) => {
  const keys = k.split('.');
  let v = msg[lang] || msg.en;
  for (const p of keys) v = v?.[p];
  return typeof v === 'string' ? v : k;
};
const data = ref({});

const statCards = computed(() => [
  { label: `GMV ${t('dashboard.today')}`, value: `$${fmt(data.value.gmvToday)}`, color: '#c4932a' },
  { label: `GMV ${t('dashboard.thisMonth')}`, value: `$${fmt(data.value.gmvThisMonth)}`, color: '#409eff' },
  { label: `${t('dashboard.totalUsers')} / ${t('dashboard.totalOrders')}`, value: `${data.value.totalUsers || 0} / ${data.value.totalOrders || 0}`, color: '#67c23a' },
  { label: t('dashboard.paymentRate'), value: `${data.value.paymentSuccessRate || 0}%`, color: (data.value.paymentSuccessRate || 0) >= 80 ? '#67c23a' : '#e6a23c' },
  { label: t('dashboard.todayNewSkus'), value: data.value.todayNewSkus || 0, color: '#409eff' },
]);

// 7 天趋势图
const trendOpt = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: [t('dashboard.gmv'), t('dashboard.newUsers')], bottom: 0 },
  xAxis: { type: 'category', data: (data.value.recent7DaysTrend || []).map((d) => d.date?.slice(5)) },
  yAxis: { type: 'value' },
  series: [
    { name: t('dashboard.gmv'), data: (data.value.recent7DaysTrend || []).map((d) => d.gmv), type: 'line', smooth: true },
    { name: t('dashboard.newUsers'), data: (data.value.recent7DaysTrend || []).map((d) => d.newUsers), type: 'bar' },
  ],
}));

// 品类销售占比饼图
const pieOpt = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: ${c} ({d}%)' },
  legend: { orient: 'vertical', right: 0, top: 'center', textStyle: { fontSize: 11 } },
  series: [{
    type: 'pie',
    radius: ['45%', '75%'],
    center: ['35%', '50%'],
    data: (data.value.categorySales || []).map((c) => ({ name: c.category, value: c.gmv })),
    label: { show: false },
    emphasis: { label: { show: true } },
  }],
}));

function fmt(v) { return (Number(v) || 0).toFixed(0); }

onMounted(async () => {
  try {
    data.value = (await getAdminDashboard()).data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load dashboard:', e);
    data.value = {};
  }
});
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }

.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { text-align: center; }
.stat-label { font-size: 13px; color: #999; margin-bottom: 4px; }
.stat-value { font-size: 28px; font-weight: 800; }

.table-wrap { overflow-x: auto; }

@media (max-width: 1023px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 767px) {
  .stat-grid { grid-template-columns: 1fr; }
  .stat-value { font-size: 24px; }
}
</style>
