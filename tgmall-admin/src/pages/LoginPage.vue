<template>
  <div class="login"><el-card class="card"><h2>TG Mall — ចូលប្រព័ន្ធ</h2>
    <el-input v-model="token" placeholder="បិទភ្ជាប់ Admin Token" style="margin:16px 0" type="password" />
    <el-button type="primary" @click="doLogin" :loading="loading" style="width:100%">ចូល</el-button>
  </el-card></div>
</template>
<script setup>
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import { useUserStore } from '@/stores/userStore'; import api from '@/api';
const router = useRouter(); const store = useUserStore(); const token = ref(''); const loading = ref(false);
async function doLogin() { if (!token.value) return; loading.value = true; try { await api.get('/admin/dashboard', { headers: { Authorization: `Bearer ${token.value}` } }); store.setAuth(token.value); router.push('/dashboard'); } catch { alert('សិទ្ធិមិនត្រឹមត្រូវ'); } finally { loading.value = false; } }
</script>
<style scoped>.login { display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; } .card { width: 400px; }</style>
