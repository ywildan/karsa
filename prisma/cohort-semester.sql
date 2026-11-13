-- ============================================================================
-- KARSA — Semester Aktif per (Prodi, Angkatan)
-- ============================================================================
-- File SQL inkremental & idempoten untuk database yang SUDAH berjalan.
-- Untuk instalasi baru, tabel & kolom ini sudah termasuk di `init.sql`.
--
-- Latar belakang: `Semester.is_active` lama hanya bisa menandai SATU periode
-- untuk seluruh kampus. Sekarang tiap (prodi, angkatan) menunjuk periodenya
-- sendiri lewat "CohortSemester"; dua kelas dalam angkatan yang sama otomatis
-- berbagi pointer yang sama.
--
-- Isi:
-- 1. Kolom "Kelas"."angkatan" + backfill dari NIM anggota bila seragam.
-- 2. Tabel "CohortSemester" (satu baris per prodi + angkatan).
-- 3. Ganti unique index kelas menjadi (name, prodi_id, angkatan, semester_id).
-- 4. Seed pointer awal dari `Semester.is_active` yang sekarang.
--
-- Jalankan sebagai role pemilik skema. Aman dijalankan berulang.
-- Setelah migrasi, periksa kelas yang belum punya angkatan:
--   SELECT "id", "name" FROM "Kelas" WHERE "angkatan" IS NULL;

BEGIN;

-- 1. Kolom angkatan -----------------------------------------------------------
ALTER TABLE "Kelas" ADD COLUMN IF NOT EXISTS "angkatan" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Kelas_angkatan_check') THEN
    ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_angkatan_check"
      CHECK ("angkatan" IS NULL OR "angkatan" BETWEEN 2000 AND 2100);
  END IF;
END $$;

-- Backfill dari NIM (2 digit pertama = tahun masuk), hanya bila semua anggota
-- kelas memiliki prefix tahun yang sama. Kelas tanpa anggota / campuran
-- dibiarkan NULL agar admin menentukan manual — tidak menebak.
WITH per_kelas AS (
    SELECT u."kelas_id" AS kelas_id,
           MIN(2000 + substring(u."nim" FROM 1 FOR 2)::integer) AS angkatan,
           COUNT(DISTINCT substring(u."nim" FROM 1 FOR 2)) AS variasi
      FROM "User" u
     WHERE u."kelas_id" IS NOT NULL
       AND u."nim" ~ '^[0-9]{2}'
     GROUP BY u."kelas_id"
)
UPDATE "Kelas" k
   SET "angkatan" = p.angkatan,
       "updated_at" = CURRENT_TIMESTAMP
  FROM per_kelas p
 WHERE k."id" = p.kelas_id
   AND p.variasi = 1
   AND k."angkatan" IS NULL;

-- 2. Tabel CohortSemester -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "CohortSemester" (
    "id"          TEXT         NOT NULL,
    "prodi_id"    TEXT         NOT NULL,
    "angkatan"    INTEGER      NOT NULL,
    "semester_id" TEXT         NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CohortSemester_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CohortSemester_angkatan_check" CHECK ("angkatan" BETWEEN 2000 AND 2100)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CohortSemester_prodi_id_angkatan_key') THEN
    ALTER TABLE "CohortSemester"
      ADD CONSTRAINT "CohortSemester_prodi_id_angkatan_key" UNIQUE ("prodi_id", "angkatan");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CohortSemester_prodi_id_fkey') THEN
    ALTER TABLE "CohortSemester"
      ADD CONSTRAINT "CohortSemester_prodi_id_fkey"
      FOREIGN KEY ("prodi_id") REFERENCES "Prodi" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CohortSemester_semester_id_fkey') THEN
    ALTER TABLE "CohortSemester"
      ADD CONSTRAINT "CohortSemester_semester_id_fkey"
      FOREIGN KEY ("semester_id") REFERENCES "Semester" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CohortSemester_semester_id_idx"
  ON "CohortSemester" ("semester_id");

-- 3. Unique kelas per angkatan ------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Kelas_name_prodi_id_semester_id_key') THEN
    ALTER TABLE "Kelas" DROP CONSTRAINT "Kelas_name_prodi_id_semester_id_key";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Kelas_name_prodi_id_angkatan_semester_id_key') THEN
    ALTER TABLE "Kelas"
      ADD CONSTRAINT "Kelas_name_prodi_id_angkatan_semester_id_key"
      UNIQUE ("name", "prodi_id", "angkatan", "semester_id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Kelas_prodi_id_angkatan_idx"
  ON "Kelas" ("prodi_id", "angkatan");

-- RLS: hanya role runtime yang boleh mengakses tabel ini. Pola sama dengan
-- "PengelolaAssignment" — anon/authenticated tidak butuh akses langsung.
ALTER TABLE "CohortSemester" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "CohortSemester" FROM PUBLIC;
DO $$
DECLARE role_name TEXT;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON "CohortSemester" FROM %I', role_name);
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'karsa_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "CohortSemester" TO karsa_runtime;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'CohortSemester'
        AND policyname = 'karsa_runtime_ai'
    ) THEN
      CREATE POLICY karsa_runtime_ai ON "CohortSemester"
        FOR ALL TO karsa_runtime USING (true) WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- 4. Pointer awal dari semester aktif lama ------------------------------------
-- Hanya untuk cohort yang sudah terdeteksi dari kelas. Cohort lain ditetapkan
-- admin lewat /admin/semester (tab Semester Aktif).
INSERT INTO "CohortSemester" ("id", "prodi_id", "angkatan", "semester_id", "created_at", "updated_at")
SELECT 'cohort_' || md5(k."prodi_id" || ':' || k."angkatan"::text),
       k."prodi_id",
       k."angkatan",
       s."id",
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
  FROM (
        SELECT DISTINCT "prodi_id", "angkatan"
          FROM "Kelas"
         WHERE "angkatan" IS NOT NULL
       ) k
  CROSS JOIN LATERAL (
        SELECT "id" FROM "Semester" WHERE "is_active" = true LIMIT 1
       ) s
ON CONFLICT ("prodi_id", "angkatan") DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFIKASI (jalankan manual setelah migrasi)
-- ----------------------------------------------------------------------------
--   SELECT COUNT(*) FROM "CohortSemester";
--   SELECT k."id", k."name" FROM "Kelas" k WHERE k."angkatan" IS NULL;
-- ============================================================================
