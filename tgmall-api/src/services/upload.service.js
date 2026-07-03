// 文件上传服务 —— 接收 base64 图片，保存到本地 uploads 目录
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { AppError } from '../utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

const ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function detectMime(base64) {
  const match = base64.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : null;
}

function stripPrefix(base64) {
  return base64.replace(/^data:image\/\w+;base64,/, '');
}

export async function uploadBase64Image(base64, folder = 'images') {
  if (!base64 || typeof base64 !== 'string') {
    throw new AppError('缺少图片数据', 400, 'MISSING_IMAGE');
  }

  const mime = detectMime(base64);
  if (!mime || !ALLOWED_MIME[mime]) {
    throw new AppError('仅支持 jpeg/png/webp/gif 图片', 400, 'INVALID_IMAGE_TYPE');
  }

  const buffer = Buffer.from(stripPrefix(base64), 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    throw new AppError('图片大小超过 5MB 限制', 413, 'IMAGE_TOO_LARGE');
  }

  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ALLOWED_MIME[mime]}`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buffer);

  return `/uploads/${folder}/${filename}`;
}
