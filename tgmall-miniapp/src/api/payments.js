// 支付 API
import api from './index.js';

/** POST /payments/khqr — 生成 KHQR 支付二维码 */
export const createKHQRPayment = (orderId) => api.post('/payments/khqr', { order_id: orderId });

/** POST /payments/aba_pay — 发起 ABA Pay 支付 */
export const createABAPayPayment = (orderId) => api.post('/payments/aba_pay', { order_id: orderId });

/** POST /payments/wing_pay — 发起 Wing Pay 支付 */
export const createWingPayPayment = (orderId) => api.post('/payments/wing_pay', { order_id: orderId });

/** POST /payments/telegram_invoice — 发起 Telegram Invoice 支付 */
export const createTelegramInvoicePayment = (orderId) => api.post('/payments/telegram_invoice', { order_id: orderId });

/** GET /payments/status/:orderId — 查询支付状态（前端轮询） */
export const getPaymentStatus = (orderId) => api.get(`/payments/status/${orderId}`);
