/**
 * Karsa — auth.config.ts
 * ----------------------------------------------------------------------------
 * Konfigurasi Auth.js (NextAuth v5) yang AMAN UNTUK EDGE RUNTIME.
 *
 * Kenapa dipisah dari `auth.ts`?
 *   `middleware.ts` berjalan di Edge Runtime — tidak boleh mengimpor Prisma
 *   (`@prisma/client` butuh Node runtime). Jadi:
 *     · `auth.config.ts` (file ini) → provider, halaman, strategy, dan callback
 *       murni. Dipakai middleware lewat `NextAuth(authConfig)`.
 *     · `auth.ts`                → menambah PrismaAdapter + provider dev-login +
 *       refresh klaim dari DB di `callbacks.jwt`.
 *   Dipakai berdua supaya aturan (filter domain, bentuk session) konsisten.
 *
 * Catatan versi: `next-auth@5.0.0-beta.25` + `@auth/prisma-adapter@2.11.3`.
 */
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { DEV_PROVIDER_ID, isDevAuthEnabled, isDevUserEmail } from "@/lib/dev-users";
import { isAllowedEmail } from "@/lib/utils";

export const authConfig = {
  providers: [
    Google({
      /**
       * User seed (`usr_admin`, `usr_pj_budi`, …) sudah ada di tabel `User`
       * tanpa baris `Account`. Tanpa opsi ini, login Google dengan email yang
       * sama akan ditolak `OAuthAccountNotLinked` (lihat
       * `@auth/core/lib/actions/callback/handle-login.js`).
       *
       * Kenapa aman: (1) hanya ada satu provider OAuth (Google), (2) Google
       * memverifikasi kepemilikan email, (3) email tetap disaring domainnya di
       * `callbacks.signIn` di bawah. Risiko account takeover praktis nol.
       */
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  /** PRD §6: session berbasis JWT — tidak memakai tabel `Session`. */
  session: { strategy: "jwt" },

  /** Halaman login & error milik sendiri (bukan halaman bawaan Auth.js). */
  pages: { signIn: "/login", error: "/login" },

  /** Percayai host dari proxy (Vercel / preview sandbox). */
  trustHost: true,

  callbacks: {
    /**
     * Gerbang masuk — PRD §1: "Batas domain: hanya @students.untidar.ac.id".
     *
     * Nilai balik:
     *   · `true`  → izinkan
     *   · string  → redirect ke halaman itu (dipakai untuk pesan error ramah)
     *   · `false` → Auth.js melempar AccessDenied → /login?error=AccessDenied
     *
     * Callback ini jalan SEBELUM user ditulis ke DB, jadi email non-UNTIDAR
     * tidak pernah membuat baris `User`/`Account`.
     */
    async signIn({ user, account }) {
      if (account?.provider === DEV_PROVIDER_ID) {
        // Dev Quick Login: hanya di luar production + hanya 4 email user uji.
        const allowed = isDevAuthEnabled() && isDevUserEmail(user?.email);
        return allowed || "/login?error=dev_disabled";
      }

      if (account?.provider === "google") {
        return isAllowedEmail(user?.email) || "/login?error=domain";
      }

      // Provider lain tidak dipakai di Karsa.
      return false;
    },

    /**
     * Bentuk session yang dilihat aplikasi (server & middleware).
     *
     * Murni mapping dari token JWT → `session.user`; pembacaan DB-nya ada di
     * `callbacks.jwt` (`auth.ts`). Di middleware (Edge) callback ini yang
     * menyuplai `req.auth.user.is_admin` untuk guard route.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.nim = token.nim ?? null;
        session.user.is_admin = token.is_admin ?? false;
        session.user.kelas_id = token.kelas_id ?? null;
        session.user.is_pj = token.is_pj ?? false;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
