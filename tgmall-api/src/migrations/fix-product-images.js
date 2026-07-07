// 一次性数据修复：将 Product.images 中的字符串 URL 迁移为 {url, thumb_url} 对象
// 幂等：仅处理 images[0] 为字符串的记录
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 检查商品图片格式...');
  const products = await prisma.product.findMany({
    where: { status: { not: 'deleted' } },
    select: { id: true, images: true, nameEn: true },
  });

  let fixed = 0;
  for (const p of products) {
    const images = Array.isArray(p.images) ? p.images : [];
    if (images.length === 0) continue;
    if (typeof images[0] === 'string') {
      const migrated = images.map((url) => ({
        url,
        thumb_url: url,
      }));
      await prisma.product.update({
        where: { id: p.id },
        data: { images: migrated },
      });
      fixed += 1;
      console.log(`   ✅ ${p.nameEn || p.id}`);
    }
  }

  if (fixed === 0) {
    console.log('   ⏭️  所有商品图片格式正常，无需修复');
  } else {
    console.log(`   ✅ 已修复 ${fixed} 个商品的图片格式`);
  }
}

main()
  .catch((err) => {
    console.error('❌ 商品图片格式修复失败:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
