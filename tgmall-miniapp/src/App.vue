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

onMounted(() => {
  // 轮询等待 Telegram WebApp SDK 就绪（最大 5 秒）
  let attempts = 0;
  const maxAttempts = 50; // 50 × 100ms = 5s

  const timer = setInterval(async () => {
    attempts++;
    const tg = window.Telegram?.WebApp;

    if (tg) {
      clearInterval(timer);

      tg.ready();
      tg.expand();

      // 从 SDK 读取用户信息（优先 initDataUnsafe，fallback 解析 initData）
      let u = tg.initDataUnsafe?.user;
      if (!u && tg.initData) {
        try {
          u = JSON.parse(new URLSearchParams(tg.initData).get('user') || 'null');
        } catch { /* ignore */ }
      }

      if (u) {
        userStore.user = {
          telegramId: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          username: u.username,
          languageCode: u.language_code || 'km',
          photoUrl: u.photo_url || null,
        };
      }

      // 异步 API 认证获取 JWT + 持久化用户信息
      if (tg.initData) {
        try {
          const res = await telegramLogin(tg.initData);
          const data = res?.data || res;
          if (data?.token) {
            // 合并 SDK 原始数据（photoUrl）与后端持久化数据（avatarUrl 等）
            const mergedUser = { ...userStore.user, ...(data.user || {}) };
            userStore.setAuth(data.token, mergedUser);
          }
        } catch {
          // 静默失败：基础信息已从 SDK 获取，仍可展示
        }
      }

      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(timer);
      // 超时：非 Telegram 环境或 SDK 注入异常
    }
  }, 100);
});
</script>

<style>
.fade-enter-active,.fade-leave-active{transition:opacity .15s ease}
.fade-enter-from,.fade-leave-to{opacity:0}
</style>
