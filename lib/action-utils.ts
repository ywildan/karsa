/**
 * Karsa — lib/action-utils.ts
 * ----------------------------------------------------------------------------
 * Kontrak & helper Server Action Fase 2 (PRD §0 aturan 6: otorisasi di server;
 * error handling tangkap `Prisma.PrismaClientKnownRequestError` → pesan ramah).
 *
 * Semua action CRUD admin mengembalikan `ActionResult` supaya komponen client
 * bisa seragam: sukses → `toast.success(message)`, gagal → `toast.error(error)`.
 *
 * ⚠️ Modul ini menjadi server-only karena mengimpor `next/cache`. Client
 * component WAJIB mengimpor `ActionResult` lewat `import type` (dihapus saat
 * compile), bukan import nilai.
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

/** Hasil standar semua Server Action mutasi. */
export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

/**
 * Segarkan Route Cache untuk sekumpulan route sekaligus.
 *
 * Dipakai setelah mutasi domain yang invalidated halaman-halaman terkait, supaya
 * tiap action tidak menulis ulang loop `revalidatePath` yang sama.
 */
export function revalidatePaths(paths: readonly string[]): void {
  for (const path of paths) revalidatePath(path);
}

/**
 * Route yang bergantung pada isi satu kelas: daftar kelas, dashboard, dan
 * halaman detail kelas tersebut.
 *
 * Dipakai setiap mutasi yang mengubah isi kelas — anggota kelas, matkul, atau
 * PJ — supaya ketiganya tidak pernah menampilkan data basi.
 */
export function revalidateKelasRoutes(kelasId: string): void {
  revalidatePaths(["/admin/kelas", "/admin/dashboard", `/admin/kelas/${kelasId}`]);
}

/**
 * Ambil pesan pertama dari `ZodError` sebagai pesan ramah user.
 * Pesan diambil dari `message` tiap issue (schema Zod Karsa men-set pesan
 * berbahasa Indonesia di level field).
 */
export function zodFirstError(error: ZodError): string {
  return error.errors[0]?.message ?? "Data tidak valid.";
}

/** Pesan per kode error Prisma yang dikenali (lihat prisma.io error reference). */
type KnownErrorMessages = Partial<{
  /** Unique constraint dilanggar. */
  P2002: string;
  /** Baris tidak ditemukan (update/delete dengan id salah). */
  P2025: string;
  /** Foreign key constraint gagal (masih dirujuk tabel lain). */
  P2003: string;
  /** Perubahan data diperlukan tapi tidak ada baris terpengaruh. */
  P2014: string;
  /** Value melanggar CHECK constraint DB (mis. end_date > start_date). */
  P2004: string;
}>;

/**
 * Ubah error Prisma yang dikenali menjadi pesan ramah user.
 * Error tak dikenal (koneksi, runtime, dsb.) → `fallback`; detail asli
 * TIDAK dibocorkan ke UI (PRD §0 aturan 4).
 */
export function mapPrismaKnownError(
  error: unknown,
  messages: KnownErrorMessages,
  fallback: string,
): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const message = messages[error.code as keyof KnownErrorMessages];
    if (message) return message;
  }
  return fallback;
}
