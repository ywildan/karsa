/**
 * Karsa — lib/semester.ts
 * ----------------------------------------------------------------------------
 * Aturan murni "semester aktif per (prodi, angkatan)".
 *
 * Murni (tanpa Prisma/DOM) supaya bisa dipakai Server Action, komponen client,
 * dan unit test. Resolusi ke database ada di `lib/services/semester-service.ts`.
 */

/** Batas angkatan yang masuk akal; juga dijaga CHECK di SQL. */
export const ANGKATAN_MIN = 2000;
export const ANGKATAN_MAX = 2100;

export const ANGKATAN_MESSAGE =
  "Angkatan harus tahun 4 digit antara 2000 dan 2100.";

/** Cohort = satu angkatan pada satu prodi. */
export interface CohortKey {
  prodi_id: string;
  angkatan: number;
}

/**
 * Angkatan mahasiswa dari NIM: dua digit pertama = tahun masuk.
 * `2310501001` → 2023. Null/invalid/format tak dikenal → null.
 */
export function angkatanFromNim(nim: string | null | undefined): number | null {
  const value = nim?.trim() ?? "";
  if (!/^\d{2}/.test(value)) return null;

  const angkatan = 2000 + Number(value.slice(0, 2));
  if (angkatan < ANGKATAN_MIN || angkatan > ANGKATAN_MAX) return null;
  return angkatan;
}

/** Kunci stabil untuk map/audit: `prodi_ti:2023`. */
export function cohortKey(prodiId: string, angkatan: number): string {
  return `${prodiId}:${angkatan}`;
}

/** Pesan saat NIM tidak cocok dengan angkatan kelas tujuan. */
export function angkatanMismatchMessage(
  nimAngkatan: number,
  kelasAngkatan: number,
): string {
  return (
    `NIM ini tercatat angkatan ${nimAngkatan}, sedangkan kelas ini untuk ` +
    `angkatan ${kelasAngkatan}. Pilih kelas yang sesuai.`
  );
}

/** Mahasiswa tanpa NIM tidak bisa diverifikasi angkatannya. */
export const NIM_BELUM_ADA_MESSAGE =
  "Mahasiswa belum mengisi NIM. Minta ia melengkapi profil dulu, lalu tambahkan ke kelas.";

/** Cohort belum punya pointer semester aktif. */
export const SEMESTER_AKTIF_BELUM_DISET =
  "Semester aktif untuk angkatan ini belum ditetapkan.";

/** Kelas sudah bukan periode aktif cohort-nya (input/koreksi ditutup). */
export const KELAS_NONAKTIF_MESSAGE =
  "Kelas ini bukan semester aktif angkatannya. Input dan koreksi poin ditutup.";
