/**
 * Karsa — lib/roles.ts
 * ----------------------------------------------------------------------------
 * Logika peran & home channel (PRD §6, §7).
 *
 * Modul ini SENGAJA murni — tanpa Prisma, tanpa `next-auth`, tanpa DOM — karena
 * dipakai di tiga runtime sekaligus:
 *   · `auth.config.ts` → dipakai `middleware.ts` (Edge Runtime, tidak boleh
 *     menyentuh Prisma)
 *   · `lib/auth-helpers.ts` → Server Component / Server Action (Node runtime)
 *   · komponen UI (label peran)
 */

import { DESKTOP_HOME, MOBILE_HOME, type Channel } from "@/lib/channel";

export type Role = "admin" | "pj" | "mahasiswa" | "tanpa_kelas";

/** Klaim minimum untuk menentukan peran & home channel. */
export interface RoleClaims {
  is_admin: boolean;
  /** PJ bila punya ≥1 `KelasMatkul` dengan `pj_id = dirinya`. */
  is_pj?: boolean;
  kelas_id?: string | null;
}

/** Home channel admin desktop (PRD §7.1). */
export const HOME_ADMIN = "/admin/dashboard";

/**
 * Home channel default untuk mahasiswa, user tanpa kelas, dan admin di
 * channel mobile (keputusan Fase 1.5: admin + mobile → `/dashboard`).
 */
export const HOME_DEFAULT = DESKTOP_HOME;

/** Halaman login — dipakai middleware & halaman publik. */
export const LOGIN_PATH = "/login";

/**
 * Home channel berdasarkan klaim session + channel efektif.
 *
 *   admin + desktop → `/admin/dashboard`
 *   admin + mobile  → `/dashboard`
 *   PJ              → `/catat-poin` (locked, channel diabaikan)
 *   lainnya         → `/dashboard`
 *
 * `channel` diisi dari hasil auto-detect User-Agent di middleware dan halaman
 * `/login`. Kalau `channel` dihilangkan, admin dianggap desktop (fallback aman).
 */
export function homePathForUser(
  claims: RoleClaims | null | undefined,
  channel?: Channel,
): string {
  if (claims?.is_admin) {
    return channel === "mobile" ? DESKTOP_HOME : HOME_ADMIN;
  }
  if (claims?.is_pj) {
    return MOBILE_HOME;
  }
  return HOME_DEFAULT;
}

/**
 * Prioritas peran untuk label UI (PRD §6): admin > PJ > mahasiswa > tanpa kelas.
 * Catatan: Budi adalah PJ **sekaligus** mahasiswa, jadi `is_pj` menang.
 */
export function roleOf(claims: RoleClaims | null | undefined): Role {
  if (claims?.is_admin) return "admin";
  if (claims?.is_pj) return "pj";
  if (claims?.kelas_id) return "mahasiswa";
  return "tanpa_kelas";
}

/** Label peran siap tampil. */
export function roleLabel(claims: RoleClaims | null | undefined): string {
  switch (roleOf(claims)) {
    case "admin":
      return "Admin";
    case "pj":
      return "PJ (Penanggung Jawab)";
    case "mahasiswa":
      return "Mahasiswa";
    default:
      return "Belum ada kelas";
  }
}
