-- CreateTable
CREATE TABLE "flash_deals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "deal_price_usd" DECIMAL(10,2) NOT NULL,
    "deal_price_khr" INTEGER NOT NULL,
    "deal_stock" INTEGER NOT NULL,
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "city_code" VARCHAR(50),
    "start_at" TIMESTAMPTZ,
    "end_at" TIMESTAMPTZ,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "flash_deals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flash_deals_status_sort_order_idx" ON "flash_deals"("status", "sort_order");

-- CreateIndex
CREATE INDEX "flash_deals_city_code_status_start_at_end_at_idx" ON "flash_deals"("city_code", "status", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "flash_deals_product_id_idx" ON "flash_deals"("product_id");

-- AddForeignKey
ALTER TABLE "flash_deals" ADD CONSTRAINT "flash_deals_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
