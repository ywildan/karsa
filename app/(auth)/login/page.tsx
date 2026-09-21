/**
 * Karsa — app/(auth)/login/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman masuk (Fase 1 — sudah tersambung auth):
 *   · Logo Karsa + tagline "Setiap karsa, satu poin."
 *   · Tombol Google OAuth (Server Action `googleSignInAction`)
 *   · Dev Quick Login 4 tombol — HANYA dirender saat `NODE_ENV !== "production"`
 *   · Pesan error ramah dari `?error=` (mis. domain bukan kampus)
 *
 * Route group `(auth)` tidak menambah segmen URL → tetap `/login`.
 * Sudah login → langsung diarahkan ke home channel (middleware juga menjaga ini).
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { googleSignInAction } from "@/actions/auth";
import { Button } from "@/components/button";
import { DevLoginButtons } from "@/components/dev-login-buttons";
import { getRequestChannel, getSession } from "@/lib/auth-helpers";
import { DEV_USERS, isDevAuthEnabled } from "@/lib/dev-users";
import { homePathForUser } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke Karsa dengan akun Google kampus UNTIDAR.",
};

/** Pesan ramah untuk kode `?error=` dari Auth.js (lihat `auth.config.ts`). */
const ERROR_MESSAGES: Record<string, string> = {
  domain:
    "Email itu bukan domain kampus UNTIDAR. Pakai email @students.untidar.ac.id.",
  dev_disabled: "Dev Quick Login tidak tersedia.",
  AccessDenied:
    "Akses ditolak. Karsa hanya untuk email kampus UNTIDAR (@students.untidar.ac.id).",
  OAuthAccountNotLinked:
    "Email ini sudah terdaftar lewat cara lain. Hubungi admin kelasmu.",
  Configuration:
    "Konfigurasi login bermasalah. Cek variabel AUTH_* di .env.",
  Verification: "Tautan login tidak valid atau sudah kedaluwarsa.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session?.user?.id) {
    const channel = await getRequestChannel();
    redirect(homePathForUser(session.user, channel));
  }

  const { error } = await searchParams;
  const errorMessage = error
    ? (ERROR_MESSAGES[error] ?? "Gagal masuk. Coba lagi sebentar lagi.")
    : null;
  const devEnabled = isDevAuthEnabled();

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center text-center">
          {/* Logo sementara Karsa (PRD §19 D7: placeholder SVG dulu). */}
          <Image
            src="/icon.svg"
            alt="Logo Karsa"
            width={56}
            height={56}
            priority
            unoptimized
            className="rounded-2xl"
          />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Karsa</h1>
          <p className="mt-2 text-sm text-primary">
            Setiap karsa, satu poin.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-medium">Halo, calon pengkarya 👋</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Masuk pakai email kampus untuk mulai mencatat dan melihat poin
            keaktifanmu.
          </p>

          {errorMessage && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <form action={googleSignInAction} className="mt-6">
            <Button type="submit" size="lg" className="w-full">
              Lanjutkan dengan Google
            </Button>
          </form>

          {devEnabled && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dev Quick Login
              </p>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">
                Tombol ini hanya muncul di luar production.
              </p>
              <DevLoginButtons users={DEV_USERS} />
            </div>
          )}

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Hanya email{" "}
              <span className="font-medium text-foreground">
                @students.untidar.ac.id
              </span>{" "}
              yang bisa masuk. Ada kendala? Hubungi{" "}
              <Link
                href="mailto:yuwiaffa@gmail.com"
                className="font-medium text-foreground underline underline-offset-4 hover:underline"
              >
                developer
              </Link>
              .
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Universitas Tidar
          </Link>{" "}
          · Sistem Pencatatan Poin Keaktifan
        </p>
      </div>
    </main>
  );
}
