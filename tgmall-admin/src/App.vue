<template>
  <el-config-provider :z-index="3000" :message="{ max: 3, grouping: true }">
    <LayoutWrapper>
      <router-view />
    </LayoutWrapper>
  </el-config-provider>
</template>

<script setup>
import { ElConfigProvider } from 'element-plus';
import LayoutWrapper from '@/components/layout/LayoutWrapper.vue';
</script>
