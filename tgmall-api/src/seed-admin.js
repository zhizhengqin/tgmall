// 种子脚本: 确保默认管理员存在且密码正确
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();

(async () => {
  try {
    const existing = await p.adminUser.findFirst().catch(() => null);
    const envHash = process.env.ADMIN_PASSWORD;

    if (envHash) {
      // 有环境变量: 创建或更新为指定密码
      if (existing) {
        await p.adminUser.update({
          where: { id: existing.id },
          data: { passwordHash: envHash },
        });
        console.log('✅ 管理员密码已更新（来自 ADMIN_PASSWORD）');
      } else {
        await p.adminUser.create({
          data: {
            username: 'admin',
            passwordHash: envHash,
            displayName: '管理员',
            role: 'admin',
          },
        });
        console.log('✅ 默认管理员已创建（ADMIN_PASSWORD）');
      }
    } else {
      // 无环境变量: 使用默认密码 admin123
      const defaultHash = await bcrypt.hash('admin123', 10);
      if (existing) {
        await p.adminUser.update({
          where: { id: existing.id },
          data: { passwordHash: defaultHash },
        });
        console.log('✅ 管理员密码已重置为默认 (admin123)');
      } else {
        await p.adminUser.create({
          data: {
            username: 'admin',
            passwordHash: defaultHash,
            displayName: '管理员',
            role: 'admin',
          },
        });
        console.log('✅ 默认管理员已创建 (admin / admin123)');
      }
    }
  } catch (e) {
    console.error('种子失败:', e.message);
  } finally {
    await p.$disconnect().catch(() => {});
  }
})();
