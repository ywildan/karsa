-- ============================================================================
-- Karsa Lib AI — penanda provider fallback (PR fallback provider)
-- ============================================================================
-- Tujuan: mencatat provider mana yang melayani tiap request Teman Baca —
-- "primary" (gateway utama; base URL bisa dari dashboard Langganan AI)
-- atau "fallback" (provider resmi cadangan dari env AI_FALLBACK_*) — di
-- `LibAiTurn` dan `LibAiSummaryGeneration`, supaya dashboard Penggunaan AI
-- bisa memisahkan traffic dan biaya keduanya.
--
-- Aman dijalankan berulang (idempoten). Jalankan SATU KALI di Supabase SQL
-- Editor, idealnya SEBELUM deploy kode yang memakainya. Kode tetap fail-safe
-- bila file ini belum dijalankan: pencatatan analitik dicoba ulang tanpa
-- kolom `provider`, jadi jawaban AI dan snapshot lain tidak terganggu.
-- ============================================================================

ALTER TABLE "LibAiTurn"
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'primary';
ALTER TABLE "LibAiSummaryGeneration"
  ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'primary';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LibAiTurn_provider_check'
  ) THEN
    ALTER TABLE "LibAiTurn"
      ADD CONSTRAINT "LibAiTurn_provider_check"
      CHECK ("provider" IN ('primary', 'fallback'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LibAiSummaryGeneration_provider_check'
  ) THEN
    ALTER TABLE "LibAiSummaryGeneration"
      ADD CONSTRAINT "LibAiSummaryGeneration_provider_check"
      CHECK ("provider" IN ('primary', 'fallback'));
  END IF;
END $$;
