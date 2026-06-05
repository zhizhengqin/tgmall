// 优惠券控制器
import * as couponService from '../services/coupon.service.js';

export async function list(_req, res, next) {
  try {
    const coupons = await couponService.getAvailableCoupons();
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
}

export async function claim(req, res, next) {
  try {
    const result = await couponService.claimCoupon(req.user.userId, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function myCoupons(req, res, next) {
  try {
    const { status = 'unused' } = req.query;
    const coupons = await couponService.getUserCoupons(req.user.userId, status);
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
}
