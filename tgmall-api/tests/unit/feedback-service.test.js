// Feedback 服务单元测试 — 提交反馈 / 工单列表 / 标记已处理
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const prismaMock = {
  feedbackTicket: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

async function submitFeedback(userId, content, images = []) {
  if (!content || content.trim().length === 0) {
    throw new AppError('反馈内容不能为空', 400, 'VALIDATION_ERROR');
  }
  if (content.length > 500) {
    throw new AppError('反馈内容不能超过 500 字', 400, 'VALIDATION_ERROR');
  }
  if (images.length > 3) {
    throw new AppError('最多上传 3 张图片', 400, 'VALIDATION_ERROR');
  }
  return prismaMock.feedbackTicket.create({
    data: { userId, content: content.trim(), images, status: 'pending' },
  });
}

async function listFeedback(page = 1, limit = 20, status) {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;
  const [items, total] = await Promise.all([
    prismaMock.feedbackTicket.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, username: true, phone: true } },
      },
    }),
    prismaMock.feedbackTicket.count({ where }),
  ]);
  return { items, total };
}

async function resolveTicket(id) {
  const ticket = await prismaMock.feedbackTicket.findUnique({ where: { id } });
  if (!ticket) throw new AppError('工单不存在', 404, 'NOT_FOUND');
  return prismaMock.feedbackTicket.update({
    where: { id },
    data: { status: 'resolved', resolvedAt: new Date() },
  });
}

describe('Feedback 服务', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TC-FB-001: submitFeedback — 提交成功', async () => {
    prismaMock.feedbackTicket.create.mockResolvedValue({
      id: 'fb1', userId: 'u1', content: '商品很好用', images: [], status: 'pending',
    });

    const result = await submitFeedback('u1', '商品很好用');

    expect(result.status).toBe('pending');
    expect(result.content).toBe('商品很好用');
    expect(prismaMock.feedbackTicket.create).toHaveBeenCalledWith({
      data: { userId: 'u1', content: '商品很好用', images: [], status: 'pending' },
    });
  });

  it('TC-FB-002: submitFeedback — 内容为空抛出 VALIDATION_ERROR', async () => {
    await expect(submitFeedback('u1', ''))
      .rejects.toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
  });

  it('TC-FB-003: listFeedback — 管理员分页查询工单', async () => {
    const mockTicket = { id: 'fb1', userId: 'u1', content: '...', images: [], status: 'pending', user: { id: 'u1', firstName: 'Test', lastName: 'User' } };
    prismaMock.feedbackTicket.findMany.mockResolvedValue([mockTicket]);
    prismaMock.feedbackTicket.count.mockResolvedValue(1);

    const result = await listFeedback(1, 20, 'pending');

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].status).toBe('pending');
    expect(prismaMock.feedbackTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'pending' }, skip: 0, take: 20 }),
    );
  });

  it('TC-FB-004: resolveTicket — 标记工单为已处理', async () => {
    prismaMock.feedbackTicket.findUnique.mockResolvedValue({ id: 'fb1', status: 'pending' });
    prismaMock.feedbackTicket.update.mockResolvedValue({ id: 'fb1', status: 'resolved', resolvedAt: new Date() });

    const result = await resolveTicket('fb1');

    expect(result.status).toBe('resolved');
    expect(result.resolvedAt).toBeDefined();
    expect(prismaMock.feedbackTicket.update).toHaveBeenCalledWith({
      where: { id: 'fb1' },
      data: expect.objectContaining({ status: 'resolved' }),
    });
  });
});
