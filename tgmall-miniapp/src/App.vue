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
  if (userStore.token) return;

  const tg = window.Telegram?.WebApp;
  if (!tg) {
    console.warn('非 Telegram Mini App 环境');
    return;
  }

  tg.ready();
  tg.expand();

  // 先从 Telegram 获取用户基本信息（无需 API）
  const tgUser = tg.initDataUnsafe?.user;
  if (tgUser && !userStore.user) {
    userStore.user = {
      telegramId: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
      languageCode: tgUser.language_code || 'km',
    };
  }

  // 然后通过 API 认证获取 JWT
  if (!tg.initData) return;
  try {
    const res = await telegramLogin(tg.initData);
    const payload = res?.data || res;
    if (payload?.token) {
      userStore.setAuth(payload.token, payload.user || userStore.user);
      console.log('✅ 自动登录成功');
    }
  } catch (err) {
    console.error('Telegram 登录失败:', err);
    // 即使 API 失败，Telegram 基本信息也已展示
  }
});
</script>

<style>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
