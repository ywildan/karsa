/**
 * Karsa — app/api/auth/[...nextauth]/route.ts
 * ----------------------------------------------------------------------------
 * Handler HTTP NextAuth v5 (Auth.js): /api/auth/*.
 *
 * Endpoint penting yang dihasilkan:
 *   GET  /api/auth/providers        → daftar provider aktif
 *   GET  /api/auth/session          → session (klaim Karsa, lihat auth.config.ts)
 *   GET  /api/auth/csrf             → CSRF token
 *   GET  /api/auth/signin/google    → mulai OAuth Google
 *   POST /api/auth/callback/google  → balikan dari Google
 *   POST /api/auth/callback/dev-login → Dev Quick Login (DEV ONLY)
 *   POST /api/auth/signout          → logout
 *
 * Runtime Node wajib: PrismaAdapter memakai `@prisma/client` (tidak jalan di Edge).
 * Route ini juga TIDAK pernah masuk `middleware.ts` — matcher-nya hanya
 * /admin, /dashboard, dan /login (lihat catatan di `middleware.ts`).
 */
import { handlers } from "@/auth";

export const runtime = "nodejs";

export const { GET, POST } = handlers;
