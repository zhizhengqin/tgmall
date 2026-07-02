// 运营配置服务
import { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import { getPagination } from '../utils/pagination.js';

// ---------- Categories ----------

export async function listCategories({ page = 1, limit = 20, status } = {}) {
  const { page: normalizedPage, limit: normalizedLimit, skip } = getPagination({ page, limit });
  const where = {};
  if (status) where.status = status;
  const [items, total] = await Promise.all([
    prisma.category.findMany({ where, orderBy: { sortOrder: 'asc' }, skip, take: normalizedLimit }),
    prisma.category.count({ where }),
  ]);
  return {
    items,
    total,
    page: normalizedPage,
    limit: normalizedLimit,
    totalPages: Math.ceil(total / normalizedLimit),
    hasNext: normalizedPage * normalizedLimit < total,
  };
}

export async function createCategory(input) {
  const data = {
    code: input.code,
    nameKm: input.name_km,
    nameEn: input.name_en,
    nameZh: input.name_zh,
    iconUrl: input.icon_url,
    sortOrder: input.sort_order,
    status: input.status,
  };
  return prisma.category.create({ data });
}

export async function updateCategory(code, input) {
  const data = {
    code: input.code,
    nameKm: input.name_km,
    nameEn: input.name_en,
    nameZh: input.name_zh,
    iconUrl: input.icon_url,
    sortOrder: input.sort_order,
    status: input.status,
  };
  return prisma.category.update({ where: { code }, data });
}

export async function toggleCategory(code) {
  const cat = await prisma.category.findUnique({ where: { code } });
  if (!cat) throw new AppError('品类不存在', 404, 'NOT_FOUND');
  const nextStatus = cat.status === 'active' ? 'inactive' : 'active';
  return prisma.category.update({ where: { code }, data: { status: nextStatus } });
}

export async function listActiveCategories(clientPrisma = prisma) {
  return clientPrisma.category.findMany({
    where: { status: 'active' },
    orderBy: { sortOrder: 'asc' },
  });
}

// ---------- Banners ----------

export async function listBanners({ page = 1, limit = 20, status } = {}) {
  const { page: normalizedPage, limit: normalizedLimit, skip } = getPagination({ page, limit });
  const where = {};
  if (status) where.status = status;
  const [items, total] = await Promise.all([
    prisma.banner.findMany({ where, orderBy: { sortOrder: 'asc' }, skip, take: normalizedLimit }),
    prisma.banner.count({ where }),
  ]);
  return {
    items,
    total,
    page: normalizedPage,
    limit: normalizedLimit,
    totalPages: Math.ceil(total / normalizedLimit),
    hasNext: normalizedPage * normalizedLimit < total,
  };
}

export async function createBanner(input) {
  const data = {
    titleKm: input.title_km,
    titleEn: input.title_en,
    titleZh: input.title_zh,
    imageUrl: input.image_url,
    linkType: input.link_type,
    linkTarget: input.link_target,
    cityCode: input.city_code,
    sortOrder: input.sort_order,
    status: input.status,
    startAt: input.start_at,
    endAt: input.end_at,
  };
  return prisma.banner.create({ data });
}

export async function updateBanner(id, input) {
  const data = {
    titleKm: input.title_km,
    titleEn: input.title_en,
    titleZh: input.title_zh,
    imageUrl: input.image_url,
    linkType: input.link_type,
    linkTarget: input.link_target,
    cityCode: input.city_code,
    sortOrder: input.sort_order,
    status: input.status,
    startAt: input.start_at,
    endAt: input.end_at,
  };
  return prisma.banner.update({ where: { id }, data });
}

export async function toggleBanner(id) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw new AppError('Banner 不存在', 404, 'NOT_FOUND');
  const nextStatus = banner.status === 'active' ? 'inactive' : 'active';
  return prisma.banner.update({ where: { id }, data: { status: nextStatus } });
}

