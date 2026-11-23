/**
 * Karsa — lib/absensi-view.ts
 * ----------------------------------------------------------------------------
 * Tipe & helper tampilan absensi web. Murni (tanpa Prisma/DOM) supaya bisa
 * dipakai Server Component maupun komponen client. Aturan kuota tetap di
 * `lib/absensi.ts`; di sini hanya label dan format tanggal.
 */
import { ABSENSI_STATUS_LABEL, type AbsensiStatus } from "@/lib/absensi";

export interface AbsensiHistoryItem {
  id: string;
  status: AbsensiStatus | string;
  /** `YYYY-MM-DD`. */
  tanggal: string;
  catatan: string | null;
}

export interface AbsensiStudentRow {
  id: string;
  name: string | null;
  nim: string | null;
  is_self: boolean;
  counts: {
    tanpa_keterangan: number;
    sakit: number;
    izin: number;
  };
  alpha_limit: number;
  alpha_remaining: number;
  alpha_over: number;
  history: AbsensiHistoryItem[];
}

export interface PjAbsensiDetail {
  assignment: {
    id: string;
    matkul: { name: string; code: string | null };
    kelas: {
      name: string;
      prodi: { name: string };
      semester: { name: string };
    };
    student_count: number;
  };
  limit: number;
  students: AbsensiStudentRow[];
}

export interface AbsensiQuotaWarningView {
  name: string;
  nim: string | null;
  alpha: number;
  limit: number;
}

export type AbsensiActionResult =
  | { ok: true; message: string; warnings?: AbsensiQuotaWarningView[] }
  | { ok: false; error: string };

export type AbsensiFormState = AbsensiActionResult | null;

export function absensiStatusLabel(status: string): string {
  return ABSENSI_STATUS_LABEL[status as AbsensiStatus] ?? status;
}

export function absensiStatusTone(status: string): string {
  switch (status) {
    case "TANPA_KETERANGAN":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "SAKIT":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "IZIN":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

/** Label pendek status untuk chip formulir. */
export function absensiStatusShortLabel(status: string): string {
  if (status === "TANPA_KETERANGAN") return "Tanpa ket.";
  return absensiStatusLabel(status);
}

/** `2026-11-23` → `23 Nov 2026` (tanggal murni, tanpa geser timezone). */
export function formatTanggalAbsensi(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Tanggal hari ini WIB dalam `YYYY-MM-DD` — dihitung di server. */
export function todayIsoWib(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
