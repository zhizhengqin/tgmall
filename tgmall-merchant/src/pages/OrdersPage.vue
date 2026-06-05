<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main"><h1>កម្មង</h1>
      <el-tabs v-model="filter" @tab-change="load">
        <el-tab-pane label="ទាំងអស់" name="" /><el-tab-pane label="រង់ចាំបង់ប្រាក់" name="pending_payment" />
        <el-tab-pane label="បានបង់" name="paid" /><el-tab-pane label="បានដឹក" name="shipped" /><el-tab-pane label="បានបញ្ចប់" name="completed" />
      </el-tabs>
      <el-table :data="items" v-loading="loading">
        <el-table-column prop="orderNumber" label="លេខកម្មង" width="180" />
        <el-table-column label="ចំនួន" width="100"><template #default="{row}">${{row.totalUsd}}</template></el-table-column>
        <el-table-column label="ស្ថានភាព" width="100">
          <template #default="{row}"><el-tag :type="tag(row.status)">{{row.status}}</el-tag></template>
        </el-table-column>
        <el-table-column prop="customerName" label="អតិថិជន" />
        <el-table-column label="កាលបរិច្ឆេទ" width="110"><template #default="{row}">{{row.createdAt?.slice(0,10)}}</template></el-table-column>
        <el-table-column label="" width="80"><template #default="{row}"><el-button size="small" @click="$router.push(`/orders/${row.id}`)">លម្អិត</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top:16px" />
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { getOrders } from '@/api'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';
const items = ref([]); const loading = ref(false); const page = ref(1); const total = ref(0); const filter = ref('');
function tag(s) { const m={pending_payment:'warning',paid:'primary',shipped:'info',completed:'success',cancelled:'danger'}; return m[s]||''; }
async function load() { loading.value = true; const r = await getOrders({ page: page.value, status: filter.value || undefined }); items.value = r.data; total.value = r.meta?.total||0; loading.value = false; }
onMounted(load);
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; } .main { margin-left: 220px; padding: 20px; }</style>
