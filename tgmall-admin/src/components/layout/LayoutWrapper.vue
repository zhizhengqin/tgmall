<template>
  <div class="layout-wrapper" :class="{ mobile: isMobile }">
    <template v-if="isAuthPage">
      <aside
        v-if="!isMobile"
        class="layout-sidebar-desktop"
        data-testid="desktop-sidebar"
      >
        <Sidebar />
      </aside>

      <el-drawer
        v-model="drawerVisible"
        direction="ltr"
        size="260px"
        :with-header="false"
        class="layout-drawer"
      >
        <SidebarMenu @select="drawerVisible = false" />
      </el-drawer>

      <div class="layout-main">
        <TopBar @menu="drawerVisible = true" />
        <main class="layout-content">
          <slot />
        </main>
      </div>
    </template>

    <template v-else>
      <slot />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useBreakpoint } from '@/composables/useBreakpoint';
import Sidebar from './Sidebar.vue';
import SidebarMenu from './SidebarMenu.vue';
import TopBar from './TopBar.vue';

const route = useRoute();
const { isMobile } = useBreakpoint();
const isAuthPage = computed(() => !!route.meta?.requiresAuth);
const drawerVisible = ref(false);

watch(isMobile, (mobile) => {
  if (!mobile) drawerVisible.value = false;
});
</script>

<style scoped>
.layout-wrapper { min-height: 100vh; background: #f5f5f5; }
.layout-sidebar-desktop { position: fixed; left: 0; top: 0; width: 220px; height: 100vh; z-index: 100; }
.layout-main { margin-left: 220px; min-height: 100vh; display: flex; flex-direction: column; }
.layout-content { flex: 1; padding: 20px; }

.layout-wrapper.mobile .layout-main { margin-left: 0; }
.layout-wrapper.mobile .layout-content { padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
</style>
