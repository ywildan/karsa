/**
 * Karsa — lib/utils.ts
 * ----------------------------------------------------------------------------
 * Helper generik lintas channel (mobile & desktop). Tanpa dependensi ke
 * Prisma/DOM — aman dipakai di server maupun client component.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gabungkan className Tailwind dengan aman (class konflik → yang terakhir menang).
 * Contoh: cn("px-2 py-1", "px-4") → "py-1 px-4"
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Masking nama untuk leaderboard (PRD §7.5).
 * Pertahankan 2 karakter pertama setiap kata, sisanya jadi "x".
 *   "Rizki Dermawan" → "Rixxx Dexxxxxx"
 *   "Rizki"          → "Rixxx"
 *   "A B"            → "Ax Bx"
 * Nama kosong/null → "Anonim".
 */
export function maskName(name?: string | null): string {
  if (!name || !name.trim()) return "Anonim";

  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      const visible = word.slice(0, 2);
      const hidden = "x".repeat(Math.max(word.length - visible.length, 1));
      return `${visible}${hidden}`;
    })
    .join(" ");
}

/**
 * Rank dense dari daftar skor yang SUDAH terurut menurun (PRD §7.5).
 * Skor sama → rank sama, rank berikutnya tidak melompat.
 *   [10, 10, 7, 5] → [1, 1, 2, 3]
 */
export function denseRank(scores: number[]): number[] {
  let rank = 0;
  let previous: number | null = null;

  return scores.map((score) => {
    if (previous === null || score !== previous) {
      rank += 1;
      previous = score;
    }
    return rank;
  });
}

/** Inisial untuk avatar fallback: "Rizki Dermawan" → "RD". */
export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "?";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Format tanggal ke WIB (Asia/Jakarta) sesuai default keputusan minor PRD §13.2.
 * Selalu render di server & client dengan locale yang sama ("id-ID") supaya
 * tidak memicu hydration mismatch.
 *   2026-09-16T03:00:00Z → "16 Sep 2026, 10.00"
 */
export function formatDateTimeWib(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

/**
 * Format tanggal saja (tanpa jam) ke WIB (Asia/Jakarta) — timezone EKSPLISIT
 * karena server Vercel default UTC; tanpa ini tanggal bisa bergeser 7 jam.
 * Dipakai tabel admin (mulai/akhir semester).
 */
export function formatDateWib(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

/**
 * Waktu relatif dalam Bahasa Indonesia. Setelah tujuh hari, gunakan tanggal
 * absolut WIB supaya waktu yang lama tetap mudah dipindai.
 */
export function formatRelativeTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const elapsedMs = Math.max(0, Date.now() - date.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

  if (elapsedMinutes < 1) return "baru saja";
  if (elapsedMinutes < 60) return `${elapsedMinutes} menit lalu`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} jam lalu`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays} hari lalu`;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

/** Format ringkas tanggal dan waktu eksplisit WIB, mis. "17 Sep 2026, 10.00 WIB". */
export function formatDateTimeShortWib(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).format(date)} WIB`;
}

/**
 * Nilai untuk `<input type="date">` (yyyy-mm-dd) dihitung DALAM WIB —
 * supaya tanggal yang tampil di form sama dengan tanggal yang disimpan
 * walau server menyimpannya sebagai UTC.
 */
export function toDateInputWib(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

/** Format angka gaya Indonesia: 1234 → "1.234". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

/**
 * Validasi domain email (PRD §1: batas domain hanya untuk kampus).
 * Domain diambil dari env ALLOWED_EMAIL_DOMAINS (dipisah koma).
 * Default (kalau env kosong): students.untidar.ac.id + untidar.ac.id
 */
export function isAllowedEmail(email?: string | null): boolean {
  if (!email || !email.includes("@")) return false;

  const allowed = (
    process.env.ALLOWED_EMAIL_DOMAINS ?? "students.untidar.ac.id,untidar.ac.id"
  )
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  const domain = email.split("@").pop()?.toLowerCase() ?? "";
  return allowed.includes(domain);
}

/** Rentang poin yang sah (PRD §8 — fixed 1–4). */
export const POIN_MIN = 1;
export const POIN_MAX = 4;

/** Label kategori fallback kalau data DB belum siap. */
export const KATEGORI_POIN = ["Bertanya", "Menjawab", "Presentasi", "Lainnya"] as const;
export type KategoriPoinName = (typeof KATEGORI_POIN)[number];
