import type { Metadata } from "next";

import { Button } from "@/components/button";

/**
 * Karsa — app/(auth)/login/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman masuk. Fase 0: SHELL SAJA (UI), belum ada auth.
 *
 * Yang sengaja BELUM ada di sini:
 *  · `auth.config.ts` + `auth.ts` (NextAuth v5, Google OAuth, JWT)
 *  · Server Action `signIn("google")`
 *  · Guard redirect: kalau sudah login → ke home channel masing-masing (PRD §6)
 *
 * Route group `(auth)` tidak menambah segmen URL, jadi halaman ini tetap `/login`.
 * Setelah auth terpasang, bagian <form> diganti dengan form server action.
 */
export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke Karsa dengan akun Google kampus UNTIDAR.",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Karsa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Setiap karsa, satu poin.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-medium">Halo, calon pengkarya 👋</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Masuk pakai email kampus untuk mulai mencatat dan melihat poin
            keaktifanmu.
          </p>

          <div className="mt-6 space-y-3">
            {/*
              Tombol ini belum terhubung ke NextAuth (sengaja — Fase 0 hanya
              menulis file). Setelah `auth.ts` siap, ganti <Button> di bawah
              dengan <form action={signInWithGoogle}>.
            */}
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled
              title="Auth (NextAuth v5 + Google OAuth) dipasang di fase berikutnya"
            >
              Lanjutkan dengan Google
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Belum tersambung — Auth dipasang di fase berikutnya.
            </p>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Hanya email <span className="font-medium text-foreground">@students.untidar.ac.id</span>{" "}
              yang bisa masuk. Ada kendala? Hubungi admin kelasmu.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Universitas Tidar · Sistem Pencatatan Poin Keaktifan
        </p>
      </div>
    </main>
  );
}
