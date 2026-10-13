/**
 * Karsa — app/lengkapi-nim/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman gerbang "lengkapi NIM" (lihat `lib/nim-gate.ts`). Sengaja di luar
 * route group (desktop)/(mobile) agar shell aplikasi tidak ikut dirender —
 * mahasiswa yang belum punya NIM memang belum boleh masuk ke mana pun.
 *
 * Pemeriksaan di sini memakai sesi segar dari DB (`getSession` → snapshot),
 * jadi begitu NIM tersimpan halaman ini langsung mengarahkan user ke home
 * channel-nya, dan user yang tidak wajib mengisi tidak bisa terdampar di sini.
 */

import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

import { NimForm } from "@/app/lengkapi-nim/_components/nim-form";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/button";
import { getSession } from "@/lib/auth-helpers";
import { CHANNEL_COOKIE, resolveChannel, type Channel } from "@/lib/channel";
import { NIM_GATE_PATH, needsNimCompletion } from "@/lib/nim-gate";
import { LOGIN_PATH, homePathForUser } from "@/lib/roles";

export const metadata: Metadata = { title: "Lengkapi NIM" };

export default async function LengkapiNimPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect(`${LOGIN_PATH}?callbackUrl=${encodeURIComponent(NIM_GATE_PATH)}`);
  }

  const user = session.user;
  if (!needsNimCompletion(user)) {
    const cookieChannel = (await cookies()).get(CHANNEL_COOKIE)?.value;
    const channel: Channel =
      cookieChannel === "mobile" || cookieChannel === "desktop"
        ? cookieChannel
        : resolveChannel((await headers()).get("user-agent"));
    redirect(homePathForUser(user, channel));
  }

  const displayName = user.name?.trim() || user.email || "Pengguna Karsa";

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Image
            src="/icon.svg"
            alt=""
            width={28}
            height={28}
            unoptimized
            className="rounded-md"
          />
          <span>Karsa</span>
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight">
          Satu langkah lagi: lengkapi NIM kamu
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Halo, {displayName}. Akunmu belum punya NIM. NIM dipakai sebagai
          identitas resmi kamu di Karsa dan tampil di rekap poin, jadi isi
          sekali saja dengan benar sebelum melanjutkan.
        </p>

        <div className="mt-6">
          <NimForm />
        </div>

        <div className="mt-8 border-t border-border pt-4">
          <form
            action={signOutAction}
            className="flex items-center justify-between gap-3"
          >
            <p className="text-xs text-muted-foreground">
              Masuk dengan akun yang salah?
            </p>
            <Button type="submit" variant="ghost" size="sm">
              Keluar
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
