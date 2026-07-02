// 城市模块 API
import api from './index.js';

export function listCities() {
  return api.get('/cities');
}

export function getNearestCity(lat, lng) {
  return api.get('/cities/nearest', { params: { lat, lng } });
}

export function updateUserCity(cityCode) {
  return api.put('/cities/users/me/city', { cityCode });
}
