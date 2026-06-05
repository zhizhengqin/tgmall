import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { requiresAuth: true } },
  { path: '/merchants', name: 'Merchants', component: () => import('@/pages/MerchantsPage.vue'), meta: { requiresAuth: true } },
  { path: '/merchants/:id', name: 'MerchantDetail', component: () => import('@/pages/MerchantDetailPage.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/users', name: 'Users', component: () => import('@/pages/UsersPage.vue'), meta: { requiresAuth: true } },
  { path: '/settings', name: 'Settings', component: () => import('@/pages/SettingsPage.vue'), meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('admin_token');
  if (to.meta.requiresAuth && !token) return next('/login');
  next();
});

export default router;
