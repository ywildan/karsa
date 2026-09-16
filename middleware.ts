/**
 * Karsa — middleware.ts
 * ----------------------------------------------------------------------------
 * Guard route (PRD §6) — Fase 1.
 *
 *   /admin/*      → wajib login + `is_admin === true`; bukan admin → /dashboard
 *   /dashboard/*  → wajib login; belum login → /login?callbackUrl=…
 *   /login        → sudah login → redirect ke home channel
 *
 * Klaim dibaca dari cookie JWT (bukan query DB) karena middleware berjalan di
 * Edge Runtime — Prisma tidak boleh diimpor di sini. Jaminan otorisasi yang
 * sesungguhnya tetap di server: halaman admin memanggil `requireAdmin()`, yang
 * membaca session hasil refresh DB (`callbacks.jwt` di `auth.ts`).
 *
 * Peta route lain (device detection, route mobile, leaderboard) menyusul di
 * Fase 1.5 — matcher di bawah sengaja whitelist ketat, bukan exclusion, supaya
 * `/api/auth/*`, aset statis, dan landing `/` tidak pernah tersentuh.
 */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { HOME_DEFAULT, LOGIN_PATH, homePathForUser } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;
  const isLoggedIn = Boolean(user?.id);
  const { pathname } = nextUrl;

  // Sudah login tapi membuka /login → antar ke home channel-nya.
  if (pathname === LOGIN_PATH) {
    if (isLoggedIn && user) {
      return NextResponse.redirect(new URL(homePathForUser(user), nextUrl));
    }
    return NextResponse.next();
  }

  // Belum login → /login (bawa tujuan semula supaya bisa dipakai fase berikutnya).
  if (!isLoggedIn) {
    const loginUrl = new URL(LOGIN_PATH, nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  // Area admin: hanya `is_admin`.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user?.is_admin) {
      return NextResponse.redirect(new URL(HOME_DEFAULT, nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  /**
   * Whitelist ketat — hanya halaman ber-guard.
   * Yang TIDAK masuk middleware: `/api/auth/*` (Auth.js harus bebas),
   * `_next/static`, `_next/image`, file di /public, dan landing `/`.
   */
  matcher: ["/admin/:path*", "/dashboard/:path*", "/login"],
};
