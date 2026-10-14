/**
 * Karsa — lib/karsa-lib/ai-settings-store.ts
 * ----------------------------------------------------------------------------
 * Pembacaan pengaturan AI dari tabel `LibAiSetting` (server-only) dengan
 * cache singkat per instance dan fail-safe penuh: tabel belum dibuat atau
 * bacaan gagal → kembalikan kosong, dan `ai-service` jatuh ke env. Fitur AI
 * tidak boleh tumbang hanya karena dashboard pengaturan belum dimigrasikan.
 *
 * Cache 60 detik: perubahan dari dashboard berlaku paling lambat semenit
 * di instance lain; instance yang menulis mengosongkan cache-nya sendiri
 * lewat `invalidateAiSettingsCache`.
 */

import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 60_000;

let cache: { at: number; values: Record<string, string> } | null = null;

export async function getAiSettingValues(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;
  try {
    const rows = await prisma.libAiSetting.findMany({
      select: { key: true, value: true },
    });
    const values: Record<string, string> = {};
    for (const row of rows) values[row.key] = row.value;
    cache = { at: Date.now(), values };
    return values;
  } catch (error) {
    console.error("[ai-settings] gagal membaca LibAiSetting — memakai env.", error);
    return cache?.values ?? {};
  }
}

export function invalidateAiSettingsCache(): void {
  cache = null;
}
