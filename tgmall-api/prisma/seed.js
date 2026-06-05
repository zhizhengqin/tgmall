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

  console.log(`   商家: ${merchant1.nameEn}, ${merchant2.nameEn}`);

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
  ]);

  console.log(`   商品: ${products.length} 件已创建`);

  // 4. 创建平台优惠券
  await prisma.coupon.create({
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

  console.log('✅ 测试数据填充完成');
}

main()
  .catch((e) => {
    console.error('❌ Seed 失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
