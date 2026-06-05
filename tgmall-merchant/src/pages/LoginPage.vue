<template>
  <div class="login"><el-card class="card"><h2>TG Mall — ចូលហាង</h2>
    <el-input v-model="token" placeholder="បិទភ្ជាប់ JWT Token" style="margin:16px 0" />
    <el-button type="primary" @click="doLogin" :loading="loading" style="width:100%">ចូល</el-button>
    <p style="font-size:12px;color:#999;margin-top:10px">សូមចូលតាម Mini App ដើម្បីទទួលបាន Token</p>
  </el-card></div>
</template>
<script setup>
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import { useUserStore } from '@/stores/userStore'; import api from '@/api';
const router = useRouter(); const store = useUserStore(); const token = ref(''); const loading = ref(false);
async function doLogin() {
  if (!token.value) return; loading.value = true;
  try {
    await api.get('/merchants/dashboard', { headers: { Authorization: `Bearer ${token.value}` } });
    store.setAuth(token.value, 'TG Mall Shop'); router.push('/dashboard');
  } catch { alert('ការចូលបរាជ័យ'); } finally { loading.value = false; }
}
</script>
<style scoped>
.login { display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; }
.card { width: 400px; }
</style>
