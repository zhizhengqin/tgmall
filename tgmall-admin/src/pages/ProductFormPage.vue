<template>
  <div class="page">
    <div class="main"><h1>{{ isEdit ? $t('products.editTitle') : $t('products.createTitle') }}</h1>
      <el-form :model="f" label-width="120px" class="product-form" style="max-width:600px">
        <el-form-item :label="$t('products.nameKm')"><el-input v-model="f.nameKm" /></el-form-item>
        <el-form-item :label="$t('products.nameEn')"><el-input v-model="f.nameEn" /></el-form-item>
        <el-form-item :label="$t('products.nameZh')"><el-input v-model="f.nameZh" /></el-form-item>
        <el-form-item :label="$t('products.priceUsd')"><el-input-number v-model="f.priceUsd" :min="0.01" :precision="2" /></el-form-item>
        <el-form-item :label="$t('products.priceKhr')"><el-input-number v-model="f.priceKhr" :min="0" :step="100" /></el-form-item>
        <el-form-item :label="$t('products.stock')"><el-input-number v-model="f.stock" :min="0" /></el-form-item>
        <el-form-item :label="$t('inventory.alertThreshold')"><el-input-number v-model="f.alertThreshold" :min="0" placeholder="留空表示不预警" /></el-form-item>
        <el-form-item :label="$t('products.category')"><el-input v-model="f.category" /></el-form-item>
        <el-form-item :label="$t('products.images')"><el-input v-model="img" placeholder="URL" /><el-button @click="addImg" size="small" style="margin-left:8px">+</el-button><ImageUploader @update:modelValue="onUploadImage" style="margin-left:8px" /></el-form-item>
        <div v-for="(im,i) in f.images" :key="i"><el-tag closable @close="f.images.splice(i,1)"><img :src="im.url" class="img-tag" /> {{im.url}}</el-tag></div>
        <el-form-item :label="$t('products.tags')">
          <div class="tag-editor">
            <div v-if="allTags.length" class="tag-library">
              <span class="tag-label">{{ $t('products.tagLibrary') }}:</span>
              <el-tag
                v-for="tag in allTags"
                :key="tag.id"
                :style="{ color: tag.color, backgroundColor: tag.bg }"
                size="small"
                class="library-tag"
                @click="selectTag(tag)"
              >
                {{ tag.textKm }}
              </el-tag>
            </div>
            <div v-for="(t,i) in f.tags" :key="i" class="tag-item">
              <el-input v-model="t.textKm" placeholder="KM" size="small" style="width:70px" />
              <el-input v-model="t.textEn" placeholder="EN" size="small" style="width:60px" />
              <el-input v-model="t.textZh" placeholder="ZH" size="small" style="width:60px" />
              <el-input v-model="t.color" placeholder="#fff" size="small" style="width:70px" type="color" />
              <el-input v-model="t.bg" placeholder="#c4932a" size="small" style="width:80px" type="color" />
              <el-button size="small" @click="f.tags.splice(i,1)" type="danger" circle>X</el-button>
            </div>
            <el-button size="small" @click="f.tags.push({textKm:'',textEn:'',textZh:'',color:'#ffffff',bg:'#c4932a'})" :disabled="f.tags.length >= 6">+ {{ $t('products.addTag') }}</el-button>
          </div>
        </el-form-item>
        <el-form-item :label="$t('products.specs')">
          <div class="spec-editor">
            <div v-for="(s, si) in f.specs" :key="si" class="spec-group">
              <div class="spec-header">
                <el-input v-model="s.nameEn" :placeholder="$t('products.specNameEn')" size="small" style="width:120px" />
                <el-input v-model="s.nameKm" :placeholder="$t('products.specNameKm')" size="small" style="width:120px" />
                <el-input v-model="s.nameZh" :placeholder="$t('products.specNameZh')" size="small" style="width:120px" />
                <el-button size="small" type="danger" circle @click="f.specs.splice(si,1)">X</el-button>
              </div>
              <div class="spec-values">
                <div v-for="(v, vi) in s.values" :key="vi" class="spec-value-row">
                  <el-input v-model="v.valueEn" :placeholder="$t('products.specValueEn')" size="small" style="width:100px" />
                  <el-input v-model="v.valueKm" :placeholder="$t('products.specValueKm')" size="small" style="width:100px" />
                  <el-input v-model="v.valueZh" :placeholder="$t('products.specValueZh')" size="small" style="width:100px" />
                  <el-input-number v-model="v.priceUsd" :min="0" :precision="2" :controls="false" size="small" style="width:90px" :placeholder="$t('products.priceUsd')" />
                  <el-input-number v-model="v.priceKhr" :min="0" :step="100" :controls="false" size="small" style="width:90px" :placeholder="$t('products.priceKhr')" />
                  <el-input-number v-model="v.stock" :min="0" :controls="false" size="small" style="width:80px" :placeholder="$t('products.stock')" />
                  <el-button size="small" type="danger" circle @click="s.values.splice(vi,1)">X</el-button>
                </div>
                <el-button size="small" @click="addValue(s)">+ {{ $t('products.addSpecValue') }}</el-button>
              </div>
            </div>
            <el-button size="small" @click="addSpec" :disabled="f.specs.length >= 6">+ {{ $t('products.addSpec') }}</el-button>
          </div>
        </el-form-item>
        <el-form-item style="margin-top:20px" v-if="!isMobile">
          <el-button type="primary" @click="save" :loading="saving">{{ $t('common.save') }}</el-button>
          <el-button @click="$router.back()">{{ $t('common.cancel') }}</el-button>
        </el-form-item>
      </el-form>

      <div v-if="isMobile" class="mobile-actions bottom-fixed">
        <el-button @click="$router.back()">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="save" :loading="saving">{{ $t('common.save') }}</el-button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted } from 'vue'; import { useRouter, useRoute } from 'vue-router'; import { useBreakpoint } from '@/composables/useBreakpoint'; import { getProductById, createProduct, updateProduct, getTags } from '@/api'; import ImageUploader from '@/components/common/ImageUploader.vue';
