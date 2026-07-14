import { describe, it, expect } from 'vitest';
import { t } from '@/utils/i18n';

function withLang(lang) {
  window.localStorage = {
    getItem: (key) => (key === 'admin_lang' ? lang : null),
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  };
}

describe('i18n helper', () => {
  it.each([
    ['km', 'common.noData', 'មិនទាន់មានទិន្នន័យ'],
    ['en', 'common.noData', 'No data yet'],
    ['zh', 'common.noData', '暂无数据'],
  ])('returns %s translation for %s', (lang, key, expected) => {
    withLang(lang);
    expect(t(key)).toBe(expected);
  });

  it('falls back to the key when translation is missing', () => {
    withLang('en');
    expect(t('common.thisKeyDoesNotExist')).toBe('common.thisKeyDoesNotExist');
  });
});
