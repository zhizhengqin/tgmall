import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import BottomNav from '@/components/common/BottomNav.vue';

vi.mock('@/stores/cartStore', () => ({
  useCartStore: () => ({ totalItems: 0 }),
}));

function setScrollY(value) {
  Object.defineProperty(window, 'scrollY', {
    value,
    writable: true,
    configurable: true,
  });
}

function mountBottomNav() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });

  return mount(BottomNav, {
    global: {
      mocks: {
        $t: (key) => key,
      },
      stubs: {
        'router-link': {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
      },
      plugins: [router],
    },
    attachTo: document.body,
  });
}

describe('BottomNav', () => {
  let wrapper;

  beforeEach(() => {});

  afterEach(() => {
    wrapper?.unmount();
    window.scrollY = 0;
  });

  it('renders five navigation items', () => {
    wrapper = mountBottomNav();
    const items = wrapper.findAll('.nav-item');
    expect(items.length).toBe(5);
    expect(wrapper.text()).toContain('nav.home');
    expect(wrapper.text()).toContain('nav.cart');
    expect(wrapper.text()).toContain('nav.profile');
  });

  it('hides when scrolling down and shows when scrolling up', async () => {
    wrapper = mountBottomNav();

    setScrollY(100);
    window.dispatchEvent(new Event('scroll'));
    await flushPromises();
    expect(wrapper.find('.bottom-nav').classes()).toContain('is-hidden');

    setScrollY(50);
    window.dispatchEvent(new Event('scroll'));
    await flushPromises();
    expect(wrapper.find('.bottom-nav').classes()).not.toContain('is-hidden');
  });

  it('stays visible at the top of the page', async () => {
    wrapper = mountBottomNav();

    setScrollY(0);
    window.dispatchEvent(new Event('scroll'));
    await flushPromises();
    expect(wrapper.find('.bottom-nav').classes()).not.toContain('is-hidden');
  });

  it('resets to visible after route change', async () => {
    wrapper = mountBottomNav();

    setScrollY(200);
    window.dispatchEvent(new Event('scroll'));
    await flushPromises();
    expect(wrapper.find('.bottom-nav').classes()).toContain('is-hidden');

    const router = wrapper.vm.$router;
    await router.push('/?category=fashion');
    await flushPromises();
    expect(wrapper.find('.bottom-nav').classes()).not.toContain('is-hidden');
  });
});
