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
  if (!tg) return;

  tg.ready();
  tg.expand();

  // 直接设置用户信息
  if (tg.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    userStore.user = {
      telegramId: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      username: u.username,
      languageCode: u.language_code || 'km',
    };
  }

  // 异步 API 认证
  if (tg.initData) {
    try {
      const res = await telegramLogin(tg.initData);
      const data = res?.data || res;
      if (data?.token) {
        userStore.setAuth(data.token, data.user || userStore.user);
      }
    } catch (e) {
      // 静默失败，用户信息已从 SDK 获取
    }
  }
});
</script>

<style>
.fade-enter-active,.fade-leave-active{transition:opacity .15s ease}
.fade-enter-from,.fade-leave-to{opacity:0}
</style>
