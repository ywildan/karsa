/**
 * Karsa — lib/channel.ts
 * ----------------------------------------------------------------------------
 * Resolusi channel (PRD §4.2, §11) — dua sumber kebenaran:
 *
 *   1. cookie `karsa_channel`  → override manual (tombol "Mode HP" / "Mode Desktop")
 *   2. User-Agent              → auto-detect; kalau tidak jelas → desktop
 *
 * SENGAJA modul murni: tanpa Prisma, tanpa `next/headers`, tanpa DOM. Karena itu
 * bisa diimpor `middleware.ts` (Edge Runtime). Pemanggil yang butuh nilai dari
 * request — layout `(mobile)` / `(desktop)` — membaca `cookies()` / `headers()`
 * sendiri lalu meneruskannya ke `resolveChannel()`. `next/headers` TIDAK boleh
 * dipakai di middleware (sudah tersedia sebagai `req.cookies` / `req.headers`).
 */

export type Channel = "mobile" | "desktop";

/**
 * Cookie override channel. Session-only (tanpa `maxAge`) — lihat
 * `setChannelAction()` di `actions/channel.ts` dan `withChannelCookie()` di
 * `middleware.ts`. Nilainya TIDAK rahasia dan tidak dipakai untuk otorisasi.
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
 * Channel efektif untuk satu request: cookie override menang atas auto-detect.
 * `cookieValue` = isi `karsa_channel` (bisa `undefined`), `userAgent` = header UA.
 */
export function resolveChannel(
  cookieValue?: string | null,
  userAgent?: string | null,
): Channel {
  return isChannel(cookieValue)
    ? cookieValue
    : detectChannelFromUserAgent(userAgent);
}

/** Label tombol switch channel: tujuan yang dituju, bukan channel saat ini. */
export function channelToggleLabel(to: Channel): string {
  return to === "mobile" ? "Mode HP" : "Mode Desktop";
}
