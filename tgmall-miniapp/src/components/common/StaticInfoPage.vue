<!-- 通用静态信息页 — 关于/隐私/条款 -->
<template>
  <div class="page">
    <header class="page-header">
      <button class="back-btn" @click="$router.back()">←</button>
      <h1>{{ title }}</h1>
    </header>

    <div class="content">
      <p class="body-text">{{ body }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  titleKey: { type: String, required: true },
  bodyKey: { type: String, required: true },
});

const { t } = useI18n();
const title = computed(() => t(props.titleKey));
const body = computed(() => t(props.bodyKey));
</script>

<style scoped>
.page { max-width: var(--max-width); margin: 0 auto; padding: 0 var(--space-lg) 100px; min-height: 100vh; background: var(--bg); }
.page-header { display: flex; align-items: center; gap: 12px; padding: 16px 0; }
.page-header h1 { font-size: 18px; font-weight: 700; }
.back-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.content { padding: 16px 0; }
.body-text { font-size: 14px; line-height: 1.8; color: var(--fg); white-space: pre-line; }
</style>
