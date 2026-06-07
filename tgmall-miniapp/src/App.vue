// 根组件
<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
import { onMounted } from 'vue';
import { useLanguageStore } from '@/stores/languageStore';
import { useUserStore } from '@/stores/userStore';
import { telegramLogin } from '@/api/auth';

const languageStore = useLanguageStore();
const userStore = useUserStore();

onMounted(async () => {
  // 如果已有 token，跳过登录
  if (userStore.token) return;

  const tg = window.Telegram?.WebApp;
  if (!tg || !tg.initData) {
    // 浏览器开发模式：尝试用本地存储的 token
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      userStore.token = savedToken;
    }
    console.warn('非 Telegram Mini App 环境');
    return;
  }

  try {
    tg.ready();
    tg.expand();
    const res = await telegramLogin(tg.initData);
    // API 响应: { success: true, data: { token, user } }
    const payload = res?.data || res;
    if (payload?.token) {
      userStore.setAuth(payload.token, payload.user || {});
      console.log('✅ 自动登录成功');
    }
  } catch (err) {
    console.error('Telegram 登录失败:', err);
  }
});
</script>

<style>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
