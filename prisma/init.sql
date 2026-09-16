-- ============================================================================
-- Karsa — prisma/init.sql
-- Sistem Pencatatan Poin Keaktifan Mahasiswa UNTIDAR
-- ----------------------------------------------------------------------------
-- APA INI?
--   Skrip SQL siap-tempel untuk membuat SELURUH struktur database Karsa di
--   Supabase / PostgreSQL, tanpa perlu `prisma db push` (yang butuh unduh
--   engine Prisma + koneksi langsung dari mesin lokal).
--
-- CARA PAKAI (Supabase)
--   1. Buka project Supabase → SQL Editor → New query.
--   2. Tempel SELURUH isi file ini.
--   3. Klik Run. Semua pernyataan idempoten — aman dijalankan berulang.
--   4. Setelah ini jalankan seed: `npm run db:seed`
--      (atau eksekusi blok SEED di bagian paling bawah, baris 300+).
--
-- HUBUNGAN DENGAN prisma/schema.prisma
--   File ini adalah CERMIN dari schema.prisma. Nama tabel & kolom ditulis
--   persis seperti yang dihasilkan Prisma, supaya `prisma db pull`,
--   `db push`, dan Prisma Client tidak menemukan drift.
--   Kalau schema.prisma diubah, WAJIB update file ini juga.
--     · model PascalCase  → tabel PascalCase (dikutip: "PoinLog")
--     · field snake_case  → kolom snake_case  (tanpa kutip)
--     · field camelCase   → kolom camelCase   ("emailVerified" — khusus Auth.js)
--     · tanpa @map        → tidak ada renaming sama sekali
--
-- CATATAN
--   · `prisma migrate` TIDAK dipakai di proyek ini. Kalau nanti mau pindah ke
--     migration, jalankan `npx prisma migrate diff --from-empty --to-schema-datamodel
--     prisma/schema.prisma --script` sebagai baseline.
--   · Idempoten: CREATE TABLE IF NOT EXISTS + constraint dibuat lewat DO block
--     yang cek pg_constraint lebih dulu. Skrip bisa diulang tanpa error.
--   · Urutan penting: tabel dibuat lebih dulu, baru FOREIGN KEY.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. TABEL
-- ---------------------------------------------------------------------------

