<template>
  <div class="topbar" :class="{ 'is-mobile': isMobile }">
    <button
      v-if="isMobile"
      class="menu-btn"
      data-testid="mobile-menu-btn"
      @click="$emit('menu')"
      aria-label="menu"
    >
      <span class="hamburger" />
    </button>
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
      <el-button v-if="!isMobile" @click="logout" size="small" type="danger" plain>{{ $t('nav.logout') }}</el-button>
      <button v-else class="logout-btn" @click="logout">{{ $t('nav.logout') }}</button>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { useBreakpoint } from '@/composables/useBreakpoint';

defineEmits(['menu']);

const { isMobile } = useBreakpoint();
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
.topbar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #fff; border-bottom: 1px solid #e8e8e8; position: sticky; top: 0; z-index: 50; }
.actions { display: flex; gap: 12px; align-items: center; }
.title { font-weight: 600; }
.lang-switcher { display: flex; gap: 4px; }
.lang-btn { font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px; background: #f5f5f5; border: 1px solid #ddd; color: #666; cursor: pointer; transition: all 0.2s; min-width: 32px; }
.lang-btn.active { background: #c4932a; color: #fff; border-color: #c4932a; }
.menu-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; cursor: pointer; padding: 0; margin-left: -12px; }
.hamburger { display: block; width: 20px; height: 2px; background: #333; position: relative; }
.hamburger::before, .hamburger::after { content: ''; position: absolute; left: 0; width: 100%; height: 2px; background: #333; }
.hamburger::before { top: -6px; }
.hamburger::after { top: 6px; }
.logout-btn { font-size: 13px; color: #f56c6c; background: transparent; border: none; padding: 8px; cursor: pointer; }

.is-mobile { padding: 0 12px; }
.is-mobile .title { flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 8px; }
.is-mobile .lang-btn { padding: 4px 6px; min-width: 28px; font-size: 11px; }
</style>
