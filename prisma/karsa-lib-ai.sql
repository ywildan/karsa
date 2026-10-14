-- Karsa Lib AI: jalankan seluruh file sekali sebelum AI_ENABLED=true.
-- Hanya tambah tabel. Tidak mengubah data artikel, akun, atau komentar.
BEGIN;
CREATE TABLE IF NOT EXISTS "LibAiSummary" (
  "article_id" TEXT PRIMARY KEY REFERENCES "LibArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "revision" TEXT NOT NULL,
  "content" TEXT,
  "sources" JSONB,
  "lease_token" TEXT,
  "lease_expires_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "LibAiTurn" (
  "id" TEXT PRIMARY KEY,
  "article_id" TEXT NOT NULL REFERENCES "LibArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "user_id" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "revision" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT,
  "sources" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'COMPLETE', 'FAILED')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "LibAiTurn_user_id_article_id_request_id_key"
  ON "LibAiTurn"("user_id", "article_id", "request_id");
CREATE INDEX IF NOT EXISTS "LibAiTurn_user_id_article_id_revision_created_at_idx"
  ON "LibAiTurn"("user_id", "article_id", "revision", "created_at");
CREATE TABLE IF NOT EXISTS "LibAiUsageBucket" (
  "scope" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0 CHECK ("used" >= 0),
  PRIMARY KEY ("scope", "day")
);
ALTER TABLE "LibAiSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LibAiTurn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LibAiUsageBucket" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "LibAiSummary", "LibAiTurn", "LibAiUsageBucket" FROM PUBLIC;
DO $$
DECLARE tbl TEXT; role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "LibAiSummary", "LibAiTurn", "LibAiUsageBucket" FROM %I', role_name);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_runtime') THEN
    FOREACH tbl IN ARRAY ARRAY['LibAiSummary', 'LibAiTurn', 'LibAiUsageBucket'] LOOP
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO karsa_runtime', tbl);
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'karsa_runtime_ai') THEN
        EXECUTE format('CREATE POLICY karsa_runtime_ai ON %I FOR ALL TO karsa_runtime USING (true) WITH CHECK (true)', tbl);
      END IF;
    END LOOP;
  END IF;
END $$;

-- Web search (Tavily) + kolom analitik usage — 2026-10-08.
-- Idempoten: aman dijalankan ulang di database yang sudah punya tabel AI.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "premium_tier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "web_search" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "latency_ms" INTEGER;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "prompt_tokens" INTEGER;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "completion_tokens" INTEGER;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "search_error" TEXT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "web_sources" JSONB;

COMMIT;

