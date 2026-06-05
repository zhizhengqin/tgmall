// 收货地址服务
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';

const MAX_ADDRESSES = 10;

export async function getUserAddresses(userId) {
  const addresses = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  return addresses;
}

export async function createAddress(userId, data) {
  // 检查数量上限
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) {
    throw new AppError('最多保存 10 个地址', 400, 'ADDRESS_LIMIT_REACHED');
  }

  // 如果设为默认，先取消其他默认地址
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return prisma.address.create({
    data: { ...data, userId },
  });
}

export async function updateAddress(userId, addressId, data) {
  const addr = await prisma.address.findFirst({
    where: { id: addressId, userId },
  });
  if (!addr) throw new AppError('地址不存在', 404, 'NOT_FOUND');

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId, isDefault: true, id: { not: addressId } },
      data: { isDefault: false },
    });
  }

  return prisma.address.update({
    where: { id: addressId },
    data,
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
