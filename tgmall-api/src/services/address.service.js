// 收货地址服务
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

const MAX_ADDRESSES = 10;

export async function getUserAddresses(userId) {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    include: {
      city: { select: { code: true, nameKm: true, nameEn: true, nameZh: true } },
    },
  });
  return addresses;
}

export async function createAddress(userId, data) {
  // Zod validated body 是 snake_case，转 camelCase 给 Prisma
  const mapped = {
    recipientName: data.recipient_name,
    phone: data.phone,
    cityCode: data.city_code,
    province: data.province,
    district: data.district,
    detail: data.detail,
    isDefault: data.is_default ?? false,
  };

  // 检查数量上限
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) {
    throw new AppError('最多保存 10 个地址', 400, 'ADDRESS_LIMIT_REACHED');
  }

  // 如果设为默认，先取消其他默认地址
  if (mapped.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.address.create({
    data: { ...mapped, userId },
    include: {
      city: { select: { code: true, nameKm: true, nameEn: true, nameZh: true } },
    },
  });
}

export async function updateAddress(userId, addressId, data) {
  const addr = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!addr) throw new AppError('地址不存在', 404, 'NOT_FOUND');

  // snake_case → camelCase
  const mapped = {};
  if (data.recipient_name !== undefined) mapped.recipientName = data.recipient_name;
  if (data.phone !== undefined) mapped.phone = data.phone;
  if (data.city_code !== undefined) mapped.cityCode = data.city_code;
  if (data.province !== undefined) mapped.province = data.province;
  if (data.district !== undefined) mapped.district = data.district;
  if (data.detail !== undefined) mapped.detail = data.detail;
  if (data.is_default !== undefined) mapped.isDefault = data.is_default;

  if (mapped.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: addressId } },
      data: { isDefault: false },
    });
  }

  return prisma.address.update({
    where: { id: addressId },
    data: mapped,
    include: {
      city: { select: { code: true, nameKm: true, nameEn: true, nameZh: true } },
    },
  });
}

export async function deleteAddress(userId, addressId) {
  const addr = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!addr) throw new AppError('地址不存在', 404, 'NOT_FOUND');

  await prisma.address.delete({ where: { id: addressId } });

  // 如果删除的是默认地址，将最新地址设为默认
  if (addr.isDefault) {
    const latest = await prisma.address.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      await prisma.address.update({
        where: { id: latest.id },
        data: { isDefault: true },
      });
    }
  }
}