-- Analitik usage per pengguna (dashboard admin `/admin/ai-usage`).
-- Isi blok ini sama dengan file inkremental `ai-usage-analytics.sql`;
-- database yang sudah berjalan cukup menjalankan file inkremental itu.
BEGIN;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "model_requested" TEXT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "model_reported" TEXT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "input_price_nano_usd_per_million" BIGINT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "output_price_nano_usd_per_million" BIGINT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "estimated_cost_nano_usd" BIGINT;
CREATE INDEX IF NOT EXISTS "LibAiTurn_created_at_idx" ON "LibAiTurn"("created_at");
CREATE INDEX IF NOT EXISTS "LibAiTurn_article_id_created_at_idx" ON "LibAiTurn"("article_id", "created_at");
CREATE INDEX IF NOT EXISTS "LibAiTurn_web_search_created_at_idx" ON "LibAiTurn"("web_search", "created_at");
CREATE INDEX IF NOT EXISTS "LibAiTurn_status_created_at_idx" ON "LibAiTurn"("status", "created_at");
CREATE TABLE IF NOT EXISTS "LibAiSummaryGeneration" (
  "id" TEXT NOT NULL,
  "article_id" TEXT NOT NULL,
  "triggered_by_id" TEXT NOT NULL,
  "revision" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "model_requested" TEXT,
  "model_reported" TEXT,
  "prompt_tokens" INTEGER,
  "completion_tokens" INTEGER,
  "latency_ms" INTEGER,
  "input_price_nano_usd_per_million" BIGINT,
  "output_price_nano_usd_per_million" BIGINT,
  "estimated_cost_nano_usd" BIGINT,
  "error_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibAiSummaryGeneration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LibAiSummaryGeneration_status_check"
    CHECK ("status" IN ('PENDING', 'COMPLETE', 'FAILED'))
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LibAiSummaryGeneration_article_id_fkey') THEN
    ALTER TABLE "LibAiSummaryGeneration"
      ADD CONSTRAINT "LibAiSummaryGeneration_article_id_fkey"
      FOREIGN KEY ("article_id") REFERENCES "LibArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LibAiSummaryGeneration_triggered_by_id_fkey') THEN
    ALTER TABLE "LibAiSummaryGeneration"
      ADD CONSTRAINT "LibAiSummaryGeneration_triggered_by_id_fkey"
      FOREIGN KEY ("triggered_by_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "LibAiSummaryGeneration_article_id_created_at_idx"
  ON "LibAiSummaryGeneration"("article_id", "created_at");
CREATE INDEX IF NOT EXISTS "LibAiSummaryGeneration_triggered_by_id_created_at_idx"
  ON "LibAiSummaryGeneration"("triggered_by_id", "created_at");
CREATE INDEX IF NOT EXISTS "LibAiSummaryGeneration_status_created_at_idx"
  ON "LibAiSummaryGeneration"("status", "created_at");
CREATE INDEX IF NOT EXISTS "LibAiSummaryGeneration_created_at_idx"
  ON "LibAiSummaryGeneration"("created_at");
ALTER TABLE "LibAiSummaryGeneration" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "LibAiSummaryGeneration" FROM PUBLIC;
DO $$
DECLARE role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "LibAiSummaryGeneration" FROM %I', role_name);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "LibAiSummaryGeneration" TO karsa_runtime;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'LibAiSummaryGeneration'
        AND policyname = 'karsa_runtime_ai'
    ) THEN
      CREATE POLICY karsa_runtime_ai ON "LibAiSummaryGeneration"
        FOR ALL TO karsa_runtime USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;
COMMIT;

-- Langganan AI (dashboard admin `/admin/ai-premium`): limit khusus per user
-- + tabel pengaturan global `LibAiSetting`. Idempoten.
-- Untuk database yang sudah berjalan bisa juga memakai
-- `prisma/ai-premium-admin.sql` (isi sama).
BEGIN;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ai_chat_limit_override" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ai_summary_limit_override" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ai_web_search_limit_override" INTEGER;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_ai_chat_limit_override_check') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_ai_chat_limit_override_check"
      CHECK ("ai_chat_limit_override" IS NULL OR ("ai_chat_limit_override" >= 0 AND "ai_chat_limit_override" <= 1000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_ai_summary_limit_override_check') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_ai_summary_limit_override_check"
      CHECK ("ai_summary_limit_override" IS NULL OR ("ai_summary_limit_override" >= 0 AND "ai_summary_limit_override" <= 1000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_ai_web_search_limit_override_check') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_ai_web_search_limit_override_check"
      CHECK ("ai_web_search_limit_override" IS NULL OR ("ai_web_search_limit_override" >= 0 AND "ai_web_search_limit_override" <= 1000));
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "LibAiSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LibAiSetting_pkey" PRIMARY KEY ("key")
);
ALTER TABLE "LibAiSetting" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "LibAiSetting" FROM PUBLIC;
DO $$
DECLARE role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "LibAiSetting" FROM %I', role_name);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "LibAiSetting" TO karsa_runtime;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'LibAiSetting'
        AND policyname = 'karsa_runtime_ai'
    ) THEN
      CREATE POLICY karsa_runtime_ai ON "LibAiSetting"
        FOR ALL TO karsa_runtime USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;
COMMIT;
