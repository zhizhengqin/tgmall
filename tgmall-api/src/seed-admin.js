// 种子脚本: 创建默认管理员
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

(async () => {
  try {
    // 检查表是否存在
    const existing = await p.adminUser.findFirst().catch(() => null);
    if (existing) {
      console.log('✅ 管理员已存在，跳过种子');
      await p.$disconnect();
      return;
    }

    const envHash = process.env.ADMIN_PASSWORD;
    let passwordHash;

    if (envHash) {
      console.log('✅ 使用 ADMIN_PASSWORD 环境变量');
      passwordHash = envHash;
    } else {
      console.log('⚠️ ADMIN_PASSWORD 未设置，使用默认密码 admin123');
      passwordHash = await bcrypt.hash('admin123', 10);
    }

    await p.adminUser.create({
      data: {
        username: 'admin',
        passwordHash,
        displayName: '管理员',
        role: 'admin',
      },
    });

    console.log('✅ 默认管理员已创建 (admin)');
  } catch (e) {
    console.error('种子失败:', e.message);
    // 不要让种子失败阻塞启动
  } finally {
    await p.$disconnect().catch(() => {});
  }
})();
