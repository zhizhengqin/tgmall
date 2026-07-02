// 库存服务单元测试
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock prisma with ESM-compatible approach
const mockPrismaProduct = {
  findUnique: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
};

const mockStockLog = {
  create: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

const mockInventoryCheck = {
  create: jest.fn(),
};

const mockTx = {
  product: {
    update: jest.fn(),
  },
  stockLog: {
    create: jest.fn(),
  },
  inventoryCheck: {
    create: jest.fn(),
  },
};

const mockPrisma = {
  product: mockPrismaProduct,
  stockLog: mockStockLog,
  inventoryCheck: mockInventoryCheck,
  $transaction: jest.fn((fn) => fn(mockTx)),
};

jest.unstable_mockModule('../../src/config/database.js', () => ({
  __esModule: true,
  default: mockPrisma,
}));

describe('Inventory Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('adjustStock', () => {
    it('调整库存并记录 StockLog', async () => {
      const { adjustStock } = await import('../../src/services/inventory.service.js');

      mockPrismaProduct.findUnique
        .mockResolvedValueOnce({ id: 'p1', stock: 10 })
        .mockResolvedValueOnce({ id: 'p1', stock: 25, status: 'active', alertThreshold: null });

      const result = await adjustStock('p1', 25, 'admin1', '补货');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.stock).toBe(25);
    });

    it('库存归零时调用事务处理并下架', async () => {
      const { adjustStock } = await import('../../src/services/inventory.service.js');

      mockPrismaProduct.findUnique
        .mockResolvedValueOnce({ id: 'p1', stock: 5 })
        .mockResolvedValueOnce({ id: 'p1', stock: 0, status: 'inactive', alertThreshold: null });

      const result = await adjustStock('p1', 0, 'admin1', null);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.status).toBe('inactive');
      expect(result.stock).toBe(0);
    });
  });

  describe('checkInventory', () => {
    it('盘点无差异时仅创建 InventoryCheck 记录', async () => {
      const { checkInventory } = await import('../../src/services/inventory.service.js');

      mockPrismaProduct.findUnique.mockResolvedValue({ id: 'p1', stock: 50, nameKm: '测试商品' });

      await checkInventory({ productId: 'p1', actualQty: 50, checkedBy: 'admin1', note: '月度盘点' });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('盘点有差异时自动调整库存', async () => {
      const { checkInventory } = await import('../../src/services/inventory.service.js');

      mockPrismaProduct.findUnique.mockResolvedValue({ id: 'p1', stock: 50, nameKm: '测试商品' });

      await checkInventory({ productId: 'p1', actualQty: 48, checkedBy: 'admin1', note: null });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('setAlertThreshold', () => {
    it('设置预警阈值', async () => {
      const { setAlertThreshold } = await import('../../src/services/inventory.service.js');

      mockPrismaProduct.findUnique.mockResolvedValue({ id: 'p1', stock: 20 });
      mockPrismaProduct.update.mockResolvedValue({ id: 'p1', nameKm: 'test', stock: 20, alertThreshold: 5, status: 'active' });

      const r = await setAlertThreshold('p1', 5);
      expect(r.alertThreshold).toBe(5);
    });

    it('null 关闭预警', async () => {
      const { setAlertThreshold } = await import('../../src/services/inventory.service.js');

      mockPrismaProduct.findUnique.mockResolvedValue({ id: 'p1', stock: 20 });
      mockPrismaProduct.update.mockResolvedValue({ id: 'p1', nameKm: 'test', stock: 20, alertThreshold: null, status: 'active' });

      const r = await setAlertThreshold('p1', null);
      expect(r.alertThreshold).toBeNull();
    });
  });

  describe('listInventory', () => {
    it('返回库存列表（分页）', async () => {
      const { listInventory } = await import('../../src/services/inventory.service.js');

      mockPrismaProduct.findMany.mockResolvedValue([]);
      mockPrismaProduct.count.mockResolvedValue(0);

      const result = await listInventory({ page: 1, limit: 20 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.total).toBe(0);
    });
  });

  describe('getStockLogs', () => {
    it('返回分页日志', async () => {
      const { getStockLogs } = await import('../../src/services/inventory.service.js');

      mockStockLog.findMany.mockResolvedValue([]);
      mockStockLog.count.mockResolvedValue(0);

      const result = await getStockLogs('p1', { page: 1, limit: 20 });
      expect(result).toHaveProperty('items');
      expect(result.total).toBe(0);
    });
  });
});
