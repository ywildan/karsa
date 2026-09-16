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

export type Role = "admin" | "pj" | "mahasiswa" | "tanpa_kelas";

/** Klaim minimum untuk menentukan peran & home channel. */
export interface RoleClaims {
  is_admin: boolean;
  /** PJ bila punya ≥1 `KelasMatkul` dengan `pj_id = dirinya`. */
  is_pj?: boolean;
  kelas_id?: string | null;
}

/** Home channel admin (PRD §7.1). */
export const HOME_ADMIN = "/admin/dashboard";

/**
 * Home channel default: mahasiswa, PJ, dan user tanpa kelas (PRD §7.2–§7.4).
 * PJ akan dipindah ke `/catat-poin` pada Fase 1.5/3A — route-nya belum ada,
 * jadi untuk sekarang semua non-admin mendarat di `/dashboard`.
 */
export const HOME_DEFAULT = "/dashboard";

/** Halaman login — dipakai middleware & halaman publik. */
export const LOGIN_PATH = "/login";

/**
 * Home channel berdasarkan klaim session.
 * Selalu panggil di server (claim-nya sudah di-refresh dari DB — lihat
 * `callbacks.jwt` di `auth.ts`).
 */
export function homePathForUser(claims: RoleClaims | null | undefined): string {
  return claims?.is_admin ? HOME_ADMIN : HOME_DEFAULT;
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
