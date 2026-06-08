<!-- 根组件 -->
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
  const tg = window.Telegram?.WebApp;
  if (!tg) {
    console.warn('非 Telegram Mini App 环境');
    return;
  }

  tg.ready();
  tg.expand();

  // 始终从 Telegram SDK 获取用户信息（不管是否有 token）
  const tgUser = tg.initDataUnsafe?.user
    || (tg.initData ? JSON.parse(new URLSearchParams(tg.initData).get('user') || 'null') : null);
  if (tgUser) {
    userStore.user = {
      telegramId: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
      languageCode: tgUser.language_code || 'km',
    };
  }

  // 如果有 token 且用户信息已有，跳过登录 API
  if (userStore.token && userStore.user) return;

  // 通过 API 认证获取 JWT
  if (!tg.initData) return;
  try {
    const res = await telegramLogin(tg.initData);
    const payload = res?.data || res;
    if (payload?.token) {
      userStore.setAuth(payload.token, payload.user || userStore.user);
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
