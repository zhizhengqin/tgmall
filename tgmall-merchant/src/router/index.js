import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { requiresAuth: true } },
  { path: '/products', name: 'Products', component: () => import('@/pages/ProductsPage.vue'), meta: { requiresAuth: true } },
  { path: '/products/new', name: 'ProductNew', component: () => import('@/pages/ProductFormPage.vue'), meta: { requiresAuth: true } },
  { path: '/products/:id', name: 'ProductEdit', component: () => import('@/pages/ProductFormPage.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/orders', name: 'Orders', component: () => import('@/pages/OrdersPage.vue'), meta: { requiresAuth: true } },
  { path: '/orders/:id', name: 'OrderDetail', component: () => import('@/pages/OrderDetailPage.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({ history: createWebHistory('/merchant/'), routes });

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('merchant_token');
  if (to.meta.requiresAuth && !token) return next('/login');
  next();
});

export default router;
