/**
 * Karsa — actions/ai-premium.ts
 * ----------------------------------------------------------------------------
 * Mutasi dashboard "Langganan AI" (admin saja): ganti tier langganan user,
 * limit khusus per user, dan limit global (`LibAiSetting`). Semua perubahan
 * dicatat ke `AuditLog` dalam transaksi yang sama (pola repo), dan cache
 * pengaturan diinstance ini dikosongkan agar langsung berlaku.
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { zodFirstError } from "@/lib/action-utils";
import { listAiSubscribers, type AiSubscriberRow } from "@/lib/admin/ai-premium";
import { auditActorFromSession, logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { parseAiBaseUrl } from "@/lib/karsa-lib/ai-policy";
import {
  AI_GLOBAL_LIMIT_MAX,
  AI_SETTING_BASE_URL,
  AI_SETTING_GLOBAL_DAILY_LIMIT,
  AI_SETTING_TOKEN_FREE_MONTHLY,
  AI_SETTING_TOKEN_PLUS_MONTHLY,
  AI_SETTING_TOKEN_PREMIUM_MONTHLY,
  AI_SETTING_WEBSEARCH_GLOBAL_LIMIT,
  AI_TOKEN_LIMIT_MAX,
  isValidAiLimitOverride,
  isValidAiTokenOverride,
} from "@/lib/karsa-lib/ai-settings";
import { invalidateAiSettingsCache } from "@/lib/karsa-lib/ai-settings-store";
import { prisma } from "@/lib/prisma";

const PAGE_PATH = "/admin/ai-premium";
const SQL_HINT =
  "Tabel pengaturan AI belum ada di database. Jalankan prisma/ai-premium-admin.sql di Supabase SQL Editor dulu.";

export async function searchAiSubscribers(query: string): Promise<AiSubscriberRow[]> {
  await requireAdmin();
  return listAiSubscribers(typeof query === "string" ? query.slice(0, 100) : "");
}

const tierSchema = z.object({
  userId: z.string().min(1),
  tier: z.enum(["free", "premium", "plus"]),
});

export async function setUserPremiumTier(input: {
  userId: string;
  tier: "free" | "premium" | "plus";
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = tierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };
  const { userId, tier } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, premium_tier: true, is_admin: true },
  });
  if (!user || user.is_admin) return { ok: false, error: "User tidak ditemukan." };
  if (user.premium_tier === tier) return { ok: true, message: "Tier tidak berubah." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { premium_tier: tier } });
      await logAudit(
        {
          actor: auditActorFromSession(admin),
          action: "AI_TIER_SET",
          entity: { type: "User", id: user.id, label: user.name ?? user.email },
          before: { premium_tier: user.premium_tier },
          after: { premium_tier: tier },
        },
        tx,
      );
    });
  } catch {
    return { ok: false, error: "Gagal mengubah tier. Silakan coba lagi." };
  }

  revalidatePath(PAGE_PATH);
  return { ok: true, message: `Tier ${user.name ?? user.email} sekarang ${tier}.` };
}

const overridesSchema = z.object({
  userId: z.string().min(1),
  token: z.number().int().min(0).max(AI_TOKEN_LIMIT_MAX).nullable(),
  summary: z.number().int().min(0).max(1000).nullable(),
  webSearch: z.number().int().min(0).max(1000).nullable(),
});

export async function setUserAiLimitOverrides(input: {
  userId: string;
  token: number | null;
  summary: number | null;
  webSearch: number | null;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = overridesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };
  const { userId, token, summary, webSearch } = parsed.data;
  if (!isValidAiTokenOverride(token) || !isValidAiLimitOverride(summary) || !isValidAiLimitOverride(webSearch)) {
    return { ok: false, error: "Limit tidak valid. Jatah token 0–100.000.000, limit lain 0–1000, atau kosong." };
  }

  const user = await prisma.user
    .findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        is_admin: true,
        ai_token_limit_override: true,
        ai_summary_limit_override: true,
        ai_web_search_limit_override: true,
      },
    })
    .catch(() => null);
  if (!user) return { ok: false, error: `User tidak ditemukan. ${SQL_HINT}` };
  if (user.is_admin) return { ok: false, error: "User tidak ditemukan." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          ai_token_limit_override: token,
          ai_summary_limit_override: summary,
          ai_web_search_limit_override: webSearch,
        },
      });
      await logAudit(
        {
          actor: auditActorFromSession(admin),
          action: "AI_LIMIT_SET",
          entity: { type: "User", id: user.id, label: user.name ?? user.email },
          before: {
            ai_token_limit_override: user.ai_token_limit_override,
            ai_summary_limit_override: user.ai_summary_limit_override,
            ai_web_search_limit_override: user.ai_web_search_limit_override,
          },
          after: {
            ai_token_limit_override: token,
            ai_summary_limit_override: summary,
            ai_web_search_limit_override: webSearch,
          },
        },
        tx,
      );
    });
  } catch {
    return { ok: false, error: `Gagal menyimpan limit khusus. ${SQL_HINT}` };
  }

  revalidatePath(PAGE_PATH);
  return { ok: true, message: "Limit khusus tersimpan." };
}

const globalSettingsSchema = z.object({
  globalDailyLimit: z.number().int().min(1).max(AI_GLOBAL_LIMIT_MAX).nullable(),
  webSearchGlobalLimit: z.number().int().min(1).max(AI_GLOBAL_LIMIT_MAX).nullable(),
});

export async function setAiGlobalSettings(input: {
  globalDailyLimit: number | null;
  webSearchGlobalLimit: number | null;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = globalSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };
  const { globalDailyLimit, webSearchGlobalLimit } = parsed.data;

  const entries: { key: string; value: number | null }[] = [
    { key: AI_SETTING_GLOBAL_DAILY_LIMIT, value: globalDailyLimit },
    { key: AI_SETTING_WEBSEARCH_GLOBAL_LIMIT, value: webSearchGlobalLimit },
  ];

  try {
    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        if (entry.value === null) {
          await tx.libAiSetting.deleteMany({ where: { key: entry.key } });
        } else {
          await tx.libAiSetting.upsert({
            where: { key: entry.key },
            create: { key: entry.key, value: String(entry.value) },
            update: { value: String(entry.value) },
          });
        }
      }
      await logAudit(
        {
          actor: auditActorFromSession(admin),
          action: "AI_GLOBAL_SETTINGS_SET",
          entity: { type: "LibAiSetting", id: "global", label: "Pengaturan AI global" },
          after: { global_daily_limit: globalDailyLimit, websearch_global_limit: webSearchGlobalLimit },
        },
        tx,
      );
    });
  } catch {
    return { ok: false, error: `Gagal menyimpan pengaturan global. ${SQL_HINT}` };
  }

  invalidateAiSettingsCache();
  revalidatePath(PAGE_PATH);
  return { ok: true, message: "Pengaturan global tersimpan." };
}

const baseUrlSchema = z.object({
  baseUrl: z.string().trim().min(1).max(500).nullable(),
});

/**
 * Atur base URL provider AI dari dashboard (null = hapus override, ikut env).
 * Divalidasi dengan aturan yang sama persis seperti jalur env
 * (`parseAiBaseUrl`): wajib HTTPS, tanpa kredensial/query, bukan IP/localhost.
 * Nilai yang tidak valid ditolak di sini — tidak pernah disimpan.
 */