const router = useRouter(); const route = useRoute(); const { isMobile } = useBreakpoint(); const isEdit = !!route.params.id; const saving = ref(false); const img = ref(''); const allTags = ref([]);
const f = reactive({ nameKm:'', nameEn:'', nameZh:'', priceUsd:0, priceKhr:0, stock:0, alertThreshold:null, category:'', images:[], specs:[], tags:[], descriptionKm:'', descriptionEn:'', descriptionZh:'' });
function addImg() { if (img.value) { f.images.push({ url: img.value }); img.value = ''; } }
function onUploadImage(url) { if (url) f.images.push({ url }); }
function selectTag(tag) {
  if (f.tags.length >= 6) return;
  const exists = f.tags.some((t) => t.textKm === tag.textKm && t.textEn === tag.textEn && t.textZh === tag.textZh);
  if (exists) return;
  f.tags.push({ textKm: tag.textKm, textEn: tag.textEn || '', textZh: tag.textZh || '', color: tag.color, bg: tag.bg });
}
function addSpec() {
  f.specs.push({ nameEn: '', nameKm: '', nameZh: '', values: [] });
}
function addValue(spec) {
  spec.values.push({ valueEn: '', valueKm: '', valueZh: '', priceUsd: null, priceKhr: null, stock: null });
}
async function save() {
  saving.value = true;
  const payload = {
    name_km: f.nameKm,
    name_en: f.nameEn,
    name_zh: f.nameZh,
    price_usd: f.priceUsd,
    price_khr: f.priceKhr,
    stock: f.stock,
    alert_threshold: f.alertThreshold,
    category: f.category,
    images: f.images,
    specs: f.specs,
    tags: f.tags,
    status: f.status,
    description_km: f.descriptionKm,
    description_en: f.descriptionEn,
    description_zh: f.descriptionZh,
  };
  try {
    if (isEdit) {
      await updateProduct(route.params.id, payload);
    } else {
      await createProduct(payload);
    }
    router.push('/products');
  } finally {
    saving.value = false;
  }
}
onMounted(async () => {
  if (isEdit) { const r = await getProductById(route.params.id); if(r.data) Object.assign(f, r.data); }
  const tagRes = await getTags({ page: 1, limit: 100 });
  allTags.value = Array.isArray(tagRes.data) ? tagRes.data : [];
});
</script>
<style scoped>.page { min-height: 100vh; background: #f5f5f5; }  .tag-editor { display: flex; flex-direction: column; gap: 6px; } .tag-item { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; } .tag-library { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; } .tag-label { font-size: 13px; color: var(--text-secondary, #666); } .library-tag { cursor: pointer; user-select: none; } .spec-editor { display: flex; flex-direction: column; gap: 12px; } .spec-group { border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; background: #fafafa; } .spec-header { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; } .spec-values { display: flex; flex-direction: column; gap: 8px; } .spec-value-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; } .img-tag { width: 24px; height: 24px; object-fit: cover; border-radius: 4px; vertical-align: middle; margin-right: 4px; }

.mobile-actions { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2000; background: #fff; border-top: 1px solid #eee; padding: 12px 16px; display: flex; justify-content: flex-end; gap: 12px; box-shadow: 0 -2px 8px rgba(0,0,0,0.05); }

@media (max-width: 767px) {
  .product-form { padding-bottom: 80px; }
}</style>
