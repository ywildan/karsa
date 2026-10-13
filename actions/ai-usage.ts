"use server";

/**
 * Karsa — actions/ai-usage.ts
 * ----------------------------------------------------------------------------
 * Pintu masuk dashboard "Penggunaan AI" untuk client component.
 * Selalu dijaga `requireAdmin()` di server; tanggal filter adalah tanggal
 * kalender WIB (YYYY-MM-DD) dan rentang dibatasi maksimal 366 hari.
 */
import { requireAdmin } from "@/lib/auth-helpers";
import {
  getAiUsageAnalytics,
  type AiUsageAnalytics,
  type AiUsageMode,
  type AiUsageStatus,
} from "@/lib/admin/ai-usage";
import { aiDay } from "@/lib/karsa-lib/ai-policy";

export type AiUsageFilters = {
  /** Tanggal awal kalender WIB, inklusif. */
  start: string;
  /** Tanggal akhir kalender WIB, inklusif. */
  end: string;
  prodiId?: string | null;
  mode?: AiUsageMode;
  status?: AiUsageStatus;
};

const MODES: AiUsageMode[] = ["ALL", "CHAT", "WEB_SEARCH", "SUMMARY"];
const STATUSES: AiUsageStatus[] = ["ALL", "COMPLETE", "FAILED", "PENDING"];

function parseWibDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return null;
  // Tanggal tidak nyata (mis. 31 Februari) akan bergeser; tolak.
  if (aiDay(date).day !== value) return null;
  return date;
}

export async function getAiUsage(filters: AiUsageFilters): Promise<AiUsageAnalytics | null> {
  await requireAdmin();

  const start = parseWibDay(filters.start);
  const endDay = parseWibDay(filters.end);
  if (!start || !endDay) return null;
  const end = new Date(endDay.getTime() + 86_400_000);
  if (!(start < end) || end.getTime() - start.getTime() > 367 * 86_400_000) return null;

  const mode = MODES.includes(filters.mode ?? "ALL") ? (filters.mode ?? "ALL") : "ALL";
  const status = STATUSES.includes(filters.status ?? "ALL") ? (filters.status ?? "ALL") : "ALL";
  const prodiId = typeof filters.prodiId === "string" && filters.prodiId ? filters.prodiId : null;

  try {
    return await getAiUsageAnalytics({ start, end, prodiId, mode, status });
  } catch (error) {
    console.error("[admin/ai-usage] gagal memuat analitik AI", error);
    return null;
  }
}
