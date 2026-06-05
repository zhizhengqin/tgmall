-- Create tokens table
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
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");
CREATE INDEX "notifications_type_created_at_idx" ON "notifications"("type", "created_at");
CREATE INDEX "notifications_status_retry_count_idx" ON "notifications"("status", "retry_count");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
