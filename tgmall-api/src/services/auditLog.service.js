// 审计日志服务
import prisma from '../config/database.js';

/**
 * 写入审计日志
 * @param {Object} params
 * @param {string} params.adminId 操作管理员 ID
 * @param {string} params.action  操作标识，如 ADMIN_USER_CREATE / PLATFORM_SETTINGS_UPDATE
 * @param {Object} params.detail  操作详情（会被 JSON.stringify）
 * @param {string} params.ip      请求 IP
 */
export async function writeAuditLog({ adminId, action, detail, ip }) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        detail: detail ? JSON.stringify(detail) : null,
        ip: ip || null,
      },
    });
  } catch (err) {
    // 审计日志写入失败不应阻塞主流程，但需记录错误
    console.error('[AuditLog] 写入失败:', err.message, { adminId, action });
  }
}
