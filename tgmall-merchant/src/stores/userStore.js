import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('merchantUser', () => {
  const token = ref(localStorage.getItem('merchant_token') || null);
  const merchantName = ref(localStorage.getItem('merchant_name') || '');

  function setAuth(t, name) {
    token.value = t;
    merchantName.value = name;
    localStorage.setItem('merchant_token', t);
    localStorage.setItem('merchant_name', name);
  }

  function clearAuth() {
    token.value = null;
    merchantName.value = '';
    localStorage.removeItem('merchant_token');
    localStorage.removeItem('merchant_name');
  }

  return { token, merchantName, setAuth, clearAuth };
});
