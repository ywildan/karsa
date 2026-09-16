/**
 * Karsa — lib/dev-users.ts
 * ----------------------------------------------------------------------------
 * Dev Quick Login (Fase 1) — daftar 4 user uji dari `prisma/seed.ts`.
 *
 * Modul ini SENGAJA murni (tanpa Prisma/DOM) supaya bisa dipakai oleh:
 *   · `app/(auth)/login/page.tsx`  → label tombol
 *   · `components/dev-login-buttons.tsx` (client component) → label
 *   · `actions/auth.ts`            → whitelist key tombol
 *   · `auth.ts`                    → whitelist email di `authorize()`
 *
 * Email di bawah BUKAN rahasia (sudah ada di `prisma/seed.ts`, `init.sql`,
 * dan README). ID-nya sengaja tidak ditulis di sini: `authorize()` selalu
 * mencari user lewat email, supaya tetap jalan walau id-nya bukan id seed
 * (kasus user terlanjur dibuat NextAuth saat login Google — lihat seed).
 *
 * GUARD: seluruh modul ini hanya boleh dipakai bila `isDevAuthEnabled()`.
 * Ada 3 lapis guard dev login (semua wajib tetap ada):
 *   1. UI   → tombol tidak dirender di production (`app/(auth)/login/page.tsx`)
 *   2. Daftar provider → provider `dev-login` tidak didaftarkan di production (`auth.ts`)
 *   3. `authorize()` + server action → menolak walau endpoint dipanggil manual
 */

/** ID provider Credentials yang dipakai Dev Quick Login. */
export const DEV_PROVIDER_ID = "dev-login";

/**
 * State hasil Server Action `devLoginAction` (dipakai `useActionState`).
 * Diletakkan di sini — bukan di `actions/auth.ts` — karena file ber-`"use server"`
 * hanya boleh mengekspor fungsi async.
 */
export interface DevLoginState {
  error: string | null;
}

export type DevUserKey = "admin" | "pj" | "mahasiswa" | "user_baru";

export interface DevUser {
  key: DevUserKey;
  /** Label tombol di halaman /login. */
  label: string;
  /** Keterangan singkat di samping label. */
  description: string;
  /** Email user seed yang dituju. */
  email: string;
  /**
   * Home channel setelah login. Nilai ini mengikuti data seed (role-nya
   * deterministik) — bukan hasil query DB, supaya `redirectTo` bisa ditentukan
   * sebelum cookie session ada. Kalau seed diubah, ubah di sini juga.
   */
  home: string;
}

/**
 * 4 tombol Dev Quick Login (Fase 1). Urutan tampil = urutan array.
 * `usr_agus` (mahasiswa kedua) sengaja tidak dipakai — Siti cukup mewakili
 * role mahasiswa.
 */
export const DEV_USERS: readonly DevUser[] = [
  {
    key: "admin",
    label: "Masuk sebagai Admin",
    description: "usr_admin",
    email: "admin@students.untidar.ac.id",
    home: "/admin/dashboard",
  },
  {
    key: "pj",
    label: "Masuk sebagai PJ",
    description: "usr_pj_budi",
    email: "pj.budi@students.untidar.ac.id",
    // PJ belum punya /catat-poin (Fase 3A) → sementara /dashboard.
    home: "/dashboard",
  },
  {
    key: "mahasiswa",
    label: "Masuk sebagai Mahasiswa",
    description: "usr_siti",
    email: "siti.aminah@students.untidar.ac.id",
    home: "/dashboard",
  },
  {
    key: "user_baru",
    label: "Masuk sebagai User Baru",
    description: "usr_user_baru",
    email: "user.baru@students.untidar.ac.id",
    // kelas_id = NULL → /dashboard menampilkan empty state (PRD §7.4).
    home: "/dashboard",
  },
];

/**
 * Dev Quick Login hanya hidup di luar production.
 * Panggil fungsi ini (jangan bandingkan `process.env.NODE_ENV` langsung)
 * supaya guard-nya satu pintu.
 */
export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Cari user dev berdasarkan key tombol. */
export function findDevUser(key: unknown): DevUser | undefined {
  if (typeof key !== "string") return undefined;
  return DEV_USERS.find((user) => user.key === key);
}

/** Cari user dev berdasarkan email (dipakai `authorize()`). */
export function findDevUserByEmail(email: unknown): DevUser | undefined {
  if (typeof email !== "string") return undefined;
  const normalized = email.trim().toLowerCase();
  return DEV_USERS.find((user) => user.email.toLowerCase() === normalized);
}

/** True bila email termasuk 4 user uji di atas. */
export function isDevUserEmail(email: unknown): boolean {
  return findDevUserByEmail(email) !== undefined;
}
