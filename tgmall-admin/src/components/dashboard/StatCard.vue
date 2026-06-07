<template>
  <el-card shadow="hover" class="stat-card">
    <div class="stat-title">{{ title }}</div>
    <div class="stat-value" :style="{ color }">{{ value }}</div>
  </el-card>
</template>
<script setup>defineProps({ title: String, value: String, color: { type: String, default: '#333' } });</script>
<style scoped>
.stat-card { text-align: center; }
.stat-title { font-size: 13px; color: #8b8b9e; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 800; }
</style>
