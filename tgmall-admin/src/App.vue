<template>
  <el-config-provider :z-index="3000" :message="{ max: 3, grouping: true }" :locale="elLocale">
    <LayoutWrapper>
      <router-view />
    </LayoutWrapper>
  </el-config-provider>
</template>

<script setup>
import { ref, watch, inject } from 'vue';
import { ElConfigProvider } from 'element-plus';
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue';
import elKm from 'element-plus/dist/locale/km.mjs';
import elEn from 'element-plus/dist/locale/en.mjs';
import elZhCn from 'element-plus/dist/locale/zh-cn.mjs';

const injected = inject('i18n', null);
const locale = injected?.locale || { current: 'km' };
const localeMap = { km: elKm, en: elEn, zh: elZhCn };
const elLocale = ref(localeMap[locale.current] || elKm);

watch(() => locale.current, (lang) => {
  elLocale.value = localeMap[lang] || elKm;
});
</script>
