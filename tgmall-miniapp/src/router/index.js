// Vue Router 配置 — 路由懒加载
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/userStore.js';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
    meta: { title: 'home' },
  },
  {
    path: '/category',
    name: 'Category',
    component: () => import('@/views/CategoryPage.vue'),
    meta: { title: 'categories' },
  },
  {
    path: '/cities',
    name: 'CitySelect',
    component: () => import('@/views/CitySelectPage.vue'),
    meta: { title: 'citySelect', showBackButton: true },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/SearchPage.vue'),
    meta: { title: 'search', showBackButton: true },
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('@/views/ProductDetail.vue'),
    meta: { title: 'product', showBackButton: true },
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('@/views/CartPage.vue'),
    meta: { title: 'cart' },
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: () => import('@/views/CheckoutPage.vue'),
    meta: { title: 'checkout', requiresAuth: true, showBackButton: true },
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/views/OrderList.vue'),
    meta: { title: 'orders', requiresAuth: true },
  },
  {
    path: '/orders/:id',
    name: 'OrderDetail',
    component: () => import('@/views/OrderDetail.vue'),
    meta: { title: 'order', showBackButton: true },
  },
  {
    path: '/payment',
    name: 'Payment',
    component: () => import('@/views/PaymentPage.vue'),
    meta: { title: 'payment', requiresAuth: true, showBackButton: true },
  },
  {
    path: '/payment/result',
    name: 'PaymentResult',
    component: () => import('@/views/PaymentResult.vue'),
    meta: { title: 'paymentResult', showBackButton: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfilePage.vue'),
    meta: { title: 'profile' },
  },
  {
    path: '/coupons',
    name: 'Coupons',
    component: () => import('@/views/CouponCenter.vue'),
    meta: { title: 'coupons', showBackButton: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginPage.vue'),
    meta: { title: 'login', showBackButton: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/ResetPasswordPage.vue'),
    meta: { title: 'resetPassword', showBackButton: true },
  },
  {
    path: '/wishlist',
    name: 'Wishlist',
    component: () => import('@/views/WishlistPage.vue'),
    meta: { title: 'wishlist', requiresAuth: true, showBackButton: true },
  },
  {
    path: '/feedback',
    name: 'Feedback',
    component: () => import('@/views/FeedbackPage.vue'),
    meta: { title: 'feedback', requiresAuth: true, showBackButton: true },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/AboutPage.vue'),
    meta: { title: 'about', showBackButton: true },
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/views/PrivacyPage.vue'),
    meta: { title: 'privacy', showBackButton: true },
  },
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/views/TermsPage.vue'),
    meta: { title: 'terms', showBackButton: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }
  next();
});

export default router;
