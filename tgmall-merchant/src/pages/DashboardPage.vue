<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main"><h1>{{ $t('dashboard.title') }}</h1>
      <el-row :gutter="20" style="margin-bottom:20px">
        <el-col :span="6"><StatCard :title="$t('dashboard.todayRevenue')" :value="'$'+(data.todayRevenueUsd||0)" color="#c4932a" /></el-col>
        <el-col :span="6"><StatCard :title="$t('dashboard.pendingOrders')" :value="String(data.pendingOrders||0)" color="#409eff" /></el-col>
        <el-col :span="6"><StatCard :title="$t('orders.shipped')" :value="String(data.shippedOrders||0)" color="#e6a23c" /></el-col>
        <el-col :span="6"><StatCard :title="$t('dashboard.totalProducts')" :value="String(data.productCount||0)" color="#67c23a" /></el-col>
      </el-row>
      <el-card><template #header>{{ $t('dashboard.recent7Days') || 'ចំណូល ៧ ថ្ងៃចុងក្រោយ' }}</template>
        <v-chart :option="chartOption" style="height:300px" autoresize />
      </el-card>
      <el-card v-if="data.lowStockAlerts?.length" style="margin-top:20px">
        <template #header>{{ $t('dashboard.lowStock') || 'ទំនិញជិតអស់' }}</template>
        <el-table :data="data.lowStockAlerts" size="small">
          <el-table-column prop="nameKm" :label="$t('nav.products')" />
          <el-table-column prop="stock" :label="$t('products.stock')" width="80"><template #default="{row}"><el-tag type="danger">{{row.stock}}</el-tag></template></el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'; import { getDashboard } from '@/api'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue'; import StatCard from '@/components/dashboard/StatCard.vue'; import VChart from 'vue-echarts'; import 'echarts';
const data = ref({});
const chartOption = computed(() => ({ xAxis: { type: 'category', data: (data.value.recent7DaysRevenue||[]).map(d=>d.date.slice(5)) }, yAxis: { type: 'value' }, series: [{ data: (data.value.recent7DaysRevenue||[]).map(d=>d.revenue), type: 'line', smooth: true }] }));
onMounted(async () => { try { data.value = (await getDashboard()).data; } catch(e) { console.error(e); } });
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; } .main { margin-left: 220px; padding: 20px; }</style>
