/**
 * Karsa — lib/karsa-lib/ai-settings.ts
 * ----------------------------------------------------------------------------
 * Policy MURNI untuk pengaturan AI yang bisa diedit admin dari dashboard
 * "Langganan AI" (`/admin/ai-premium`): limit global harian dan limit khusus
 * per user. Tanpa Prisma/DOM — dipakai server (ai-service, actions) dan
 * diuji langsung.
 *
 * Urutan penentu nilai (konsisten di semua tempat):
 *   limit khusus per user  >  pengaturan dashboard (`LibAiSetting`)  >
 *   env (`aiConfig`)  >  bawaan kode.
 * Konfigurasi provider (base URL, API key, model) TIDAK ikut dipindah —
 * tetap env (keputusan pemilik, 2026-10-14).
 */

import type { AiConfig } from "@/lib/karsa-lib/ai-policy";

/** Kunci baris di tabel `LibAiSetting`. */
export const AI_SETTING_GLOBAL_DAILY_LIMIT = "global_daily_limit";
export const AI_SETTING_WEBSEARCH_GLOBAL_LIMIT = "websearch_global_limit";

/** Batas atas limit khusus per user (samakan dengan CHECK di SQL). */
export const AI_LIMIT_OVERRIDE_MAX = 1000;

/** Batas atas limit global, mengikuti parser env `aiConfig` (maks 10.000). */
export const AI_GLOBAL_LIMIT_MAX = 10000;

export type AiTier = "free" | "premium" | "plus";

/** Tier tak dikenal dianggap "free" (paling aman). */
export function normalizeAiTier(value: unknown): AiTier {
  return value === "premium" || value === "plus" ? value : "free";
}

/** Limit khusus per user; `null` = ikut bawaan (tier/env). */
export interface AiUserLimitOverrides {
  chat: number | null;
  summary: number | null;
  webSearch: number | null;
}

export const NO_AI_OVERRIDES: AiUserLimitOverrides = {
  chat: null,
  summary: null,
  webSearch: null,
};

/** Valid: null, atau bilangan bulat 0..AI_LIMIT_OVERRIDE_MAX (0 = nonaktif). */
export function isValidAiLimitOverride(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= AI_LIMIT_OVERRIDE_MAX)
  );
}

/**
 * Parse nilai pengaturan global dari tabel (string) — null bila kosong atau
 * tidak valid, supaya pembacaan yang rusak jatuh ke env, bukan mengunci AI.
 */
export function parseAiSettingLimit(
  value: string | null | undefined,
  max: number = AI_GLOBAL_LIMIT_MAX,
): number | null {
  if (value == null) return null;
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) return null;
  return parsed;
}

/** Limit global efektif: pengaturan dashboard menang atas env. */
export function resolveAiGlobalLimits(
  settings: Record<string, string>,
  config: Pick<AiConfig, "globalLimit" | "webSearchGlobalLimit">,
): { globalLimit: number; webSearchGlobalLimit: number } {
  return {
    globalLimit:
      parseAiSettingLimit(settings[AI_SETTING_GLOBAL_DAILY_LIMIT]) ??
      config.globalLimit,
    webSearchGlobalLimit:
      parseAiSettingLimit(settings[AI_SETTING_WEBSEARCH_GLOBAL_LIMIT]) ??
      config.webSearchGlobalLimit,
  };
}

export interface ResolvedAiUserLimits {
  chatLimit: number;
  summaryLimit: number;
  webSearchLimit: number;
  /** Tier gratis memakai jendela bulanan; premium/plus harian. */
  webSearchPeriod: "day" | "month";
}

/**
 * Limit efektif satu user: override per user menang; sisanya dari tier
 * (khusus web search) atau bawaan konfigurasi env.
 */
export function resolveAiUserLimits(input: {
  tier: unknown;
  overrides: AiUserLimitOverrides;
  config: Pick<
    AiConfig,
    | "chatLimit"
    | "summaryLimit"
    | "webSearchFreeLimit"
    | "webSearchPremiumLimit"
    | "webSearchPlusLimit"
  >;
}): ResolvedAiUserLimits {
  const tier = normalizeAiTier(input.tier);
  const { config, overrides } = input;
  const tierWebLimit =
    tier === "plus"
      ? config.webSearchPlusLimit
      : tier === "premium"
        ? config.webSearchPremiumLimit
        : config.webSearchFreeLimit;
  return {
    chatLimit: overrides.chat ?? config.chatLimit,
    summaryLimit: overrides.summary ?? config.summaryLimit,
    webSearchLimit: overrides.webSearch ?? tierWebLimit,
    webSearchPeriod: tier === "free" ? "month" : "day",
  };
}
