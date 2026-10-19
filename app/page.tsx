import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, Clock, KeyRound, ShieldCheck } from "lucide-react";

import { Button } from "@/components/button";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { THEME_COOKIE, themeFromCookieValue } from "@/lib/theme";

/**
 * Karsa — app/page.tsx
 * ----------------------------------------------------------------------------
 * Hub brand Karsa di root `/`. Hanya tampil untuk pengunjung yang belum
 * login; middleware meneruskan user yang sudah login ke home channel
 * masing-masing. Aplikasi tinggal di path-nya sendiri (`/login`,
 * `/dashboard`, `/admin`, …), produk menempati `/product/<nama>`.
 */

export const metadata: Metadata = {
  title: "Karsa — Produk Digital untuk Lingkungan UNTIDAR",
  description:
    "Karsa menaungi aplikasi untuk mahasiswa, dosen, dan pengelola Universitas Tidar. Satu akun Google UNTIDAR untuk semua produk, dimulai dari SiKarsa, pencatat poin keaktifan mahasiswa.",
};

const HIGHLIGHTS = [
  { icon: KeyRound, label: "Satu akun Google UNTIDAR" },
  { icon: BadgeCheck, label: "Gratis untuk sivitas UNTIDAR" },
  { icon: ShieldCheck, label: "Akses sesuai peran" },
] as const;

const SIKARSA_FEATURES = ["Catat poin dari HP", "Rapor poin live", "Karsa Lib & Teman Baca AI"] as const;

export default async function HomePage() {
  const isDark =
    themeFromCookieValue((await cookies()).get(THEME_COOKIE)?.value) === "dark";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Ornamen latar: aura hangat dari warna aksen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <SiteNav initialDark={isDark} />

      <main className="relative flex-1">
        {/* Hero brand */}
        <section className="mx-auto w-full max-w-3xl px-6 pb-16 pt-14 text-center animate-slide-up sm:pt-20">
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Universitas Tidar
          </span>

          <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">Karsa</h1>
          <p className="mt-3 text-xl text-primary">Produk digital untuk lingkungan UNTIDAR.</p>

          <p className="mt-6 text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            Karsa menaungi aplikasi yang dibangun untuk mahasiswa, dosen, dan
            pengelola Universitas Tidar, dengan satu akun Google UNTIDAR untuk
            semua produk. Produk pertamanya, SiKarsa, mencatat poin keaktifan
            mahasiswa secara transparan dan live.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="#produk">Lihat Produk</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">Masuk dengan Google</Link>
            </Button>
          </div>

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
        </section>

        {/* Produk */}
        <section id="produk" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Produk</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Satu rumah, banyak produk</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Setiap produk Karsa tinggal di alamat <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/product/</code>{" "}
              domain ini dan memakai akun yang sama. Yang sudah berjalan:
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {/* SiKarsa */}
            <article className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <Image
                  src="/icon.svg"
                  alt=""
                  width={44}
                  height={44}
                  unoptimized
                  className="rounded-xl"
                />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  Aktif
                </span>
              </div>

              <h3 className="mt-5 text-2xl font-semibold tracking-tight">SiKarsa</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Pencatatan poin keaktifan mahasiswa per mata kuliah per kelas.
                PJ mencatat dari HP, mahasiswa melihat rapor poinnya secara
                live, dan admin merekap semuanya tanpa hitung manual.
              </p>

              <ul className="mt-5 space-y-2">
                {SIKARSA_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-col gap-3 pt-1 sm:flex-row">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/product/sikarsa">
                    Pelajari SiKarsa
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href="/login">Masuk</Link>
                </Button>
              </div>
            </article>

            {/* Produk berikutnya */}
            <article className="flex flex-col rounded-3xl border border-dashed border-border p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" aria-hidden />
                </span>
                <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Segera
                </span>
              </div>

              <h3 className="mt-5 text-2xl font-semibold tracking-tight text-muted-foreground">
                Produk berikutnya
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Produk Karsa berikutnya sedang disiapkan. Saat rilis, ia akan
                tinggal di alamat <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/product/</code>{" "}
                yang sama dan memakai akun Google UNTIDAR yang sama dengan
                yang kamu pakai hari ini.
              </p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
