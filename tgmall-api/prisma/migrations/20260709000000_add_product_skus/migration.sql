-- Migration: 新增 ProductSku 表并在 OrderItem 中关联 SKU

-- 1. 创建 product_skus 表
CREATE TABLE IF NOT EXISTS "product_skus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sku_code" VARCHAR(100) NOT NULL,
    "spec" JSONB NOT NULL DEFAULT '{}',
    "price_usd" DECIMAL(10,2) NOT NULL,
    "price_khr" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_skus_pkey" PRIMARY KEY ("id")
);

-- 2. 添加唯一索引和外键
CREATE UNIQUE INDEX "product_skus_product_id_sku_code_key" ON "product_skus"("product_id", "sku_code");
CREATE INDEX "product_skus_product_id_status_idx" ON "product_skus"("product_id", "status");
ALTER TABLE "product_skus" ADD CONSTRAINT "product_skus_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. OrderItem 增加 sku_id 列
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "sku_id" UUID;
CREATE INDEX "order_items_sku_id_idx" ON "order_items"("sku_id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sku_id_fkey"
    FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. 为每个商品创建默认 SKU（无规格或迁移兜底）
INSERT INTO "product_skus" ("id", "product_id", "sku_code", "spec", "price_usd", "price_khr", "stock", "status", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    p.id,
    'DEFAULT',
    '{}',
    p.price_usd,
    p.price_khr,
    p.stock,
    p.status,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "products" p
LEFT JOIN "product_skus" s ON s.product_id = p.id
WHERE s.id IS NULL;

-- 5. 为单规格商品按现有 spec values 创建 SKU（当 specs 为单规格数组时）
-- 注意：当前 Product.specs 存储的是规格定义，value 上可能带有 priceUsd/priceKhr/stock
DO $$
DECLARE
    rec RECORD;
    spec_value RECORD;
    new_sku_id UUID;
BEGIN
    FOR rec IN
        SELECT p.id AS product_id, p.specs AS specs, p.price_usd, p.price_khr, p.stock
        FROM products p
        WHERE jsonb_array_length(COALESCE(p.specs, '[]'::jsonb)) = 1
    LOOP
        FOR spec_value IN
            SELECT value FROM jsonb_array_elements((rec.specs -> 0) -> 'values') AS value
        LOOP
            INSERT INTO product_skus (
                id, product_id, sku_code, spec, price_usd, price_khr, stock, status, created_at, updated_at
            ) VALUES (
                gen_random_uuid(),
                rec.product_id,
                COALESCE(spec_value.value ->> 'valueEn', 'DEFAULT'),
                jsonb_build_object(
                    rec.specs -> 0 ->> 'nameEn',
                    spec_value.value ->> 'valueEn'
                ),
                COALESCE((spec_value.value ->> 'priceUsd')::numeric, rec.price_usd),
                COALESCE((spec_value.value ->> 'priceKhr')::integer, rec.price_khr),
                COALESCE((spec_value.value ->> 'stock')::integer, rec.stock),
                CASE WHEN COALESCE((spec_value.value ->> 'stock')::integer, rec.stock) > 0 THEN 'active' ELSE 'inactive' END,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (product_id, sku_code) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- 6. 回刷历史 order_items 的 sku_id（按 spec JSON 匹配）
-- 优先匹配单规格 SKU；多规格或无法匹配时使用默认 SKU
UPDATE "order_items" oi
SET "sku_id" = COALESCE(
    (
        SELECT s.id FROM "product_skus" s
        WHERE s.product_id = oi.product_id
          AND s.sku_code <> 'DEFAULT'
          AND s.spec @> oi.spec
          AND oi.spec <> '{}'::jsonb
        LIMIT 1
    ),
    (
        SELECT s.id FROM "product_skus" s
        WHERE s.product_id = oi.product_id
          AND s.sku_code = 'DEFAULT'
        LIMIT 1
    )
);
