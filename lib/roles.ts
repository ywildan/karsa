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
  /**
   * PJ bila punya ≥1 `KelasMatkul` dengan `pj_id = dirinya` (dihitung di
   * `lib/user-snapshot.ts`). Sejak Fase 3A klaim ini TIDAK dibatalkan oleh
   * `is_admin` — admin boleh merangkap PJ (PRD §6).
   */
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
 *   PJ (dari HP)     → `/catat-poin` (locked) — TERMASUK admin yang merangkap PJ
 *   admin + desktop  → `/admin/dashboard`
 *   admin + mobile   → `/dashboard`   (admin yang bukan PJ)
 *   PJ murni desktop → `/catat-poin`  (locked, render shell mobile + hint)
 *   lainnya          → `/dashboard`
 *
 * **Keputusan Fase 3A:** PJ = user dengan ≥1 `KelasMatkul.pj_id = dirinya`,
 * TIDAK peduli `is_admin` (PRD §6). Admin boleh merangkap PJ — jadi cabang PJ
 * di channel mobile harus diperiksa SEBELUM cabang admin. Sebelumnya admin
 * diperiksa lebih dulu sehingga admin-PJ dari HP selalu terlempar ke
 * `/dashboard` dan tidak pernah sampai ke `/catat-poin`.
 *
 * `channel` diisi dari hasil auto-detect User-Agent di middleware dan halaman
 * `/login`. Kalau `channel` dihilangkan, admin dianggap desktop (fallback aman).
 */
export function homePathForUser(
  claims: RoleClaims | null | undefined,
  channel?: Channel,
): string {
  // PJ locked mobile (PRD §7.2) — menang atas admin di channel mobile.
  if (claims?.is_pj && channel === "mobile") {
    return MOBILE_HOME;
  }
  // Admin tanpa tugas PJ: desktop → panel admin (Q9), mobile → /dashboard.
  if (claims?.is_admin) {
    return channel === "mobile" ? DESKTOP_HOME : HOME_ADMIN;
  }
  // PJ murni yang membuka dari desktop tetap dikunci ke shell mobile.
  if (claims?.is_pj) {
    return MOBILE_HOME;
  }
  return HOME_DEFAULT;
}

/**
 * Prioritas peran untuk label UI (PRD §6): admin > PJ > mahasiswa > tanpa kelas.
 * Catatan: Budi adalah PJ **sekaligus** mahasiswa, jadi `is_pj` menang.
 *
 * Ini HANYA untuk label. Untuk otorisasi & routing, `is_admin` dan `is_pj`
 * dipakai terpisah — sejak Fase 3A admin boleh merangkap PJ, jadi dua klaim
 * itu tidak saling meniadakan (lihat `homePathForUser`).
 */
export function roleOf(claims: RoleClaims | null | undefined): Role {
  if (claims?.is_admin) return "admin";
  if (claims?.is_pj) return "pj";
  if (claims?.kelas_id) return "mahasiswa";
  return "tanpa_kelas";
}

/** Label peran siap tampil. Admin yang merangkap PJ ditulis "Admin · PJ". */
export function roleLabel(claims: RoleClaims | null | undefined): string {
  switch (roleOf(claims)) {
    case "admin":
      return claims?.is_pj ? "Admin · PJ" : "Admin";
    case "pj":
      return "PJ (Penanggung Jawab)";
    case "mahasiswa":
      return "Mahasiswa";
    default:
      return "Belum ada kelas";
  }
}
