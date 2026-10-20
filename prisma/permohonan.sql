-- ============================================================================
-- KARSA — Permohonan materi dari publik (halaman /materi/kirim)
-- ============================================================================
-- File SQL inkremental & idempoten untuk database yang SUDAH berjalan.
-- Jalankan di Supabase SQL Editor sebagai role pemilik skema (postgres)
-- SEBELUM membuka halaman /materi/kirim di produksi.
--
-- Isi:
-- 1. Tabel "MateriPermohonan" (cermin model di schema.prisma) + CHECK
--    jenis/status. Tidak ada FK ke Faculty/Prodi: pemohon mengirim nama
--    fakultas/prodi sebagai teks bebas, dan admin memetakannya saat membuat
--    materi — supaya permohonan tetap masuk walau nama prodi sudah berubah.
-- 2. Index untuk daftar antrean (status + waktu) dan pencarian per email.
-- 3. RLS aktif, akses anon/authenticated dicabut, grant minimum untuk
--    `karsa_runtime` (satu-satunya jalur tulis adalah server action).
--
-- Aman dijalankan berulang.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_runtime') THEN
    RAISE EXCEPTION 'Role karsa_runtime belum ada. Buat role runtime sebelum menjalankan file ini.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "MateriPermohonan" (
    "id"          TEXT         NOT NULL,
    "nama"        TEXT         NOT NULL,
    "email"       TEXT         NOT NULL,
    "fakultas"    TEXT,
    "prodi"       TEXT,
    "matkul"      TEXT         NOT NULL,
    "jenis"       TEXT         NOT NULL DEFAULT 'UTS',
    "pertemuan"   TEXT,
    "ringkasan"   TEXT         NOT NULL,
    "tautan"      TEXT,
    "izin"        BOOLEAN      NOT NULL DEFAULT false,
    "status"      TEXT         NOT NULL DEFAULT 'MENUNGGU',
    "catatan"     TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    CONSTRAINT "MateriPermohonan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MateriPermohonan_jenis_check" CHECK ("jenis" IN ('UTS', 'UAS', 'KUIS')),
    CONSTRAINT "MateriPermohonan_status_check" CHECK ("status" IN ('MENUNGGU', 'DISETUJUI', 'DITOLAK'))
);

CREATE INDEX IF NOT EXISTS "MateriPermohonan_status_created_at_idx"
    ON "MateriPermohonan" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "MateriPermohonan_email_idx"
    ON "MateriPermohonan" ("email");

ALTER TABLE "MateriPermohonan" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "MateriPermohonan" FROM PUBLIC;
DO $$
DECLARE role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "MateriPermohonan" FROM %I', role_name);
    END IF;
  END LOOP;
  GRANT SELECT, INSERT, UPDATE, DELETE ON "MateriPermohonan" TO karsa_runtime;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'MateriPermohonan' AND policyname = 'karsa_runtime_ai') THEN
    CREATE POLICY karsa_runtime_ai ON "MateriPermohonan" FOR ALL TO karsa_runtime USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verifikasi read-only setelah migrasi
-- ---------------------------------------------------------------------------
--
-- SELECT table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'karsa_runtime' AND table_schema = 'public' AND table_name = 'MateriPermohonan'
-- ORDER BY privilege_type;
--
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = '"MateriPermohonan"'::regclass ORDER BY conname;
--
-- SELECT status, count(*) FROM "MateriPermohonan" GROUP BY status;
-- ---------------------------------------------------------------------------
