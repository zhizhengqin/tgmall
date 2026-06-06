<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main"><h1>{{ $t('merchants.title') }}</h1>
      <el-tabs v-model="filter" @tab-change="load">
        <el-tab-pane :label="$t('merchants.pending')" name="pending" />
        <el-tab-pane :label="$t('merchants.approved')" name="active" />
        <el-tab-pane :label="$t('merchants.rejected')" name="rejected" />
      </el-tabs>
      <el-table :data="items" @row-click="(r)=>$router.push(`/merchants/${r.id}`)" style="cursor:pointer">
        <el-table-column prop="nameKm" :label="$t('merchants.name')" />
        <el-table-column prop="phone" :label="$t('merchants.phone')" width="120" />
        <el-table-column prop="category" :label="$t('products.category')" width="100" />
        <el-table-column :label="$t('merchants.date')" width="110"><template #default="{row}">{{row.createdAt?.slice(0,10)}}</template></el-table-column>
        <el-table-column label="" width="140"><template #default="{row}"><template v-if="row.status==='pending'"><el-button size="small" type="success" @click.stop="approve(row.id)">{{ $t('merchants.approve') }}</el-button><el-button size="small" type="danger" @click.stop="openReject(row.id)" style="margin-left:4px">{{ $t('merchants.reject') }}</el-button></template></template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev,pager,next" @current-change="load" style="margin-top:16px" />
      <el-dialog v-model="dlg" :title="$t('merchants.reject')">
        <el-input v-model="reason" :placeholder="$t('merchants.reason')" />
        <template #footer><el-button @click="dlg=false">{{ $t('common.cancel') }}</el-button><el-button type="danger" @click="doReject">{{ $t('merchants.reject') }}</el-button></template>
      </el-dialog>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'; import { getMerchants, approveMerchant, rejectMerchant } from '@/api'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';
const items = ref([]); const page = ref(1); const total = ref(0); const filter = ref('pending'); const dlg = ref(false); const reason = ref(''); const rejectId = ref('');
async function load() { const r = await getMerchants({ page: page.value, status: filter.value }); items.value = r.data; total.value = r.meta?.total||0; }
async function approve(id) { await approveMerchant(id); load(); }
function openReject(id) { rejectId.value = id; dlg.value = true; }
async function doReject() { await rejectMerchant(rejectId.value, reason.value); dlg.value = false; reason.value = ''; load(); }
onMounted(load);
</script>
<style scoped>.page{min-height:100vh;background:#f5f5f5}.main{margin-left:220px;padding:20px}</style>
