// V2: 为管理员设置默认平台自营商户
// 所有商品/订单操作都归属到默认 merchant
import prisma from '../config/database.js';

export async function defaultMerchant(req, _res, next) {
  try {
    // 优先使用已有的默认 merchant
    let merchant = await prisma.merchant.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'asc' },
    });

    if (!merchant) {
      // 创建默认平台自营 merchant
      merchant = await prisma.merchant.create({
        data: {
          nameKm: 'TG Mall ផ្លូវការ',
          nameEn: 'TG Mall Official',
          ownerName: 'Admin',
          phone: '+85500000000',
          address: 'Phnom Penh',
          category: 'all',
          status: 'active',
        },
      });
      console.log('✅ 创建默认平台自营商户');
    }

    req.merchant = merchant;
    next();
  } catch (err) {
    next(err);
  }
}
