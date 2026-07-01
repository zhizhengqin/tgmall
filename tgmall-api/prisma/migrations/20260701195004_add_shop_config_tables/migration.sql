-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "city_code" VARCHAR(50);

-- AlterTable
ALTER TABLE "admin_users" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "template_id" VARCHAR(50) NOT NULL,
    "params" JSONB NOT NULL,
    "content" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ,
    "failed_at" TIMESTAMPTZ,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "code" VARCHAR(50) NOT NULL,
    "name_km" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100),
    "name_zh" VARCHAR(100),
    "icon_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" UUID NOT NULL,
    "title_km" VARCHAR(200) NOT NULL,
    "title_en" VARCHAR(200),
    "title_zh" VARCHAR(200),
    "image_url" TEXT NOT NULL,
    "link_type" VARCHAR(20) NOT NULL,
    "link_target" VARCHAR(255) NOT NULL,
    "city_code" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "start_at" TIMESTAMPTZ,
    "end_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "code" VARCHAR(50) NOT NULL,
    "name_km" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100),
    "name_zh" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "delivery_rules" (
    "id" UUID NOT NULL,
    "city_code" VARCHAR(50) NOT NULL,
    "min_order_amount_usd" DECIMAL(10,2) NOT NULL DEFAULT 4.00,
    "shipping_fee_usd" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "free_shipping_threshold_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimated_delivery_days" INTEGER NOT NULL DEFAULT 2,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "delivery_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_services" (
    "id" UUID NOT NULL,
    "name_km" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100),
    "name_zh" VARCHAR(100),
    "telegram_username" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "work_hours" VARCHAR(100),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customer_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "notifications_type_created_at_idx" ON "notifications"("type", "created_at");

-- CreateIndex
CREATE INDEX "notifications_status_retry_count_idx" ON "notifications"("status", "retry_count");

-- CreateIndex
CREATE INDEX "categories_status_sort_order_idx" ON "categories"("status", "sort_order");

-- CreateIndex
CREATE INDEX "banners_status_sort_order_idx" ON "banners"("status", "sort_order");

-- CreateIndex
CREATE INDEX "banners_city_code_status_sort_order_idx" ON "banners"("city_code", "status", "sort_order");

-- CreateIndex
CREATE INDEX "banners_start_at_end_at_idx" ON "banners"("start_at", "end_at");

-- CreateIndex
CREATE INDEX "cities_status_sort_order_idx" ON "cities"("status", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_rules_city_code_key" ON "delivery_rules"("city_code");

-- CreateIndex
CREATE INDEX "delivery_rules_status_idx" ON "delivery_rules"("status");

-- CreateIndex
CREATE INDEX "customer_services_status_is_default_idx" ON "customer_services"("status", "is_default");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_city_code_fkey" FOREIGN KEY ("city_code") REFERENCES "cities"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_rules" ADD CONSTRAINT "delivery_rules_city_code_fkey" FOREIGN KEY ("city_code") REFERENCES "cities"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
