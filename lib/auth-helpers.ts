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
 * query ganda).
 * Jika refresh gagal, `authorization_verified` bernilai false dan guard role
 * menolak akses (fail-closed).
 *
 * Jangan pakai helper ini di middleware (Edge Runtime) — lihat `lib/roles.ts`
 * untuk logika peran yang bebas Prisma.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { resolveChannel, type Channel } from "@/lib/channel";
import { canManageKelas, canManageProdi } from "@/lib/pengelola";
import { prisma } from "@/lib/prisma";
import { HOME_DEFAULT, LOGIN_PATH } from "@/lib/roles";

/** Tipe `session.user` Karsa (lihat augmentasi di `types/next-auth.d.ts`). */
export type SessionUser = Session["user"];

/**
 * Session mentah, nullable. Dipakai kalau pemanggil ingin menangani sendiri
 * keadaan "belum login" (mis. halaman publik /login).
 */
export async function getSession(): Promise<Session | null> {
  return auth();
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
  if (!user.authorization_verified || !user.is_admin) {
    redirect(HOME_DEFAULT);
  }
  return user;
}

/**
 * Wajib PJ (punya ≥1 KelasMatkul). Bukan PJ → /dashboard.
 * Dipakai layout `(mobile)` — otorisasi server, bukan hanya middleware.
 */
export async function requirePj(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.authorization_verified || !user.is_pj) {
    redirect(HOME_DEFAULT);
  }
  return user;
}

/**
 * Wajib pengelola (punya ≥1 penunjukan aktif) ATAU admin penuh.
 * Dipakai layout `(desktop)/pengelola` — otorisasi server per halaman,
 * bukan hanya middleware.
 */
export async function requirePengelola(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.authorization_verified || !(user.is_admin || user.is_pengelola)) {
    redirect(HOME_DEFAULT);
  }
  return user;
}

/**
 * Wajib berhak mengelola prodi ini: admin penuh selalu lolos; pengelola
 * harus memegang lingkup prodi tersebut (`lib/pengelola.ts`).
 */
export async function requirePengelolaProdi(
  prodiId: string,
): Promise<SessionUser> {
  const user = await requirePengelola();
  if (user.is_admin) return user;
  if (!canManageProdi(user.pengelola_scopes, prodiId)) {
    redirect(HOME_DEFAULT);
  }
  return user;
}

/**
 * Wajib berhak mengelola kelas ini: admin penuh selalu lolos; pengelola
 * lolos bila kelasnya ditunjuk langsung atau prodinya berada dalam lingkup
 * (pewarisan lingkup prodi → kelas). Kelas tidak ditemukan → /dashboard,
 * konsisten dengan pola "akses salah = seolah tidak ada".
 */
export async function requirePengelolaKelas(
  kelasId: string,
): Promise<SessionUser> {
  const user = await requirePengelola();
  if (user.is_admin) return user;
  const kelas = await prisma.kelas.findUnique({
    where: { id: kelasId },
    select: { id: true, prodi_id: true },
  });
  if (!kelas || !canManageKelas(user.pengelola_scopes, kelas)) {
    redirect(HOME_DEFAULT);
  }
  return user;
}

/**
 * Channel efektif request ini ditentukan dari User-Agent.
 * Hanya untuk Server Component / Server Action — jangan diimpor middleware.
 */
export async function getRequestChannel(): Promise<Channel> {
  const headerStore = await headers();
  return resolveChannel(headerStore.get("user-agent"));
}
