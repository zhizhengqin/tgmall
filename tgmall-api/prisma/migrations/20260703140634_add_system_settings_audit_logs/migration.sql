-- CreateTable: system_settings (key-value platform config)
CREATE TABLE "system_settings" (
    "key"        VARCHAR(100) NOT NULL,
    "value"      TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable: audit_logs (admin operation tracking)
CREATE TABLE "audit_logs" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id"   UUID,
    "action"     VARCHAR(100) NOT NULL,
    "detail"     TEXT,
    "ip"         VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_logs_action_time" ON "audit_logs"("action", "created_at");
CREATE INDEX "idx_audit_logs_admin" ON "audit_logs"("admin_id");
