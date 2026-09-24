-- Karsa Mobile Group
-- Migrasi idempotent untuk grup percakapan mobile-only.
--
-- Jalankan hanya setelah backup production berhasil dan isi file direview.
-- File ini tidak membuat endpoint web/admin dan tidak memberi grant kepada
-- anon/authenticated. Semua authorization pengguna tetap dilakukan API mobile.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Status grup pada KelasMatkul
-- ---------------------------------------------------------------------------

ALTER TABLE "KelasMatkul"
    ADD COLUMN IF NOT EXISTS "group_locked_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "group_locked_by_id" TEXT;

-- ---------------------------------------------------------------------------
-- 2. Tabel fitur
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "GroupMessage" (
    "id"                 TEXT         NOT NULL,
    "kelas_matkul_id"    TEXT         NOT NULL,
    "author_id"          TEXT         NOT NULL,
    "reply_to_id"        TEXT,
    "body"               TEXT,
    "idempotency_key"    TEXT         NOT NULL,
    "edited_at"          TIMESTAMP(3),
    "deleted_at"         TIMESTAMP(3),
    "hidden_at"          TIMESTAMP(3),
    "hidden_by_id"       TEXT,
    "hidden_reason"      TEXT,
    "pinned_at"          TIMESTAMP(3),
    "pinned_by_id"       TEXT,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GroupReport" (
    "id"             TEXT         NOT NULL,
    "message_id"     TEXT         NOT NULL,
    "reporter_id"    TEXT         NOT NULL,
    "reason"         TEXT         NOT NULL,
    "details"        TEXT,
    "status"         TEXT         NOT NULL DEFAULT 'OPEN',
    "resolved_at"    TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GroupBlock" (
    "blocker_id" TEXT         NOT NULL,
    "blocked_id" TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupBlock_pkey" PRIMARY KEY ("blocker_id", "blocked_id")
);

-- ---------------------------------------------------------------------------
-- 3. Unique, FK, dan CHECK constraint
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "GroupMessage_idempotency_key_key"
    ON "GroupMessage" ("idempotency_key");

