<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main" v-if="order">
      <el-page-header @back="$router.back()"><template #content>លេខកម្មង {{ order.orderNumber }}</template></el-page-header>
      <el-row :gutter="20" style="margin-top:20px">
        <el-col :span="12">
          <el-card header="ទំនិញ">
            <el-table :data="order.items" size="small">
              <el-table-column prop="productName" label="ទំនិញ" />
              <el-table-column prop="quantity" label="ចំនួន" width="60" />
              <el-table-column label="ថ្លៃ" width="80"><template #default="{row}">${{row.unitPriceUsd}}</template></el-table-column>
            </el-table>
            <p style="margin-top:12px;font-weight:700">សរុប: ${{ order.totalUsd }} / {{ order.totalKhr }}៛</p>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card header="អាសយដ្ឋាន">
            <p>{{ order.customer?.name }}</p><p>{{ order.customer?.phone }}</p>
            <p>{{ order.shippingAddress?.detail }}</p>
          </el-card>
          <el-card header="ដឹកជញ្ជូន" style="margin-top:10px" v-if="order.status==='paid'">
            <el-form :model="s"><el-form-item label="ក្រុមហ៊ុន"><el-input v-model="s.logistics_company" /></el-form-item>
              <el-form-item label="លេខតាមដាន"><el-input v-model="s.tracking_number" /></el-form-item>
              <el-button type="primary" @click="doShip" :loading="shipping">បញ្ជាក់ការដឹក</el-button>
            </el-form>
          </el-card>
          <el-card v-else-if="order.logisticsInfo" style="margin-top:10px">
            <p>ក្រុមហ៊ុន: {{ order.logisticsInfo.logistics_company || order.logisticsInfo.company }}</p>
            <p>លេខតាមដាន: {{ order.logisticsInfo.tracking_number }}</p>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue'; import { useRoute } from 'vue-router'; import { getOrderDetail, shipOrder } from '@/api'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';
const route = useRoute(); const order = ref(null); const shipping = ref(false); const s = reactive({ logistics_company:'', tracking_number:'' });
onMounted(async () => { order.value = (await getOrderDetail(route.params.id)).data; });
async function doShip() { shipping.value = true; await shipOrder(route.params.id, s); order.value = (await getOrderDetail(route.params.id)).data; shipping.value = false; }
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; } .main { margin-left: 220px; padding: 20px; }</style>
