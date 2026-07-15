import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CouponsPage from '@/pages/CouponsPage.vue';
import { getMock } from '@/api';

vi.mock('@/api', () => {
  const getMock = vi.fn(() =>
    Promise.resolve({
      data: [
        { id: 'c1', titleKm: 'ចុះ 10%', type: 'percent', value: 10, minSpend: 0, totalQty: 100, usedCount: 5, status: 'active', startDate: '2026-07-01', endDate: '2026-07-31' },
        { id: 'c2', titleKm: 'ចុះ $2', type: 'fixed', value: 2, minSpend: 10, totalQty: 50, usedCount: 0, status: 'inactive', startDate: '2026-07-01', endDate: '2026-07-31' },
      ],
      meta: { total: 2 },
    })
  );
  return {
    default: {
      get: getMock,
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
    },
    getMock,
  };
});

async function mountPage() {
  return mount(CouponsPage, {
    global: {
      mocks: { $t: (key) => key },
    },
    attachTo: document.body,
  });
}

describe('CouponsPage', () => {
  let wrapper;

  afterEach(() => {
    wrapper?.unmount();
    vi.clearAllMocks();
  });

  it('renders coupon list without i18n plugin crash', async () => {
    wrapper = await mountPage();
    await flushPromises();

    expect(getMock).toHaveBeenCalledWith('/admin/coupons', { params: { page: 1, limit: 20 } });
    const rows = wrapper.findAll('.el-table__row');
    expect(rows.length).toBe(2);
    expect(wrapper.text()).toContain('ចុះ 10%');
    expect(wrapper.text()).toContain('ចុះ $2');
  });

  it('renders localized status tags instead of raw status', async () => {
    wrapper = await mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('coupons.active');
    expect(wrapper.text()).toContain('coupons.inactive');
    expect(wrapper.text()).not.toContain('activeactive');
  });
});
