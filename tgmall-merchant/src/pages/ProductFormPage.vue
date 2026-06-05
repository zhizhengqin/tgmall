<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main"><h1>{{ isEdit?'កែទំនិញ':'បន្ថែមទំនិញ' }}</h1>
      <el-form :model="f" label-width="100px" style="max-width:600px">
        <el-form-item label="ឈ្មោះ (KM)"><el-input v-model="f.nameKm" /></el-form-item>
        <el-form-item label="Name (EN)"><el-input v-model="f.nameEn" /></el-form-item>
        <el-form-item label="名称 (ZH)"><el-input v-model="f.nameZh" /></el-form-item>
        <el-form-item label="USD"><el-input-number v-model="f.priceUsd" :min="0.01" :precision="2" /></el-form-item>
        <el-form-item label="KHR"><el-input-number v-model="f.priceKhr" :min="0" :step="100" /></el-form-item>
        <el-form-item label="ស្តុក"><el-input-number v-model="f.stock" :min="0" /></el-form-item>
        <el-form-item label="ប្រភេទ"><el-input v-model="f.category" /></el-form-item>
        <el-form-item label="រូបភាព"><el-input v-model="img" placeholder="URL" /><el-button @click="addImg" size="small" style="margin-left:8px">+</el-button></el-form-item>
        <div v-for="(im,i) in f.images" :key="i"><el-tag closable @close="f.images.splice(i,1)">{{im.url}}</el-tag></div>
        <el-form-item style="margin-top:20px">
          <el-button type="primary" @click="save" :loading="saving">រក្សាទុក</el-button>
          <el-button @click="$router.back()">បោះបង់</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue'; import { useRouter, useRoute } from 'vue-router'; import { getProductById, createProduct, updateProduct } from '@/api'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';
const router = useRouter(); const route = useRoute(); const isEdit = !!route.params.id; const saving = ref(false); const img = ref('');
const f = reactive({ nameKm:'', nameEn:'', nameZh:'', priceUsd:0, priceKhr:0, stock:0, category:'', images:[], specs:[] });
function addImg() { if (img.value) { f.images.push({ url: img.value }); img.value = ''; } }
async function save() { saving.value = true; isEdit ? await updateProduct(route.params.id, f) : await createProduct(f); router.push('/products'); }
onMounted(async () => { if (isEdit) { const r = await getProductById(route.params.id); if(r.data) Object.assign(f, r.data); } });
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; } .main { margin-left: 220px; padding: 20px; }</style>
