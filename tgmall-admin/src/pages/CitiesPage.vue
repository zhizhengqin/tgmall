<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h1>城市管理</h1>
        <el-button type="primary" @click="openDialog()">新增城市</el-button>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column prop="code" label="编码" width="120" />
        <el-table-column label="名称">
          <template #default="{row}">
            <div>{{ row.nameKm }} / {{ row.nameEn }} / {{ row.nameZh }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{row}">
            <el-switch :model-value="row.status==='active'" @change="toggle(row.code)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{row}">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="form.code ? '编辑城市' : '新增城市'" width="500px">
        <el-form :model="form" label-width="100px">
          <el-form-item label="编码"><el-input v-model="form.code" :disabled="!!form.code" /></el-form-item>
          <el-form-item label="高棉语"><el-input v-model="form.nameKm" /></el-form-item>
          <el-form-item label="英语"><el-input v-model="form.nameEn" /></el-form-item>
          <el-form-item label="中文"><el-input v-model="form.nameZh" /></el-form-item>
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
import { getCities, createCity, updateCity, toggleCity } from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const items = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const form = ref({ code: '', nameKm: '', nameEn: '', nameZh: '', sortOrder: 0 });

async function load() {
  loading.value = true;
  const r = await getCities({ limit: 100 });
  items.value = r.data || [];
  loading.value = false;
}

function openDialog(row) {
  form.value = row ? { ...row } : { code: '', nameKm: '', nameEn: '', nameZh: '', sortOrder: 0 };
  dialogVisible.value = true;
}

async function save() {
  if (form.value.code) {
    await updateCity(form.value.code, form.value);
  } else {
    await createCity(form.value);
  }
  dialogVisible.value = false;
  load();
}

async function toggle(code) {
  await toggleCity(code);
  load();
}

onMounted(load);
</script>
<style scoped>.page{min-height:100vh;background:#f5f5f5}.main{margin-left:220px;padding:20px}</style>