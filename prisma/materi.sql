-- ============================================================================
-- KARSA — Materi publik (kisi-kisi & ringkasan ujian)
-- ============================================================================
-- File SQL inkremental & idempoten untuk database yang SUDAH berjalan.
-- Jalankan di Supabase SQL Editor sebagai role pemilik skema (postgres)
-- SEBELUM deploy halaman /materi versi database.
--
-- Isi:
-- 1. Tabel "Materi" (cermin model di schema.prisma) + CHECK jenis/status
--    + FK ke Faculty/Prodi.
-- 2. Unique parsial: satu slug hanya sekali (index unik dari kolom slug).
-- 3. RLS aktif, akses publik dicabut, grant minimum untuk `karsa_runtime`.
--
-- Aman dijalankan berulang.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_runtime') THEN
    RAISE EXCEPTION 'Role karsa_runtime belum ada. Buat role runtime sebelum menjalankan file ini.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Materi" (
    "id"         TEXT         NOT NULL,
    "slug"       TEXT         NOT NULL,
    "judul"      TEXT         NOT NULL,
    "matkul"     TEXT         NOT NULL,
    "jenis"      TEXT         NOT NULL DEFAULT 'UTS',
    "pertemuan"  TEXT,
    "sub_cpmk"   TEXT,
    "bobot"      INTEGER,
    "sumber"     TEXT,
    "ringkasan"  TEXT         NOT NULL,
    "bagian"     INTEGER,
    "html"       TEXT         NOT NULL,
    "status"     TEXT         NOT NULL DEFAULT 'DRAFT',
    "faculty_id" TEXT,
    "prodi_id"   TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Materi_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Materi_jenis_check" CHECK ("jenis" IN ('UTS', 'UAS', 'KUIS')),
    CONSTRAINT "Materi_status_check" CHECK ("status" IN ('DRAFT', 'TERBIT')),
    CONSTRAINT "Materi_bobot_check" CHECK ("bobot" IS NULL OR ("bobot" BETWEEN 0 AND 100)),
    CONSTRAINT "Materi_bagian_check" CHECK ("bagian" IS NULL OR "bagian" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "Materi_slug_key" ON "Materi" ("slug");
CREATE INDEX IF NOT EXISTS "Materi_status_updated_at_idx" ON "Materi" ("status", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "Materi_faculty_id_idx" ON "Materi" ("faculty_id");
CREATE INDEX IF NOT EXISTS "Materi_prodi_id_idx" ON "Materi" ("prodi_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Materi_faculty_id_fkey') THEN
        ALTER TABLE "Materi" ADD CONSTRAINT "Materi_faculty_id_fkey"
            FOREIGN KEY ("faculty_id") REFERENCES "Faculty" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Materi_prodi_id_fkey') THEN
        ALTER TABLE "Materi" ADD CONSTRAINT "Materi_prodi_id_fkey"
            FOREIGN KEY ("prodi_id") REFERENCES "Prodi" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "Materi" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Materi" FROM PUBLIC;
DO $$
DECLARE role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "Materi" FROM %I', role_name);
    END IF;
  END LOOP;
  GRANT SELECT, INSERT, UPDATE, DELETE ON "Materi" TO karsa_runtime;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Materi' AND policyname = 'karsa_runtime_ai') THEN
    CREATE POLICY karsa_runtime_ai ON "Materi" FOR ALL TO karsa_runtime USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verifikasi read-only setelah migrasi
-- ---------------------------------------------------------------------------
--
-- SELECT table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'karsa_runtime' AND table_schema = 'public' AND table_name = 'Materi'
-- ORDER BY privilege_type;
--
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = '"Materi"'::regclass ORDER BY conname;
--
-- SELECT count(*) FILTER (WHERE status = 'TERBIT') AS terbit,
--        count(*) FILTER (WHERE status = 'DRAFT')  AS draf
-- FROM "Materi";
