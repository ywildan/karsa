-- ============================================================================
-- KARSA — Penunjukan Pengelola Scoped (PRODI | KELAS)
-- ============================================================================
-- File SQL inkremental & idempoten untuk database yang SUDAH berjalan.
-- Untuk instalasi baru, tabel ini sudah termasuk di `init.sql`.
--
-- Isi:
-- 1. Tabel "PengelolaAssignment" (cermin model di schema.prisma) + CHECK
--    target tepat-satu sesuai scope_type + unique parsial penunjukan aktif.
-- 2. RLS aktif, akses publik dicabut, grant minimum untuk `karsa_runtime`.
--
-- Jalankan sebagai role pemilik skema (postgres). Aman dijalankan berulang.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_runtime') THEN
    RAISE EXCEPTION 'Role karsa_runtime belum ada. Buat role runtime sebelum menjalankan file ini.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PengelolaAssignment" (
    "id"            TEXT         NOT NULL,
    "user_id"       TEXT,
    "email"         TEXT         NOT NULL,
    "scope_type"    TEXT         NOT NULL DEFAULT 'PRODI',
    "prodi_id"      TEXT,
    "kelas_id"      TEXT,
    "granted_by_id" TEXT         NOT NULL,
    "semester_id"   TEXT,
    "granted_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at"    TIMESTAMP(3),
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PengelolaAssignment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PengelolaAssignment_scope_type_check" CHECK ("scope_type" IN ('PRODI', 'KELAS')),
    CONSTRAINT "PengelolaAssignment_target_check" CHECK (
        ("scope_type" = 'PRODI' AND "prodi_id" IS NOT NULL AND "kelas_id" IS NULL) OR
        ("scope_type" = 'KELAS' AND "kelas_id" IS NOT NULL AND "prodi_id" IS NULL)
    )
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PengelolaAssignment_user_id_fkey') THEN
        ALTER TABLE "PengelolaAssignment" ADD CONSTRAINT "PengelolaAssignment_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PengelolaAssignment_granted_by_id_fkey') THEN
        ALTER TABLE "PengelolaAssignment" ADD CONSTRAINT "PengelolaAssignment_granted_by_id_fkey"
            FOREIGN KEY ("granted_by_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PengelolaAssignment_prodi_id_fkey') THEN
        ALTER TABLE "PengelolaAssignment" ADD CONSTRAINT "PengelolaAssignment_prodi_id_fkey"
            FOREIGN KEY ("prodi_id") REFERENCES "Prodi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PengelolaAssignment_kelas_id_fkey') THEN
        ALTER TABLE "PengelolaAssignment" ADD CONSTRAINT "PengelolaAssignment_kelas_id_fkey"
            FOREIGN KEY ("kelas_id") REFERENCES "Kelas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PengelolaAssignment_semester_id_fkey') THEN
        ALTER TABLE "PengelolaAssignment" ADD CONSTRAINT "PengelolaAssignment_semester_id_fkey"
            FOREIGN KEY ("semester_id") REFERENCES "Semester" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PengelolaAssignment_user_id_idx" ON "PengelolaAssignment" ("user_id");
CREATE INDEX IF NOT EXISTS "PengelolaAssignment_email_idx" ON "PengelolaAssignment" ("email");
CREATE INDEX IF NOT EXISTS "PengelolaAssignment_prodi_id_idx" ON "PengelolaAssignment" ("prodi_id");
CREATE INDEX IF NOT EXISTS "PengelolaAssignment_kelas_id_idx" ON "PengelolaAssignment" ("kelas_id");

-- Satu penunjukan AKTIF per (email, jenis lingkup, target).
CREATE UNIQUE INDEX IF NOT EXISTS "PengelolaAssignment_active_prodi_key"
  ON "PengelolaAssignment" ("email", "scope_type", "prodi_id")
  WHERE "revoked_at" IS NULL AND "prodi_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "PengelolaAssignment_active_kelas_key"
  ON "PengelolaAssignment" ("email", "scope_type", "kelas_id")
  WHERE "revoked_at" IS NULL AND "kelas_id" IS NOT NULL;

ALTER TABLE "PengelolaAssignment" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PengelolaAssignment" FROM PUBLIC;
DO $$
DECLARE role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "PengelolaAssignment" FROM %I', role_name);
    END IF;
  END LOOP;
  GRANT SELECT, INSERT, UPDATE, DELETE ON "PengelolaAssignment" TO karsa_runtime;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'PengelolaAssignment' AND policyname = 'karsa_runtime_ai') THEN
    CREATE POLICY karsa_runtime_ai ON "PengelolaAssignment" FOR ALL TO karsa_runtime USING (true) WITH CHECK (true);
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
--   AND table_name = 'PengelolaAssignment'
-- ORDER BY privilege_type;
--
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = '"PengelolaAssignment"'::regclass
-- ORDER BY conname;
