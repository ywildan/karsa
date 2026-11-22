/**
 * Karsa — lib/absensi.ts
 * ----------------------------------------------------------------------------
 * Aturan murni pencatatan absensi per matkul (tanpa Prisma/DOM) supaya bisa
 * dipakai service API, komponen, dan unit test.
 *
 * Satu baris absensi = satu mahasiswa tidak hadir pada satu tanggal di satu
 * matkul-kelas. Kuota kampus: maksimal 2 TANPA_KETERANGAN per semester per
 * matkul. Batas itu dipakai sebagai peringatan, bukan tembok: catatan ke-3
 * tetap diterima agar PJ tidak kehilangan data lapangan.
 */

export const ABSENSI_ALPHA_LIMIT = 2;

export const ABSENSI_STATUSES = ["TANPA_KETERANGAN", "SAKIT", "IZIN"] as const;

export type AbsensiStatus = (typeof ABSENSI_STATUSES)[number];

export const ABSENSI_STATUS_LABEL: Record<AbsensiStatus, string> = {
  TANPA_KETERANGAN: "Tanpa keterangan",
  SAKIT: "Sakit",
  IZIN: "Keterangan",
};

/** `YYYY-MM-DD`, tanpa komponen jam. */
export const ABSENSI_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const ABSENSI_CATATAN_MAX = 500;

export interface AbsensiStatusCounts {
  /** Jumlah catatan TANPA_KETERANGAN — satu-satunya status yang memakai kuota. */
  tanpa_keterangan: number;
  sakit: number;
  izin: number;
}

export interface AbsensiQuota {
  limit: number;
  alpha: number;
  /** Sisa jatah, tidak pernah negatif. */
  remaining: number;
  /** Berapa catatan melewati batas; 0 berarti masih di dalam kuota. */
  over: number;
  /** True saat alpha sudah mencapai atau melewati batas. */
  exhausted: boolean;
}

export function isAbsensiStatus(value: unknown): value is AbsensiStatus {
  return (
    typeof value === "string" &&
    (ABSENSI_STATUSES as readonly string[]).includes(value)
  );
}

export function emptyAbsensiCounts(): AbsensiStatusCounts {
  return { tanpa_keterangan: 0, sakit: 0, izin: 0 };
}

export function countAbsensiStatuses(
  records: readonly { status: string }[],
): AbsensiStatusCounts {
  const counts = emptyAbsensiCounts();
  for (const record of records) {
    if (record.status === "TANPA_KETERANGAN") counts.tanpa_keterangan += 1;
    else if (record.status === "SAKIT") counts.sakit += 1;
    else if (record.status === "IZIN") counts.izin += 1;
  }
  return counts;
}

export function absensiQuota(
  counts: AbsensiStatusCounts,
  limit = ABSENSI_ALPHA_LIMIT,
): AbsensiQuota {
  const alpha = counts.tanpa_keterangan;
  return {
    limit,
    alpha,
    remaining: Math.max(0, limit - alpha),
    over: Math.max(0, alpha - limit),
    exhausted: alpha >= limit,
  };
}

/**
 * Validasi tanggal kalender nyata. `2026-02-30` ditolak karena Date akan
 * menggesernya ke Maret, sehingga hasil `toISOString` tidak sama dengan input.
 */
export function parseAbsensiDate(value: string): Date | null {
  if (!ABSENSI_DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

/** Tanggal dari Prisma (`@db.Date`) → `YYYY-MM-DD`. */
export function formatAbsensiDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
