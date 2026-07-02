// 意见反馈 API
import api from './index.js';

export function submitFeedback(content, images = []) {
  return api.post('/feedback', { content, images });
}
