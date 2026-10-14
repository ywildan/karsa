/**
 * Karsa — lib/admin/ai-premium.ts
 * ----------------------------------------------------------------------------
 * Data untuk dashboard "Langganan AI" (`/admin/ai-premium`): pengaturan
 * global (dari `LibAiSetting`, menang atas env) dan daftar user beserta
 * tier, limit khusus, pemakaian hari ini, dan limit efektifnya.
 *
 * Semua bacaan fail-safe: tabel pengaturan belum dibuat atau AI belum aktif
 * lewat env → halaman tetap tampil dengan nilai bawaan + penanda sumber,
 * bukan error. Penulisan tetap divalidasi ketat di `actions/ai-premium.ts`.
 */

import "server-only";

import { aiConfig, aiDay, aiMonth, parseAiBaseUrl } from "@/lib/karsa-lib/ai-policy";
import {
  AI_SETTING_BASE_URL,
  AI_SETTING_GLOBAL_DAILY_LIMIT,
  AI_SETTING_WEBSEARCH_GLOBAL_LIMIT,
  normalizeAiTier,
  resolveAiBaseUrl,
  resolveAiGlobalLimits,
  resolveAiTokenLimit,
  resolveAiUserLimits,
  tokenAllotmentFor,
  type AiTier,
  type AiUserLimitOverrides,
} from "@/lib/karsa-lib/ai-settings";
import { getAiSettingValues } from "@/lib/karsa-lib/ai-settings-store";
import { prisma } from "@/lib/prisma";

/** Bawaan parser env — hanya untuk tampilan bila AI belum aktif. */
const FALLBACK_LIMITS = {
  summaryLimit: 3,
  globalLimit: 100,
  webSearchFreeLimit: 3,
  webSearchPremiumLimit: 3,
  webSearchPlusLimit: 5,
  webSearchGlobalLimit: 100,
};

export interface AiGlobalSettingView {
  value: number;
  source: "dashboard" | "env";
  usedToday: number;
}

export interface AiPremiumSettingsView {
  aiEnabled: boolean;
  /** False bila tabel `LibAiSetting` belum dibuat (SQL belum dijalankan). */
  settingsAvailable: boolean;
  globalDailyLimit: AiGlobalSettingView;
  webSearchGlobalLimit: AiGlobalSettingView;
  /** Base URL provider yang sedang efektif + sumbernya. */
  baseUrl: { value: string; source: "dashboard" | "env" };
  /** Jatah token bulanan per tier (dashboard menang atas bawaan kode). */
  tokenAllotments: Record<AiTier, { value: number; source: "dashboard" | "default" }>;
}

export async function getAiPremiumSettingsView(): Promise<AiPremiumSettingsView> {
  const config = aiConfig();
  const base = config ?? FALLBACK_LIMITS;
  const settings = await getAiSettingValues();
  const settingsAvailable = await prisma.libAiSetting
    .count()
    .then(() => true)
    .catch(() => false);
  const resolved = resolveAiGlobalLimits(settings, base);
  const { day } = aiDay();
  const [globalUsed, webGlobalUsed] = await Promise.all([
    prisma.libAiUsageBucket
      .findUnique({ where: { scope_day: { scope: "GLOBAL", day } } })
      .catch(() => null),
    prisma.libAiUsageBucket
      .findUnique({ where: { scope_day: { scope: "GLOBAL_WEBSEARCH", day } } })
      .catch(() => null),
  ]);
  const dashboardBaseUrl = parseAiBaseUrl(settings[AI_SETTING_BASE_URL]);
  const resolvedBase = config ? resolveAiBaseUrl(settings, config) : null;
  return {
    aiEnabled: config !== null,
    settingsAvailable,
    baseUrl: resolvedBase
      ? { value: resolvedBase.baseUrl, source: resolvedBase.source }
      : {
          value: dashboardBaseUrl ?? process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
          source: dashboardBaseUrl ? ("dashboard" as const) : ("env" as const),
        },
    tokenAllotments: {
      free: tokenAllotmentFor("free", settings),
      premium: tokenAllotmentFor("premium", settings),
      plus: tokenAllotmentFor("plus", settings),
    },
    globalDailyLimit: {
      value: resolved.globalLimit,
      source: settings[AI_SETTING_GLOBAL_DAILY_LIMIT] ? "dashboard" : "env",
      usedToday: globalUsed?.used ?? 0,
    },
    webSearchGlobalLimit: {
      value: resolved.webSearchGlobalLimit,
      source: settings[AI_SETTING_WEBSEARCH_GLOBAL_LIMIT] ? "dashboard" : "env",
      usedToday: webGlobalUsed?.used ?? 0,
    },
  };
}

