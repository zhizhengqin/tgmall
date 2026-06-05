<template>
  <div class="topbar"><span class="title">ផ្ទាំងគ្រប់គ្រង</span>
    <div class="actions"><el-button @click="logout" size="small" type="danger" plain>ចាកចេញ</el-button></div>
  </div>
</template>
<script setup>
const logout = () => { localStorage.removeItem('admin_token'); location.href = '/login'; };
</script>
<style scoped>
.topbar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: #fff; border-bottom: 1px solid #e8e8e8; margin-left: 220px; }
.actions { display: flex; gap: 10px; align-items: center; }
.title { font-weight: 600; }
</style>
