// 测试数据 Seeder — 用于开发和测试环境
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充测试数据...');

  // 1. 创建测试用户
  const user1 = await prisma.user.upsert({
    where: { telegramId: 10000001 },
    update: {},
    create: {
      telegramId: 10000001,
      firstName: 'Sopheap',
      lastName: 'Kong',
      username: 'sopheap_k',
      phone: '+85512345001',
      language: 'km',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { telegramId: 10000002 },
    update: {},
    create: {
      telegramId: 10000002,
      firstName: '李华',
      username: 'lihua_cn',
      phone: '+85512345002',
      language: 'zh',
    },
  });

  console.log(`   用户: ${user1.firstName}, ${user2.firstName}`);

  // ---- 默认城市与配送规则 ----
  const cities = [
    { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', nameEn: 'Phnom Penh', nameZh: '金边', lat: 11.562, lng: 104.889, sortOrder: 1, status: 'active' },
    { code: 'siem_reap', nameKm: 'សៀមរាប', nameEn: 'Siem Reap', nameZh: '暹粒', lat: 13.363, lng: 103.856, sortOrder: 2, status: 'active' },
    { code: 'sihanoukville', nameKm: 'ក្រុងព្រះសីហនុ', nameEn: 'Sihanoukville', nameZh: '西哈努克', lat: 10.625, lng: 103.523, sortOrder: 3, status: 'active' },
    { code: 'battambang', nameKm: 'បាត់ដំបង', nameEn: 'Battambang', nameZh: '马德望', lat: 13.096, lng: 103.202, sortOrder: 4, status: 'inactive' },
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { code: city.code },
      update: { lat: city.lat, lng: city.lng },
      create: city,
    });
    console.log(`   城市: ${city.nameEn} (${city.code}) lat=${city.lat}, lng=${city.lng}`);
  }
  console.log(`   ${cities.length} 城市坐标已同步`);

  await prisma.deliveryRule.upsert({
    where: { cityCode: 'phnom_penh' },
    update: {},
    create: {
      cityCode: 'phnom_penh',
      minOrderAmountUsd: 4.00,
      shippingFeeUsd: 1.00,
      freeShippingThresholdUsd: 0,
      estimatedDeliveryDays: 2,
      status: 'active',
    },
  });
  await prisma.deliveryRule.upsert({
    where: { cityCode: 'siem_reap' },
    update: {},
    create: {
      cityCode: 'siem_reap',
      minOrderAmountUsd: 6.00,
      shippingFeeUsd: 2.00,
      freeShippingThresholdUsd: 30.00,
      estimatedDeliveryDays: 3,
      status: 'active',
    },
  });

  // ---- 默认品类 ----
  const categories = [
    { code: 'fashion', nameKm: 'សំលៀកបំពាក់', nameEn: 'Fashion', nameZh: '时尚', iconUrl: 'https://cdn.xxx.com/icons/fashion.svg', sortOrder: 1 },
    { code: 'beauty', nameKm: 'គ្រឿងសម្អាង', nameEn: 'Beauty', nameZh: '美妆', iconUrl: 'https://cdn.xxx.com/icons/beauty.svg', sortOrder: 2 },
    { code: 'electronics', nameKm: 'គ្រឿងអេឡិចត្រូនិច', nameEn: 'Electronics', nameZh: '电子', iconUrl: 'https://cdn.xxx.com/icons/electronics.svg', sortOrder: 3 },
    { code: 'home', nameKm: 'គ្រឿងសង្ហារិម', nameEn: 'Home', nameZh: '家居', iconUrl: 'https://cdn.xxx.com/icons/home.svg', sortOrder: 4 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // ---- 默认 Banner ----
  await prisma.banner.createMany({
    data: [
      {
        titleKm: 'ប្រូម៉ូសិនពិសេស',
        titleEn: 'Special Promotion',
        titleZh: '特价促销',
        imageUrl: 'https://placehold.co/800x400/c4932a/white?text=Promo',
        linkType: 'url',
        linkTarget: 'https://t.me/xhzmall_bot',
        sortOrder: 1,
        status: 'active',
      },
    ],
    skipDuplicates: false,
  });

  // ---- 默认客服 ----
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

  // 2. V2 公司自营模式：商品直接归属平台，无需商户
  // 3. 创建平台优惠券
  const coupon1 = await prisma.coupon.create({
    data: {
      titleKm: 'បញ្ចុះតម្លៃ $5',
      titleEn: '$5 OFF',
      titleZh: '满减 $5',
      type: 'fixed',
      value: 5.00,
      minSpend: 20.00,
      totalQty: 100,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const coupon2 = await prisma.coupon.create({
    data: {
      titleKm: 'បញ្ចុះតម្លៃ 10%',
      titleEn: '10% OFF',
      titleZh: '全场 9 折',
      type: 'percent',
      value: 10.00,
      minSpend: 15.00,
      totalQty: 200,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const coupon3 = await prisma.coupon.create({
    data: {
      titleKm: 'បញ្ចុះតម្លៃ $10',
      titleEn: '$10 OFF',
      titleZh: '满减 $10',
      type: 'fixed',
      value: 10.00,
      minSpend: 50.00,
      totalQty: 50,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // V2 公司自营：所有优惠券均为平台券

  // 给用户发放优惠券（模拟已领取场景）
  await prisma.userCoupon.create({
    data: {
      userId: user1.id,
      couponId: coupon1.id,
      status: 'unused',
    },
  });

  await prisma.userCoupon.create({
    data: {
      userId: user1.id,
      couponId: coupon2.id,
      status: 'unused',
    },
  });

  // 用户 2 的优惠券（已使用一张）
  await prisma.userCoupon.create({
    data: {
      userId: user2.id,
      couponId: coupon2.id,
      status: 'used',
      usedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`   优惠券: 3 张已创建 + 3 张用户关联`);

  // 5. 创建用户收货地址
  await prisma.address.createMany({
    data: [
      {
        userId: user1.id,
        recipientName: 'Sopheap Kong',
        phone: '+85512345001',
        province: 'ភ្នំពេញ',
        district: 'ខណ្ឌបឹងកេងកង',
        cityCode: 'phnom_penh',
        detail: 'ផ្ទះលេខ 123 ផ្លូវ 456',
        isDefault: true,
      },
      {
        userId: user1.id,
        recipientName: 'Sopheap Kong',
        phone: '+85512345001',
        province: 'សៀមរាប',
        district: 'ក្រុងសៀមរាប',
        cityCode: 'siem_reap',
        detail: 'ផ្ទះលេខ 78 ផ្លូវជាតិលេខ 6',
        isDefault: false,
      },
      {
        userId: user2.id,
        recipientName: '李华',
        phone: '+85512345002',
        province: 'ភ្នំពេញ',
        district: 'ខណ្ឌដូនពេញ',
        cityCode: 'phnom_penh',
        detail: 'No. 200, Street 13',
        isDefault: true,
      },
    ],
  });

  console.log('   地址: 3 个已创建');

  console.log('✅ 测试数据填充完成');
}

main()
  .catch((e) => {
    console.error('❌ Seed 失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