CREATE UNIQUE INDEX IF NOT EXISTS "GroupReport_message_id_reporter_id_key"
    ON "GroupReport" ("message_id", "reporter_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'KelasMatkul_group_locked_by_id_fkey'
    ) THEN
        ALTER TABLE "KelasMatkul"
            ADD CONSTRAINT "KelasMatkul_group_locked_by_id_fkey"
            FOREIGN KEY ("group_locked_by_id") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupMessage_kelas_matkul_id_fkey'
    ) THEN
        ALTER TABLE "GroupMessage"
            ADD CONSTRAINT "GroupMessage_kelas_matkul_id_fkey"
            FOREIGN KEY ("kelas_matkul_id") REFERENCES "KelasMatkul"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupMessage_author_id_fkey'
    ) THEN
        ALTER TABLE "GroupMessage"
            ADD CONSTRAINT "GroupMessage_author_id_fkey"
            FOREIGN KEY ("author_id") REFERENCES "User"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupMessage_reply_to_id_fkey'
    ) THEN
        ALTER TABLE "GroupMessage"
            ADD CONSTRAINT "GroupMessage_reply_to_id_fkey"
            FOREIGN KEY ("reply_to_id") REFERENCES "GroupMessage"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupMessage_hidden_by_id_fkey'
    ) THEN
        ALTER TABLE "GroupMessage"
            ADD CONSTRAINT "GroupMessage_hidden_by_id_fkey"
            FOREIGN KEY ("hidden_by_id") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupMessage_pinned_by_id_fkey'
    ) THEN
        ALTER TABLE "GroupMessage"
            ADD CONSTRAINT "GroupMessage_pinned_by_id_fkey"
            FOREIGN KEY ("pinned_by_id") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupReport_message_id_fkey'
    ) THEN
        ALTER TABLE "GroupReport"
            ADD CONSTRAINT "GroupReport_message_id_fkey"
            FOREIGN KEY ("message_id") REFERENCES "GroupMessage"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupReport_reporter_id_fkey'
    ) THEN
        ALTER TABLE "GroupReport"
            ADD CONSTRAINT "GroupReport_reporter_id_fkey"
            FOREIGN KEY ("reporter_id") REFERENCES "User"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupReport_resolved_by_id_fkey'
    ) THEN
        ALTER TABLE "GroupReport"
            ADD CONSTRAINT "GroupReport_resolved_by_id_fkey"
            FOREIGN KEY ("resolved_by_id") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupBlock_blocker_id_fkey'
    ) THEN
        ALTER TABLE "GroupBlock"
            ADD CONSTRAINT "GroupBlock_blocker_id_fkey"
            FOREIGN KEY ("blocker_id") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupBlock_blocked_id_fkey'
    ) THEN
        ALTER TABLE "GroupBlock"
            ADD CONSTRAINT "GroupBlock_blocked_id_fkey"
            FOREIGN KEY ("blocked_id") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupMessage_body_check'
    ) THEN
        ALTER TABLE "GroupMessage"
            ADD CONSTRAINT "GroupMessage_body_check" CHECK (
                (
                    "body" IS NOT NULL
                    AND char_length(btrim("body")) BETWEEN 1 AND 2000
                )
                OR (
                    "body" IS NULL
                    AND ("deleted_at" IS NOT NULL OR "hidden_at" IS NOT NULL)
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupMessage_hidden_reason_check'
    ) THEN
        ALTER TABLE "GroupMessage"
            ADD CONSTRAINT "GroupMessage_hidden_reason_check" CHECK (
                "hidden_reason" IS NULL
                OR char_length(btrim("hidden_reason")) BETWEEN 1 AND 120
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupReport_reason_check'
    ) THEN
        ALTER TABLE "GroupReport"
            ADD CONSTRAINT "GroupReport_reason_check" CHECK (
                "reason" IN (
                    'SPAM',
                    'HARASSMENT',
                    'INAPPROPRIATE',
                    'MISINFORMATION',
                    'OTHER'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupReport_details_check'
    ) THEN
        ALTER TABLE "GroupReport"
            ADD CONSTRAINT "GroupReport_details_check" CHECK (
                "details" IS NULL OR char_length("details") <= 500
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupReport_status_check'
    ) THEN
        ALTER TABLE "GroupReport"
            ADD CONSTRAINT "GroupReport_status_check" CHECK (
                "status" IN ('OPEN', 'DISMISSED', 'ACTIONED')
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GroupBlock_not_self_check'
    ) THEN
        ALTER TABLE "GroupBlock"
            ADD CONSTRAINT "GroupBlock_not_self_check" CHECK (
                "blocker_id" <> "blocked_id"
            );
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Index
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "KelasMatkul_group_locked_by_id_idx"
    ON "KelasMatkul" ("group_locked_by_id");

CREATE INDEX IF NOT EXISTS "GroupMessage_kelas_matkul_id_created_at_id_idx"
    ON "GroupMessage" ("kelas_matkul_id", "created_at" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "GroupMessage_kelas_matkul_id_updated_at_idx"
    ON "GroupMessage" ("kelas_matkul_id", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "GroupMessage_author_id_idx"
    ON "GroupMessage" ("author_id");
CREATE INDEX IF NOT EXISTS "GroupMessage_reply_to_id_idx"
    ON "GroupMessage" ("reply_to_id");
CREATE INDEX IF NOT EXISTS "GroupMessage_kelas_matkul_id_pinned_at_idx"
    ON "GroupMessage" ("kelas_matkul_id", "pinned_at" DESC);

CREATE INDEX IF NOT EXISTS "GroupReport_message_id_status_idx"
    ON "GroupReport" ("message_id", "status");
CREATE INDEX IF NOT EXISTS "GroupReport_reporter_id_created_at_idx"
    ON "GroupReport" ("reporter_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "GroupReport_resolved_by_id_idx"
    ON "GroupReport" ("resolved_by_id");

CREATE INDEX IF NOT EXISTS "GroupBlock_blocked_id_idx"
    ON "GroupBlock" ("blocked_id");

-- ---------------------------------------------------------------------------
-- 5. RLS dan grant minimum
-- ---------------------------------------------------------------------------

ALTER TABLE "GroupMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GroupBlock" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "GroupMessage", "GroupReport", "GroupBlock"
    FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_runtime') THEN
        GRANT SELECT, INSERT, UPDATE ON TABLE "GroupMessage" TO karsa_runtime;
        GRANT SELECT, INSERT, UPDATE ON TABLE "GroupReport" TO karsa_runtime;
        GRANT SELECT, INSERT, DELETE ON TABLE "GroupBlock" TO karsa_runtime;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_backup') THEN
        GRANT SELECT ON TABLE "GroupMessage", "GroupReport", "GroupBlock"
            TO karsa_backup;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_runtime') THEN
        RAISE EXCEPTION 'required role karsa_runtime does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'GroupMessage'
          AND policyname = 'karsa_runtime_select'
    ) THEN
        CREATE POLICY "karsa_runtime_select" ON "GroupMessage"
            FOR SELECT TO karsa_runtime USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'GroupMessage'
          AND policyname = 'karsa_runtime_insert'
    ) THEN
        CREATE POLICY "karsa_runtime_insert" ON "GroupMessage"
            FOR INSERT TO karsa_runtime WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'GroupMessage'
          AND policyname = 'karsa_runtime_update'
    ) THEN
        CREATE POLICY "karsa_runtime_update" ON "GroupMessage"
            FOR UPDATE TO karsa_runtime USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'GroupReport'
          AND policyname = 'karsa_runtime_select'
    ) THEN
        CREATE POLICY "karsa_runtime_select" ON "GroupReport"
            FOR SELECT TO karsa_runtime USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'GroupReport'
          AND policyname = 'karsa_runtime_insert'
    ) THEN
        CREATE POLICY "karsa_runtime_insert" ON "GroupReport"
            FOR INSERT TO karsa_runtime WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'GroupReport'
          AND policyname = 'karsa_runtime_update'
    ) THEN
        CREATE POLICY "karsa_runtime_update" ON "GroupReport"
            FOR UPDATE TO karsa_runtime USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'GroupBlock'
          AND policyname = 'karsa_runtime_select'
    ) THEN
        CREATE POLICY "karsa_runtime_select" ON "GroupBlock"
            FOR SELECT TO karsa_runtime USING (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'GroupBlock'
          AND policyname = 'karsa_runtime_insert'
    ) THEN
        CREATE POLICY "karsa_runtime_insert" ON "GroupBlock"
            FOR INSERT TO karsa_runtime WITH CHECK (true);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'GroupBlock'
          AND policyname = 'karsa_runtime_delete'
    ) THEN
        CREATE POLICY "karsa_runtime_delete" ON "GroupBlock"
            FOR DELETE TO karsa_runtime USING (true);
    END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verifikasi read-only setelah migrasi
-- ---------------------------------------------------------------------------
--
-- SELECT table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'karsa_runtime'
--   AND table_schema = 'public'
--   AND table_name IN ('GroupMessage', 'GroupReport', 'GroupBlock')
-- ORDER BY table_name, privilege_type;
--
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('GroupMessage', 'GroupReport', 'GroupBlock')
-- ORDER BY tablename, policyname;
--
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relname IN ('GroupMessage', 'GroupReport', 'GroupBlock')
-- ORDER BY c.relname;