export async function setAiBaseUrl(input: {
  baseUrl: string | null;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = baseUrlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const normalized =
    parsed.data.baseUrl === null ? null : parseAiBaseUrl(parsed.data.baseUrl);
  if (parsed.data.baseUrl !== null && normalized === null) {
    return {
      ok: false,
      error:
        "Base URL tidak valid. Syaratnya: diawali https://, tanpa kredensial atau query string, dan bukan alamat IP/localhost.",
    };
  }

  const current = await prisma.libAiSetting
    .findUnique({ where: { key: AI_SETTING_BASE_URL }, select: { value: true } })
    .catch(() => null);

  try {
    await prisma.$transaction(async (tx) => {
      if (normalized === null) {
        await tx.libAiSetting.deleteMany({ where: { key: AI_SETTING_BASE_URL } });
      } else {
        await tx.libAiSetting.upsert({
          where: { key: AI_SETTING_BASE_URL },
          create: { key: AI_SETTING_BASE_URL, value: normalized },
          update: { value: normalized },
        });
      }
      await logAudit(
        {
          actor: auditActorFromSession(admin),
          action: "AI_GLOBAL_SETTINGS_SET",
          entity: { type: "LibAiSetting", id: "global", label: "Pengaturan AI global" },
          before: { base_url: current?.value ?? null },
          after: { base_url: normalized },
        },
        tx,
      );
    });
  } catch {
    return { ok: false, error: `Gagal menyimpan base URL. ${SQL_HINT}` };
  }

  invalidateAiSettingsCache();
  revalidatePath(PAGE_PATH);
  return {
    ok: true,
    message:
      normalized === null
        ? "Base URL kembali mengikuti env."
        : "Base URL tersimpan dan akan berlaku dalam beberapa detik.",
  };
}

const tokenAllotmentsSchema = z.object({
  free: z.number().int().min(0).max(AI_TOKEN_LIMIT_MAX).nullable(),
  premium: z.number().int().min(0).max(AI_TOKEN_LIMIT_MAX).nullable(),
  plus: z.number().int().min(0).max(AI_TOKEN_LIMIT_MAX).nullable(),
});

/**
 * Atur jatah token bulanan per tier dari dashboard (null per tier = hapus
 * override tier itu, kembali ke bawaan kode). Disimpan sebagai baris
 * `LibAiSetting`; perubahan tercatat audit `AI_GLOBAL_SETTINGS_SET`.
 */
export async function setAiTokenAllotments(input: {
  free: number | null;
  premium: number | null;
  plus: number | null;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = tokenAllotmentsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };
  const { free, premium, plus } = parsed.data;

  const entries: { key: string; value: number | null }[] = [
    { key: AI_SETTING_TOKEN_FREE_MONTHLY, value: free },
    { key: AI_SETTING_TOKEN_PREMIUM_MONTHLY, value: premium },
    { key: AI_SETTING_TOKEN_PLUS_MONTHLY, value: plus },
  ];

  try {
    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        if (entry.value === null) {
          await tx.libAiSetting.deleteMany({ where: { key: entry.key } });
        } else {
          await tx.libAiSetting.upsert({
            where: { key: entry.key },
            create: { key: entry.key, value: String(entry.value) },
            update: { value: String(entry.value) },
          });
        }
      }
      await logAudit(
        {
          actor: auditActorFromSession(admin),
          action: "AI_GLOBAL_SETTINGS_SET",
          entity: { type: "LibAiSetting", id: "global", label: "Pengaturan AI global" },
          after: { token_free_monthly: free, token_premium_monthly: premium, token_plus_monthly: plus },
        },
        tx,
      );
    });
  } catch {
    return { ok: false, error: `Gagal menyimpan jatah token. ${SQL_HINT}` };
  }

  invalidateAiSettingsCache();
  revalidatePath(PAGE_PATH);
  return { ok: true, message: "Jatah token per tier tersimpan." };
}
