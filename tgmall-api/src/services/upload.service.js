// 文件上传服务 —— 接收 base64 图片，压缩转 WebP 后上传至 S3/R2/CDN
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/index.js';
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

const S3_ENABLED = Boolean(config.aws.accessKeyId && config.aws.secretAccessKey && config.aws.s3Bucket);

let s3Client = null;
if (S3_ENABLED) {
  s3Client = new S3Client({
    region: config.aws.region,
    ...(config.aws.s3Endpoint ? { endpoint: config.aws.s3Endpoint } : {}),
    forcePathStyle: config.aws.s3ForcePathStyle,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });
}

function detectMime(base64) {
  const match = base64.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : null;
}

function stripPrefix(base64) {
  return base64.replace(/^data:image\/\w+;base64,/, '');
}

async function saveLocal(buffer, folder, ext) {
  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buffer);
  return `/uploads/${folder}/${filename}`;
}

async function uploadToS3(buffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
  });
  await s3Client.send(command);
  const base = config.cdnBaseUrl || `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com`;
  return `${base.replace(/\/$/, '')}/${key}`;
}

export async function uploadBase64Image(base64, folder = 'images') {
  if (!base64 || typeof base64 !== 'string') {
    throw new AppError('缺少图片数据', 400, 'MISSING_IMAGE');
  }

  const mime = detectMime(base64);
  if (!mime || !ALLOWED_MIME[mime]) {
    throw new AppError('仅支持 jpeg/png/webp/gif 图片', 400, 'INVALID_IMAGE_TYPE');
  }

  let buffer = Buffer.from(stripPrefix(base64), 'base64');
  if (buffer.length > 5 * 1024 * 1024) {
    throw new AppError('图片大小超过 5MB 限制', 413, 'IMAGE_TOO_LARGE');
  }

  const isGif = mime === 'image/gif';
  let contentType = 'image/webp';
  let ext = 'webp';

  if (!isGif) {
    // 压缩并转为 WebP：质量 85，最大边 1200px
    buffer = await sharp(buffer)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } else {
    // GIF 保持原图，避免破坏动图
    contentType = 'image/gif';
    ext = 'gif';
  }

  const key = `${folder}/${crypto.randomUUID()}.${ext}`;

  if (S3_ENABLED) {
    try {
      const url = await uploadToS3(buffer, key, contentType);
      return url;
    } catch (err) {
      console.error('[Upload] S3 上传失败，回退本地存储:', err.message);
      // 回退本地，避免上传失败阻塞业务
      return saveLocal(buffer, folder, ext);
    }
  }

  return saveLocal(buffer, folder, ext);
}
