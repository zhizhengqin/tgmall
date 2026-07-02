import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ProfilePage from '@/views/ProfilePage.vue';

// ---- shared mock state ----
const mockCustomerService = ref(null);
const mockLoadCustomerService = vi.fn();
const mockLocale = ref('km');
const mockOpenTelegramLink = vi.fn();
const mockOpen = vi.fn();

const routerPush = vi.fn();

// ---- mocks ----
vi.mock('@/composables/useShopConfig.js', () => ({
  useShopConfig: () => ({
    customerService: mockCustomerService,
    loadCustomerService: mockLoadCustomerService,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: mockLocale,
    t: (key) => key,
  }),
}));

vi.mock('@/stores/languageStore.js', () => ({
  useLanguageStore: () => ({
    current: 'km',
    setLanguage: vi.fn(),
  }),
}));

vi.mock('@/api/addresses.js', () => ({
  getAddresses: vi.fn(() => Promise.resolve({ data: [] })),
  createAddress: vi.fn(),
  deleteAddress: vi.fn(),
}));

// ---- helpers ----
function mountProfilePage() {
  return mount(ProfilePage, {
    global: {
      stubs: {
        BottomNav: true,
        RouterLink: true,
      },
      mocks: {
        $t: (key) => key,
        $router: { push: routerPush },
      },
    },
    attachTo: document.body,
  });
}

describe('ProfilePage customer service entry', () => {
  let wrapper;
  let originalLocation;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockCustomerService.value = null;
    mockLocale.value = 'km';
    mockLoadCustomerService.mockResolvedValue(undefined);
    mockOpenTelegramLink.mockClear();
    mockOpen.mockClear();

    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('Telegram', {
      WebApp: {
        openTelegramLink: mockOpenTelegramLink,
      },
    });
    vi.stubGlobal('open', mockOpen);

    originalLocation = window.location;
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.unstubAllGlobals();
    if (originalLocation) {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    }
  });

  it('loads customer service info on mount', async () => {
    wrapper = mountProfilePage();
    await flushPromises();

    expect(mockLoadCustomerService).toHaveBeenCalledTimes(1);
  });

  it('renders the customer service menu item', async () => {
    wrapper = mountProfilePage();
    await flushPromises();

    const items = wrapper.findAll('.menu-item');
    const customerServiceItem = items.find((item) => item.text().includes('profile.customerService'));
    expect(customerServiceItem).toBeTruthy();
  });

  it('opens Telegram link via window.Telegram.WebApp.openTelegramLink when username is available', async () => {
    mockCustomerService.value = { telegram_username: 'support_bot', phone: '+85512345678' };

    wrapper = mountProfilePage();
    await flushPromises();

    const items = wrapper.findAll('.menu-item');
    const customerServiceItem = items.find((item) => item.text().includes('profile.customerService'));

    await customerServiceItem.trigger('click');

    expect(mockOpenTelegramLink).toHaveBeenCalledTimes(1);
    expect(mockOpenTelegramLink).toHaveBeenCalledWith('https://t.me/support_bot');
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('falls back to window.open when Telegram WebApp is unavailable and username is available', async () => {
    vi.stubGlobal('Telegram', undefined);

    mockCustomerService.value = { telegram_username: 'support_bot' };

    wrapper = mountProfilePage();
    await flushPromises();

    const items = wrapper.findAll('.menu-item');
    const customerServiceItem = items.find((item) => item.text().includes('profile.customerService'));

    await customerServiceItem.trigger('click');

    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith('https://t.me/support_bot', '_blank');
  });

  it('falls back to phone tel: link when no username is available', async () => {
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    mockCustomerService.value = { telegram_username: null, phone: '+85512345678' };

    wrapper = mountProfilePage();
    await flushPromises();

    const items = wrapper.findAll('.menu-item');
    const customerServiceItem = items.find((item) => item.text().includes('profile.customerService'));

    await customerServiceItem.trigger('click');

    expect(mockOpenTelegramLink).not.toHaveBeenCalled();
    expect(mockOpen).not.toHaveBeenCalled();
    expect(window.location.href).toBe('tel:+85512345678');
  });

  it('silently does nothing when customer service is null', async () => {
    mockCustomerService.value = null;

    wrapper = mountProfilePage();
    await flushPromises();

    const items = wrapper.findAll('.menu-item');
    const customerServiceItem = items.find((item) => item.text().includes('profile.customerService'));

    expect(() => customerServiceItem.trigger('click')).not.toThrow();
    expect(mockOpenTelegramLink).not.toHaveBeenCalled();
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('keeps the page usable when loadCustomerService fails', async () => {
    mockLoadCustomerService.mockRejectedValue(new Error('network error'));

    wrapper = mountProfilePage();
    await flushPromises();

    expect(wrapper.find('.profile-header').exists()).toBe(true);
    expect(wrapper.findAll('.menu-item').length).toBeGreaterThan(0);
    expect(mockLoadCustomerService).toHaveBeenCalledTimes(1);
  });
});
