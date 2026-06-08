<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main"><h1>{{ $t('dashboard.title') }}</h1>
      <el-row :gutter="20" style="margin-bottom:20px">
        <el-col :span="6"><el-card shadow="hover"><div style="text-align:center"><div style="font-size:13px;color:#999">GMV {{ $t('dashboard.today') || 'ថ្ងៃនេះ' }}</div><div style="font-size:28px;font-weight:800;color:#c4932a">${{ (data.gmvToday||0).toFixed(0) }}</div></div></el-card></el-col>
        <el-col :span="6"><el-card shadow="hover"><div style="text-align:center"><div style="font-size:13px;color:#999">GMV {{ $t('dashboard.thisMonth') || 'ខែនេះ' }}</div><div style="font-size:28px;font-weight:800;color:#409eff">${{ (data.gmvThisMonth||0).toFixed(0) }}</div></div></el-card></el-col>
        <el-col :span="6"><el-card shadow="hover"><div style="text-align:center"><div style="font-size:13px;color:#999">{{ $t('dashboard.totalMerchants') }} / {{ $t('dashboard.totalUsers') }}</div><div style="font-size:28px;font-weight:800;color:#67c23a">{{ data.totalMerchants||0 }} / {{ data.totalUsers||0 }}</div></div></el-card></el-col>
        <el-col :span="6"><el-card shadow="hover"><div style="text-align:center"><div style="font-size:13px;color:#999">{{ $t('dashboard.totalOrders') }} / {{ $t('merchants.pending') }}</div><div style="font-size:28px;font-weight:800" :style="{color:data.pendingAudit?'#e6a23c':'#67c23a'}">{{ data.totalOrders||0 }} / {{ data.pendingAudit||0 }}</div></div></el-card></el-col>
      </el-row>
      <el-card><template #header>{{ $t('dashboard.trend7d') || 'និន្នាការ ៧ ថ្ងៃ' }}</template>
        <v-chart :option="opt" style="height:300px" autoresize />
      </el-card>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'; import { getAdminDashboard } from '@/api'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue'; import VChart from 'vue-echarts'; import 'echarts';
import km from '@/locales/km.json'; import en from '@/locales/en.json'; import zh from '@/locales/zh.json';
const msg={km,en,zh}; const lang=localStorage.getItem('admin_lang')||'km';
const t=k=>{const keys=k.split('.');let v=msg[lang]||msg.en;for(const p of keys)v=v?.[p];return typeof v==='string'?v:k;};
const data = ref({});
const opt = computed(() => ({ xAxis: { type: 'category', data: (data.value.recent7DaysTrend||[]).map(d=>d.date.slice(5)) }, yAxis: { type: 'value' }, series: [{ name: t('dashboard.gmv'), data: (data.value.recent7DaysTrend||[]).map(d=>d.gmv), type: 'line', smooth: true }, { name: t('dashboard.newUsers'), data: (data.value.recent7DaysTrend||[]).map(d=>d.newUsers), type: 'bar' }] }));
onMounted(async () => { data.value = (await getAdminDashboard()).data; });
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; } .main { margin-left: 220px; padding: 20px; }</style>
