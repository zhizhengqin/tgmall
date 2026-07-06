-- 删除旧版商户系统残留字段与表（V1 商户功能已下线）
ALTER TABLE "coupons" DROP CONSTRAINT IF EXISTS "coupons_merchant_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_merchant_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_merchant_id_fkey";

DROP INDEX IF EXISTS "orders_merchant_id_created_at_idx";
DROP INDEX IF EXISTS "products_merchant_id_idx";

ALTER TABLE "coupons" DROP COLUMN IF EXISTS "merchant_id";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "merchant_id";
ALTER TABLE "products" DROP COLUMN IF EXISTS "merchant_id",
    ADD COLUMN IF NOT EXISTS "alert_threshold" INTEGER,
    ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';

DROP TABLE IF EXISTS "merchants";

-- 创建新版业务表
CREATE TABLE IF NOT EXISTS "stock_logs" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "before_qty" INTEGER NOT NULL,
    "after_qty" INTEGER NOT NULL,
    "change_qty" INTEGER NOT NULL,
    "reason" VARCHAR(30) NOT NULL,
    "operator_id" VARCHAR(36),
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_checks" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "system_qty" INTEGER NOT NULL,
    "actual_qty" INTEGER NOT NULL,
    "diff" INTEGER NOT NULL,
    "note" TEXT,
    "checked_by" VARCHAR(100) NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inventory_checks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "password_history" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wishlist" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wishlist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "feedback_tickets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feedback_tickets_pkey" PRIMARY KEY ("id")
);

-- 索引
CREATE INDEX IF NOT EXISTS "stock_logs_product_id_created_at_idx" ON "stock_logs"("product_id", "created_at");
CREATE INDEX IF NOT EXISTS "inventory_checks_product_id_checked_at_idx" ON "inventory_checks"("product_id", "checked_at");
CREATE INDEX IF NOT EXISTS "password_history_user_id_created_at_idx" ON "password_history"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "wishlist_user_id_created_at_idx" ON "wishlist"("user_id", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_user_id_product_id_key" ON "wishlist"("user_id", "product_id");
CREATE INDEX IF NOT EXISTS "feedback_tickets_status_created_at_idx" ON "feedback_tickets"("status", "created_at");
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders"("created_at" DESC);

-- 外键
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_city_code_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_city_code_fkey" FOREIGN KEY ("city_code") REFERENCES "cities"("code") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_logs" DROP CONSTRAINT IF EXISTS "stock_logs_product_id_fkey";
ALTER TABLE "stock_logs" ADD CONSTRAINT "stock_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_checks" DROP CONSTRAINT IF EXISTS "inventory_checks_product_id_fkey";
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "password_history" DROP CONSTRAINT IF EXISTS "password_history_user_id_fkey";
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wishlist" DROP CONSTRAINT IF EXISTS "wishlist_user_id_fkey";
ALTER TABLE "wishlist" DROP CONSTRAINT IF EXISTS "wishlist_product_id_fkey";
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedback_tickets" DROP CONSTRAINT IF EXISTS "feedback_tickets_user_id_fkey";
ALTER TABLE "feedback_tickets" ADD CONSTRAINT "feedback_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
