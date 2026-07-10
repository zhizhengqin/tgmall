// 上传服务单元测试
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { uploadBase64Image } from '../../src/services/upload.service.js';

async function createBase64Image(mime = 'image/jpeg') {
  const buffer = await sharp({
    create: { width: 100, height: 100, channels: 3, background: 'red' },
  })
    .toFormat(mime.split('/')[1])
    .toBuffer();
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

describe('upload.service', () => {
  let createdFiles = [];

  afterAll(async () => {
    for (const f of createdFiles) {
      try { await fs.unlink(f); } catch {}
    }
  });

  it('未配置 S3 时保存为本地 WebP 并返回 /uploads 路径', async () => {
    const base64 = await createBase64Image('image/jpeg');
    const url = await uploadBase64Image(base64, 'test');

    expect(url).toMatch(/^\/uploads\/test\/[\w-]+\.webp$/);

    const filepath = path.resolve(process.cwd(), url.slice(1));
    const stat = await fs.stat(filepath);
    expect(stat.isFile()).toBe(true);
    createdFiles.push(filepath);
  });

  it('不支持的图片类型应抛错', async () => {
    const base64 = 'data:image/bmp;base64,xxxx';
    await expect(uploadBase64Image(base64)).rejects.toMatchObject({
      errorCode: 'INVALID_IMAGE_TYPE',
    });
  });

  it('GIF 保持原格式', async () => {
    // 构造一个最小 gif（1x1 透明）
    const gifBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64',
    );
    const base64 = `data:image/gif;base64,${gifBuffer.toString('base64')}`;
    const url = await uploadBase64Image(base64, 'test');

    expect(url).toMatch(/^\/uploads\/test\/[\w-]+\.gif$/);
    const filepath = path.resolve(process.cwd(), url.slice(1));
    expect(await fs.stat(filepath).then((s) => s.isFile())).toBe(true);
    createdFiles.push(filepath);
  });
});