-- User — identitas tunggal untuk admin, PJ, dan mahasiswa.
CREATE TABLE IF NOT EXISTS "User" (
    "id"            TEXT         NOT NULL,
    "name"          TEXT,
    "email"         TEXT         NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image"         TEXT,
    "is_admin"      BOOLEAN      NOT NULL DEFAULT false,
    "kelas_id"      TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Account — tautan OAuth Google (wajib untuk Auth.js / NextAuth v5 adapter).
CREATE TABLE IF NOT EXISTS "Account" (
    "id"                TEXT NOT NULL,
    "userId"            TEXT NOT NULL,
    "type"              TEXT NOT NULL,
    "provider"          TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token"     TEXT,
    "access_token"      TEXT,
    "expires_at"        INTEGER,
    "token_type"        TEXT,
    "scope"             TEXT,
    "id_token"          TEXT,
    "session_state"     TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- Session — tidak dipakai selama strategi JWT, disediakan untuk kompatibilitas.
CREATE TABLE IF NOT EXISTS "Session" (
    "id"           TEXT         NOT NULL,
    "sessionToken" TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "expires"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- VerificationToken — standar Auth.js.
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT         NOT NULL,
    "token"      TEXT         NOT NULL,
    "expires"    TIMESTAMP(3) NOT NULL
);

-- Semester — hanya satu baris boleh is_active = true (dijaga partial unique index).
CREATE TABLE IF NOT EXISTS "Semester" (
    "id"         TEXT         NOT NULL,
    "name"       TEXT         NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date"   TIMESTAMP(3) NOT NULL,
    "is_active"  BOOLEAN      NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- Prodi — program studi.
CREATE TABLE IF NOT EXISTS "Prodi" (
    "id"         TEXT         NOT NULL,
    "name"       TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prodi_pkey" PRIMARY KEY ("id")
);

-- Matkul — master mata kuliah lintas kelas.
CREATE TABLE IF NOT EXISTS "Matkul" (
    "id"         TEXT         NOT NULL,
    "name"       TEXT         NOT NULL,
    "code"       TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Matkul_pkey" PRIMARY KEY ("id")
);

-- Kelas — rombongan belajar pada satu prodi & satu semester.
CREATE TABLE IF NOT EXISTS "Kelas" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "prodi_id"    TEXT         NOT NULL,
    "semester_id" TEXT         NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- KelasMatkul — matkul yang diajarkan di satu kelas, dipegang satu PJ.
CREATE TABLE IF NOT EXISTS "KelasMatkul" (
    "id"         TEXT         NOT NULL,
    "kelas_id"   TEXT         NOT NULL,
    "matkul_id"  TEXT         NOT NULL,
    "pj_id"      TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KelasMatkul_pkey" PRIMARY KEY ("id")
);

-- KategoriPoin — Bertanya · Menjawab · Presentasi · Lainnya.
CREATE TABLE IF NOT EXISTS "KategoriPoin" (
    "id"         TEXT         NOT NULL,
    "name"       TEXT         NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KategoriPoin_pkey" PRIMARY KEY ("id")
);

-- PoinLog — satu baris = satu "karsa".
CREATE TABLE IF NOT EXISTS "PoinLog" (
    "id"              TEXT         NOT NULL,
    "kelas_matkul_id" TEXT         NOT NULL,
    "mahasiswa_id"    TEXT         NOT NULL,
    "pj_id"           TEXT         NOT NULL,
    "kategori_id"     TEXT         NOT NULL,
    "poin"            INTEGER      NOT NULL,
    "catatan"         TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoinLog_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 2. UNIQUE CONSTRAINT
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_email_key') THEN
        ALTER TABLE "User" ADD CONSTRAINT "User_email_key" UNIQUE ("email");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_provider_providerAccountId_key') THEN
        ALTER TABLE "Account" ADD CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_sessionToken_key') THEN
        ALTER TABLE "Session" ADD CONSTRAINT "Session_sessionToken_key" UNIQUE ("sessionToken");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VerificationToken_token_key') THEN
        ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_token_key" UNIQUE ("token");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VerificationToken_identifier_token_key') THEN
        ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Semester_name_key') THEN
        ALTER TABLE "Semester" ADD CONSTRAINT "Semester_name_key" UNIQUE ("name");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Prodi_name_key') THEN
        ALTER TABLE "Prodi" ADD CONSTRAINT "Prodi_name_key" UNIQUE ("name");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Matkul_code_key') THEN
        ALTER TABLE "Matkul" ADD CONSTRAINT "Matkul_code_key" UNIQUE ("code");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Kelas_name_prodi_id_semester_id_key') THEN
        ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_name_prodi_id_semester_id_key" UNIQUE ("name", "prodi_id", "semester_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KelasMatkul_kelas_id_matkul_id_key') THEN
        ALTER TABLE "KelasMatkul" ADD CONSTRAINT "KelasMatkul_kelas_id_matkul_id_key" UNIQUE ("kelas_id", "matkul_id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KategoriPoin_name_key') THEN
        ALTER TABLE "KategoriPoin" ADD CONSTRAINT "KategoriPoin_name_key" UNIQUE ("name");
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. FOREIGN KEY
--    onDelete mengikuti schema.prisma:
--      Cascade  → ikut terhapus
--      Restrict → ditolak kalau masih dipakai (tanpa aksi DB)
--      SetNull  → jadi NULL (User.kelas_id)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    -- User → Kelas
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_kelas_id_fkey') THEN
        ALTER TABLE "User"
            ADD CONSTRAINT "User_kelas_id_fkey"
            FOREIGN KEY ("kelas_id") REFERENCES "Kelas" ("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Account → User
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
        ALTER TABLE "Account"
            ADD CONSTRAINT "Account_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Session → User
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
        ALTER TABLE "Session"
            ADD CONSTRAINT "Session_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Kelas → Prodi
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Kelas_prodi_id_fkey') THEN
        ALTER TABLE "Kelas"
            ADD CONSTRAINT "Kelas_prodi_id_fkey"
            FOREIGN KEY ("prodi_id") REFERENCES "Prodi" ("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- Kelas → Semester
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Kelas_semester_id_fkey') THEN
        ALTER TABLE "Kelas"
            ADD CONSTRAINT "Kelas_semester_id_fkey"
            FOREIGN KEY ("semester_id") REFERENCES "Semester" ("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- KelasMatkul → Kelas
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KelasMatkul_kelas_id_fkey') THEN
        ALTER TABLE "KelasMatkul"
            ADD CONSTRAINT "KelasMatkul_kelas_id_fkey"
            FOREIGN KEY ("kelas_id") REFERENCES "Kelas" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- KelasMatkul → Matkul
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KelasMatkul_matkul_id_fkey') THEN
        ALTER TABLE "KelasMatkul"
            ADD CONSTRAINT "KelasMatkul_matkul_id_fkey"
            FOREIGN KEY ("matkul_id") REFERENCES "Matkul" ("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- KelasMatkul → User (PJ)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'KelasMatkul_pj_id_fkey') THEN
        ALTER TABLE "KelasMatkul"
            ADD CONSTRAINT "KelasMatkul_pj_id_fkey"
            FOREIGN KEY ("pj_id") REFERENCES "User" ("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- PoinLog → KelasMatkul
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PoinLog_kelas_matkul_id_fkey') THEN
        ALTER TABLE "PoinLog"
            ADD CONSTRAINT "PoinLog_kelas_matkul_id_fkey"
            FOREIGN KEY ("kelas_matkul_id") REFERENCES "KelasMatkul" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- PoinLog → User (mahasiswa yang dinilai)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PoinLog_mahasiswa_id_fkey') THEN
        ALTER TABLE "PoinLog"
            ADD CONSTRAINT "PoinLog_mahasiswa_id_fkey"
            FOREIGN KEY ("mahasiswa_id") REFERENCES "User" ("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- PoinLog → User (PJ pembuat)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PoinLog_pj_id_fkey') THEN
        ALTER TABLE "PoinLog"
            ADD CONSTRAINT "PoinLog_pj_id_fkey"
            FOREIGN KEY ("pj_id") REFERENCES "User" ("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- PoinLog → KategoriPoin
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PoinLog_kategori_id_fkey') THEN
        ALTER TABLE "PoinLog"
            ADD CONSTRAINT "PoinLog_kategori_id_fkey"
            FOREIGN KEY ("kategori_id") REFERENCES "KategoriPoin" ("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. RULE BISNIS DI LEVEL DATABASE (defense in depth)
-- ---------------------------------------------------------------------------

-- PRD §8: poin wajib integer 1–4. Server tetap memvalidasi dengan Zod;
-- CHECK ini mencegah baris tidak sah kalau ada jalur tulis lain.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PoinLog_poin_check') THEN
        ALTER TABLE "PoinLog"
            ADD CONSTRAINT "PoinLog_poin_check" CHECK ("poin" >= 1 AND "poin" <= 4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Semester_rentang_check') THEN
        ALTER TABLE "Semester"
            ADD CONSTRAINT "Semester_rentang_check" CHECK ("end_date" > "start_date");
    END IF;
END $$;

-- PRD §9: maksimal SATU semester aktif. Dijaga partial unique index,
-- jadi bahkan `updateMany` yang salah tidak bisa melanggarnya.
CREATE UNIQUE INDEX IF NOT EXISTS "Semester_satu_aktif_key"
    ON "Semester" ("is_active")
    WHERE "is_active" = true;

-- ---------------------------------------------------------------------------
-- 5. INDEX
-- ---------------------------------------------------------------------------

-- Auth
CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account" ("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session" ("userId");

-- User
CREATE INDEX IF NOT EXISTS "User_kelas_id_idx" ON "User" ("kelas_id");

-- Master akademik
CREATE INDEX IF NOT EXISTS "Kelas_prodi_id_idx" ON "Kelas" ("prodi_id");
CREATE INDEX IF NOT EXISTS "Kelas_semester_id_idx" ON "Kelas" ("semester_id");
CREATE INDEX IF NOT EXISTS "KelasMatkul_kelas_id_idx" ON "KelasMatkul" ("kelas_id");
CREATE INDEX IF NOT EXISTS "KelasMatkul_matkul_id_idx" ON "KelasMatkul" ("matkul_id");
CREATE INDEX IF NOT EXISTS "KelasMatkul_pj_id_idx" ON "KelasMatkul" ("pj_id");

-- PoinLog
CREATE INDEX IF NOT EXISTS "PoinLog_kelas_matkul_id_idx" ON "PoinLog" ("kelas_matkul_id");
CREATE INDEX IF NOT EXISTS "PoinLog_mahasiswa_id_idx" ON "PoinLog" ("mahasiswa_id");
CREATE INDEX IF NOT EXISTS "PoinLog_pj_id_idx" ON "PoinLog" ("pj_id");
CREATE INDEX IF NOT EXISTS "PoinLog_kategori_id_idx" ON "PoinLog" ("kategori_id");
CREATE INDEX IF NOT EXISTS "PoinLog_created_at_idx" ON "PoinLog" ("created_at");
CREATE INDEX IF NOT EXISTS "PoinLog_kelas_matkul_id_mahasiswa_id_idx" ON "PoinLog" ("kelas_matkul_id", "mahasiswa_id");

COMMIT;

-- ============================================================================
-- 6. SEED MINIMAL (PRD §5: 4 KategoriPoin + 1 Semester aktif)
-- ----------------------------------------------------------------------------
-- Blok ini idempoten. Jalankan setelah blok di atas sukses.
-- Id dibuat eksplisit supaya hasilnya sama dengan `npm run db:seed`
-- kalau nanti seed Prisma dipakai.
-- ============================================================================

INSERT INTO "KategoriPoin" ("id", "name", "created_at", "updated_at")
VALUES
    ('kat_bertanya',   'Bertanya',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kat_menjawab',   'Menjawab',   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kat_presentasi', 'Presentasi', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('kat_lainnya',    'Lainnya',    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "Semester" ("id", "name", "start_date", "end_date", "is_active", "created_at", "updated_at")
VALUES
    ('smt_ganjil_2026_2027', 'Ganjil 2026/2027', TIMESTAMP '2026-09-01 00:00:00', TIMESTAMP '2027-01-31 23:59:59', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Pastikan hanya satu semester aktif (kalau sebelumnya sudah ada yang aktif).
UPDATE "Semester"
SET "is_active" = false
WHERE "is_active" = true
  AND "name" <> 'Ganjil 2026/2027';
