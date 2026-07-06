// 种子脚本: 确保默认管理员存在且密码正确
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

(async () => {
  try {
    const existing = await p.adminUser.findFirst().catch(() => null);
    const envPassword = process.env.ADMIN_PASSWORD;

    if (envPassword) {
      // 如果环境变量是明文密码，自动 bcrypt；如果已是 bcrypt hash（以 $2a$/$2b$/$2y$ 开头），直接存储
      const isAlreadyHash = /^\$2[aby]\$\d+\$/.test(envPassword);
      const passwordHash = isAlreadyHash ? envPassword : await bcrypt.hash(envPassword, 10);

      if (existing) {
        await p.adminUser.update({
          where: { id: existing.id },
          data: { passwordHash },
        });
        console.log('✅ Admin password updated (from ADMIN_PASSWORD)');
      } else {
        await p.adminUser.create({
          data: {
            username: 'admin',
            passwordHash,
            displayName: '管理员',
            role: 'admin',
          },
        });
        console.log('✅ Default admin created (ADMIN_PASSWORD)');
      }
    } else {
      const isProd = process.env.NODE_ENV === 'production';

      if (isProd) {
        // 生产环境必须设置 ADMIN_PASSWORD，拒绝创建默认密码管理员
        if (existing) {
          console.log('⚠️  Admin user exists but ADMIN_PASSWORD is not set — password unchanged');
        } else {
          console.error('❌ PRODUCTION: ADMIN_PASSWORD is required to create admin user. Skipping.');
        }
      } else {
        // 非生产环境: 使用默认密码 admin123（仅开发/测试用）
        const defaultHash = await bcrypt.hash('admin123', 10);
        if (existing) {
          await p.adminUser.update({
            where: { id: existing.id },
            data: { passwordHash: defaultHash },
          });
          console.log('✅ Admin password reset to default (admin123) [dev only]');
        } else {
          await p.adminUser.create({
            data: {
              username: 'admin',
              passwordHash: defaultHash,
              displayName: '管理员',
              role: 'admin',
            },
          });
          console.log('✅ Default admin created (admin / admin123) [dev only]');
        }
      }
    }
  } catch (e) {
    console.error('种子失败:', e.message);
  } finally {
    await p.$disconnect().catch(() => {});
  }
})();
