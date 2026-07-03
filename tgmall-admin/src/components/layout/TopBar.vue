<template>
  <div class="topbar">
    <span class="title">{{ $t('app.name') }}</span>
    <div class="actions">
      <div class="lang-switcher">
        <button
          v-for="l in langList"
          :key="l.code"
          class="lang-btn"
          :class="{ active: locale === l.code }"
          @click="switchLang(l.code)"
        >
          {{ l.label }}
        </button>
      </div>
      <el-button @click="logout" size="small" type="danger" plain>{{ $t('nav.logout') }}</el-button>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';

const locale = ref(localStorage.getItem('admin_lang') || 'km');
const langList = [
  { code: 'zh', label: '中' },
  { code: 'km', label: 'ខ' },
  { code: 'en', label: 'EN' },
];

function switchLang(code) {
  locale.value = code;
  localStorage.setItem('admin_lang', code);
  location.reload();
}

function logout() {
  sessionStorage.removeItem('admin_token');
  location.href = '/admin/';
}
</script>
<style scoped>
.topbar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #fff; border-bottom: 1px solid #e8e8e8; margin-left: 220px; }
.actions { display: flex; gap: 12px; align-items: center; }
.title { font-weight: 600; }
.lang-switcher { display: flex; gap: 4px; }
.lang-btn { font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px; background: #f5f5f5; border: 1px solid #ddd; color: #666; cursor: pointer; transition: all 0.2s; min-width: 32px; }
.lang-btn.active { background: #c4932a; color: #fff; border-color: #c4932a; }
</style>
