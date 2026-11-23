-- ============================================================================
-- KARSA — Absensi per matkul (tanpa keterangan · sakit · izin)
-- ============================================================================
-- File SQL inkremental untuk database yang SUDAH berjalan.
-- Untuk instalasi baru, tabel ini juga ada di `init.sql`.
--
-- Fitur: PJ mencatat mahasiswa yang tidak hadir pada satu tanggal di matkul
-- yang dipegangnya. Mahasiswa melihat sisa jatah tanpa keterangan (maksimal 2
-- per semester per matkul) beserta riwayatnya.
--
-- Jalankan SELURUH file ini, termasuk baris COMMIT di paling bawah.
-- Tidak ada blok dollar-quoted; aman dijalankan ulang.
--
-- Verifikasi setelah migrasi:
--   SELECT COUNT(*) FROM "AbsensiLog";
--   SELECT policyname FROM pg_policies WHERE tablename = 'AbsensiLog';
BEGIN;

CREATE TABLE IF NOT EXISTS "AbsensiLog" (
    "id"              TEXT         NOT NULL,
    "kelas_matkul_id" TEXT         NOT NULL,
    "mahasiswa_id"    TEXT         NOT NULL,
    "pj_id"           TEXT         NOT NULL,
    "status"          TEXT         NOT NULL,
    "tanggal"         DATE         NOT NULL,
    "catatan"         TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbsensiLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AbsensiLog_status_check" CHECK (
        "status" IN ('TANPA_KETERANGAN', 'SAKIT', 'IZIN')
    ),
    CONSTRAINT "AbsensiLog_catatan_check" CHECK (
        "catatan" IS NULL OR char_length("catatan") <= 500
    )
);

-- Tambahkan constraint secara terpisah agar tetap terpasang bila tabel
-- sempat dibuat oleh percobaan sebelumnya. Drop + add = idempoten.
ALTER TABLE "AbsensiLog"
    DROP CONSTRAINT IF EXISTS "AbsensiLog_kelas_matkul_id_mahasiswa_id_tanggal_key";
ALTER TABLE "AbsensiLog"
    ADD CONSTRAINT "AbsensiLog_kelas_matkul_id_mahasiswa_id_tanggal_key"
    UNIQUE ("kelas_matkul_id", "mahasiswa_id", "tanggal");

ALTER TABLE "AbsensiLog"
    DROP CONSTRAINT IF EXISTS "AbsensiLog_kelas_matkul_id_fkey";
ALTER TABLE "AbsensiLog"
    ADD CONSTRAINT "AbsensiLog_kelas_matkul_id_fkey"
    FOREIGN KEY ("kelas_matkul_id") REFERENCES "KelasMatkul" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AbsensiLog"
    DROP CONSTRAINT IF EXISTS "AbsensiLog_mahasiswa_id_fkey";
ALTER TABLE "AbsensiLog"
    ADD CONSTRAINT "AbsensiLog_mahasiswa_id_fkey"
    FOREIGN KEY ("mahasiswa_id") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AbsensiLog"
    DROP CONSTRAINT IF EXISTS "AbsensiLog_pj_id_fkey";
ALTER TABLE "AbsensiLog"
    ADD CONSTRAINT "AbsensiLog_pj_id_fkey"
    FOREIGN KEY ("pj_id") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "AbsensiLog_kelas_matkul_id_status_idx"
    ON "AbsensiLog" ("kelas_matkul_id", "status");
CREATE INDEX IF NOT EXISTS "AbsensiLog_mahasiswa_id_kelas_matkul_id_idx"
    ON "AbsensiLog" ("mahasiswa_id", "kelas_matkul_id");
CREATE INDEX IF NOT EXISTS "AbsensiLog_tanggal_idx"
    ON "AbsensiLog" ("tanggal");

-- RLS: hanya role runtime yang boleh mengakses tabel ini.
ALTER TABLE "AbsensiLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AbsensiLog" FROM PUBLIC;
REVOKE ALL ON "AbsensiLog" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "AbsensiLog" TO karsa_runtime;
DROP POLICY IF EXISTS karsa_runtime_ai ON "AbsensiLog";
CREATE POLICY karsa_runtime_ai ON "AbsensiLog"
    FOR ALL TO karsa_runtime USING (true) WITH CHECK (true);

COMMIT;
