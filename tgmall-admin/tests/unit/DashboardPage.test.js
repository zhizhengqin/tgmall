import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { defineComponent, nextTick } from 'vue';
import DashboardPage from '@/pages/DashboardPage.vue';

vi.mock('@/api', () => ({
  getAdminDashboard: vi.fn(() => Promise.resolve({
    data: {
      gmvToday: 1234,
      gmvThisMonth: 5678,
      totalUsers: 42,
      totalOrders: 99,
      paymentSuccessRate: 85,
      todayNewSkus: 3,
      recent7DaysTrend: [{ date: '2026-07-01', gmv: 100, newUsers: 2 }],
      categorySales: [{ category: 'A', gmv: 50 }],
      topProducts: [
        { id: 1, nameZh: 'Product 1', priceUsd: 10, salesCount: 5, thumbnail: '' },
        { id: 2, nameZh: 'Product 2', priceUsd: 20, salesCount: 3, thumbnail: '' },
      ],
    },
  })),
}));

vi.mock('vue-echarts', () => ({
  default: defineComponent({ name: 'VChart', template: '<div data-testid="vchart-stub" />' }),
}));

function setWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

async function mountDashboard(width = 1280) {
  setWidth(width);
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
  await router.push('/');
  await router.isReady();

  return mount(DashboardPage, {
    global: {
      mocks: { $t: (key) => key },
      plugins: [router],
      stubs: {},
    },
    attachTo: document.body,
  });
}

describe('DashboardPage', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
    setWidth(1280);
  });

  it('renders charts and stat cards on desktop', async () => {
    wrapper = await mountDashboard(1280);
    await flushPromises();

    expect(wrapper.find('[data-testid="dashboard-charts"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="stat-card"]').length).toBeGreaterThanOrEqual(5);
    expect(wrapper.find('[data-testid="top-products-table"]').exists()).toBe(true);
  });

  it('hides charts and keeps stat cards on mobile', async () => {
    wrapper = await mountDashboard(375);
    await flushPromises();

    expect(wrapper.find('[data-testid="dashboard-charts"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="stat-card"]').length).toBeGreaterThanOrEqual(5);
  });
});
