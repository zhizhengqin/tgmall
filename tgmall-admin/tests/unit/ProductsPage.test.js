import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import ProductsPage from '@/pages/ProductsPage.vue';

vi.mock('@/api', () => ({
  getProducts: vi.fn(() => Promise.resolve({
    data: [
      { id: 'p1', nameKm: 'ទំនិញA', nameEn: 'Product A', nameZh: '商品A', priceUsd: 4.5, stock: 100, status: 'active' },
      { id: 'p2', nameKm: 'ទំនិញB', nameEn: 'Product B', nameZh: '', priceUsd: 11, stock: 50, status: 'active' },
      { id: 'p3', nameKm: 'ទំនិញC', nameEn: '', nameZh: '商品C', priceUsd: 14, stock: 30, status: 'active' },
      { id: 'p4', nameKm: 'ទំនិញD', nameEn: '', nameZh: '', priceUsd: 9.5, stock: 20, status: 'active' },
    ],
    meta: { total: 4 },
  })),
  toggleProduct: vi.fn(),
}));

async function mountPage() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
  await router.push('/');
  await router.isReady();
  return mount(ProductsPage, {
    global: {
      mocks: { $t: (key) => key },
      plugins: [router],
    },
    attachTo: document.body,
  });
}

describe('ProductsPage', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
  });

  it('renders trilingual product names', async () => {
    wrapper = await mountPage();
    await flushPromises();

    const rows = wrapper.findAll('.el-table__row');
    expect(rows.length).toBe(4);

    const first = rows[0].find('[data-testid="product-name"]');
    expect(first.text()).toContain('ទំនិញA');
    expect(first.text()).toContain('Product A');
    expect(first.text()).toContain('商品A');
  });

  it('hides missing secondary names cleanly', async () => {
    wrapper = await mountPage();
    await flushPromises();

    const rows = wrapper.findAll('.el-table__row');
    expect(rows[1].find('[data-testid="product-name"]').text()).toContain('Product B');
    expect(rows[1].find('[data-testid="product-name"]').text()).not.toContain('·');

    expect(rows[2].find('[data-testid="product-name"]').text()).toContain('商品C');
    expect(rows[2].find('[data-testid="product-name"]').text()).not.toContain('·');

    expect(rows[3].find('[data-testid="product-name"]').text()).toBe('ទំនិញD');
  });
});
