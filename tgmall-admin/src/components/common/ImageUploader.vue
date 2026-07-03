<template>
  <div class="image-uploader">
    <input ref="fileInput" type="file" accept="image/*" class="file-input" @change="onFileChange" />
    <el-button size="small" :loading="uploading" @click="fileInput?.click()">{{ uploading ? $t('common.loading') : $t('products.uploadImage') }}</el-button>
    <span v-if="modelValue" class="preview">
      <img :src="modelValue" class="thumb" />
      <el-button size="small" type="danger" circle @click="clear">X</el-button>
    </span>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { uploadImage } from '@/api';

const props = defineProps({ modelValue: { type: String, default: '' } });
const emit = defineEmits(['update:modelValue']);

const fileInput = ref(null);
const uploading = ref(false);

function clear() {
  emit('update:modelValue', '');
}

async function onFileChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    uploading.value = true;
    const base64 = await compressImage(file, 1200, 0.85);
    const res = await uploadImage({ image: base64 });
    emit('update:modelValue', res.data.url);
  } catch (err) {
    console.error('上传失败', err);
    alert(err?.response?.data?.error?.message || '上传失败');
  } finally {
    uploading.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = evt.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
</script>

<style scoped>
.image-uploader { display: flex; align-items: center; gap: 12px; }
.file-input { display: none; }
.preview { display: flex; align-items: center; gap: 8px; }
.thumb { width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid #eee; }
</style>
