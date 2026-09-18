/**
 * Karsa — lib/poin.ts
 * ----------------------------------------------------------------------------
 * Kontrak data & aturan domain pencatatan poin (Fase 3A, PRD §8 + §14 Fase 3A).
 *
 * Sama seperti `lib/mahasiswa.ts` / `lib/kelas-matkul.ts`: modul MURNI (tanpa
 * Prisma, tanpa `next/headers`, tanpa DOM) karena dipakai dua sisi —
 * Server Action (`actions/poin.ts`) dan komponen client (bottom sheet).
 * Wajib terpisah karena file ber-`"use server"` hanya boleh mengekspor fungsi
 * async, jadi tipe bersama tidak boleh ditulis di sana.
 */

/** Kartu matkul yang dipegang PJ — grid di `/catat-poin`. */
export interface MatkulPjCard {
  /** `KelasMatkul.id` — dipakai sebagai segmen URL `/catat-poin/[id]`. */
  id: string;
  matkulName: string;
  matkulCode: string | null;
  kelasName: string;
  prodiName: string;
  semesterName: string;
  /** Semua anggota kelas yang bisa diberi poin, termasuk admin yang merangkap mahasiswa. */
  jumlahMahasiswa: number;
}

/** Satu mahasiswa di kelas milik penugasan matkul. */
export interface MahasiswaItem {
  id: string;
  name: string | null;
  nim: string | null;
  /**
   * True bila baris ini = PJ yang sedang membuka halaman. UI menonaktifkan
   * tombolnya; server tetap menolak (PRD §13.2: PJ tidak menilai diri sendiri).
   */
  isDiriSendiri: boolean;
}

/** Kategori poin dari tabel `KategoriPoin` (segmented control di sheet). */
export interface KategoriItem {
  id: string;
  name: string;
}

/** Satu riwayat poin yang dicatat PJ, lengkap dengan konteks akademiknya. */
export interface RiwayatPoinRow {
  id: string;
  /** `KelasMatkul.id`, dipakai filter riwayat per penugasan. */
  kelas_matkul_id: string;
  poin: number;
  catatan: string | null;
  created_at: Date;
  mahasiswa: {
    name: string | null;
    nim: string | null;
  };
  kategori: {
    name: string;
  };
  matkul: {
    name: string;
    code: string | null;
  };
  kelas: {
    name: string;
  };
  prodi: {
    name: string;
  };
  semester: {
    name: string;
  };
}

/** Opsi filter riwayat; id adalah `KelasMatkul.id`, bukan `Matkul.id`. */
export interface MatkulFilterOption {
  id: string;
  label: string;
}

/**
 * Payload `createPoinLog` dari client. `poin` bertipe longgar karena
 * `FormData`/input mengirim string — Zod (`z.coerce.number()`) yang memutuskan
 * sah atau tidak, bukan pemanggil.
 */
export interface PoinInput {
  kelas_matkul_id: string;
  mahasiswa_id: string;
  kategori_id: string;
  poin: number | string;
  catatan?: string;
}

/** Nilai poin yang sah, untuk tombol besar 1–4 di bottom sheet (PRD §8). */
export const POIN_OPTIONS = [1, 2, 3, 4] as const;

/** Catatan opsional, maksimal 500 karakter (batasan Fase 3A). */
export const CATATAN_MAX = 500;

/**
 * Jendela anti double-submit (PRD §8): payload identik dalam 3 detik dianggap
 * kiriman ganda dan di-skip — bukan error, supaya UI tidak memarahi user yang
 * cuma menekan tombol dua kali.
 */
export const DOUBLE_SUBMIT_WINDOW_MS = 3000;

/** Nama tampil mahasiswa: `name` → kalau kosong pakai "Mahasiswa". */
export function mahasiswaLabel(mahasiswa: { name: string | null }): string {
  return mahasiswa.name?.trim() || "Mahasiswa";
}

/**
 * Tanggal hari ini DALAM WIB (Asia/Jakarta) — timezone EKSPLISIT karena server
 * Vercel default UTC (PRD §13.2). Dihitung di server dan dikirim sebagai
 * string supaya tidak ada hydration mismatch.
 *   → "17 Sep 2026"
 */
export function tanggalHariIniWib(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(now);
}
