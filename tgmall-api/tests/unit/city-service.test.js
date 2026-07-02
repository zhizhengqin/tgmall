// City 服务单元测试 — Haversine 距离计算 + 最近城市匹配
import { describe, it, expect } from '@jest/globals';

// Haversine 公式（从 city.service.js 副本，纯函数无外部依赖）
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestCityFromList(lat, lng, cities) {
  let nearest = null;
  let minDist = Infinity;
  for (const city of cities) {
    const dist = haversineKm(lat, lng, city.lat, city.lng);
    if (dist < minDist) { minDist = dist; nearest = city; }
  }
  return minDist <= 50 ? nearest : null;
}

const TEST_CITIES = [
  { code: 'phnom_penh', nameKm: 'ភ្នំពេញ', lat: 11.562, lng: 104.889 },
  { code: 'siem_reap', nameKm: 'សៀមរាប', lat: 13.363, lng: 103.856 },
  { code: 'sihanoukville', nameKm: 'ក្រុងព្រះសីហនុ', lat: 10.625, lng: 103.523 },
];

describe('City 服务 — Haversine', () => {
  it('TC-CT-001: 金边到暹粒距离 ~230km', () => {
    const dist = haversineKm(11.562, 104.889, 13.363, 103.856);
    expect(dist).toBeGreaterThan(200);
    expect(dist).toBeLessThan(300);
  });

  it('TC-CT-002: 同一点距离为 0', () => {
    expect(haversineKm(11.562, 104.889, 11.562, 104.889)).toBe(0);
  });

  it('TC-CT-003: 金边附近坐标匹配金边', () => {
    const result = findNearestCityFromList(11.55, 104.92, TEST_CITIES);
    expect(result).not.toBeNull();
    expect(result.code).toBe('phnom_penh');
  });

  it('TC-CT-004: 暹粒坐标匹配暹粒', () => {
    const result = findNearestCityFromList(13.36, 103.86, TEST_CITIES);
    expect(result).not.toBeNull();
    expect(result.code).toBe('siem_reap');
  });

  it('TC-CT-005: 超过 50km 阈值返回 null（曼谷坐标）', () => {
    const result = findNearestCityFromList(13.75, 100.50, TEST_CITIES);
    expect(result).toBeNull();
  });
});
