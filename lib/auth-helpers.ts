/**
 * Karsa — lib/auth-helpers.ts
 * ----------------------------------------------------------------------------
 * API otorisasi sisi server (PRD §0 aturan 6: "Otorisasi di server").
 *
 *   const user = await requireUser();   // di halaman /dashboard
 *   const admin = await requireAdmin(); // di halaman /admin/*
 *
 * `auth()` membaca cookie JWT dan — karena `callbacks.jwt` di `auth.ts` —
 * me-refresh klaim (id, nim, is_admin, kelas_id, is_pj) dari database pada
 * request itu juga. Jadi helper di sini TIDAK perlu query DB lagi (tidak ada
 * query ganda); kecuali `getCurrentUser()` yang memang meminta data penuh.
 *
 * Jangan pakai helper ini di middleware (Edge Runtime) — lihat `lib/roles.ts`
 * untuk logika peran yang bebas Prisma.
 */
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { HOME_DEFAULT, LOGIN_PATH } from "@/lib/roles";
import {
  loadUserSnapshot,
  loadUserSnapshotByEmail,
  type UserSnapshot,
} from "@/lib/user-snapshot";

export { loadUserSnapshot, loadUserSnapshotByEmail };
export type { UserSnapshot };

/** Tipe `session.user` Karsa (lihat augmentasi di `types/next-auth.d.ts`). */
export type SessionUser = Session["user"];

/**
 * Session mentah, nullable. Dipakai kalau pemanggil ingin menangani sendiri
 * keadaan "belum login" (mis. halaman publik /login).
 */
export async function getSession(): Promise<Session | null> {
  return auth();
}

/** True bila ada user login (tanpa redirect). */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user?.id);
}

/**
 * Profil lengkap dari DB (nama, email, image, nim, is_admin, kelas_id, is_pj).
 * Mengembalikan `null` bila belum login atau user sudah tidak ada di DB.
 */
export async function getCurrentUser(): Promise<UserSnapshot | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  return loadUserSnapshot(userId);
}

/**
 * Wajib login. Belum login → redirect /login (dengan `callbackUrl`).
 * Dipakai halaman /dashboard/*.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`${LOGIN_PATH}?callbackUrl=${encodeURIComponent(HOME_DEFAULT)}`);
  }
  return session.user;
}

/**
 * Wajib admin (PRD §6). Bukan admin → redirect /dashboard.
 * Klaim `is_admin` di sini berasal dari DB pada request ini (lihat `auth.ts`),
 * jadi mencabut hak admin langsung berlaku pada request berikutnya.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.is_admin) {
    redirect(HOME_DEFAULT);
  }
  return user;
}
