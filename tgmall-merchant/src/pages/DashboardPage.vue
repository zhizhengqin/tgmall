<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main"><h1>របាយការណ៍</h1>
      <el-row :gutter="20" style="margin-bottom:20px">
        <el-col :span="6"><StatCard title="ចំណូលថ្ងៃនេះ" :value="'$'+(data.todayRevenue||0)" color="#c4932a" /></el-col>
        <el-col :span="6"><StatCard title="កម្មងថ្ងៃនេះ" :value="String(data.todayOrders||0)" color="#409eff" /></el-col>
        <el-col :span="6"><StatCard title="ត្រូវដឹក" :value="String(data.pendingShip||0)" color="#e6a23c" /></el-col>
        <el-col :span="6"><StatCard title="ទំនិញសរុប" :value="String(data.totalProducts||0)" color="#67c23a" /></el-col>
      </el-row>
      <el-card><template #header>ចំណូល ៧ ថ្ងៃចុងក្រោយ</template>
        <v-chart :option="chartOption" style="height:300px" autoresize />
      </el-card>
      <el-card v-if="data.lowStockAlerts?.length" style="margin-top:20px">
        <template #header>ទំនិញជិតអស់</template>
        <el-table :data="data.lowStockAlerts" size="small">
          <el-table-column prop="nameKm" label="ទំនិញ" />
          <el-table-column prop="stock" label="ស្តុក" width="80"><template #default="{row}"><el-tag type="danger">{{row.stock}}</el-tag></template></el-table-column>
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
