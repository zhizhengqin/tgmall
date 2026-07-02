import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCityStore } from '@/stores/cityStore.js';

describe('cityStore', () => {
  let storage = {};

  beforeEach(() => {
    setActivePinia(createPinia());
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => storage[key] ?? null),
      setItem: vi.fn((key, value) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete storage[key];
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes currentCode from localStorage when present', () => {
    storage['tgmall_selected_city'] = 'siem_reap';
    const store = useCityStore();
    expect(store.currentCode).toBe('siem_reap');
  });

  it('falls back to default city when localStorage is empty', () => {
    const store = useCityStore();
    expect(store.currentCode).toBe('phnom_penh');
    expect(localStorage.setItem).toHaveBeenCalledWith('tgmall_selected_city', 'phnom_penh');
  });

  it('computes currentCity from the cities list', () => {
    const store = useCityStore();
    store.setCities([
      { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 },
      { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', sortOrder: 2 },
    ]);
    expect(store.currentCity.code).toBe('phnom_penh');
    expect(store.currentCity.nameEn).toBe('Phnom Penh');
  });

  it('returns a default city object when the list is empty', () => {
    const store = useCityStore();
    expect(store.currentCity.code).toBe('phnom_penh');
    expect(store.currentCity.nameKm).toBe('ភ្នំពេញ');
    expect(store.currentCity.nameEn).toBe('Phnom Penh');
    expect(store.currentCity.nameZh).toBe('金边');
  });

  it('setCity updates currentCode and persists to localStorage', () => {
    const store = useCityStore();
    store.setCities([
      { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 },
      { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', sortOrder: 2 },
    ]);

    store.setCity('siem_reap');
    expect(store.currentCode).toBe('siem_reap');
    expect(localStorage.setItem).toHaveBeenLastCalledWith('tgmall_selected_city', 'siem_reap');
  });

  it('setCity ignores unknown city codes', () => {
    const store = useCityStore();
    store.setCities([
      { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', sortOrder: 1 },
    ]);

    store.setCity('unknown_city');
    expect(store.currentCode).toBe('phnom_penh');
  });

  it('setCity allows the default city even when the list is empty', () => {
    const store = useCityStore();
    store.setCity('phnom_penh');
    expect(store.currentCode).toBe('phnom_penh');
  });

  it('setCities populates the list and keeps current city valid', () => {
    storage['tgmall_selected_city'] = 'siem_reap';
    const store = useCityStore();
    expect(store.currentCode).toBe('siem_reap');

    store.setCities([
      { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', sortOrder: 1 },
    ]);

    expect(store.cities).toHaveLength(1);
    expect(store.currentCity.code).toBe('siem_reap');
  });
});
