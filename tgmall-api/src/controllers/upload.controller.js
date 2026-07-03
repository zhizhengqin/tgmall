// 上传控制器
import { uploadBase64Image } from '../services/upload.service.js';

export async function uploadImage(req, res, next) {
  try {
    const { image, folder = 'images' } = req.body;
    const url = await uploadBase64Image(image, folder);
    res.json({ success: true, data: { url } });
  } catch (err) { next(err); }
}
