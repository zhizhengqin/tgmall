CREATE TABLE "tags" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "text_km"    VARCHAR(50) NOT NULL,
    "text_en"    VARCHAR(50),
    "text_zh"    VARCHAR(50),
    "color"      VARCHAR(20) NOT NULL DEFAULT '#c4932a',
    "bg"         VARCHAR(30) NOT NULL DEFAULT 'rgba(196,147,42,0.08)',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status"     VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_tags_status_sort" ON "tags"("status", "sort_order");
