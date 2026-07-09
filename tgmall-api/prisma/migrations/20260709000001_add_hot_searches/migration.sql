-- 新增热门搜索词表
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "hot_searches" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "keyword" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hot_searches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hot_searches_status_sort_order_idx" ON "hot_searches"("status", "sort_order");
