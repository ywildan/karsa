/**
 * Karsa — lib/channel.ts
 * ----------------------------------------------------------------------------
 * Resolusi channel (PRD §4.2, §11) — auto-detect dari User-Agent.
 *
 * Cookie `karsa_channel` adalah snapshot hasil deteksi yang ditulis middleware
 * untuk kebutuhan redirect saja. Cookie bukan override manual dan tidak
 * menentukan layout; route group dipilih dari path URL.
 *
 * SENGAJA modul murni: tanpa Prisma, tanpa `next/headers`, tanpa DOM. Karena itu
 * bisa diimpor `middleware.ts` (Edge Runtime). Pemanggil yang membutuhkan nilai
 * request meneruskan User-Agent ke `resolveChannel()` atau
 * `detectChannelFromUserAgent()`. `next/headers` TIDAK boleh dipakai di
 * middleware (sudah tersedia sebagai `req.headers`).
 */

export type Channel = "mobile" | "desktop";

/**
 * Cookie hasil deteksi channel. Session-only (tanpa `maxAge`) dan ditulis oleh
 * middleware untuk redirect logic. Nilainya TIDAK rahasia dan tidak dipakai
 * untuk otorisasi.
 */
export const CHANNEL_COOKIE = "karsa_channel";

/** Home channel PJ — route group `(mobile)` (PRD §7.2). */
export const MOBILE_HOME = "/catat-poin";

/** Home channel mahasiswa / user tanpa kelas (PRD §7.3–§7.4). */
export const DESKTOP_HOME = "/dashboard";

/** Prefiks rute milik `(mobile)`. Route group tidak menambah segmen URL. */
export const MOBILE_ROUTE_PREFIXES = [
  "/catat-poin",
  "/riwayat-poin",
  "/poin-saya",
] as const;

/** Nilai cookie yang dikenal. Nilai lain (mis. rusak/dimanipulasi) → auto-detect. */
export function isChannel(value: unknown): value is Channel {
  return value === "mobile" || value === "desktop";
}

/** True bila path termasuk rute channel mobile (juga sub-route seperti `/catat-poin/[id]`). */
export function isMobilePath(pathname: string): boolean {
  return MOBILE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Deteksi perangkat dari User-Agent.
 *
 * Aturan pragmatic (PRD §4.2): yang dikenali sebagai perangkat genggam → mobile,
 * sisanya → desktop. iPadOS 13+ melaporkan UA "Macintosh" (mode desktop Safari)
 * sehingga ikut desktop — sengaja: channel mobile dikunci untuk PJ yang mencatat
 * dari HP (PRD §7.2), tablet tidak termasuk alur itu.
 */
const MOBILE_UA_PATTERN =
  /(?:android|bb\d+|blackberry|iemobile|ip(hone|od|ad)|mobile safari|opera mini|opera mobi|palm|phone|pod|webos|windows phone|mobile)/i;

export function detectChannelFromUserAgent(
  userAgent?: string | null,
): Channel {
  if (!userAgent) return "desktop";
  return MOBILE_UA_PATTERN.test(userAgent) ? "mobile" : "desktop";
}

/**
 * Channel efektif untuk satu request berdasarkan User-Agent.
 * Tidak ada input cookie: channel tidak dapat diganti lewat tombol manual.
 */
export function resolveChannel(userAgent?: string | null): Channel {
  return detectChannelFromUserAgent(userAgent);
}
