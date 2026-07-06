// 重置管理员密码为指定明文（默认 admin123）
// 用法：ADMIN_PASSWORD=新密码 node scripts/reset-admin-password.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const password = process.env.ADMIN_PASSWORD || 'admin123';

(async () => {
  try {
    const existing = await prisma.adminUser.findFirst();
    const hash = await bcrypt.hash(password, 10);

    if (existing) {
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash: hash },
      });
      console.log(`✅ 管理员 ${existing.username} 密码已重置为: ${password}`);
    } else {
      await prisma.adminUser.create({
        data: {
          username: 'admin',
          passwordHash: hash,
          displayName: '管理员',
          role: 'admin',
        },
      });
      console.log(`✅ 默认管理员 admin 已创建，密码: ${password}`);
    }
  } catch (e) {
    console.error('❌ 重置失败:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
