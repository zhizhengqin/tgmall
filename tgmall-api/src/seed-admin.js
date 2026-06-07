// 种子脚本: 创建默认管理员
// 独立文件避免 shell 变量展开破坏 bcrypt 哈希
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

(async () => {
  try {
    const existing = await p.adminUser.findFirst();
    if (existing) {
      console.log('✅ 管理员已存在，跳过种子');
      await p.$disconnect();
      return;
    }

    const hash = process.env.ADMIN_PASSWORD;
    if (!hash) {
      console.warn('⚠️ ADMIN_PASSWORD 未设置，使用默认密码');
      // 默认密码: admin123 (仅开发用)
      const bcrypt = await import('bcryptjs');
      const defaultHash = await bcrypt.hash('admin123', 10);
      await p.adminUser.create({
        data: {
          username: 'admin',
          passwordHash: defaultHash,
          displayName: '管理员',
          role: 'admin',
        },
      });
    } else {
      await p.adminUser.create({
        data: {
          username: 'admin',
          passwordHash: hash,
          displayName: '管理员',
          role: 'admin',
        },
      });
    }

    console.log('✅ 默认管理员已创建 (admin)');
  } catch (e) {
    console.error('种子失败:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