export async function listActiveBanners(clientPrisma = prisma, cityCode, now = new Date()) {
  const cityOr = [{ cityCode: null }];
  if (cityCode) cityOr.push({ cityCode });
  const items = await clientPrisma.banner.findMany({
    where: {
      status: 'active',
      OR: cityOr,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: { sortOrder: 'asc' },
    take: 5,
  });
  return items;
}

// ---------- Cities ----------

export async function listCities({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  return prisma.city.findMany({ where, orderBy: { sortOrder: 'asc' } });
}

export async function createCity(input) {
  const data = {
    code: input.code,
    nameKm: input.name_km,
    nameEn: input.name_en,
    nameZh: input.name_zh,
    sortOrder: input.sort_order,
    status: input.status,
  };
  return prisma.$transaction(async (tx) => {
    const city = await tx.city.create({ data });
    await tx.deliveryRule.create({
      data: {
        cityCode: city.code,
        minOrderAmountUsd: 4.00,
        shippingFeeUsd: 1.00,
        freeShippingThresholdUsd: 0,
        estimatedDeliveryDays: 2,
        status: 'active',
      },
    });
    return city;
  });
}

export async function updateCity(code, input) {
  const data = {
    code: input.code,
    nameKm: input.name_km,
    nameEn: input.name_en,
    nameZh: input.name_zh,
    sortOrder: input.sort_order,
    status: input.status,
  };
  return prisma.city.update({ where: { code }, data });
}

export async function toggleCity(code) {
  return prisma.$transaction(async (tx) => {
    const city = await tx.city.findUnique({ where: { code } });
    if (!city) throw new AppError('城市不存在', 404, 'NOT_FOUND');

    // 若准备禁用城市，先对当前所有启用城市加行锁，防止并发下同时禁用最后一个启用城市。
    // 注意：该锁依赖 PostgreSQL 的 SELECT FOR UPDATE，仅在事务内生效。
    if (city.status === 'active') {
      await tx.$queryRaw(Prisma.sql`SELECT * FROM "cities" WHERE status = 'active' FOR UPDATE`);
    }

    const activeCount = await tx.city.count({ where: { status: 'active' } });
    if (city.status === 'active' && activeCount <= 1) {
      throw new AppError('至少保留一个启用城市', 400, 'VALIDATION_ERROR');
    }
    const nextStatus = city.status === 'active' ? 'inactive' : 'active';
    return tx.city.update({ where: { code }, data: { status: nextStatus } });
  });
}

// ---------- Delivery Rules ----------

export async function listDeliveryRules() {
  return prisma.deliveryRule.findMany({
    include: { city: { select: { nameKm: true, nameEn: true, nameZh: true, status: true } } },
    orderBy: { city: { sortOrder: 'asc' } },
  });
}

export async function upsertDeliveryRule(cityCode, input) {
  const data = {
    minOrderAmountUsd: input.min_order_amount_usd,
    shippingFeeUsd: input.shipping_fee_usd,
    freeShippingThresholdUsd: input.free_shipping_threshold_usd,
    estimatedDeliveryDays: input.estimated_delivery_days,
    status: input.status,
  };
  return prisma.deliveryRule.upsert({
    where: { cityCode },
    update: data,
    create: { cityCode, ...data },
  });
}

export async function toggleDeliveryRule(id) {
  const rule = await prisma.deliveryRule.findUnique({ where: { id } });
  if (!rule) throw new AppError('配送规则不存在', 404, 'NOT_FOUND');
  const nextStatus = rule.status === 'active' ? 'inactive' : 'active';
  return prisma.deliveryRule.update({ where: { id }, data: { status: nextStatus } });
}

export function calculateShippingFee(subtotalUsd, rule) {
  if (!rule) return 0;
  const threshold = Number(rule.freeShippingThresholdUsd);
  if (threshold > 0 && subtotalUsd >= threshold) return 0;
  return Number(rule.shippingFeeUsd);
}

export async function getActiveDeliveryRule(clientPrisma = prisma, cityCode) {
  return clientPrisma.deliveryRule.findFirst({
    where: { cityCode, status: 'active' },
  });
}

// ---------- Customer Services ----------

export async function listCustomerServices({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  return prisma.customerService.findMany({ where, orderBy: { sortOrder: 'asc' } });
}

export async function createCustomerService(input) {
  const data = {
    nameKm: input.name_km,
    nameEn: input.name_en,
    nameZh: input.name_zh,
    telegramUsername: input.telegram_username,
    phone: input.phone,
    workHours: input.work_hours,
    sortOrder: input.sort_order,
    status: input.status,
  };
  return prisma.customerService.create({ data });
}

export async function updateCustomerService(id, input) {
  const data = {
    nameKm: input.name_km,
    nameEn: input.name_en,
    nameZh: input.name_zh,
    telegramUsername: input.telegram_username,
    phone: input.phone,
    workHours: input.work_hours,
    sortOrder: input.sort_order,
    status: input.status,
  };
  return prisma.customerService.update({ where: { id }, data });
}

export async function toggleCustomerService(id) {
  const cs = await prisma.customerService.findUnique({ where: { id } });
  if (!cs) throw new AppError('客服账号不存在', 404, 'NOT_FOUND');
  const nextStatus = cs.status === 'active' ? 'inactive' : 'active';
  return prisma.customerService.update({ where: { id }, data: { status: nextStatus } });
}

export async function setDefaultCustomerService(id) {
  return prisma.$transaction(async (tx) => {
    const cs = await tx.customerService.findUnique({ where: { id } });
    if (!cs) throw new AppError('客服账号不存在', 404, 'NOT_FOUND');
    await tx.customerService.updateMany({ data: { isDefault: false } });
    return tx.customerService.update({ where: { id }, data: { isDefault: true, status: 'active' } });
  });
}

export async function getDefaultCustomerService() {
  return prisma.customerService.findFirst({
    where: { status: 'active', isDefault: true },
  });
}
