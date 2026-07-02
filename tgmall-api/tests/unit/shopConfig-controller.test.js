import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { validate } from '../../src/middleware/validate.js';
import { categorySchema } from '../../src/validators/shopConfig.schema.js';

const mockShopConfig = {
  listActiveCategories: jest.fn(),
  listActiveBanners: jest.fn(),
  getActiveDeliveryRule: jest.fn(),
  createCategory: jest.fn(),
};

jest.unstable_mockModule('../../src/services/shopConfig.service.js', () => mockShopConfig);

const ctrl = await import('../../src/controllers/shopConfig.controller.js');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function createNext() {
  return jest.fn();
}

describe('shopConfig.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /categories 返回 active 品类列表', async () => {
    const items = [{ code: 'food', nameKm: 'អាហារ' }];
    mockShopConfig.listActiveCategories.mockResolvedValue(items);
    const req = {};
    const res = createRes();
    const next = createNext();

    await ctrl.publicCategories(req, res, next);

    expect(mockShopConfig.listActiveCategories).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: items });
    expect(next).not.toHaveBeenCalled();
  });

  it('GET /banners?city=phnom_penh 返回 active 轮播图', async () => {
    const items = [{ id: 'b1', titleKm: 'A' }];
    mockShopConfig.listActiveBanners.mockResolvedValue(items);
    const req = { query: { city: 'phnom_penh' } };
    const res = createRes();
    const next = createNext();

    await ctrl.publicBanners(req, res, next);

    expect(mockShopConfig.listActiveBanners).toHaveBeenCalledWith(undefined, 'phnom_penh', expect.any(Date));
    expect(res.json).toHaveBeenCalledWith({ success: true, data: items });
    expect(next).not.toHaveBeenCalled();
  });

  it('GET /delivery-rules/:cityCode 返回对应配送规则', async () => {
    const rule = { id: 'r1', cityCode: 'phnom_penh' };
    mockShopConfig.getActiveDeliveryRule.mockResolvedValue(rule);
    const req = { params: { cityCode: 'phnom_penh' } };
    const res = createRes();
    const next = createNext();

    await ctrl.publicDeliveryRule(req, res, next);

    expect(mockShopConfig.getActiveDeliveryRule).toHaveBeenCalledWith(undefined, 'phnom_penh');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: rule });
    expect(next).not.toHaveBeenCalled();
  });

  it('GET /delivery-rules/:cityCode 无规则时返回 404', async () => {
    mockShopConfig.getActiveDeliveryRule.mockResolvedValue(null);
    const req = { params: { cityCode: 'unknown' } };
    const res = createRes();
    const next = createNext();

    await ctrl.publicDeliveryRule(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('NOT_FOUND');
    expect(err.message).toBe('Delivery rule not found');
  });

  it('Admin POST /admin/categories 合法请求调用 createCategory 并返回 201', async () => {
    const validatedBody = {
      code: 'food',
      name_km: 'អាហារ',
      name_en: 'Food',
      sort_order: 1,
      status: 'active',
    };
    const created = { code: 'food', nameKm: 'អាហារ' };
    mockShopConfig.createCategory.mockResolvedValue(created);
    const req = { validatedBody };
    const res = createRes();
    const next = createNext();

    await ctrl.createCategory(req, res, next);

    expect(mockShopConfig.createCategory).toHaveBeenCalledWith(validatedBody);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: created });
    expect(next).not.toHaveBeenCalled();
  });

  it('Admin POST /admin/categories 非法请求返回 400', async () => {
    const req = { body: { code: '', name_km: '' } };
    const res = createRes();
    const next = createNext();

    const middleware = validate(categorySchema);
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe('VALIDATION_ERROR');
  });
});
