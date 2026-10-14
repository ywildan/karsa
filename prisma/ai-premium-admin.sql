-- Karsa Lib AI — dashboard Langganan AI (/admin/ai-premium).
-- Jalankan file ini SATU KALI di Supabase SQL Editor sebelum memakai
-- dashboard Langganan AI. Idempoten: aman dijalankan ulang.
-- Prasyarat: tabel dasar dari `karsa-lib-ai.sql` sudah ada.
BEGIN;

-- Limit khusus Teman Baca per user (NULL = ikut bawaan tier/env).
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

-- Pengaturan global yang bisa diedit dari dashboard (key-value).
-- Kunci dikenal: "global_daily_limit", "websearch_global_limit", "base_url".
-- API key dan model TIDAK disimpan di sini (tetap env).
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
