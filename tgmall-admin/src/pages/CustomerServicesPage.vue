<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h1>客服账号</h1>
        <el-button type="primary" @click="openDialog()">新增客服</el-button>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column label="名称">
          <template #default="{row}">
            <div>{{ row.nameKm }} / {{ row.nameEn }} / {{ row.nameZh }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="telegramUsername" label="Telegram" width="140" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="workHours" label="工作时间" width="140" />
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="默认" width="80">
          <template #default="{row}">
            <el-tag v-if="row.isDefault" type="success">默认</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{row}">
            <el-switch :model-value="row.status==='active'" @change="toggle(row.id)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{row}">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="warning" :disabled="row.isDefault" @click="setDefault(row.id)">设为默认</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="form.id ? '编辑客服' : '新增客服'" width="520px">
        <el-form :model="form" label-width="100px">
          <el-form-item label="高棉语"><el-input v-model="form.nameKm" /></el-form-item>
          <el-form-item label="英语"><el-input v-model="form.nameEn" /></el-form-item>
          <el-form-item label="中文"><el-input v-model="form.nameZh" /></el-form-item>
          <el-form-item label="Telegram"><el-input v-model="form.telegramUsername" /></el-form-item>
          <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
          <el-form-item label="工作时间"><el-input v-model="form.workHours" placeholder="例如 09:00-18:00" /></el-form-item>
          <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="save">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import {
  getCustomerServices,
  createCustomerService,
  updateCustomerService,
  toggleCustomerService,
  setDefaultCustomerService,
} from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const items = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const form = ref({
  id: null,
  nameKm: '',
  nameEn: '',
  nameZh: '',
  telegramUsername: '',
  phone: '',
  workHours: '',
  sortOrder: 0,
});

async function load() {
  loading.value = true;
  const r = await getCustomerServices({ limit: 100 });
  items.value = r.data || [];
  loading.value = false;
}

function openDialog(row) {
  form.value = row
    ? { ...row }
    : {
        id: null,
        nameKm: '',
        nameEn: '',
        nameZh: '',
        telegramUsername: '',
        phone: '',
        workHours: '',
        sortOrder: 0,
      };
  dialogVisible.value = true;
}

async function save() {
  const data = { ...form.value };
  delete data.id;
  if (form.value.id) {
    await updateCustomerService(form.value.id, data);
  } else {
    await createCustomerService(data);
  }
  dialogVisible.value = false;
  load();
}

async function toggle(id) {
  await toggleCustomerService(id);
  load();
}

async function setDefault(id) {
  await setDefaultCustomerService(id);
  load();
}

onMounted(load);
</script>
<style scoped>.page{min-height:100vh;background:#f5f5f5}.main{margin-left:220px;padding:20px}</style>