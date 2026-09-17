/**
 * Karsa — lib/rapor.ts
 * ----------------------------------------------------------------------------
 * Kontrak data rapor mahasiswa Fase 4A. Modul murni ini dapat dipakai action
 * server serta komponen client tanpa menarik Prisma atau Next.js.
 */

/** Satu pencatatan poin pada matkul rapor, terbaru ditampilkan lebih dahulu. */
export interface RaporPoinItem {
  id: string;
  poin: number;
  catatan: string | null;
  created_at: Date;
  kategori: {
    name: string;
  };
  /** PJ yang benar-benar mencatat poin saat itu. */
  pj: {
    name: string | null;
  };
}

/** Rekap dan riwayat satu `KelasMatkul` pada semester aktif mahasiswa. */
export interface RaporMatkulItem {
  /** `KelasMatkul.id`, untuk mengikat rekap dan popup riwayat. */
  id: string;
  matkul: {
    name: string;
    code: string | null;
  };
  /** PJ penugasan saat ini. */
  pj: {
    name: string | null;
  };
  totalPoin: number;
  riwayat: RaporPoinItem[];
}

/** Seluruh data rapor yang dikirim server ke tampilan desktop. */
export interface RaporMahasiswaData {
  semester: {
    id: string;
    name: string;
  };
  kelas: {
    id: string;
    name: string;
  };
  prodi: {
    name: string;
  };
  matkuls: RaporMatkulItem[];
  totalPoin: number;
}

/** Hasil query rapor: user tanpa kelas tidak memiliki data akademik aktif. */
export type RaporMahasiswaResult =
  | { ok: true; empty: true }
  | { ok: true; empty: false; data: RaporMahasiswaData };
