// 演示数据 Seeder — 用于客户演示，覆盖完整业务流程
// 特点：幂等、安全，不会删除已有数据，可重复运行
// 运行: cd tgmall-api && npx prisma db push && node prisma/seed-demo.js
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// 辅助函数：生成订单号
function generateOrderNumber(seq) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${dateStr}-${String(seq).padStart(4, '0')}`;
}

// 辅助函数：USD 转 KHR（汇率 4100）
function toKhr(usd) {
  return Math.round(Number(usd) * 4100);
}

async function main() {
  console.log('🌱 开始填充演示数据（幂等模式）...');

  // ================================================================
  // 1. 城市与配送规则
  // ================================================================
  const cities = [
    { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', lat: 11.562, lng: 104.889, sortOrder: 1, status: 'active' },
    { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', lat: 13.363, lng: 103.856, sortOrder: 2, status: 'active' },
    { code: 'sihanoukville', nameKm: 'ក្រុងព្រះសីហនុ', nameEn: 'Sihanoukville', nameZh: '西哈努克', lat: 10.625, lng: 103.523, sortOrder: 3, status: 'active' },
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { code: city.code },
      update: {},
      create: city,
    });
  }

  const deliveryRules = [
    { cityCode: 'phnom_penh', minOrderAmountUsd: 5.00, shippingFeeUsd: 1.00, freeShippingThresholdUsd: 25.00, estimatedDeliveryDays: 1 },
    { cityCode: 'siem_reap', minOrderAmountUsd: 6.00, shippingFeeUsd: 2.00, freeShippingThresholdUsd: 35.00, estimatedDeliveryDays: 2 },
    { cityCode: 'sihanoukville', minOrderAmountUsd: 8.00, shippingFeeUsd: 2.50, freeShippingThresholdUsd: 40.00, estimatedDeliveryDays: 2 },
  ];

  for (const rule of deliveryRules) {
    await prisma.deliveryRule.upsert({
      where: { cityCode: rule.cityCode },
      update: {},
      create: { ...rule, status: 'active' },
    });
  }
  console.log('   ✅ 3 个城市 + 配送规则');

  // ================================================================
  // 2. 客服账号
  // ================================================================
  await prisma.customerService.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nameKm: 'ផ្នែកជំនួយអតិថិជន',
      nameEn: 'Customer Support',
      nameZh: '在线客服',
      telegramUsername: 'xhzmall_support',
      phone: '+85512345678',
      workHours: '8:00 - 20:00',
      isDefault: true,
      sortOrder: 1,
      status: 'active',
    },
  });
  console.log('   ✅ 客服账号');

  // ================================================================
  // 3. 商品分类
  // ================================================================
  const categories = [
    { code: 'fashion', nameKm: 'សំលៀកបំពាក់', nameEn: 'Fashion', nameZh: '时尚', iconUrl: 'https://cdn-icons-png.flaticon.com/128/3081/3081840.png', sortOrder: 1 },
    { code: 'beauty', nameKm: 'គ្រឿងសម្អាង', nameEn: 'Beauty', nameZh: '美妆', iconUrl: 'https://cdn-icons-png.flaticon.com/128/3093/3093911.png', sortOrder: 2 },
    { code: 'electronics', nameKm: 'គ្រឿងអេឡិចត្រូនិច', nameEn: 'Electronics', nameZh: '电子', iconUrl: 'https://cdn-icons-png.flaticon.com/128/3659/3659898.png', sortOrder: 3 },
    { code: 'home', nameKm: 'គ្រឿងសង្ហារិម', nameEn: 'Home', nameZh: '家居', iconUrl: 'https://cdn-icons-png.flaticon.com/128/1946/1946488.png', sortOrder: 4 },
    { code: 'food', nameKm: 'អាហារ', nameEn: 'Food', nameZh: '食品', iconUrl: 'https://cdn-icons-png.flaticon.com/128/2276/2276931.png', sortOrder: 5 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log('   ✅ 5 个商品分类');

  // ================================================================
  // 4. 商品标签（固定 UUID，幂等）
  // ================================================================
  const tagIds = {
    new: '40000000-0000-0000-0000-000000000001',
    hot: '40000000-0000-0000-0000-000000000002',
    sale: '40000000-0000-0000-0000-000000000003',
    bestseller: '40000000-0000-0000-0000-000000000004',
    premium: '40000000-0000-0000-0000-000000000005',
  };
  const tags = [
    { id: tagIds.new, textKm: 'ថ្មី', textEn: 'New', textZh: '新品', color: '#ffffff', bg: 'rgba(196,147,42,0.9)', sortOrder: 1 },
    { id: tagIds.hot, textKm: 'ពេញនិយម', textEn: 'Hot', textZh: '热销', color: '#ffffff', bg: 'rgba(196,58,48,0.9)', sortOrder: 2 },
    { id: tagIds.sale, textKm: 'បញ្ចុះតម្លៃ', textEn: 'Sale', textZh: '特惠', color: '#ffffff', bg: 'rgba(46,125,50,0.9)', sortOrder: 3 },
    { id: tagIds.bestseller, textKm: 'លក់ដាច់', textEn: 'Bestseller', textZh: '爆款', color: '#ffffff', bg: 'rgba(25,118,210,0.9)', sortOrder: 4 },
    { id: tagIds.premium, textKm: 'កម្រិតលើ', textEn: 'Premium', textZh: '精选', color: '#2d2b28', bg: 'rgba(255,215,0,0.25)', sortOrder: 5 },
  ];
  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { id: tag.id },
      update: {},
      create: tag,
    });
  }
  console.log('   ✅ 5 个商品标签');

  // ================================================================
  // 5. Banner 轮播图（仅当没有演示 banner 时创建）
  // ================================================================
  const existingBannerCount = await prisma.banner.count({
    where: { imageUrl: { startsWith: 'https://images.unsplash.com' } },
  });

  if (existingBannerCount === 0) {
    await prisma.banner.createMany({
      data: [
        {
          titleKm: 'ប្រូម៉ូសិនពិសេសសប្តាហ៍នេះ',
          titleEn: 'Weekly Special Promotion',
          titleZh: '本周特价促销',
          imageUrl: '/images/banners/banner-1.svg',
          linkType: 'product',
          linkTarget: '',
          cityCode: null,
          sortOrder: 1,
          status: 'active',
        },
        {
          titleKm: 'បញ្ចុះតម្លៃរហូតដល់ 50%',
          titleEn: 'Up to 50% OFF',
          titleZh: '全场低至 5 折',
          imageUrl: '/images/banners/banner-2.svg',
          linkType: 'url',
          linkTarget: 'https://t.me/xhzmall_bot',
          cityCode: 'phnom_penh',
          sortOrder: 2,
          status: 'active',
        },
        {
          titleKm: 'ដឹកជញ្ជូនឥតគិតថ្លៃនៅភ្នំពេញ',
          titleEn: 'Free Delivery in Phnom Penh',
          titleZh: '金边免费配送',
          imageUrl: '/images/banners/banner-3.svg',
          linkType: 'category',
          linkTarget: 'fashion',
          cityCode: 'phnom_penh',
          sortOrder: 3,
          status: 'active',
        },
      ],
    });
    console.log('   ✅ 3 张 Banner');
  } else {
    console.log('   ⏭️  Banner 已存在，跳过');
  }

  // ================================================================
  // 6. 演示用户
  // ================================================================
  const userIds = {
    sopheap: '10000000-0000-0000-0000-000000000001',
    lihua: '10000000-0000-0000-0000-000000000002',
    sreyneang: '10000000-0000-0000-0000-000000000003',
  };

  const users = [
    {
      id: userIds.sopheap,
      telegramId: 10000001,
      firstName: 'Sopheap',
      lastName: 'Kong',
      username: 'sopheap_k',
      phone: '+85512345001',
      language: 'km',
      cityCode: 'phnom_penh',
      status: 'active',
    },
    {
      id: userIds.lihua,
      telegramId: 10000002,
      firstName: '李华',
      username: 'lihua_cn',
      phone: '+85512345002',
      language: 'zh',
      cityCode: 'phnom_penh',
      status: 'active',
    },
    {
      id: userIds.sreyneang,
      telegramId: 10000003,
      firstName: 'Sreyneang',
      lastName: 'Phan',
      username: 'sreyneang_p',
      phone: '+85512345003',
      language: 'en',
      cityCode: 'siem_reap',
      status: 'active',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { telegramId: user.telegramId },
      update: {},
      create: user,
    });
  }
  console.log('   ✅ 3 个演示用户');

  // ================================================================
  // 7. 收货地址（基于 userId + detail 幂等）
  // ================================================================
  const addresses = [
    {
      id: '50000000-0000-0000-0000-000000000001',
      userId: userIds.sopheap,
      recipientName: 'Sopheap Kong',
      phone: '+85512345001',
      province: 'ភ្នំពេញ',
      district: 'ខណ្ឌបឹងកេងកង',
      cityCode: 'phnom_penh',
      detail: 'ផ្ទះលេខ 123 ផ្លូវ 456 ជិតផ្សារដើមគរ',
      isDefault: true,
    },
    {
      id: '50000000-0000-0000-0000-000000000002',
      userId: userIds.sopheap,
      recipientName: 'Sopheap Kong',
      phone: '+85512345001',
      province: 'សៀមរាប',
      district: 'ក្រុងសៀមរាប',
      cityCode: 'siem_reap',
      detail: 'ផ្ទះលេខ 78 ផ្លូវជាតិលេខ 6',
      isDefault: false,
    },
    {
      id: '50000000-0000-0000-0000-000000000003',
      userId: userIds.lihua,
      recipientName: '李华',
      phone: '+85512345002',
      province: 'ភ្នំពេញ',
      district: 'ខណ្ឌដូនពេញ',
      cityCode: 'phnom_penh',
      detail: 'No. 200, Street 13, near Royal Palace',
      isDefault: true,
    },
    {
      id: '50000000-0000-0000-0000-000000000004',
      userId: userIds.sreyneang,
      recipientName: 'Sreyneang Phan',
      phone: '+85512345003',
      province: 'សៀមរាប',
      district: 'ខណ្ឌសៀមរាប',
      cityCode: 'siem_reap',
      detail: 'No. 55, Pub Street Area',
      isDefault: true,
    },
  ];

  for (const addr of addresses) {
    await prisma.address.upsert({
      where: { id: addr.id },
      update: {},
      create: addr,
    });
  }
  console.log('   ✅ 4 个收货地址');

  // ================================================================
  // 8. 商品数据（固定 UUID，幂等 upsert）
  // ================================================================
  const products = [
    // 时尚
    {
      id: '20000000-0000-0000-0000-000000000001',
      nameKm: 'ស្បែកជើងកីឡាបុរស',
      nameEn: "Men's Running Sneakers",
      nameZh: '男士运动跑鞋',
      descriptionKm: 'ស្បែកជើងកីឡាស្រាល ទន់រីករាយសម្រាប់ហាត់ប្រាណ និងដើរលេងប្រចាំថ្ងៃ',
      descriptionEn: 'Lightweight and comfortable running shoes for daily workouts and casual wear.',
      descriptionZh: '轻便舒适的运动鞋，适合日常锻炼和休闲穿着。',
      priceUsd: 18.50,
      stock: 120,
      alertThreshold: 20,
      category: 'fashion',
      images: [{ url: '/images/products/men-s-running-sneakers.svg', thumb_url: '/images/products/men-s-running-sneakers.svg' }],
      specs: [
        { nameKm: 'ពណ៌', nameEn: 'Color', nameZh: '颜色', values: [
          { valueKm: 'ខ្មៅ', valueEn: 'Black', valueZh: '黑色', priceUsd: 0, stock: 40 },
          { valueKm: 'ស', valueEn: 'White', valueZh: '白色', priceUsd: 0, stock: 50 },
          { valueKm: 'ប្រផេះ', valueEn: 'Gray', valueZh: '灰色', priceUsd: 0, stock: 30 },
        ]},
        { nameKm: 'ទំហំ', nameEn: 'Size', nameZh: '尺码', values: [
          { valueKm: '40', valueEn: '40', valueZh: '40', priceUsd: 0, stock: 0 },
          { valueKm: '41', valueEn: '41', valueZh: '41', priceUsd: 0, stock: 0 },
          { valueKm: '42', valueEn: '42', valueZh: '42', priceUsd: 0, stock: 0 },
        ]},
      ],
      tags: [tags[0], tags[1]],
      salesCount: 45,
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      nameKm: 'អាវយឺតកីឡា',
      nameEn: 'Sports T-Shirt',
      nameZh: '运动速干T恤',
      descriptionKm: 'អាវយឺតធ្វើពីក្រណាត់ស្រូបញើស សម្រាប់ហាត់ប្រាណ',
      descriptionEn: 'Moisture-wicking fabric sports t-shirt.',
      descriptionZh: '速干面料运动T恤，透气吸汗。',
      priceUsd: 8.90,
      stock: 200,
      alertThreshold: 30,
      category: 'fashion',
      images: [{ url: '/images/products/sports-t-shirt.svg', thumb_url: '/images/products/sports-t-shirt.svg' }],
      specs: [
        { nameKm: 'ពណ៌', nameEn: 'Color', nameZh: '颜色', values: [
          { valueKm: 'ខៀវ', valueEn: 'Blue', valueZh: '蓝色', priceUsd: 0, stock: 70 },
          { valueKm: 'ក្រហម', valueEn: 'Red', valueZh: '红色', priceUsd: 0, stock: 80 },
          { valueKm: 'ខ្មៅ', valueEn: 'Black', valueZh: '黑色', priceUsd: 0, stock: 50 },
        ]},
        { nameKm: 'ទំហំ', nameEn: 'Size', nameZh: '尺码', values: [
          { valueKm: 'M', valueEn: 'M', valueZh: 'M', priceUsd: 0, stock: 0 },
          { valueKm: 'L', valueEn: 'L', valueZh: 'L', priceUsd: 0, stock: 0 },
          { valueKm: 'XL', valueEn: 'XL', valueZh: 'XL', priceUsd: 0, stock: 0 },
        ]},
      ],
      tags: [tags[2]],
      salesCount: 128,
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      nameKm: 'កាបូបស្រីវៃឆ្លាត',
      nameEn: "Women's Leather Handbag",
      nameZh: '女士时尚手提包',
      descriptionKm: 'កាបូបស្បែកគុណភាពខ្ពស់ សម្រាប់ធ្វើការ និងចេញដើរលេង',
      descriptionEn: 'Premium leather handbag suitable for work and outings.',
      descriptionZh: '高品质皮质手提包，适合上班和外出。',
      priceUsd: 35.00,
      stock: 60,
      alertThreshold: 10,
      category: 'fashion',
      images: [{ url: '/images/products/women-s-leather-handbag.svg', thumb_url: '/images/products/women-s-leather-handbag.svg' }],
      specs: [
        { nameKm: 'ពណ៌', nameEn: 'Color', nameZh: '颜色', values: [
          { valueKm: 'ត្នោត', valueEn: 'Brown', valueZh: '棕色', priceUsd: 0, stock: 25 },
          { valueKm: 'ខ្មៅ', valueEn: 'Black', valueZh: '黑色', priceUsd: 0, stock: 20 },
          { valueKm: 'ប៊ែច', valueEn: 'Beige', valueZh: '米色', priceUsd: 2.00, stock: 15 },
        ]},
      ],
      tags: [tags[3], tags[4]],
      salesCount: 32,
    },
    // 美妆
    {
      id: '20000000-0000-0000-0000-000000000004',
      nameKm: 'សេរ៉ូមសំណើមស្បែក',
      nameEn: 'Hydrating Face Serum',
      nameZh: '保湿精华液',
      descriptionKm: 'សេរ៉ូមសំណើមជ្រៅ ជួយឲ្យស្បែកទន់រលោង',
      descriptionEn: 'Deep hydrating serum for smooth and glowing skin.',
      descriptionZh: '深层保湿精华，让肌肤水润光滑。',
      priceUsd: 22.00,
      stock: 85,
      alertThreshold: 15,
      category: 'beauty',
      images: [{ url: '/images/products/hydrating-face-serum.svg', thumb_url: '/images/products/hydrating-face-serum.svg' }],
      specs: [
        { nameKm: 'មាឌ', nameEn: 'Volume', nameZh: '容量', values: [
          { valueKm: '30ml', valueEn: '30ml', valueZh: '30ml', priceUsd: 0, stock: 50 },
          { valueKm: '50ml', valueEn: '50ml', valueZh: '50ml', priceUsd: 8.00, stock: 35 },
        ]},
      ],
      tags: [tags[0], tags[4]],
      salesCount: 67,
    },
    {
      id: '20000000-0000-0000-0000-000000000005',
      nameKm: 'ពណ៌បាត់មាត់',
      nameEn: 'Matte Lipstick',
      nameZh: '哑光口红',
      descriptionKm: 'ពណ៌បាត់មាត់ធន្ធាប់ ស្ថិរភាពរហូតដល់ 8 ម៉ោង',
      descriptionEn: 'Long-lasting matte lipstick, up to 8 hours wear.',
      descriptionZh: '持久哑光口红，持妆可达 8 小时。',
      priceUsd: 12.50,
      stock: 150,
      alertThreshold: 25,
      category: 'beauty',
      images: [{ url: '/images/products/matte-lipstick.svg', thumb_url: '/images/products/matte-lipstick.svg' }],
      specs: [
        { nameKm: 'ពណ៌', nameEn: 'Color', nameZh: '色号', values: [
          { valueKm: 'ក្រហមចាស់', valueEn: 'Ruby Red', valueZh: '复古红', priceUsd: 0, stock: 60 },
          { valueKm: 'ផ្កាឈូក', valueEn: 'Rose Pink', valueZh: '玫瑰粉', priceUsd: 0, stock: 50 },
          { valueKm: 'ត្នោត', valueEn: 'Nude', valueZh: '裸色', priceUsd: 0, stock: 40 },
        ]},
      ],
      tags: [tags[1]],
      salesCount: 95,
    },
    // 电子
    {
      id: '20000000-0000-0000-0000-000000000006',
      nameKm: 'កាសប្លូធូស',
      nameEn: 'Wireless Bluetooth Earbuds',
      nameZh: '无线蓝牙耳机',
      descriptionKm: 'កាសឥតខ្សែបច្ចេកវិទ្យា Bluetooth 5.0 សម្លេងច្បាស់',
      descriptionEn: 'Bluetooth 5.0 wireless earbuds with clear sound.',
      descriptionZh: '蓝牙 5.0 无线耳机，音质清晰。',
      priceUsd: 28.00,
      stock: 75,
      alertThreshold: 15,
      category: 'electronics',
      images: [{ url: '/images/products/wireless-bluetooth-earbuds.svg', thumb_url: '/images/products/wireless-bluetooth-earbuds.svg' }],
      specs: [
        { nameKm: 'ពណ៌', nameEn: 'Color', nameZh: '颜色', values: [
          { valueKm: 'ស', valueEn: 'White', valueZh: '白色', priceUsd: 0, stock: 35 },
          { valueKm: 'ខ្មៅ', valueEn: 'Black', valueZh: '黑色', priceUsd: 0, stock: 40 },
        ]},
      ],
      tags: [tags[1], tags[3]],
      salesCount: 156,
    },
    {
      id: '20000000-0000-0000-0000-000000000007',
      nameKm: 'ឆ្នាំងសាកឥតខ្សែ',
      nameEn: 'Fast Wireless Charger',
      nameZh: '快充无线充电器',
      descriptionKm: 'ឆ្នាំងសាកឥតខ្សែលឿន 15W ឆរស័ព្ទ iPhone និង Android',
      descriptionEn: '15W fast wireless charger for iPhone and Android.',
      descriptionZh: '15W 快充无线充电器，兼容 iPhone 和 Android。',
      priceUsd: 15.00,
      stock: 100,
      alertThreshold: 20,
      category: 'electronics',
      images: [{ url: '/images/products/fast-wireless-charger.svg', thumb_url: '/images/products/fast-wireless-charger.svg' }],
      specs: [],
      tags: [tags[2]],
      salesCount: 78,
    },
    {
      id: '20000000-0000-0000-0000-000000000008',
      nameKm: 'កាមេរ៉ាសុវត្ថិភាព',
      nameEn: 'Home Security Camera',
      nameZh: '家用安防摄像头',
      descriptionKm: 'កាមេរ៉ាសុវត្ថិភាព HD មើលពីចម្ងាយតាមរយៈទូរស័ព្ទ',
      descriptionEn: 'HD security camera with remote mobile viewing.',
      descriptionZh: '高清安防摄像头，支持手机远程查看。',
      priceUsd: 45.00,
      stock: 40,
      alertThreshold: 8,
      category: 'electronics',
      images: [{ url: '/images/products/home-security-camera.svg', thumb_url: '/images/products/home-security-camera.svg' }],
      specs: [],
      tags: [tags[4]],
      salesCount: 23,
    },
    // 家居
    {
      id: '20000000-0000-0000-0000-000000000009',
      nameKm: 'ចានពីរជាន់សម្រាប់បាយ',
      nameEn: 'Double-Layer Lunch Box',
      nameZh: '双层保温饭盒',
      descriptionKm: 'ចានពីរជាន់រក្សាកំដៅ សម្រាប់យកទៅធ្វើការ',
      descriptionEn: 'Double-layer insulated lunch box for work.',
      descriptionZh: '双层保温饭盒，适合带饭上班。',
      priceUsd: 9.50,
      stock: 180,
      alertThreshold: 30,
      category: 'home',
      images: [{ url: '/images/products/double-layer-lunch-box.svg', thumb_url: '/images/products/double-layer-lunch-box.svg' }],
      specs: [
        { nameKm: 'ពណ៌', nameEn: 'Color', nameZh: '颜色', values: [
          { valueKm: 'ផ្កាឈូក', valueEn: 'Pink', valueZh: '粉色', priceUsd: 0, stock: 90 },
          { valueKm: 'ខៀវ', valueEn: 'Blue', valueZh: '蓝色', priceUsd: 0, stock: 90 },
        ]},
      ],
      tags: [tags[0]],
      salesCount: 210,
    },
    {
      id: '20000000-0000-0000-0000-000000000010',
      nameKm: 'ផ្ទះតុក្កតារៀបចំឥវ៉ាន់',
      nameEn: 'Desktop Organizer Set',
      nameZh: '桌面收纳套装',
      descriptionKm: 'ឈុតតុក្កតាសម្រាប់រៀបចំសៀវភៅ ប៊ិច និងសម្ភារៈការងារ',
      descriptionEn: 'Desktop organizer set for books, pens, and office supplies.',
      descriptionZh: '桌面收纳套装，可整理书本、笔和办公用品。',
      priceUsd: 14.00,
      stock: 95,
      alertThreshold: 15,
      category: 'home',
      images: [{ url: '/images/products/desktop-organizer-set.svg', thumb_url: '/images/products/desktop-organizer-set.svg' }],
      specs: [],
      tags: [tags[2]],
      salesCount: 54,
    },
    // 食品
    {
      id: '20000000-0000-0000-0000-000000000011',
      nameKm: 'កាហ្វេគ្រាប់កម្ពុជា',
      nameEn: 'Cambodian Coffee Beans',
      nameZh: '柬埔寨咖啡豆',
      descriptionKm: 'កាហ្វេគ្រាប់ចំណិតពីខេត្តមណ្ឌលគិរី រសជាតិខ្លាំង',
      descriptionEn: 'Premium Mondulkiri coffee beans with strong flavor.',
      descriptionZh: '来自蒙多基里省的优质咖啡豆，风味浓郁。',
      priceUsd: 11.00,
      stock: 130,
      alertThreshold: 20,
      category: 'food',
      images: [{ url: '/images/products/cambodian-coffee-beans.svg', thumb_url: '/images/products/cambodian-coffee-beans.svg' }],
      specs: [
        { nameKm: 'ទម្ងន់', nameEn: 'Weight', nameZh: '重量', values: [
          { valueKm: '250g', valueEn: '250g', valueZh: '250g', priceUsd: 0, stock: 70 },
          { valueKm: '500g', valueEn: '500g', valueZh: '500g', priceUsd: 9.00, stock: 60 },
        ]},
      ],
      tags: [tags[4]],
      salesCount: 88,
    },
    {
      id: '20000000-0000-0000-0000-000000000012',
      nameKm: 'មីកំប៉ុងគុណភាពខ្ពស់',
      nameEn: 'Premium Instant Noodles (5 packs)',
      nameZh: '高品质方便面（5连包）',
      descriptionKm: 'មីកំប៉ុងរសជាតិឆ្ងាញ់ កញ្ចប់ 5 កញ្ចប់',
      descriptionEn: 'Delicious instant noodles, 5-pack bundle.',
      descriptionZh: '美味方便面，5 连包组合。',
      priceUsd: 4.50,
      stock: 300,
      alertThreshold: 50,
      category: 'food',
      images: [{ url: '/images/products/premium-instant-noodles-5-packs.svg', thumb_url: '/images/products/premium-instant-noodles-5-packs.svg' }],
      specs: [
        { nameKm: 'រសជាតិ', nameEn: 'Flavor', nameZh: '口味', values: [
          { valueKm: 'កម្ទេច', valueEn: 'Beef', valueZh: '牛肉味', priceUsd: 0, stock: 150 },
          { valueKm: 'មីគាវ', valueEn: 'Chicken', valueZh: '鸡肉味', priceUsd: 0, stock: 150 },
        ]},
      ],
      tags: [tags[1]],
      salesCount: 312,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        nameKm: p.nameKm,
        nameEn: p.nameEn,
        nameZh: p.nameZh,
        descriptionKm: p.descriptionKm,
        descriptionEn: p.descriptionEn,
        descriptionZh: p.descriptionZh,
        priceUsd: p.priceUsd,
        priceKhr: toKhr(p.priceUsd),
        stock: p.stock,
        alertThreshold: p.alertThreshold,
        images: p.images,
        specs: p.specs,
        category: p.category,
        status: 'active',
        salesCount: p.salesCount,
        tags: p.tags,
      },
      create: {
        id: p.id,
        nameKm: p.nameKm,
        nameEn: p.nameEn,
        nameZh: p.nameZh,
        descriptionKm: p.descriptionKm,
        descriptionEn: p.descriptionEn,
        descriptionZh: p.descriptionZh,
        priceUsd: p.priceUsd,
        priceKhr: toKhr(p.priceUsd),
        stock: p.stock,
        alertThreshold: p.alertThreshold,
        images: p.images,
        specs: p.specs,
        category: p.category,
        status: 'active',
        salesCount: p.salesCount,
        tags: p.tags,
      },
    });
  }
  console.log('   ✅ 12 个商品（含规格与图片）');

  // ================================================================
  // 9. 优惠券（固定 UUID，幂等）
  // ================================================================
  const coupons = [
    {
      id: '30000000-0000-0000-0000-000000000001',
      titleKm: 'បញ្ចុះតម្លៃ $5',
      titleEn: '$5 OFF',
      titleZh: '满减 5 美元',
      type: 'fixed',
      value: 5.00,
      minSpend: 20.00,
      totalQty: 100,
      usedCount: 8,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      titleKm: 'បញ្ចុះតម្លៃ 10%',
      titleEn: '10% OFF',
      titleZh: '全场 9 折',
      type: 'percent',
      value: 10.00,
      minSpend: 15.00,
      totalQty: 200,
      usedCount: 23,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      id: '30000000-0000-0000-0000-000000000003',
      titleKm: 'បញ្ចុះតម្លៃ $10',
      titleEn: '$10 OFF',
      titleZh: '满减 10 美元',
      type: 'fixed',
      value: 10.00,
      minSpend: 50.00,
      totalQty: 50,
      usedCount: 2,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
    {
      id: '30000000-0000-0000-0000-000000000004',
      titleKm: 'ដឹកជញ្ជូនឥតគិតថ្លៃ',
      titleEn: 'Free Shipping',
      titleZh: '免运费券',
      type: 'fixed',
      value: 2.00,
      minSpend: 10.00,
      totalQty: 500,
      usedCount: 45,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'active',
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { id: coupon.id },
      update: {},
      create: coupon,
    });
  }
  console.log('   ✅ 4 张优惠券');

  // 用户领取优惠券（幂等：基于 userId + couponId）
  const userCoupons = [
    { id: '60000000-0000-0000-0000-000000000001', userId: userIds.sopheap, couponId: coupons[0].id, status: 'unused' },
    { id: '60000000-0000-0000-0000-000000000002', userId: userIds.sopheap, couponId: coupons[1].id, status: 'unused' },
    { id: '60000000-0000-0000-0000-000000000003', userId: userIds.sopheap, couponId: coupons[3].id, status: 'unused' },
    { id: '60000000-0000-0000-0000-000000000004', userId: userIds.lihua, couponId: coupons[1].id, status: 'used', usedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    { id: '60000000-0000-0000-0000-000000000005', userId: userIds.lihua, couponId: coupons[2].id, status: 'unused' },
    { id: '60000000-0000-0000-0000-000000000006', userId: userIds.sreyneang, couponId: coupons[0].id, status: 'unused' },
  ];

  for (const uc of userCoupons) {
    await prisma.userCoupon.upsert({
      where: { id: uc.id },
      update: {},
      create: uc,
    });
  }
  console.log('   ✅ 6 张用户优惠券');

  // ================================================================
  // 10. 限时专区（固定 UUID，幂等）
  // ================================================================
  const flashDeals = [
    {
      id: '70000000-0000-0000-0000-000000000001',
      productId: products[5].id,
      dealPriceUsd: 19.90,
      dealPriceKhr: toKhr(19.90),
      dealStock: 50,
      soldCount: 12,
      cityCode: null,
      startAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      sortOrder: 1,
      status: 'active',
    },
    {
      id: '70000000-0000-0000-0000-000000000002',
      productId: products[4].id,
      dealPriceUsd: 8.50,
      dealPriceKhr: toKhr(8.50),
      dealStock: 80,
      soldCount: 35,
      cityCode: 'phnom_penh',
      startAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      sortOrder: 2,
      status: 'active',
    },
    {
      id: '70000000-0000-0000-0000-000000000003',
      productId: products[10].id,
      dealPriceUsd: 7.50,
      dealPriceKhr: toKhr(7.50),
      dealStock: 60,
      soldCount: 8,
      cityCode: null,
      startAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      sortOrder: 3,
      status: 'active',
    },
  ];

  for (const deal of flashDeals) {
    await prisma.flashDeal.upsert({
      where: { id: deal.id },
      update: {},
      create: deal,
    });
  }
  console.log('   ✅ 3 个限时专区商品');

  // ================================================================
  // 11. 订单数据（基于 orderNumber 幂等）
  // ================================================================
  const now = new Date();
  const orderData = [
    // 在线支付订单 - 已完成
    {
      orderNumber: generateOrderNumber(1),
      userId: userIds.lihua,
      totalUsd: 46.50,
      shippingFeeUsd: 1.00,
      discountUsd: 5.00,
      status: 'completed',
      paymentMethod: 'aba_pay',
      paymentStatus: 'paid',
      paidAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(now - 14 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
      couponId: coupons[0].id,
      items: [
        { productId: products[5].id, quantity: 1, priceUsd: 28.00, spec: { Color: 'White' } },
        { productId: products[6].id, quantity: 2, priceUsd: 15.00, spec: {} },
      ],
      logisticsInfo: { company: 'J&T Express', trackingNumber: 'JT123456789KH' },
    },
    // 在线支付订单 - 待发货
    {
      orderNumber: generateOrderNumber(2),
      userId: userIds.sopheap,
      totalUsd: 23.50,
      shippingFeeUsd: 1.00,
      discountUsd: 0,
      status: 'paid',
      paymentMethod: 'khqr',
      paymentStatus: 'paid',
      paidAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      items: [
        { productId: products[0].id, quantity: 1, priceUsd: 18.50, spec: { Color: 'Black', Size: '42' } },
      ],
    },
    // 在线支付订单 - 待付款
    {
      orderNumber: generateOrderNumber(3),
      userId: userIds.sopheap,
      totalUsd: 35.00,
      shippingFeeUsd: 1.00,
      discountUsd: 0,
      status: 'pending_payment',
      paymentMethod: 'wing_pay',
      paymentStatus: 'pending',
      paymentTimeout: new Date(now + 30 * 60 * 1000),
      items: [
        { productId: products[2].id, quantity: 1, priceUsd: 35.00, spec: { Color: 'Brown' } },
      ],
    },
    // COD 订单 - 已确认待发货
    {
      orderNumber: generateOrderNumber(4),
      userId: userIds.sreyneang,
      totalUsd: 27.00,
      shippingFeeUsd: 2.00,
      discountUsd: 0,
      status: 'confirmed',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      items: [
        { productId: products[3].id, quantity: 1, priceUsd: 22.00, spec: { Volume: '30ml' } },
        { productId: products[9].id, quantity: 1, priceUsd: 3.00, spec: {} },
      ],
    },
    // COD 订单 - 已发货待收款
    {
      orderNumber: generateOrderNumber(5),
      userId: userIds.sopheap,
      totalUsd: 19.50,
      shippingFeeUsd: 1.00,
      discountUsd: 0,
      status: 'shipped',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      shippedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      items: [
        { productId: products[8].id, quantity: 2, priceUsd: 9.50, spec: { Color: 'Pink' } },
      ],
      logisticsInfo: { company: 'Kerry Express', trackingNumber: 'KE987654321KH' },
    },
    // COD 订单 - 已完成
    {
      orderNumber: generateOrderNumber(6),
      userId: userIds.lihua,
      totalUsd: 42.00,
      shippingFeeUsd: 1.00,
      discountUsd: 10.00,
      status: 'completed',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      paidAt: new Date(now - 8 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      couponId: coupons[2].id,
      items: [
        { productId: products[7].id, quantity: 1, priceUsd: 45.00, spec: {} },
      ],
      logisticsInfo: { company: 'J&T Express', trackingNumber: 'JT555666777KH' },
    },
    // 已取消订单
    {
      orderNumber: generateOrderNumber(7),
      userId: userIds.sreyneang,
      totalUsd: 14.00,
      shippingFeeUsd: 2.00,
      discountUsd: 0,
      status: 'cancelled',
      paymentMethod: 'aba_pay',
      paymentStatus: 'pending',
      cancelledAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      cancelReason: 'ខ្ញុំចង់ប្តូរផលិតផល',
      items: [
        { productId: products[9].id, quantity: 1, priceUsd: 14.00, spec: {} },
      ],
    },
    // 在线支付订单 - 已发货
    {
      orderNumber: generateOrderNumber(8),
      userId: userIds.sopheap,
      totalUsd: 17.50,
      shippingFeeUsd: 1.00,
      discountUsd: 0,
      status: 'shipped',
      paymentMethod: 'aba_pay',
      paymentStatus: 'paid',
      paidAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      items: [
        { productId: products[1].id, quantity: 1, priceUsd: 8.90, spec: { Color: 'Blue', Size: 'L' } },
        { productId: products[10].id, quantity: 1, priceUsd: 11.00, spec: { Weight: '250g' } },
      ],
      logisticsInfo: { company: 'Ninja Van', trackingNumber: 'NV1122334455KH' },
    },
  ];

  for (const o of orderData) {
    const existing = await prisma.order.findUnique({ where: { orderNumber: o.orderNumber } });
    if (existing) {
      console.log(`   订单 ${o.orderNumber}: 已存在，跳过`);
      continue;
    }

    const defaultAddress = addresses.find(a => a.userId === o.userId && a.isDefault);
    await prisma.order.create({
      data: {
        orderNumber: o.orderNumber,
        userId: o.userId,
        totalUsd: o.totalUsd,
        totalKhr: toKhr(o.totalUsd),
        discountUsd: o.discountUsd,
        shippingFeeUsd: o.shippingFeeUsd,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        paymentTimeout: o.paymentTimeout || null,
        couponId: o.couponId || null,
        shippingAddress: defaultAddress,
        logisticsInfo: o.logisticsInfo || null,
        paidAt: o.paidAt || null,
        shippedAt: o.shippedAt || null,
        completedAt: o.completedAt || null,
        cancelledAt: o.cancelledAt || null,
        cancelReason: o.cancelReason || null,
        items: {
          create: o.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            priceUsd: item.priceUsd,
            priceKhr: toKhr(item.priceUsd),
            spec: item.spec,
          })),
        },
      },
    });
    console.log(`   订单 ${o.orderNumber}: ${o.status}`);
  }
  console.log('   ✅ 8 个订单（覆盖 7 种状态）');

  // ================================================================
  // 12. 库存记录（基于 productId + reason + note 幂等）
  // ================================================================
  const stockLogs = [
    { id: '80000000-0000-0000-0000-000000000001', productId: products[0].id, beforeQty: 120, afterQty: 110, changeQty: -10, reason: 'order_deduct', note: '演示订单扣减', operatorId: 'system' },
    { id: '80000000-0000-0000-0000-000000000002', productId: products[5].id, beforeQty: 75, afterQty: 100, changeQty: 25, reason: 'restock', note: '补货入库', operatorId: 'system' },
    { id: '80000000-0000-0000-0000-000000000003', productId: products[10].id, beforeQty: 130, afterQty: 125, changeQty: -5, reason: 'order_deduct', note: '演示订单扣减', operatorId: 'system' },
  ];

  for (const log of stockLogs) {
    await prisma.stockLog.upsert({
      where: { id: log.id },
      update: {},
      create: log,
    });
  }
  console.log('   ✅ 3 条库存日志');

  // ================================================================
  // 13. 反馈工单（基于 userId + content 幂等）
  // ================================================================
  const feedbacks = [
    {
      id: '90000000-0000-0000-0000-000000000001',
      userId: userIds.sopheap,
      content: 'ការដឹកជញ្ជូនលឿនណាស់ សូមអរគុណ!',
      images: [],
      status: 'resolved',
      resolvedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: '90000000-0000-0000-0000-000000000002',
      userId: userIds.lihua,
      content: '口红颜色很漂亮，但是包装有点破损，希望改进。',
      images: ['https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=300&h=300&fit=crop'],
      status: 'pending',
    },
    {
      id: '90000000-0000-0000-0000-000000000003',
      userId: userIds.sreyneang,
      content: 'How can I track my order? The tracking number is not working.',
      images: [],
      status: 'pending',
    },
  ];

  for (const fb of feedbacks) {
    await prisma.feedbackTicket.upsert({
      where: { id: fb.id },
      update: {},
      create: fb,
    });
  }
  console.log('   ✅ 3 条反馈工单');

  // ================================================================
  // 14. 收藏（基于 userId + productId 唯一约束，幂等）
  // ================================================================
  const wishlistItems = [
    { userId: userIds.sopheap, productId: products[2].id },
    { userId: userIds.sopheap, productId: products[5].id },
    { userId: userIds.lihua, productId: products[3].id },
    { userId: userIds.lihua, productId: products[7].id },
    { userId: userIds.sreyneang, productId: products[1].id },
  ];

  for (const item of wishlistItems) {
    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId: item.userId, productId: item.productId } },
    });
    if (!existing) {
      await prisma.wishlist.create({ data: item });
    }
  }
  console.log('   ✅ 5 条收藏');

  // ================================================================
  // 15. 系统设置
  // ================================================================
  const systemSettings = [
    { key: 'exchange_rate', value: '4100' },
    { key: 'shop_name_km', value: 'ធីជី ម៉ល' },
    { key: 'shop_name_en', value: 'TG Mall' },
    { key: 'shop_name_zh', value: 'TG 商城' },
    { key: 'login_banner_image', value: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=400&fit=crop' },
    { key: 'announcement_km', value: 'ដឹកជញ្ជូនឥតគិតថ្លៃសម្រាប់ការទិញចាប់ពី $25' },
    { key: 'announcement_en', value: 'Free shipping on orders over $25' },
    { key: 'announcement_zh', value: '满 $25 免运费' },
  ];

  for (const s of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log('   ✅ 系统设置');

  console.log('\n🎉 演示数据填充完成！');
  console.log('   用户: 3 个 | 商品: 12 个 | 优惠券: 4 张 | 订单: 8 个 | 反馈: 3 条');
  console.log('   订单状态覆盖: pending_payment / paid / confirmed / shipped / completed / cancelled');
}

main()
  .catch((e) => {
    console.error('❌ Seed 失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
