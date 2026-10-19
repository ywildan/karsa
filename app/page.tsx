import { cookies } from "next/headers";
import Link from "next/link";

import { BookOpen, Smartphone, Zap } from "lucide-react";

import { Button } from "@/components/button";
import { LandingMenu } from "@/components/landing-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { THEME_COOKIE, themeFromCookieValue } from "@/lib/theme";

/**
 * Karsa — app/page.tsx
 * ----------------------------------------------------------------------------
 * Landing tamu di root. Hanya tampil untuk pengunjung yang belum login;
 * middleware meneruskan user yang sudah login ke home channel masing-masing.
 * Belum menyentuh database maupun auth.
 */

const HIGHLIGHTS = [
  { icon: Smartphone, label: "PJ mencatat poin dari HP" },
  { icon: Zap, label: "Rapor poin tampil live" },
  { icon: BookOpen, label: "Karsa Lib & Teman Baca AI" },
] as const;
export default async function HomePage() {
  const isDark =
    themeFromCookieValue((await cookies()).get(THEME_COOKIE)?.value) === "dark";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Ornamen latar: aura hangat dari warna aksen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <LandingMenu />
        <ThemeToggle initialDark={isDark} />
      </div>

      <div className="relative w-full max-w-xl text-center animate-slide-up">
        <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Universitas Tidar
        </span>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          Karsa
        </h1>
        <p className="mt-3 text-lg text-primary">Setiap karsa, satu poin.</p>

        <p className="mt-6 text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          Pencatatan poin keaktifan mahasiswa per mata kuliah per kelas.
          PJ mencatat dari HP, mahasiswa melihat rapor secara LIVE.
        </p>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
            >
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              {label}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">Masuk dengan Google</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Khusus mahasiswa UNTIDAR — login dengan email{" "}
          <span className="font-medium text-foreground">@students.untidar.ac.id</span>
        </p>
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-1.5 px-6 pb-5 text-center text-xs text-muted-foreground sm:flex-row sm:justify-center sm:gap-2">
        <span>Karsa · Universitas Tidar</span>
        <span aria-hidden className="hidden sm:inline">
          ·
        </span>
        <nav className="flex items-center gap-3">
          <Link
            href="/kebijakan-privasi"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Kebijakan Privasi
          </Link>
          <Link
            href="/syarat-penggunaan"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Syarat Penggunaan
          </Link>
        </nav>
      </footer>
    </main>
  );
}
