// 收货地址控制器
import * as addressService from '../services/address.service.js';

export async function list(req, res, next) {
  try {
    const addresses = await addressService.getUserAddresses(req.user.userId);
    res.json({ success: true, data: addresses });
  } catch (err) { next(err); }
}

export async function create(req, res, next) {
  try {
    const addr = await addressService.createAddress(req.user.userId, req.validatedBody);
    res.status(201).json({ success: true, data: addr });
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const addr = await addressService.updateAddress(req.user.userId, req.params.id, req.validatedBody);
    res.json({ success: true, data: addr });
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await addressService.deleteAddress(req.user.userId, req.params.id);
    res.json({ success: true, data: { message: '地址已删除' } });
  } catch (err) { next(err); }
}
