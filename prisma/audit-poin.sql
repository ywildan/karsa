-- Jalankan sekali di Supabase SQL Editor SEBELUM deploy fitur audit poin.
-- Aman dijalankan ulang. Tidak mengubah atau menghapus baris PoinLog lama.
BEGIN;

CREATE TABLE IF NOT EXISTS "PoinAuditLog" (
    "id"              TEXT         NOT NULL,
    "action"          TEXT         NOT NULL,
    "poin_log_id"     TEXT         NOT NULL,
    "kelas_matkul_id" TEXT         NOT NULL,
    "kelas_name"      TEXT         NOT NULL,
    "matkul_name"     TEXT         NOT NULL,
    "mahasiswa_id"    TEXT         NOT NULL,
    "mahasiswa_name"  TEXT,
    "mahasiswa_nim"   TEXT,
    "pj_id"           TEXT         NOT NULL,
    "pj_name"         TEXT,
    "pj_email"        TEXT,
    "kategori_name"   TEXT         NOT NULL,
    "poin"            INTEGER      NOT NULL,
    "catatan"         TEXT,
    "poin_created_at" TIMESTAMP(3) NOT NULL,
    "occurred_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PoinAuditLog_pkey" PRIMARY KEY ("id")
);

-- Data audit hanya dibaca/ditulis server melalui koneksi PostgreSQL Prisma.
-- Tidak ada policy untuk Supabase Data API (anon/authenticated).
ALTER TABLE "PoinAuditLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "PoinAuditLog" FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PoinAuditLog_action_check') THEN
        ALTER TABLE "PoinAuditLog" ADD CONSTRAINT "PoinAuditLog_action_check"
            CHECK ("action" IN ('INPUT', 'HAPUS'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PoinAuditLog_mahasiswa_id_occurred_at_idx"
    ON "PoinAuditLog" ("mahasiswa_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "PoinAuditLog_pj_id_occurred_at_idx"
    ON "PoinAuditLog" ("pj_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "PoinAuditLog_occurred_at_idx"
    ON "PoinAuditLog" ("occurred_at");

COMMIT;
