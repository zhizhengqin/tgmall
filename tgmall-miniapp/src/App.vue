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

  // 获取用户信息：优先 initDataUnsafe，fallback 解析 initData
  const tgUser = tg.initDataUnsafe?.user
    || (tg.initData ? JSON.parse(new URLSearchParams(tg.initData).get('user') || 'null') : null);
  if (tgUser && !userStore.user) {
    userStore.user = {
      telegramId: tgUser.id,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      username: tgUser.username,
      languageCode: tgUser.language_code || 'km',
    };
    console.log('✅ 用户信息已获取:', tgUser.first_name);
  } else if (!tgUser) {
    console.warn('⚠️ 未能获取 Telegram 用户信息，initData:', tg.initData?.substring(0, 100));
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
