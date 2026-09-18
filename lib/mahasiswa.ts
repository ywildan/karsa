/**
 * Karsa — lib/mahasiswa.ts
 * ----------------------------------------------------------------------------
 * Kontrak data & aturan domain untuk anggota kelas (Sub-Fase 2C, PRD §6–§7.1).
 *
 * Kenapa modul terpisah?
 *   · `actions/mahasiswa.ts` ber-`"use server"` → hanya boleh mengekspor fungsi
 *     async, jadi tipe bersama tidak boleh ditulis di sana (pola sama dengan
 *     `lib/dev-users.ts`).
 *   · Dipakai dua sisi sekaligus: Server Action (server) dan dialog tambah
 *     mahasiswa (client) — jadi modul ini WAJIB murni: tanpa Prisma, tanpa DOM.
 */

/** Domain email mahasiswa (PRD §1: batas domain kampus). */
export const STUDENT_EMAIL_DOMAIN = "students.untidar.ac.id";

/** NIM: 5–15 digit angka (PRD §5 — `User.nim` unik). */
export const NIM_REGEX = /^\d{5,15}$/;

/** Pesan validasi NIM, dipakai Zod (server) & petunjuk form (client). */
export const NIM_MESSAGE = "NIM harus 5–15 digit angka.";

/** Email dinormalisasi (trim + lowercase) sebelum disimpan/dibandingkan. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * True bila email berdomain `@students.untidar.ac.id` (persis, bukan suffix
 * longgar — `foo@students.untidar.ac.id.evil.com` ditolak).
 */
export function isStudentEmail(email: string | null | undefined): boolean {
  if (!email || !email.includes("@")) return false;

  const domain = normalizeEmail(email).split("@").pop() ?? "";
  return domain === STUDENT_EMAIL_DOMAIN;
}

/** Satu baris tabel Mahasiswa di halaman detail kelas (serializable). */
export interface MahasiswaRow {
  id: string;
  name: string | null;
  nim: string | null;
  email: string;
  is_admin: boolean;
  /** PJ di kelas yang sedang dibuka — dihitung dengan filter `kelas_id`. */
  is_pj: boolean;
}

/** Ringkasan user untuk preview di dialog "Tambah Mahasiswa". */
export interface UserPreview {
  id: string;
  name: string | null;
  nim: string | null;
  email: string;
  is_admin: boolean;
  is_pj: boolean;
}

/** Status hasil `findUserForKelas()` — menentukan tombol di dialog. */
export type UserPreviewStatus =
  | "siap"
  | "sudah_di_kelas_ini"
  | "kelas_lain"
  | "tidak_ditemukan";

/**
 * Hasil pencarian user untuk preview. Bukan sumber kebenaran: `addMahasiswaToKelas()`
 * tetap memvalidasi ulang saat tombol "Tambahkan" ditekan.
 */
export type UserPreviewResult =
  | { ok: false; error: string }
  | { ok: true; status: "tidak_ditemukan"; message: string }
  | { ok: true; status: "siap"; message: string; user: UserPreview }
  | {
      ok: true;
      status: "sudah_di_kelas_ini";
      message: string;
      user: UserPreview;
    }
  | {
      ok: true;
      status: "kelas_lain";
      message: string;
      user: UserPreview;
      /** Nama kelas lama user (null bila relasinya tidak terbaca). */
      kelasName: string | null;
    };
