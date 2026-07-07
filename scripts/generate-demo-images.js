// 生成自托管演示图片（SVG），替代不可靠的外部图床
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../tgmall-miniapp/public/images');

const CATEGORY_COLORS = {
  fashion: '#c4932a',
  beauty: '#c43a30',
  electronics: '#2563eb',
  home: '#059669',
  food: '#d97706',
};

const products = [
  { id: '20000000-0000-0000-0000-000000000001', nameEn: "Men's Running Sneakers", category: 'fashion', icon: '👟' },
  { id: '20000000-0000-0000-0000-000000000002', nameEn: 'Sports T-Shirt', category: 'fashion', icon: '👕' },
  { id: '20000000-0000-0000-0000-000000000003', nameEn: "Women's Leather Handbag", category: 'fashion', icon: '👜' },
  { id: '20000000-0000-0000-0000-000000000004', nameEn: 'Hydrating Face Serum', category: 'beauty', icon: '💧' },
  { id: '20000000-0000-0000-0000-000000000005', nameEn: 'Matte Lipstick', category: 'beauty', icon: '💄' },
  { id: '20000000-0000-0000-0000-000000000006', nameEn: 'Wireless Bluetooth Earbuds', category: 'electronics', icon: '🎧' },
  { id: '20000000-0000-0000-0000-000000000007', nameEn: 'Fast Wireless Charger', category: 'electronics', icon: '🔌' },
  { id: '20000000-0000-0000-0000-000000000008', nameEn: 'Home Security Camera', category: 'electronics', icon: '📷' },
  { id: '20000000-0000-0000-0000-000000000009', nameEn: 'Double-Layer Lunch Box', category: 'home', icon: '🍱' },
  { id: '20000000-0000-0000-0000-000000000010', nameEn: 'Desktop Organizer Set', category: 'home', icon: '🗂️' },
  { id: '20000000-0000-0000-0000-000000000011', nameEn: 'Cambodian Coffee Beans', category: 'food', icon: '☕' },
  { id: '20000000-0000-0000-0000-000000000012', nameEn: 'Premium Instant Noodles (5 packs)', category: 'food', icon: '🍜' },
];

const banners = [
  { id: 1, titleEn: 'Weekly Special Promotion', gradient: ['#c4932a', '#c43a30'], icon: '🎁' },
  { id: 2, titleEn: 'Up to 50% OFF', gradient: ['#c43a30', '#7c2d12'], icon: '🔥' },
  { id: 3, titleEn: 'Free Delivery in Phnom Penh', gradient: ['#2563eb', '#059669'], icon: '🚚' },
];

function escapeXml(str) {
  return str.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

function productSvg(p) {
  const bg = CATEGORY_COLORS[p.category] || '#7a7670';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="${bg}"/>
  <circle cx="300" cy="220" r="120" fill="rgba(255,255,255,0.15)"/>
  <text x="300" y="260" font-size="140" text-anchor="middle" dominant-baseline="middle">${p.icon}</text>
  <text x="300" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="600" fill="#ffffff" text-anchor="middle">${escapeXml(p.nameEn)}</text>
  <text x="300" y="500" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="rgba(255,255,255,0.8)" text-anchor="middle">TG Mall Demo</text>
</svg>`;
}

function bannerSvg(b) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${b.gradient[0]}"/>
      <stop offset="100%" stop-color="${b.gradient[1]}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="400" fill="url(#g)"/>
  <circle cx="700" cy="100" r="160" fill="rgba(255,255,255,0.10)"/>
  <circle cx="100" cy="320" r="120" fill="rgba(255,255,255,0.08)"/>
  <text x="80" y="160" font-size="120">${b.icon}</text>
  <text x="80" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="700" fill="#ffffff">${escapeXml(b.titleEn)}</text>
  <text x="80" y="320" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)">TG Mall Cambodia</text>
</svg>`;
}

mkdirSync(`${OUT_DIR}/products`, { recursive: true });
mkdirSync(`${OUT_DIR}/banners`, { recursive: true });

for (const p of products) {
  const slug = p.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const path = `${OUT_DIR}/products/${slug}.svg`;
  writeFileSync(path, productSvg(p));
  console.log(`✅ ${path}`);
}

for (const b of banners) {
  const path = `${OUT_DIR}/banners/banner-${b.id}.svg`;
  writeFileSync(path, bannerSvg(b));
  console.log(`✅ ${path}`);
}

console.log('\n🖼️  演示图片生成完成');
console.log('   产品图：public/images/products/{slug}.svg');
console.log('   Banner：public/images/banners/banner-{n}.svg');
