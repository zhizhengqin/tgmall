// 城市控制器
import * as cityService from '../services/city.service.js';
import prisma from '../config/database.js';

export async function listCities(_req, res, next) {
  try {
    const cities = await cityService.listCities();
    res.json({ success: true, data: cities });
  } catch (err) { next(err); }
}

export async function nearestCity(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (isNaN(lat) || isNaN(lng)) {
      return res.json({ success: true, data: null, message: '缺少有效坐标' });
    }
    const city = await cityService.findNearestCity(lat, lng);
    res.json({ success: true, data: city });
  } catch (err) { next(err); }
}

export async function updateUserCity(req, res, next) {
  try {
    const { cityCode } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { cityCode },
    });
    res.json({ success: true, data: { cityCode: user.cityCode } });
  } catch (err) { next(err); }
}
