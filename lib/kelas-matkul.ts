/**
 * Karsa — lib/kelas-matkul.ts
 * ----------------------------------------------------------------------------
 * Kontrak data untuk penugasan matkul ke kelas + PJ (Sub-Fase 2D, PRD §7.1
 * langkah 3 "tab Matkul & PJ (assign)").
 *
 * Sama seperti `lib/mahasiswa.ts`: modul MURNI (tanpa Prisma/DOM) karena
 * dipakai server (record) dan client (tabel + dropdown). Tipe harus ditulis di
 * sini — file ber-`"use server"` hanya boleh mengekspor fungsi async.
 */

/** Matkul untuk dropdown & kolom tabel (hanya field yang dipakai UI). */
export interface MatkulOption {
  id: string;
  name: string;
  code: string | null;
}

/** PJ ringkas — dipakai tabel & dropdown "Edit PJ". */
export interface PjOption {
  id: string;
  name: string | null;
  nim: string | null;
  email: string;
}

/**
 * Kandidat PJ untuk dropdown "Assign Matkul" / "Edit PJ".
 *
 * Sejak Fase 3A (PRD §6) **admin boleh merangkap PJ**, jadi daftarnya =
 * mahasiswa kelas ini (non-admin) + semua akun admin. Flag `is_admin` hanya
 * untuk mengelompokkan tampilan; keputusan sah/tidaknya tetap di server
 * (`resolvePj()` di `actions/kelas-matkul.ts`).
 */
export interface PjKandidatOption {
  id: string;
  name: string | null;
  nim: string | null;
  email: string;
  is_admin: boolean;
}

/** Label kandidat PJ di dropdown: "Budi Santoso — 2310501001". */
export function pjKandidatLabel(kandidat: PjKandidatOption): string {
  const nama = kandidat.name?.trim() || kandidat.email;
  return kandidat.nim ? `${nama} — ${kandidat.nim}` : nama;
}

/** Satu baris penugasan matkul di kelas (KelasMatkul + matkul + PJ). */
export interface KelasMatkulRow {
  id: string;
  matkul: MatkulOption;
  pj: PjOption;
}

/** Label matkul siap tampil: "Algoritma dan Pemrograman (TIF1101)". */
export function matkulLabel(matkul: MatkulOption): string {
  return matkul.code ? `${matkul.name} (${matkul.code})` : matkul.name;
}

/** Nama tampil PJ: `name` → kalau kosong pakai email. */
export function pjLabel(pj: { name: string | null; email: string }): string {
  return pj.name?.trim() || pj.email;
}
