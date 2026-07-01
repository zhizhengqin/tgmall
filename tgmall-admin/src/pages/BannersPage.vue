<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h1>Banner 管理</h1>
        <el-button type="primary" @click="openDialog()">新增 Banner</el-button>
      </div>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column label="标题">
          <template #default="{row}">
            <div>{{ row.titleKm }} / {{ row.titleEn }} / {{ row.titleZh }}</div>
          </template>
        </el-table-column>
        <el-table-column label="图片" width="120">
          <template #default="{row}">
            <img v-if="row.imageUrl" :src="row.imageUrl" style="width:80px;height:48px;object-fit:cover;border-radius:4px" />
          </template>
        </el-table-column>
        <el-table-column prop="linkType" label="跳转类型" width="100" />
        <el-table-column prop="linkTarget" label="跳转目标" width="140" />
        <el-table-column prop="cityCode" label="城市" width="100" />
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{row}">
            <el-switch :model-value="row.status==='active'" @change="toggle(row.id)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{row}">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="dialogVisible" :title="form.id ? '编辑 Banner' : '新增 Banner'" width="520px">
        <el-form :model="form" label-width="100px">
          <el-form-item label="高棉语标题"><el-input v-model="form.titleKm" /></el-form-item>
          <el-form-item label="英语标题"><el-input v-model="form.titleEn" /></el-form-item>
          <el-form-item label="中文标题"><el-input v-model="form.titleZh" /></el-form-item>
          <el-form-item label="图片URL"><el-input v-model="form.imageUrl" /></el-form-item>
          <el-form-item label="跳转类型">
            <el-select v-model="form.linkType" placeholder="请选择" style="width:100%">
              <el-option label="商品" value="product" />
              <el-option label="品类" value="category" />
              <el-option label="链接" value="url" />
              <el-option label="页面" value="page" />
            </el-select>
          </el-form-item>
          <el-form-item label="跳转目标"><el-input v-model="form.linkTarget" /></el-form-item>
          <el-form-item label="城市编码"><el-input v-model="form.cityCode" /></el-form-item>
          <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
          <el-form-item label="开始时间"><el-date-picker v-model="form.startAt" type="datetime" placeholder="选择日期时间" style="width:100%" /></el-form-item>
          <el-form-item label="结束时间"><el-date-picker v-model="form.endAt" type="datetime" placeholder="选择日期时间" style="width:100%" /></el-form-item>
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
import { getBanners, createBanner, updateBanner, toggleBanner } from '@/api';
import Sidebar from '@/components/layout/Sidebar.vue';
import TopBar from '@/components/layout/TopBar.vue';

const items = ref([]);
const loading = ref(false);
const dialogVisible = ref(false);
const form = ref({
  id: null,
  titleKm: '',
  titleEn: '',
  titleZh: '',
  imageUrl: '',
  linkType: 'product',
  linkTarget: '',
  cityCode: '',
  sortOrder: 0,
  startAt: '',
  endAt: '',
});

async function load() {
  loading.value = true;
  const r = await getBanners({ limit: 100 });
  items.value = r.data || [];
  loading.value = false;
}

function openDialog(row) {
  form.value = row
    ? { ...row }
    : {
        id: null,
        titleKm: '',
        titleEn: '',
        titleZh: '',
        imageUrl: '',
        linkType: 'product',
        linkTarget: '',
        cityCode: '',
        sortOrder: 0,
        startAt: '',
        endAt: '',
      };
  dialogVisible.value = true;
}

async function save() {
  const data = { ...form.value };
  delete data.id;
  if (form.value.id) {
    await updateBanner(form.value.id, data);
  } else {
    await createBanner(data);
  }
  dialogVisible.value = false;
  load();
}

async function toggle(id) {
  await toggleBanner(id);
  load();
}

onMounted(load);
</script>
<style scoped>.page{min-height:100vh;background:#f5f5f5}.main{margin-left:220px;padding:20px}</style>