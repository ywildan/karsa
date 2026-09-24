/**
 * Karsa — types/next-auth.d.ts
 * ----------------------------------------------------------------------------
 * Augmentasi tipe Auth.js (NextAuth v5) supaya klaim Karsa ikut ter-type di
 * seluruh kode. Field di sini HARUS sama dengan yang diisi `callbacks.jwt` dan
 * dibaca `callbacks.session` (`auth.ts` / `auth.config.ts`) — PRD §6:
 *
 *   · id        → `User.id` (cuid / id seed seperti "usr_siti")
 *   · nim       → NIM mahasiswa (nullable; admin boleh NULL)
 *   · is_admin  → satu-satunya penanda hak akses admin
 *   · kelas_id  → kelas mahasiswa (nullable → empty state PRD §7.4)
 *   · is_pj     → punya ≥1 KelasMatkul dengan pj_id = dirinya
 *   · authorization_verified → klaim akses berhasil di-refresh dari DB
 *   · name / email / image → field bawaan Auth.js (dipakai header & avatar)
 *
 * File ini murni deklarasi tipe (tidak menghasilkan runtime code), tapi tetap
 * ikut di-typecheck karena `tsconfig.json` meng-include `**\/*.ts`.
 */
import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as AuthJWT } from "next-auth/jwt";

/** Field Karsa yang menempel di session.user. */
interface KarsaUserFields {
  /** `User.id` di database. */
  id: string;
  /** NIM — hanya mahasiswa; admin boleh NULL. */
  nim: string | null;
  /** Penanda hak akses admin (PRD §6). */
  is_admin: boolean;
  /** Kelas mahasiswa; NULL → user tanpa kelas. */
  kelas_id: string | null;
  /** Punya ≥1 `KelasMatkul` dengan `pj_id = dirinya`. */
  is_pj: boolean;
  /** True hanya setelah klaim akses berhasil di-refresh dari database. */
  authorization_verified: boolean;
}

declare module "next-auth" {
  /** Session yang dikembalikan `auth()` / `useSession()` / `/api/auth/session`. */
  interface Session {
    user: KarsaUserFields & DefaultSession["user"];
  }

  /**
   * User yang dikembalikan provider (`authorize()` / profil OAuth) dan
   * diteruskan ke `callbacks.jwt({ user })`.
   */
  interface User extends DefaultUser, Partial<KarsaUserFields> {}
}

declare module "next-auth/jwt" {
  /** Isi token JWT (cookie `authjs.session-token`) — sumber klaim di middleware. */
  interface JWT extends AuthJWT {
    id?: string;
    nim: string | null;
    is_admin: boolean;
    kelas_id: string | null;
    is_pj: boolean;
    authorization_verified?: boolean;
  }
}

export type {};
