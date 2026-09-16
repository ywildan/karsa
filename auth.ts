/**
 * Karsa — auth.ts
 * ----------------------------------------------------------------------------
 * Instance NextAuth v5 (Auth.js) untuk Karsa.
 *
 *   Provider   : Google OAuth (production) + Credentials `dev-login` (DEV ONLY)
 *   Adapter    : PrismaAdapter → user & account OAuth dipersist ke tabel
 *                `User` / `Account` (session tetap JWT, bukan tabel `Session`)
 *   Strategy   : JWT
 *   Klaim JWT  : id, nim, is_admin, kelas_id, is_pj (+ name/email/picture)
 *
 * Klaim di-refresh dari DB pada SETIAP pembacaan session. Ini terverifikasi di
 * source `@auth/core/lib/actions/session.js` (beta.25): untuk strategy `jwt`,
 * `callbacks.jwt({ token })` dipanggil lebih dulu, lalu `callbacks.session`,
 * sebelum cookie di-sign ulang — jadi `auth()` di Server Component, setiap
 * Server Action, dan `GET /api/auth/session` selalu membaca kondisi DB terbaru.
 *
 * Import yang tersedia di seluruh app:
 *   import { auth, signIn, signOut } from "@/auth";
 */
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { DEV_PROVIDER_ID, isDevAuthEnabled } from "@/lib/dev-users";
import { prisma } from "@/lib/prisma";
import { loadUserSnapshot, loadUserSnapshotByEmail } from "@/lib/user-snapshot";

/**
 * Provider Credentials untuk Dev Quick Login (Fase 1).
 * HANYA didaftarkan saat `NODE_ENV !== "production"` (guard lapis 2 dari 3).
 * Jalur credentials tidak menulis apa pun ke DB — user-nya sudah ada dari seed.
 */
const devCredentialsProvider = Credentials({
  id: DEV_PROVIDER_ID,
  name: "Dev Quick Login",
  credentials: {
    email: { label: "Email user uji", type: "email" },
  },
  async authorize(credentials) {
    // Guard lapis 3: tolak walau provider ini entah bagaimana terpanggil.
    if (!isDevAuthEnabled()) return null;

    const email =
      typeof credentials?.email === "string" ? credentials.email.trim() : "";
    if (!email) return null;

    // Email divalidasi lagi terhadap whitelist 4 user uji (jangan percaya form).
    // `callbacks.signIn` juga memeriksanya, tapi lapisan ini menjaga
    // `authorize()` tetap aman kalau dipanggil dari jalur lain.
    const snapshot = await loadUserSnapshotByEmail(email);
    if (!snapshot) return null;

    // Bentuk objek dibuat lewat variabel (bukan literal langsung) supaya field
    // tambahan Karsa tidak kena excess property check milik @auth/core.
    const authUser = {
      id: snapshot.id,
      name: snapshot.name,
      email: snapshot.email,
      image: snapshot.image,
      nim: snapshot.nim,
      is_admin: snapshot.is_admin,
      kelas_id: snapshot.kelas_id,
      is_pj: snapshot.is_pj,
    };
    return authUser;
  },
});

const devProviders = isDevAuthEnabled() ? [devCredentialsProvider] : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  // Ditulis ulang eksplisit: adapter bisa membawa default "database".
  session: { strategy: "jwt" },
  providers: [...authConfig.providers, ...devProviders],
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Isi & refresh klaim JWT.
     *
     * Dipanggil pada: (a) sign-in — `user` terisi; (b) setiap session dibaca —
     * `user` kosong, `token` berisi payload JWT yang berlaku. Karena itu query
     * DB di sini = "session refresh dari DB setiap request" (permintaan Fase 1).
     *
     * Perilaku galat (trade-off yang disetujui):
     *  · DB tidak terjangkau → klaim terakhir dipertahankan (tidak logout massal)
     *  · user benar-benar sudah dihapus → token `null` → cookie session dibersihkan
     */
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      if (!userId) return token;

      if (user?.id) token.sub = user.id;

      try {
        const snapshot = await loadUserSnapshot(userId);
        if (!snapshot) return null;

        token.sub = snapshot.id;
        token.id = snapshot.id;
        token.nim = snapshot.nim;
        token.is_admin = snapshot.is_admin;
        token.kelas_id = snapshot.kelas_id;
        token.is_pj = snapshot.is_pj;
        // Profil dasar mengikuti DB (admin boleh memperbaiki nama di fase
        // berikutnya); kalau NULL, pertahankan nilai dari OAuth.
        token.name = snapshot.name ?? token.name;
        token.email = snapshot.email ?? token.email;
        token.picture = snapshot.image ?? token.picture;
      } catch (error) {
        console.error(
          "[auth] refresh klaim dari DB gagal — memakai klaim JWT terakhir.",
          error,
        );
      }

      return token;
    },
  },
});
