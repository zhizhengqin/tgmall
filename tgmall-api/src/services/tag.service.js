// 标签管理服务
import prisma from '../config/database.js';

export async function listTags({ status } = {}) {
  const where = {};
  if (status) where.status = status;
  const tags = await prisma.tag.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  return tags;
}

export async function createTag(input) {
  const tag = await prisma.tag.create({
    data: {
      textKm: input.text_km, textEn: input.text_en, textZh: input.text_zh,
      color: input.color || '#c4932a', bg: input.bg || 'rgba(196,147,42,0.08)',
      sortOrder: input.sort_order ?? 0, status: input.status || 'active',
    },
  });
  return tag;
}

export async function updateTag(id, input) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) throw Object.assign(new Error('标签不存在'), { statusCode: 404, code: 'NOT_FOUND' });
  const data = {};
  if (input.text_km !== undefined) data.textKm = input.text_km;
  if (input.text_en !== undefined) data.textEn = input.text_en;
  if (input.text_zh !== undefined) data.textZh = input.text_zh;
  if (input.color !== undefined) data.color = input.color;
  if (input.bg !== undefined) data.bg = input.bg;
  if (input.sort_order !== undefined) data.sortOrder = input.sort_order;
  if (input.status !== undefined) data.status = input.status;
  return prisma.tag.update({ where: { id }, data });
}

export async function deleteTag(id) {
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) throw Object.assign(new Error('标签不存在'), { statusCode: 404, code: 'NOT_FOUND' });
  await prisma.tag.delete({ where: { id } });
  return { success: true };
}
