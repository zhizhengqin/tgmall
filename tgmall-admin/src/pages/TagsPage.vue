<template>
  <div class="page">
    <div class="main">
      <div class="page-header">
        <h1>商品标签</h1>
        <el-button type="primary" @click="openDialog()">+ 新增标签</el-button>
      </div>

      <el-table :data="tags" stripe style="margin-top:16px">
        <el-table-column label="预览" width="100">
          <template #default="{row}">
            <span class="tag-preview" :style="{ color: row.color, background: row.bg }">{{ row.textZh || row.textKm }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="textKm" label="ខ្មែរ" width="120" />
        <el-table-column prop="textZh" label="中文" width="120" />
        <el-table-column prop="textEn" label="English" width="120" />
        <el-table-column prop="color" label="颜色" width="80">
          <template #default="{row}"><span :style="{color:row.color}">● {{ row.color }}</span></template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="60" />
        <el-table-column label="操作" width="140">
          <template #default="{row}">
            <el-button size="small" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="visible" :title="editId ? '编辑标签' : '新增标签'" width="480px">
        <el-form :model="form" label-width="80px">
          <el-form-item label="ខ្មែរ">
            <el-input v-model="form.textKm" placeholder="高棉语文本" />
          </el-form-item>
          <el-form-item label="中文">
            <el-input v-model="form.textZh" placeholder="中文文本" />
          </el-form-item>
          <el-form-item label="English">
            <el-input v-model="form.textEn" placeholder="English text" />
          </el-form-item>
          <el-form-item label="文字颜色">
            <el-color-picker v-model="form.color" />
          </el-form-item>
          <el-form-item label="背景色">
            <el-color-picker v-model="form.bg" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sortOrder" :min="0" size="small" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="save" :loading="saving">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { getTags, createTag, updateTag, deleteTag } from '@/api';
import { ElMessage, ElMessageBox } from 'element-plus';

const tags = ref([]);
const visible = ref(false);
const editId = ref(null);
const saving = ref(false);
const form = reactive({ textKm: '', textZh: '', textEn: '', color: '#c4932a', bg: 'rgba(196,147,42,0.08)', sortOrder: 0 });

onMounted(load);
async function load() {
  try { const r = await getTags(); tags.value = r.data || []; } catch { /* ignore */ }
}

function openDialog(row) {
  if (row) {
    editId.value = row.id;
    Object.assign(form, { textKm: row.textKm, textZh: row.textZh || '', textEn: row.textEn || '', color: row.color, bg: row.bg, sortOrder: row.sortOrder });
  } else {
    editId.value = null;
    Object.assign(form, { textKm: '', textZh: '', textEn: '', color: '#c4932a', bg: 'rgba(196,147,42,0.08)', sortOrder: 0 });
  }
  visible.value = true;
}

async function save() {
  if (!form.textKm) { ElMessage.warning('高棉语文本为必填'); return; }
  saving.value = true;
  try {
    const data = { text_km: form.textKm, text_en: form.textEn || null, text_zh: form.textZh || null, color: form.color, bg: form.bg, sort_order: form.sortOrder };
    if (editId.value) await updateTag(editId.value, data);
    else await createTag(data);
    ElMessage.success(editId.value ? '已更新' : '已创建');
    visible.value = false;
    load();
  } catch (e) { ElMessage.error(e.response?.data?.error?.message || '操作失败'); }
  saving.value = false;
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(`确定删除标签 "${row.textZh || row.textKm}" 吗？`, '确认', { type: 'warning' });
    await deleteTag(row.id);
    ElMessage.success('已删除');
    load();
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }

.page-header { display: flex; justify-content: space-between; align-items: center; }
.page-header h1 { margin: 0; font-size: 20px; }
.tag-preview { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
</style>
