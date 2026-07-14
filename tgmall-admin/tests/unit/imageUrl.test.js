import { describe, it, expect } from 'vitest';
import { safeImageUrl } from '@/utils/imageUrl';

describe('safeImageUrl', () => {
  it('returns empty for falsy values', () => {
    expect(safeImageUrl(null)).toBe('');
    expect(safeImageUrl(undefined)).toBe('');
    expect(safeImageUrl('')).toBe('');
    expect(safeImageUrl({})).toBe('');
  });

  it('allows http/https URLs', () => {
    expect(safeImageUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
    expect(safeImageUrl('http://example.com/img.jpg')).toBe('http://example.com/img.jpg');
    expect(safeImageUrl({ url: 'https://example.com/img.jpg' })).toBe('https://example.com/img.jpg');
    expect(safeImageUrl({ thumb_url: 'https://example.com/thumb.jpg' })).toBe('https://example.com/thumb.jpg');
  });

  it('allows relative paths', () => {
    expect(safeImageUrl('/uploads/test.jpg')).toBe('/uploads/test.jpg');
    expect(safeImageUrl({ url: '/uploads/test.jpg' })).toBe('/uploads/test.jpg');
  });

  it('allows data:image URLs', () => {
    expect(safeImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(safeImageUrl('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc');
  });

  it('blocks javascript: and other unsafe schemes', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBe('');
    expect(safeImageUrl('vbscript:msgbox(1)')).toBe('');
    expect(safeImageUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(safeImageUrl({ url: 'javascript:alert(1)' })).toBe('');
  });
});
