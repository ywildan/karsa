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
COMMIT;
