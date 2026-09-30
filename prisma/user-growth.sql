-- Jalankan sekali di Supabase SQL Editor sebelum deploy dashboard pertumbuhan.
-- Aman dijalankan ulang. Tidak mengisi data historis secara perkiraan:
-- first_login_at baru dicatat pada login Google/mobile yang sukses berikutnya.
BEGIN;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "first_login_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "User_first_login_at_idx" ON "User" ("first_login_at");
COMMIT;