export interface AiSubscriberRow {
  id: string;
  name: string | null;
  email: string;
  nim: string | null;
  tier: AiTier;
  overrides: AiUserLimitOverrides;
  usageToday: { summary: number; webSearch: number };
  /** Token tercatat bulan WIB berjalan (chat + web search). */
  tokenUsedMonth: number;
  effective: { tokenLimit: number; summaryLimit: number; webSearchLimit: number; webSearchPeriod: "day" | "month" };
}

export async function listAiSubscribers(query: string): Promise<AiSubscriberRow[]> {
  const config = aiConfig();
  const base = config ?? FALLBACK_LIMITS;
  const q = query.trim();
  const users = await prisma.user.findMany({
    where: {
      is_admin: false,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { nim: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ premium_tier: "desc" }, { name: "asc" }],
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      nim: true,
      premium_tier: true,
      ai_token_limit_override: true,
      ai_summary_limit_override: true,
      ai_web_search_limit_override: true,
    },
  }).catch(() => []);

  if (users.length === 0) return [];

  const { day } = aiDay();
  const { month, reset_at: monthEnd } = aiMonth();
  const pairs: { scope: string; day: string }[] = [];
  for (const user of users) {
    pairs.push(
      { scope: `USER_SUMMARY:${user.id}`, day },
      normalizeAiTier(user.premium_tier) === "free"
        ? { scope: `USER_WEBSEARCH_FREE:${user.id}`, day: month }
        : { scope: `USER_WEBSEARCH:${user.id}`, day },
    );
  }
  const buckets = await prisma.libAiUsageBucket
    .findMany({ where: { OR: pairs.map((pair) => ({ scope: pair.scope, day: pair.day })) } })
    .catch(() => []);
  const usedByScope = new Map(buckets.map((bucket) => [`${bucket.scope}|${bucket.day}`, bucket.used]));

  // Pemakaian token bulan berjalan per user (satu groupBy untuk semua baris).
  const settings = await getAiSettingValues();
  const monthStart = new Date(`${month}-01T00:00:00+07:00`);
  const tokenGroups = await prisma.libAiTurn
    .groupBy({
      by: ["user_id"],
      where: {
        user_id: { in: users.map((user) => user.id) },
        status: { not: "PENDING" },
        created_at: { gte: monthStart, lt: monthEnd },
      },
      _sum: { prompt_tokens: true, completion_tokens: true },
    })
    .catch(() => []);
  const tokenUsedByUser = new Map(
    tokenGroups.map((group) => [
      group.user_id,
      (group._sum.prompt_tokens ?? 0) + (group._sum.completion_tokens ?? 0),
    ]),
  );

  return users.map((user) => {
    const tier = normalizeAiTier(user.premium_tier);
    const overrides: AiUserLimitOverrides = {
      token: user.ai_token_limit_override,
      summary: user.ai_summary_limit_override,
      webSearch: user.ai_web_search_limit_override,
    };
    const effective = resolveAiUserLimits({ tier: user.premium_tier, overrides, config: base });
    const webScope = tier === "free" ? `USER_WEBSEARCH_FREE:${user.id}` : `USER_WEBSEARCH:${user.id}`;
    const webDay = tier === "free" ? month : day;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      nim: user.nim,
      tier,
      overrides,
      usageToday: {
        summary: usedByScope.get(`USER_SUMMARY:${user.id}|${day}`) ?? 0,
        webSearch: usedByScope.get(`${webScope}|${webDay}`) ?? 0,
      },
      tokenUsedMonth: tokenUsedByUser.get(user.id) ?? 0,
      effective: {
        tokenLimit: resolveAiTokenLimit({
          tier: user.premium_tier,
          tokenOverride: user.ai_token_limit_override,
          settings,
        }),
        summaryLimit: effective.summaryLimit,
        webSearchLimit: effective.webSearchLimit,
        webSearchPeriod: effective.webSearchPeriod,
      },
    };
  });
}
