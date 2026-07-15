import { describe, it, expect } from 'vitest';
import { imageUrl, safeImageUrl } from '../../src/utils/imageUrl.js';

describe('imageUrl', () => {
  it('returns empty string for falsy values', () => {
    expect(imageUrl(null)).toBe('');
    expect(imageUrl(undefined)).toBe('');
    expect(imageUrl('')).toBe('');
  });

  it('returns string as-is', () => {
    expect(imageUrl('/products/1.svg')).toBe('/products/1.svg');
  });

  it('prefers thumb_url over url', () => {
    expect(imageUrl({ url: '/a.png', thumb_url: '/a-thumb.png' })).toBe('/a-thumb.png');
  });

  it('falls back to url when thumb_url is missing', () => {
    expect(imageUrl({ url: '/a.png' })).toBe('/a.png');
  });

  it('returns empty string when object has no usable url', () => {
    expect(imageUrl({})).toBe('');
    expect(imageUrl({ sort_order: 1 })).toBe('');
  });
});

describe('safeImageUrl', () => {
  it('allows http/https and relative paths', () => {
    expect(safeImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(safeImageUrl('/a.png')).toBe('/a.png');
  });

  it('allows data:image/* URLs', () => {
    expect(safeImageUrl('data:image/svg+xml;base64,abc')).toBe('data:image/svg+xml;base64,abc');
  });

  it('blocks javascript: and data:text/html protocols', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBe('');
    expect(safeImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('falls back to empty for object inputs when resolved url is unsafe', () => {
    expect(safeImageUrl({ url: 'javascript:alert(1)' })).toBe('');
  });
});
