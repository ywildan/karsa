-- Karsa — Kuota token AI bulanan per user (dashboard Langganan AI).
-- Jalankan SEKALI di Supabase SQL Editor. Aman dijalankan ulang (idempoten).
--
-- Menambah kolom jatah token khusus per user di "User". NULL = ikut jatah
-- tier (yang bisa diedit dari dashboard lewat tabel "LibAiSetting");
-- 0 = jatah habis untuk user itu. Kuota token menggantikan limit chat
-- berbasis jumlah request: penegakannya menjumlahkan token tercatat di
-- "LibAiTurn" pada bulan WIB berjalan (chat + web search). Kolom lama
-- ai_chat_limit_override dipertahankan (tidak lagi ditegakkan untuk chat).

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "ai_token_limit_override" integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_ai_token_limit_override_range'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "user_ai_token_limit_override_range"
      CHECK ("ai_token_limit_override" IS NULL
             OR ("ai_token_limit_override" >= 0
                 AND "ai_token_limit_override" <= 100000000));
  END IF;
END $$;
