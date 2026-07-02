// 城市服务 — 列表查询 + Haversine 最近城市匹配
import prisma from '../config/database.js';

export async function listCities() {
  return prisma.city.findMany({
    where: { status: 'active' },
    orderBy: { sortOrder: 'asc' },
    select: { code: true, nameKm: true, nameEn: true, nameZh: true, lat: true, lng: true },
  });
}

/**
 * Haversine 公式计算两点间的球面距离（单位：km）
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // 地球半径 (km)
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEAREST_THRESHOLD_KM = 50;

/**
 * 根据 GPS 坐标查找最近城市
 * @param {number} lat — 纬度
 * @param {number} lng — 经度
 * @returns {object|null} 最近城市；超过 50km 阈值返回 null
 */
export async function findNearestCity(lat, lng) {
  if (lat == null || lng == null) return null;

  const cities = await prisma.city.findMany({
    where: { status: 'active', lat: { not: null }, lng: { not: null } },
    select: { code: true, nameKm: true, nameEn: true, nameZh: true, lat: true, lng: true },
  });

  if (cities.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;
  for (const city of cities) {
    const dist = haversineKm(lat, lng, city.lat, city.lng);
    if (dist < minDist) { minDist = dist; nearest = city; }
  }

  return minDist <= NEAREST_THRESHOLD_KM ? nearest : null;
}
