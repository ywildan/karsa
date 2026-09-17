/**
 * Karsa — middleware.ts
 * ----------------------------------------------------------------------------
 * Guard route + dual channel (PRD §4.2, §6) — Fase 1.5, diselaraskan Fase 3A.
 *
 *   /                 → sudah login → home channel; belum → landing
 *   /login            → sudah login → home channel
 *   /admin/*          → wajib login + `is_admin`; bukan admin → /dashboard
 *   path mobile       → wajib login + `is_pj`; selain itu → /dashboard
 *   /dashboard        → PJ **non-admin** → /catat-poin
 *
 * **PJ = punya ≥1 `KelasMatkul.pj_id = dirinya`, tidak peduli `is_admin`**
 * (keputusan Fase 3A, PRD §6). Konsekuensinya:
 *   · admin yang merangkap PJ dari HP → home `/catat-poin` (lihat
 *     `homePathForUser`), dan `/admin/*` tetap bisa ia buka langsung.
 *   · admin yang BUKAN PJ dari HP → home `/dashboard`.
 *   · `/dashboard` sengaja TIDAK memantul admin-PJ: admin butuh dashboard-nya
 *     sendiri, dan shell mobile tetap reachable lewat bottom nav / `/catat-poin`.
 *
 * Channel: auto-detect User-Agent (`resolveChannel`), lalu hasilnya ditulis
 * ke cookie `karsa_channel` untuk kebutuhan redirect. Cookie bukan switch
 * layout; route group ditentukan oleh path URL.
 * Klaim dibaca dari cookie JWT (Edge — tanpa Prisma). Otorisasi sesungguhnya
 * tetap di server (`requireAdmin` / `requirePj` + guard per-resource di
 * `actions/poin.ts`).
 */
import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";

import { authConfig } from "@/auth.config";
import {
  CHANNEL_COOKIE,
  DESKTOP_HOME,
  MOBILE_HOME,
  isMobilePath,
  resolveChannel,
  type Channel,
} from "@/lib/channel";
import { HOME_DEFAULT, LOGIN_PATH, homePathForUser } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

/** Cookie session-only: nilainya selalu mengikuti hasil deteksi UA. */
function withChannelCookie(
  response: NextResponse,
  channel: Channel,
  existing: string | undefined,
): NextResponse {
  if (existing !== channel) {
    response.cookies.set(CHANNEL_COOKIE, channel, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}

function redirectTo(req: NextRequest, path: string, channel: Channel, existing: string | undefined) {
  return withChannelCookie(
    NextResponse.redirect(new URL(path, req.nextUrl)),
    channel,
    existing,
  );
}

function nextWithChannel(channel: Channel, existing: string | undefined) {
  return withChannelCookie(NextResponse.next(), channel, existing);
}

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;
  const isLoggedIn = Boolean(user?.id);
  const { pathname } = nextUrl;

  const existing = req.cookies.get(CHANNEL_COOKIE)?.value;
  const channel = resolveChannel(req.headers.get("user-agent"));

  // Landing: anonim tetap lihat `/`; sudah login → home channel.
  if (pathname === "/") {
    if (isLoggedIn && user) {
      return redirectTo(req, homePathForUser(user, channel), channel, existing);
    }
    return nextWithChannel(channel, existing);
  }

  if (pathname === LOGIN_PATH) {
    if (isLoggedIn && user) {
      return redirectTo(req, homePathForUser(user, channel), channel, existing);
    }
    return nextWithChannel(channel, existing);
  }

  if (!isLoggedIn) {
    const loginUrl = new URL(LOGIN_PATH, nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  // Area admin: hanya `is_admin`. Channel tidak menghalangi kalau admin
  // menavigasi ke sini sendiri (home mobile admin = /dashboard).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user?.is_admin) {
      return redirectTo(req, HOME_DEFAULT, channel, existing);
    }
    return nextWithChannel(channel, existing);
  }

  // Path (mobile): wajib PJ. Admin / mahasiswa / tanpa kelas → /dashboard.
  if (isMobilePath(pathname)) {
    if (!user?.is_pj) {
      return redirectTo(req, DESKTOP_HOME, channel, existing);
    }
    return nextWithChannel(channel, existing);
  }

  // /dashboard: PJ non-admin dikunci ke shell mobile. Admin — termasuk admin
  // yang merangkap PJ — tetap boleh membuka dashboard-nya sendiri (Fase 3A).
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (user?.is_pj && !user?.is_admin) {
      return redirectTo(req, MOBILE_HOME, channel, existing);
    }
    return nextWithChannel(channel, existing);
  }

  return nextWithChannel(channel, existing);
});

export const config = {
  /**
   * Whitelist — halaman ber-guard + landing `/`.
   * Yang TIDAK masuk: `/api/auth/*`, `_next/static`, `_next/image`, file public.
   */
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/dashboard/:path*",
    "/catat-poin/:path*",
    "/riwayat-poin/:path*",
    "/poin-saya/:path*",
  ],
};
