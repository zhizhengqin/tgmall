// 系统配置服务 — 平台设置 + 管理员账号管理
import prisma from '../config/database.js';
import bcrypt from 'bcrypt';

// ---- 平台设置 (SystemSetting key-value) ----

const PLATFORM_KEYS = [
  'store_name', 'store_logo', 'contact_phone', 'contact_email',
  'maintenance_mode', 'announcement_text', 'login_banner_image',
  'exchange_rate',
];

export async function getPlatformSettings() {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: PLATFORM_KEYS } },
  });
  const map = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    storeName: map.store_name || 'TG Mall',
    storeLogo: map.store_logo || '',
    contactPhone: map.contact_phone || '',
    contactEmail: map.contact_email || '',
    maintenanceMode: map.maintenance_mode === 'true',
    announcement: map.announcement_text || '',
    loginBannerImage: map.login_banner_image || '',
    exchangeRate: Number(map.exchange_rate) || 4000,
  };
}

export async function updatePlatformSettings(input) {
  const pairs = [];
  if (input.store_name !== undefined) pairs.push({ key: 'store_name', value: input.store_name });
  if (input.store_logo !== undefined) pairs.push({ key: 'store_logo', value: input.store_logo });
  if (input.contact_phone !== undefined) pairs.push({ key: 'contact_phone', value: input.contact_phone });
  if (input.contact_email !== undefined) pairs.push({ key: 'contact_email', value: input.contact_email });
  if (input.maintenance_mode !== undefined) pairs.push({ key: 'maintenance_mode', value: String(input.maintenance_mode) });
  if (input.announcement !== undefined) pairs.push({ key: 'announcement_text', value: input.announcement });
  if (input.login_banner_image !== undefined) pairs.push({ key: 'login_banner_image', value: input.login_banner_image });
  if (input.exchange_rate !== undefined) pairs.push({ key: 'exchange_rate', value: String(input.exchange_rate) });

  for (const p of pairs) {
    await prisma.systemSetting.upsert({
      where: { key: p.key },
      create: { key: p.key, value: p.value },
      update: { value: p.value },
    });
  }
  return getPlatformSettings();
}

/** 获取当前 USD→KHR 汇率（带缓存） */
export async function getExchangeRate() {
  const settings = await getPlatformSettings();
  const rate = Number(settings.exchangeRate);
  return Number.isFinite(rate) && rate > 0 ? rate : 4000;
}

// ---- 管理员账号管理 ----

export async function listAdminUsers() {
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, displayName: true, role: true, status: true, createdAt: true },
  });
  return users;
}

export async function createAdminUser({ username, password, displayName }) {
  const exists = await prisma.adminUser.findUnique({ where: { username } });
  if (exists) throw Object.assign(new Error('用户名已存在'), { statusCode: 409, code: 'DUPLICATE' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.create({
    data: { username, passwordHash, displayName: displayName || username, role: 'admin', status: 'active' },
    select: { id: true, username: true, displayName: true, role: true, status: true, createdAt: true },
  });
  return user;
}

export async function resetAdminPassword(id, newPassword) {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) throw Object.assign(new Error('管理员不存在'), { statusCode: 404, code: 'NOT_FOUND' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.adminUser.update({
    where: { id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  return { success: true };
}

export async function toggleAdminStatus(id) {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) throw Object.assign(new Error('管理员不存在'), { statusCode: 404, code: 'NOT_FOUND' });

  const newStatus = user.status === 'active' ? 'disabled' : 'active';
  await prisma.adminUser.update({
    where: { id },
    data: {
      status: newStatus,
      // 禁用时递增 tokenVersion，使该管理员所有已签发 JWT 立即失效
      ...(newStatus === 'disabled' ? { tokenVersion: { increment: 1 } } : {}),
    },
  });
  return { id, status: newStatus };
}

export async function deleteAdminUser(id) {
  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) throw Object.assign(new Error('管理员不存在'), { statusCode: 404, code: 'NOT_FOUND' });

  // 不允许删除最后一个 active admin
  const activeCount = await prisma.adminUser.count({ where: { status: 'active' } });
  if (activeCount <= 1 && user.status === 'active') {
    throw Object.assign(new Error('不能删除最后一个活跃管理员'), { statusCode: 400, code: 'LAST_ADMIN' });
  }

  await prisma.adminUser.delete({ where: { id } });
  return { success: true };
}
