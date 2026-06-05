// 支付控制器 — KHQR / ABA Pay / Wing Pay
import * as paymentService from '../services/payment.service.js';

/** POST /payments/khqr — 生成 KHQR 支付二维码 */
export async function khqr(req, res, next) {
  try {
    const result = await paymentService.createKHQRPayment(
      req.user.userId,
      req.validatedBody.order_id,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** GET /payments/status/:orderId — 查询支付状态（前端轮询） */
export async function status(req, res, next) {
  try {
    const result = await paymentService.getPaymentStatus(
      req.user.userId,
      req.params.orderId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
