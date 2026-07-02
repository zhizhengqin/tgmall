import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/pages/LoginPage.vue') },
  { path: '/dashboard', name: 'Dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { requiresAuth: true } },
  { path: '/users', name: 'Users', component: () => import('@/pages/UsersPage.vue'), meta: { requiresAuth: true } },
  { path: '/settings', name: 'Settings', component: () => import('@/pages/SettingsPage.vue'), meta: { requiresAuth: true } },
  { path: '/settings/banners', name: 'Banners', component: () => import('@/pages/BannersPage.vue'), meta: { requiresAuth: true } },
  { path: '/settings/categories', name: 'Categories', component: () => import('@/pages/CategoriesPage.vue'), meta: { requiresAuth: true } },
  { path: '/settings/cities', name: 'Cities', component: () => import('@/pages/CitiesPage.vue'), meta: { requiresAuth: true } },
  { path: '/settings/delivery-rules', name: 'DeliveryRules', component: () => import('@/pages/DeliveryRulesPage.vue'), meta: { requiresAuth: true } },
  { path: '/settings/customer-services', name: 'CustomerServices', component: () => import('@/pages/CustomerServicesPage.vue'), meta: { requiresAuth: true } },
  { path: '/products', name: 'Products', component: () => import('@/pages/ProductsPage.vue'), meta: { requiresAuth: true } },
  { path: '/products/new', name: 'ProductNew', component: () => import('@/pages/ProductFormPage.vue'), meta: { requiresAuth: true } },
  { path: '/products/:id', name: 'ProductEdit', component: () => import('@/pages/ProductFormPage.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/orders', name: 'Orders', component: () => import('@/pages/OrdersPage.vue'), meta: { requiresAuth: true } },
  { path: '/orders/:id', name: 'OrderDetail', component: () => import('@/pages/OrderDetailPage.vue'), meta: { requiresAuth: true }, props: true },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({ history: createWebHistory('/admin/'), routes });

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('admin_token');
  if (to.meta.requiresAuth && !token) return next('/login');
  next();
});

export default router;
