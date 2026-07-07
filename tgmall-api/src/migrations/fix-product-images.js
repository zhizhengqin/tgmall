// 一次性数据修复：把演示商品和 Banner 的外部图床 URL 迁到自托管 SVG
// 幂等：每次部署都会把 demo 数据指向 /images/products/ 和 /images/banners/
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function selfHostedProductUrl(nameEn) {
  return `/images/products/${slugify(nameEn)}.svg`;
}

async function fixProducts() {
  console.log('🔧 修复商品图片...');
  const products = await prisma.product.findMany({
    where: { status: { not: 'deleted' } },
    select: { id: true, nameEn: true, images: true },
  });

  let fixed = 0;
  for (const p of products) {
    if (!p.nameEn) continue;
    const url = selfHostedProductUrl(p.nameEn);
    const current = Array.isArray(p.images) ? p.images : [];
    const currentUrl = current[0]?.url || current[0];
    if (currentUrl === url) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: { images: [{ url, thumb_url: url }] },
    });
    fixed += 1;
    console.log(`   ✅ ${p.nameEn}`);
  }
  console.log(`   已修复 ${fixed} 个商品`);
}

async function fixBanners() {
  console.log('🔧 修复 Banner 图片...');
  const banners = await prisma.banner.findMany({
    where: { status: 'active' },
    select: { id: true, sortOrder: true, imageUrl: true },
  });

  let fixed = 0;
  for (const b of banners) {
    if (!b.sortOrder || b.sortOrder < 1 || b.sortOrder > 3) continue;
    const url = `/images/banners/banner-${b.sortOrder}.svg`;
    if (b.imageUrl === url) continue;

    await prisma.banner.update({
      where: { id: b.id },
      data: { imageUrl: url },
    });
    fixed += 1;
    console.log(`   ✅ Banner #${b.sortOrder}`);
  }
  console.log(`   已修复 ${fixed} 个 Banner`);
}

async function main() {
  await fixProducts();
  await fixBanners();
}

main()
  .catch((err) => {
    console.error('❌ 演示图片迁移失败:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
