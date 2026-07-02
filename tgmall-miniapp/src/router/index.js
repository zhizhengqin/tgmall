// Vue Router 配置 — 路由懒加载
import { createRouter, createWebHistory } from 'vue-router';

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
    meta: { title: 'citySelect' },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/SearchPage.vue'),
    meta: { title: 'search' },
  },
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('@/views/ProductDetail.vue'),
    meta: { title: 'product' },
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
    meta: { title: 'checkout', requiresAuth: true },
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
    meta: { title: 'order' },
  },
  {
    path: '/payment',
    name: 'Payment',
    component: () => import('@/views/PaymentPage.vue'),
    meta: { title: 'payment', requiresAuth: true },
  },
  {
    path: '/payment/result',
    name: 'PaymentResult',
    component: () => import('@/views/PaymentResult.vue'),
    meta: { title: 'paymentResult' },
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
    meta: { title: 'coupons' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
