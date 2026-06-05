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

  // 2. 创建测试商家
  const merchant1 = await prisma.merchant.create({
    data: {
      nameKm: 'ហាង សំលៀកបំពាក់ សុភាព',
      nameEn: 'Sopheap Fashion',
      ownerName: 'Sopheap Kong',
      phone: '+85512345001',
      address: 'No. 123, Street 456, BKK1, Phnom Penh',
      category: 'fashion',
      status: 'active',
      commissionRate: 3.0,
    },
  });

  const merchant2 = await prisma.merchant.create({
    data: {
      nameKm: 'ហាង គ្រឿងសម្អាង ស្រីស្អាត',
      nameEn: 'Srey Saat Beauty',
      ownerName: 'Chantrea Mey',
      phone: '+85512345003',
      address: 'No. 789, Russian Blvd, Toul Kork, Phnom Penh',
      category: 'beauty',
      status: 'active',
      commissionRate: 3.0,
    },
  });

  const merchant3 = await prisma.merchant.create({
    data: {
      nameKm: 'ហាង បច្ចេកវិទ្យា សុវណ្ណ',
      nameEn: 'Sovann Tech',
      ownerName: 'Sovann Heng',
      phone: '+85512345004',
      address: 'No. 45, Monivong Blvd, Daun Penh, Phnom Penh',
      category: 'electronics',
      status: 'active',
      commissionRate: 3.0,
    },
  });

  const merchant4 = await prisma.merchant.create({
    data: {
      nameKm: 'ហាង ម្ហូបអាហារ ម៉ាក់ណាំ',
      nameEn: 'Mak Nam Food',
      ownerName: 'Sreymom Ly',
      phone: '+85512345005',
      address: 'No. 88, Street 310, BKK3, Phnom Penh',
      category: 'food',
      status: 'active',
      commissionRate: 4.0,
    },
  });

  const merchant5 = await prisma.merchant.create({
    data: {
      nameKm: 'ហាង ប្រដាប់ប្រើប្រាស់ គេហដ្ឋាន',
      nameEn: 'HomePlus Cambodia',
      ownerName: 'Vuthy Chea',
      phone: '+85512345006',
      address: 'No. 12, Mao Tse Tung Blvd, Chamkarmon, Phnom Penh',
      category: 'home',
      status: 'active',
      commissionRate: 3.5,
    },
  });

  // 测试：一个 pending 状态的商家（模拟待审核场景）
  await prisma.merchant.create({
    data: {
      nameKm: 'ហាង គ្រឿងអលង្ការ ពេជ្រសុវណ្ណ',
      nameEn: 'Sovann Jewelry',
      ownerName: 'Bopha Keo',
      phone: '+85512345007',
      address: 'No. 200, Sihanouk Blvd, Phnom Penh',
      category: 'fashion',
      status: 'pending',
      commissionRate: 5.0,
      description: 'Handcrafted gemstone jewelry from Cambodian artisans.',
    },
  });

  console.log(`   商家: ${merchant1.nameEn}, ${merchant2.nameEn}, ${merchant3.nameEn}, ${merchant4.nameEn}, ${merchant5.nameEn} (+1 pending)`);

  // 3. 创建测试商品
  const products = await Promise.all([
    prisma.product.create({
      data: {
        merchantId: merchant1.id,
        nameKm: 'រ៉ូប ពណ៌ក្រហម',
        nameEn: 'Red Dress',
        nameZh: '红色连衣裙',
        descriptionKm: 'សំលៀកបំពាក់ធ្វើពីក្រណាត់មានគុណភាពខ្ពស់ សាកសមសម្រាប់ពិធីជប់លៀង',
        descriptionEn: 'Elegant red dress made from high-quality fabric, perfect for parties and formal events.',
        descriptionZh: '采用优质面料制成的红色连衣裙，适合派对和正式场合穿着。',
        priceUsd: 29.99,
        priceKhr: 120000,
        stock: 50,
        category: 'fashion',
        images: [
          { url: 'https://placehold.co/800x800/oklch(64%25+0.16+82)/white?text=Dress', thumb_url: 'https://placehold.co/200x200/oklch(64%25+0.16+82)/white?text=Dress', sort_order: 0 },
        ],
        specs: [
          { nameKm: 'ពណ៌', nameEn: 'Color', values: [{ valueKm: 'ក្រហម', valueEn: 'Red', stock: 20 }, { valueKm: 'ខៀវ', valueEn: 'Blue', stock: 15 }, { valueKm: 'ស', valueEn: 'White', stock: 15 }] },
          { nameKm: 'ទំហំ', nameEn: 'Size', values: [{ valueKm: 'S', valueEn: 'S' }, { valueKm: 'M', valueEn: 'M' }, { valueKm: 'L', valueEn: 'L' }] },
        ],
        salesCount: 45,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant1.id,
        nameKm: 'អាវយឺត ពណ៌ស',
        nameEn: 'White T-Shirt',
        nameZh: '白色T恤',
        descriptionKm: 'អាវយឺតកប្បាស 100% មានផាសុខភាព',
        descriptionEn: '100% cotton comfortable t-shirt for everyday wear.',
        descriptionZh: '100% 纯棉舒适T恤，适合日常穿着。',
        priceUsd: 12.50,
        priceKhr: 50000,
        stock: 100,
        category: 'fashion',
        images: [
          { url: 'https://placehold.co/800x800/oklch(90%25+0.005+95)/black?text=T-Shirt', thumb_url: 'https://placehold.co/200x200/oklch(90%25+0.005+95)/black?text=T-Shirt', sort_order: 0 },
        ],
        specs: [
          { nameKm: 'ទំហំ', nameEn: 'Size', values: [{ valueKm: 'S', valueEn: 'S' }, { valueKm: 'M', valueEn: 'M' }, { valueKm: 'L', valueEn: 'L' }, { valueKm: 'XL', valueEn: 'XL' }] },
        ],
        salesCount: 120,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant1.id,
        nameKm: 'ខោខូវប៊យ',
        nameEn: 'Denim Jeans',
        nameZh: '牛仔裤',
        priceUsd: 39.99,
        priceKhr: 160000,
        stock: 30,
        category: 'fashion',
        images: [
          { url: 'https://placehold.co/800x800/oklch(50%25+0.012+80)/white?text=Jeans', thumb_url: 'https://placehold.co/200x200/oklch(50%25+0.012+80)/white?text=Jeans', sort_order: 0 },
        ],
        salesCount: 78,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant2.id,
        nameKm: 'ក្រែម លាបមុខ',
        nameEn: 'Face Cream',
        nameZh: '面霜',
        descriptionKm: 'ក្រែមផ្តល់សំណើមជាមួយវីតាមីន E',
        descriptionEn: 'Moisturizing face cream with Vitamin E.',
        descriptionZh: '含维生素E的保湿面霜。',
        priceUsd: 15.50,
        priceKhr: 62000,
        stock: 200,
        category: 'beauty',
        images: [
          { url: 'https://placehold.co/800x800/oklch(98.5%25+0.003+95)/black?text=Face+Cream', thumb_url: 'https://placehold.co/200x200/oklch(98.5%25+0.003+95)/black?text=Face+Cream', sort_order: 0 },
        ],
        salesCount: 230,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant2.id,
        nameKm: 'លាបមាត់ ក្រហម',
        nameEn: 'Red Lipstick',
        nameZh: '红色口红',
        priceUsd: 8.99,
        priceKhr: 36000,
        stock: 150,
        category: 'beauty',
        images: [
          { url: 'https://placehold.co/800x800/oklch(52%25+0.20+24)/white?text=Lipstick', thumb_url: 'https://placehold.co/200x200/oklch(52%25+0.20+24)/white?text=Lipstick', sort_order: 0 },
        ],
        salesCount: 340,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant1.id,
        nameKm: 'ស្បែកជើង ស្បែក',
        nameEn: 'Leather Shoes',
        nameZh: '皮鞋',
        priceUsd: 45.00,
        priceKhr: 180000,
        stock: 20,
        category: 'fashion',
        images: [
          { url: 'https://placehold.co/800x800/oklch(30%25+0.015+80)/white?text=Shoes', thumb_url: 'https://placehold.co/200x200/oklch(30%25+0.015+80)/white?text=Shoes', sort_order: 0 },
        ],
        specs: [
          { nameKm: 'ទំហំ', nameEn: 'Size', values: [{ valueKm: '40', valueEn: '40' }, { valueKm: '41', valueEn: '41' }, { valueKm: '42', valueEn: '42' }, { valueKm: '43', valueEn: '43' }] },
        ],
        salesCount: 56,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant2.id,
        nameKm: 'ទឹកអប់ ស្រី',
        nameEn: 'Perfume — For Her',
        nameZh: '女士香水',
        priceUsd: 55.00,
        priceKhr: 220000,
        stock: 40,
        category: 'beauty',
        images: [
          { url: 'https://placehold.co/800x800/oklch(80%25+0.05+300)/white?text=Perfume', thumb_url: 'https://placehold.co/200x200/oklch(80%25+0.05+300)/white?text=Perfume', sort_order: 0 },
        ],
        salesCount: 89,
      },
    }),
    // ---- 电子品类 ----
    prisma.product.create({
      data: {
        merchantId: merchant3.id,
        nameKm: 'កាស ប៊្លូធូស',
        nameEn: 'Bluetooth Earphones',
        nameZh: '蓝牙耳机',
        descriptionKm: 'កាសឥតខ្សែ គុណភាពខ្ពស់ ប្រើបានរហូតដល់ 8 ម៉ោង',
        descriptionEn: 'Wireless earbuds with 8-hour battery life and noise cancellation.',
        descriptionZh: '无线蓝牙耳机，续航8小时，支持降噪。',
        priceUsd: 24.99,
        priceKhr: 100000,
        stock: 80,
        category: 'electronics',
        images: [
          { url: 'https://placehold.co/800x800/oklch(60%25+0.05+250)/white?text=Earbuds', thumb_url: 'https://placehold.co/200x200/oklch(60%25+0.05+250)/white?text=Earbuds', sort_order: 0 },
        ],
        specs: [
          { nameKm: 'ពណ៌', nameEn: 'Color', values: [{ valueKm: 'ស', valueEn: 'White', stock: 40 }, { valueKm: 'ខ្មៅ', valueEn: 'Black', stock: 40 }] },
        ],
        salesCount: 156,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant3.id,
        nameKm: 'ខ្សែសាកថ្ម USB-C',
        nameEn: 'USB-C Fast Charger',
        nameZh: 'USB-C 快充线',
        descriptionKm: 'ខ្សែសាកលឿន 65W សម្រាប់ទូរស័ព្ទ និងកុំព្យូទ័រ',
        descriptionEn: '65W fast charging cable compatible with phones and laptops.',
        descriptionZh: '65W快充数据线，兼容手机和笔记本。',
        priceUsd: 9.99,
        priceKhr: 40000,
        stock: 200,
        category: 'electronics',
        images: [
          { url: 'https://placehold.co/800x800/oklch(30%25+0.015+80)/white?text=Charger', thumb_url: 'https://placehold.co/200x200/oklch(30%25+0.015+80)/white?text=Charger', sort_order: 0 },
        ],
        salesCount: 420,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant3.id,
        nameKm: 'ស្មាតវ៉ូច កីឡា',
        nameEn: 'Sports Smartwatch',
        nameZh: '运动智能手表',
        descriptionKm: 'នាឡិកាឆ្លាតវៃ វាស់ចង្វាក់បេះដូង និងតាមដានការហាត់ប្រាណ',
        descriptionEn: 'Smartwatch with heart rate monitor, step counter, and sleep tracking.',
        descriptionZh: '智能手表，心率监测、计步、睡眠追踪。',
        priceUsd: 49.99,
        priceKhr: 200000,
        stock: 35,
        category: 'electronics',
        images: [
          { url: 'https://placehold.co/800x800/oklch(50%25+0.08+270)/white?text=Watch', thumb_url: 'https://placehold.co/200x200/oklch(50%25+0.08+270)/white?text=Watch', sort_order: 0 },
        ],
        specs: [
          { nameKm: 'ពណ៌', nameEn: 'Color', values: [{ valueKm: 'ខ្មៅ', valueEn: 'Black', stock: 15 }, { valueKm: 'ប្រាក់', valueEn: 'Silver', stock: 20 }] },
        ],
        salesCount: 67,
      },
    }),
    // ---- 食品品类 ----
    prisma.product.create({
      data: {
        merchantId: merchant4.id,
        nameKm: 'កាហ្វេ កិនរួច ខ្មែរ',
        nameEn: 'Khmer Ground Coffee',
        nameZh: '高棉咖啡粉',
        descriptionKm: 'កាហ្វេសុទ្ធ 100% ពីខេត្តមណ្ឌលគិរី ផលិតតាមបែបប្រពៃណី',
        descriptionEn: '100% pure Arabica coffee from Mondulkiri, traditionally roasted.',
        descriptionZh: '100%纯阿拉比卡咖啡，产自蒙多基里省，传统烘焙工艺。',
        priceUsd: 6.50,
        priceKhr: 26000,
        stock: 150,
        category: 'food',
        images: [
          { url: 'https://placehold.co/800x800/oklch(70%25+0.10+75)/white?text=Coffee', thumb_url: 'https://placehold.co/200x200/oklch(70%25+0.10+75)/white?text=Coffee', sort_order: 0 },
        ],
        salesCount: 310,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant4.id,
        nameKm: 'ផ្លែស្វាយ ក្រៀម',
        nameEn: 'Dried Mango — Kampot',
        nameZh: '贡布芒果干',
        descriptionKm: 'ផ្លែស្វាយក្រៀមធម្មជាតិ គ្មានជាតិស្ករបន្ថែម ពីខេត្តកំពត',
        descriptionEn: 'Naturally dried mango slices from Kampot, no added sugar.',
        descriptionZh: '天然晒干芒果片，产自贡布省，无添加糖。',
        priceUsd: 3.99,
        priceKhr: 16000,
        stock: 300,
        category: 'food',
        images: [
          { url: 'https://placehold.co/800x800/oklch(80%25+0.15+75)/white?text=Mango', thumb_url: 'https://placehold.co/200x200/oklch(80%25+0.15+75)/white?text=Mango', sort_order: 0 },
        ],
        salesCount: 580,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant4.id,
        nameKm: 'ប្រហុក ខ្មែរ',
        nameEn: 'Khmer Prahok (Fermented Fish)',
        nameZh: '高棉鱼酱',
        descriptionKm: 'ប្រហុកខ្មែរពិតប្រាកដ ផលិតតាមរូបមន្តគ្រួសារ ពីទន្លេសាប',
        descriptionEn: 'Authentic fermented fish paste from Tonle Sap, traditional family recipe.',
        descriptionZh: '正宗洞里萨湖发酵鱼酱，传统家族配方。',
        priceUsd: 5.50,
        priceKhr: 22000,
        stock: 100,
        category: 'food',
        images: [
          { url: 'https://placehold.co/800x800/oklch(60%25+0.08+60)/white?text=Prahok', thumb_url: 'https://placehold.co/200x200/oklch(60%25+0.08+60)/white?text=Prahok', sort_order: 0 },
        ],
        salesCount: 95,
      },
    }),
    // ---- 家居品类 ----
    prisma.product.create({
      data: {
        merchantId: merchant5.id,
        nameKm: 'កំសៀវទឹក អគ្គិសនី',
        nameEn: 'Electric Kettle 1.7L',
        nameZh: '电热水壶 1.7L',
        descriptionKm: 'កំសៀវដែកអ៊ីណុក បិទដោយស្វ័យប្រវត្តិ សមត្ថភាព 1.7 លីត្រ',
        descriptionEn: 'Stainless steel electric kettle with auto shut-off, 1.7L capacity.',
        descriptionZh: '不锈钢电热水壶，自动断电，1.7升容量。',
        priceUsd: 18.99,
        priceKhr: 76000,
        stock: 60,
        category: 'home',
        images: [
          { url: 'https://placehold.co/800x800/oklch(90%25+0.003+95)/black?text=Kettle', thumb_url: 'https://placehold.co/200x200/oklch(90%25+0.003+95)/black?text=Kettle', sort_order: 0 },
        ],
        salesCount: 140,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant5.id,
        nameKm: 'ឈុតគ្រែ 100% កប្បាស',
        nameEn: '100% Cotton Bedsheet Set',
        nameZh: '纯棉床单套装',
        descriptionKm: 'ឈុតគ្រែកប្បាស 100% សាកសមសម្រាប់អាកាសធាតុកម្ពុជា',
        descriptionEn: '100% cotton bedsheet set, breathable and perfect for Cambodian climate.',
        descriptionZh: '100%纯棉床单套装，透气舒适，适合柬埔寨气候。',
        priceUsd: 22.00,
        priceKhr: 88000,
        stock: 45,
        category: 'home',
        images: [
          { url: 'https://placehold.co/800x800/oklch(95%25+0.005+200)/black?text=Sheets', thumb_url: 'https://placehold.co/200x200/oklch(95%25+0.005+200)/black?text=Sheets', sort_order: 0 },
        ],
        specs: [
          { nameKm: 'ទំហំ', nameEn: 'Size', values: [{ valueKm: '1.2m', valueEn: 'Single', stock: 15 }, { valueKm: '1.5m', valueEn: 'Queen', stock: 20 }, { valueKm: '1.8m', valueEn: 'King', stock: 10 }] },
        ],
        salesCount: 72,
      },
    }),
    prisma.product.create({
      data: {
        merchantId: merchant5.id,
        nameKm: 'ចង្កៀង តុ ដែក',
        nameEn: 'Metal Desk Lamp',
        nameZh: '金属台灯',
        descriptionKm: 'ចង្កៀងតុដែក មានពន្លឺ 3 កម្រិត សាកសមសម្រាប់ការអាន និងធ្វើការ',
        descriptionEn: 'Metal desk lamp with 3 brightness levels, perfect for reading and working.',
        descriptionZh: '金属台灯，3档亮度，适合阅读和工作。',
        priceUsd: 15.99,
        priceKhr: 64000,
        stock: 70,
        category: 'home',
        images: [
          { url: 'https://placehold.co/800x800/oklch(40%25+0.02+80)/white?text=Lamp', thumb_url: 'https://placehold.co/200x200/oklch(40%25+0.02+80)/white?text=Lamp', sort_order: 0 },
        ],
        salesCount: 88,
      },
    }),
  ]);

  console.log(`   商品: ${products.length} 件已创建`);

  // 4. 创建平台优惠券
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

  // 商家专属优惠券
  await prisma.coupon.create({
    data: {
      merchantId: merchant3.id,
      titleKm: 'បញ្ចុះតម្លៃ 15% សម្រាប់គ្រឿងអេឡិចត្រូនិច',
      titleEn: '15% OFF Electronics',
      titleZh: '电子产品 85 折',
      type: 'percent',
      value: 15.00,
      minSpend: 30.00,
      totalQty: 80,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

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

  console.log(`   优惠券: 4 张已创建 + 3 张用户关联`);

  // 5. 创建用户收货地址
  await prisma.address.createMany({
    data: [
      {
        userId: user1.id,
        recipientName: 'Sopheap Kong',
        phone: '+85512345001',
        province: 'ភ្នំពេញ',
        district: 'ខណ្ឌបឹងកេងកង',
        detail: 'ផ្ទះលេខ 123 ផ្លូវ 456',
        isDefault: true,
      },
      {
        userId: user1.id,
        recipientName: 'Sopheap Kong',
        phone: '+85512345001',
        province: 'សៀមរាប',
        district: 'ក្រុងសៀមរាប',
        detail: 'ផ្ទះលេខ 78 ផ្លូវជាតិលេខ 6',
        isDefault: false,
      },
      {
        userId: user2.id,
        recipientName: '李华',
        phone: '+85512345002',
        province: 'ភ្នំពេញ',
        district: 'ខណ្ឌដូនពេញ',
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
