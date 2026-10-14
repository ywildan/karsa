-- Karsa Lib AI — analitik usage per pengguna untuk dashboard admin.
-- Jalankan file ini SATU KALI di Supabase SQL Editor sebelum mengaktifkan
-- kode dashboard `/admin/ai-usage`. Idempoten: aman dijalankan ulang.
-- Prasyarat: tabel AI dasar dari `karsa-lib-ai.sql` sudah ada.
BEGIN;

-- Kolom analitik dasar (dipakai juga oleh web search) — jaga-jaga bila
-- database lama belum menjalankannya.
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "web_search" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "latency_ms" INTEGER;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "prompt_tokens" INTEGER;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "completion_tokens" INTEGER;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "search_error" TEXT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "web_sources" JSONB;

-- Snapshot model & harga pada setiap turn chat/search.
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "model_requested" TEXT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "model_reported" TEXT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "input_price_nano_usd_per_million" BIGINT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "output_price_nano_usd_per_million" BIGINT;
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "estimated_cost_nano_usd" BIGINT;
-- Penanda provider yang melayani (lihat juga ai-fallback-provider.sql).
ALTER TABLE "LibAiTurn" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'primary';

CREATE INDEX IF NOT EXISTS "LibAiTurn_created_at_idx" ON "LibAiTurn"("created_at");
CREATE INDEX IF NOT EXISTS "LibAiTurn_article_id_created_at_idx" ON "LibAiTurn"("article_id", "created_at");
CREATE INDEX IF NOT EXISTS "LibAiTurn_web_search_created_at_idx" ON "LibAiTurn"("web_search", "created_at");
CREATE INDEX IF NOT EXISTS "LibAiTurn_status_created_at_idx" ON "LibAiTurn"("status", "created_at");

-- Event pembuatan ringkasan baru. Pembacaan ringkasan cache TIDAK dicatat
-- di sini dan tidak memakai provider.
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
  "provider" TEXT NOT NULL DEFAULT 'primary',
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
