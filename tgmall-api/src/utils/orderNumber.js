// 订单号生成器：ORD-YYYYMMDD-XXXXXX
import crypto from 'crypto';

export function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `ORD-${date}-${random}`;
}
