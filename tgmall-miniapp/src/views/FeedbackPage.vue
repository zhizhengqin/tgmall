<!-- 意见反馈页 -->
<template>
  <div class="page">
    <header class="page-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <h1>{{ $t('feedback.title') }}</h1>
    </header>

    <div class="form">
      <textarea
        v-model="content"
        class="textarea"
        :placeholder="$t('feedback.placeholder')"
        maxlength="500"
        rows="6"
      />
      <p class="char-count" :class="{ over: content.length > 400 }">
        {{ $t('feedback.charLimit', { current: content.length, max: 500 }) }}
      </p>

      <p class="image-label">{{ $t('feedback.imageHint') }}</p>
      <div class="image-row">
        <div v-for="(img, i) in images" :key="i" class="img-preview">
          <img :src="img" alt="preview" />
          <button class="img-remove" @click="images.splice(i, 1)">×</button>
        </div>
        <label v-if="images.length < 3" class="img-add">
          <span>+</span>
          <input type="file" accept="image/*" @change="onImageSelect" hidden />
        </label>
      </div>

      <button
        class="submit-btn"
        :disabled="!canSubmit || submitting"
        @click="handleSubmit"
      >
        {{ submitting ? '...' : $t('feedback.submit') }}
      </button>

      <p v-if="error" class="error-msg">{{ error }}</p>
      <p v-if="success" class="success-msg">{{ $t('feedback.success') }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { submitFeedback } from '@/api/feedback';

const { t } = useI18n();
const router = useRouter();

const content = ref('');
const images = ref([]);
const submitting = ref(false);
const error = ref('');
const success = ref(false);

const canSubmit = computed(() => content.value.trim().length > 0);

function onImageSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  // 简单方案：使用 FileReader 转 base64 预览
  const reader = new FileReader();
  reader.onload = () => {
    images.value.push(reader.result);
    e.target.value = '';
  };
  reader.readAsDataURL(file);
}

async function handleSubmit() {
  error.value = '';
  submitting.value = true;
  try {
    await submitFeedback(content.value.trim(), images.value);
    success.value = true;
    setTimeout(() => router.back(), 1500);
  } catch (e) {
    error.value = e?.response?.data?.error?.message || t('common.error');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: 0 var(--space-lg) 100px; min-height: 100vh; background: var(--bg); }
.page-header { display: flex; align-items: center; gap: 12px; padding: 16px 0; }
.page-header h1 { font-size: 18px; font-weight: 700; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.form { padding: 16px 0; }
.textarea { width: 100%; padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 14px; line-height: 1.6; resize: vertical; font-family: inherit; background: var(--surface); color: var(--fg); }
.char-count { text-align: right; font-size: 12px; color: var(--muted); margin: 4px 0 16px; }
.char-count.over { color: var(--accent-red); }
.image-label { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
.image-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
.img-preview { position: relative; width: 72px; height: 72px; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); }
.img-preview img { width: 100%; height: 100%; object-fit: cover; }
.img-remove { position: absolute; top: 0; right: 0; width: 20px; height: 20px; background: oklch(0 0 0 / 0.6); color: #fff; border: none; font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.img-add { width: 72px; height: 72px; border-radius: var(--radius-sm); border: 2px dashed var(--border); display: flex; align-items: center; justify-content: center; font-size: 24px; color: var(--muted); cursor: pointer; }
.submit-btn { width: 100%; padding: 14px; border-radius: var(--radius-sm); background: var(--accent); color: #fff; font-size: 15px; font-weight: 600; border: none; cursor: pointer; }
.submit-btn:disabled { opacity: 0.4; }
.error-msg { color: var(--accent-red); font-size: 13px; margin-top: 12px; text-align: center; }
.success-msg { color: #16a34a; font-size: 14px; margin-top: 12px; text-align: center; font-weight: 600; }
</style>
