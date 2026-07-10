<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main"><h1>{{ $t('dashboard.title') }}</h1>

      <!-- 指标卡片 -->
      <el-row :gutter="20" style="margin-bottom:20px">
        <el-col :span="6"><el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">GMV {{ $t('dashboard.today') }}</div>
            <div class="stat-value" style="color:#c4932a">${{ fmt(data.gmvToday) }}</div>
          </div>
        </el-card></el-col>
        <el-col :span="6"><el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">GMV {{ $t('dashboard.thisMonth') }}</div>
            <div class="stat-value" style="color:#409eff">${{ fmt(data.gmvThisMonth) }}</div>
          </div>
        </el-card></el-col>
        <el-col :span="6"><el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">{{ $t('dashboard.totalUsers') }} / {{ $t('dashboard.totalOrders') }}</div>
            <div class="stat-value" style="color:#67c23a">{{ data.totalUsers || 0 }} / {{ data.totalOrders || 0 }}</div>
          </div>
        </el-card></el-col>
        <el-col :span="6"><el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">{{ t('dashboard.paymentRate') }}</div>
            <div class="stat-value" :style="{ color: (data.paymentSuccessRate||0) >= 80 ? '#67c23a' : '#e6a23c' }">{{ data.paymentSuccessRate || 0 }}%</div>
          </div>
        </el-card></el-col>
      </el-row>

      <el-row :gutter="20" style="margin-bottom:20px">
        <el-col :span="6"><el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">{{ t('dashboard.todayNewSkus') }}</div>
            <div class="stat-value" style="color:#409eff">{{ data.todayNewSkus || 0 }}</div>
          </div>
        </el-card></el-col>
      </el-row>

      <!-- 图表区：趋势 + 品类饼图 -->
      <el-row :gutter="20" style="margin-bottom:20px">
        <el-col :span="14"><el-card>
          <template #header>{{ $t('dashboard.trend7d') }}</template>
          <v-chart :option="trendOpt" style="height:300px" autoresize />
        </el-card></el-col>
        <el-col :span="10"><el-card>
          <template #header>{{ t('dashboard.categorySales') }}</template>
          <v-chart v-if="data.categorySales?.length" :option="pieOpt" style="height:300px" autoresize />
          <div v-else style="text-align:center;padding:60px 0;color:#999">{{ t('common.noData') || '暂无数据' }}</div>
        </el-card></el-col>
      </el-row>

      <!-- TOP 10 热销商品 -->
      <el-card>
        <template #header>{{ t('dashboard.topProducts') }}</template>
        <el-table :data="data.topProducts || []" stripe size="small" v-if="(data.topProducts||[]).length">
          <el-table-column type="index" width="50" label="#" />
          <el-table-column prop="name" :label="t('product.name')" min-width="180">
            <template #default="{row}">
              <div style="display:flex;align-items:center;gap:8px">
                <img v-if="row.thumbnail" :src="row.thumbnail" style="width:36px;height:36px;border-radius:4px;object-fit:cover" />
                <span style="font-size:13px">{{ row.nameZh || row.nameEn || row.nameKm }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="priceUsd" :label="t('product.price')" width="100">
            <template #default="{row}">${{ Number(row.priceUsd).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="salesCount" :label="t('product.sales')" width="100" sortable />
        </el-table>
        <div v-else style="text-align:center;padding:40px;color:#999">{{ t('common.noData') || '暂无数据' }}</div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAdminDashboard } from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';
import VChart from 'vue-echarts';
import 'echarts';
import km from '@/locales/km.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

const msg = { km, en, zh };
const lang = localStorage.getItem('admin_lang') || 'km';
const t = k => {
  const keys = k.split('.');
  let v = msg[lang] || msg.en;
  for (const p of keys) v = v?.[p];
  return typeof v === 'string' ? v : k;
};
const data = ref({});

// 7 天趋势图
const trendOpt = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: [t('dashboard.gmv'), t('dashboard.newUsers')], bottom: 0 },
  xAxis: { type: 'category', data: (data.value.recent7DaysTrend || []).map(d => d.date?.slice(5)) },
  yAxis: { type: 'value' },
  series: [
    { name: t('dashboard.gmv'), data: (data.value.recent7DaysTrend || []).map(d => d.gmv), type: 'line', smooth: true },
    { name: t('dashboard.newUsers'), data: (data.value.recent7DaysTrend || []).map(d => d.newUsers), type: 'bar' },
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
    data: (data.value.categorySales || []).map(c => ({ name: c.category, value: c.gmv })),
    label: { show: false },
    emphasis: { label: { show: true } },
  }],
}));

function fmt(v) { return (Number(v) || 0).toFixed(0); }

onMounted(async () => {
  data.value = (await getAdminDashboard()).data;
});
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.main { margin-left: 220px; padding: 20px; }
.stat-card { text-align: center; }
.stat-label { font-size: 13px; color: #999; margin-bottom: 4px; }
.stat-value { font-size: 28px; font-weight: 800; }
</style>
