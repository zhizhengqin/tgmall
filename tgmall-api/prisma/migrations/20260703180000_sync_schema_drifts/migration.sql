-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "flash_deals" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "system_settings" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tags" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "idx_audit_logs_action_time" RENAME TO "audit_logs_action_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_audit_logs_admin" RENAME TO "audit_logs_admin_id_idx";

-- RenameIndex
ALTER INDEX "idx_tags_status_sort" RENAME TO "tags_status_sort_order_idx";

