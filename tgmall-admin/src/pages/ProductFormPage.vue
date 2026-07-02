<template>
  <div class="page"><TopBar /><Sidebar />
    <div class="main"><h1>{{ isEdit ? $t('products.editTitle') : $t('products.createTitle') }}</h1>
      <el-form :model="f" label-width="120px" style="max-width:600px">
        <el-form-item :label="$t('products.nameKm')"><el-input v-model="f.nameKm" /></el-form-item>
        <el-form-item :label="$t('products.nameEn')"><el-input v-model="f.nameEn" /></el-form-item>
        <el-form-item :label="$t('products.nameZh')"><el-input v-model="f.nameZh" /></el-form-item>
        <el-form-item :label="$t('products.priceUsd')"><el-input-number v-model="f.priceUsd" :min="0.01" :precision="2" /></el-form-item>
        <el-form-item :label="$t('products.priceKhr')"><el-input-number v-model="f.priceKhr" :min="0" :step="100" /></el-form-item>
        <el-form-item :label="$t('products.stock')"><el-input-number v-model="f.stock" :min="0" /></el-form-item>
        <el-form-item :label="$t('inventory.alertThreshold')"><el-input-number v-model="f.alertThreshold" :min="0" placeholder="留空表示不预警" /></el-form-item>
        <el-form-item :label="$t('products.category')"><el-input v-model="f.category" /></el-form-item>
        <el-form-item :label="$t('products.images')"><el-input v-model="img" placeholder="URL" /><el-button @click="addImg" size="small" style="margin-left:8px">+</el-button></el-form-item>
        <div v-for="(im,i) in f.images" :key="i"><el-tag closable @close="f.images.splice(i,1)">{{im.url}}</el-tag></div>
        <el-form-item :label="$t('products.tags')">
          <div class="tag-editor">
            <div v-for="(t,i) in f.tags" :key="i" class="tag-item">
              <el-input v-model="t.textKm" placeholder="KM" size="small" style="width:70px" />
              <el-input v-model="t.textEn" placeholder="EN" size="small" style="width:60px" />
              <el-input v-model="t.textZh" placeholder="ZH" size="small" style="width:60px" />
              <el-input v-model="t.color" placeholder="#fff" size="small" style="width:70px" type="color" />
              <el-input v-model="t.bg" placeholder="#c4932a" size="small" style="width:80px" type="color" />
              <el-button size="small" @click="f.tags.splice(i,1)" type="danger" circle>X</el-button>
            </div>
            <el-button size="small" @click="f.tags.push({textKm:'',textEn:'',textZh:'',color:'#fff',bg:'#c4932a'})" :disabled="f.tags.length >= 6">+ {{ $t('products.addTag') }}</el-button>
          </div>
        </el-form-item>
        <el-form-item style="margin-top:20px">
          <el-button type="primary" @click="save" :loading="saving">{{ $t('common.save') }}</el-button>
          <el-button @click="$router.back()">{{ $t('common.cancel') }}</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue'; import { useRouter, useRoute } from 'vue-router'; import { getProductById, createProduct, updateProduct } from '@/api'; import Sidebar from '@/components/layout/Sidebar.vue'; import TopBar from '@/components/layout/TopBar.vue';
const router = useRouter(); const route = useRoute(); const isEdit = !!route.params.id; const saving = ref(false); const img = ref('');
const f = reactive({ nameKm:'', nameEn:'', nameZh:'', priceUsd:0, priceKhr:0, stock:0, alertThreshold:null, category:'', images:[], specs:[], tags:[] });
function addImg() { if (img.value) { f.images.push({ url: img.value }); img.value = ''; } }
async function save() { saving.value = true; isEdit ? await updateProduct(route.params.id, f) : await createProduct(f); router.push('/products'); }
onMounted(async () => { if (isEdit) { const r = await getProductById(route.params.id); if(r.data) Object.assign(f, r.data); } });
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; } .main { margin-left: 220px; padding: 20px; } .tag-editor { display: flex; flex-direction: column; gap: 6px; } .tag-item { display: flex; gap: 6px; align-items: center; }</style>
