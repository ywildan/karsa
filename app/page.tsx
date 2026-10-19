import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, Clock, KeyRound, ShieldCheck } from "lucide-react";

import { Button } from "@/components/button";
import { PhoneMock, SikarsaShowcaseMock } from "@/components/marketing/product-mock";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import { marketingSerif } from "@/lib/marketing-font";
import { cn } from "@/lib/utils";
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

const SIKARSA_CAPABILITIES = [
  "PJ mencatat poin dari HP, langsung di kelas",
  "Mahasiswa memantau rapor poin secara live",
  "Admin & pengelola merekap dan mengekspor tanpa hitung manual",
  "Karsa Lib & Teman Baca AI untuk bahan bacaan prodi",
] as const;

export default async function HomePage() {
  const isDark =
    themeFromCookieValue((await cookies()).get(THEME_COOKIE)?.value) === "dark";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      {/* Ornamen latar: aura hangat dari warna aksen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <SiteNav initialDark={isDark} />

      <main className="relative flex-1">
        {/* Hero brand */}
        <section className="mx-auto w-full max-w-4xl px-6 pb-10 pt-16 text-center animate-slide-up sm:pt-24">
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Universitas Tidar
          </span>

          <h1
            className={cn(
              marketingSerif.className,
              "mt-7 text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl",
            )}
          >
            Produk digital untuk lingkungan <span className="italic text-primary">UNTIDAR</span>.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            Karsa menaungi aplikasi yang dibangun untuk mahasiswa, dosen, dan
            pengelola Universitas Tidar, dengan satu akun Google UNTIDAR untuk
            semua produk. Produk pertamanya, SiKarsa, mencatat poin keaktifan
            mahasiswa secara transparan dan live.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="#produk">Lihat Produk</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="/login">Masuk dengan Google</Link>
            </Button>
          </div>

          <ul className="mt-9 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
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

        {/* Visual produk unggulan */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-28 lg:px-8">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            SiKarsa — produk pertama Karsa
          </p>
          <SikarsaShowcaseMock />
        </section>

        {/* Showcase produk */}
        <section id="produk" className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-primary">Produk</p>
              <h2
                className={cn(marketingSerif.className, "mt-3 text-4xl leading-tight sm:text-5xl")}
              >
                SiKarsa
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                Pencatatan poin keaktifan mahasiswa per mata kuliah per kelas.
                Setiap kontribusi di kelas tercatat sebagai karsa, dan semua
                pihak melihat data yang sama pada saat yang sama.
              </p>

              <ul className="mt-7 space-y-3">
                {SIKARSA_CAPABILITIES.map((capability) => (
                  <li key={capability} className="flex items-start gap-2.5 text-sm sm:text-base">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                    {capability}
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/product/sikarsa">
                    Pelajari SiKarsa
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="/login">Masuk</Link>
                </Button>
              </div>

              <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                Aktif — dipakai dalam lingkungan UNTIDAR
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <PhoneMock className="w-[320px]" />
            </div>
          </div>

          {/* Produk berikutnya */}
          <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-5 py-4 text-sm text-muted-foreground">
              <Clock className="h-5 w-5 shrink-0" aria-hidden />
              <p>
                Produk Karsa berikutnya sedang disiapkan. Saat rilis, ia akan tinggal di alamat{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/product/</code> domain ini
                juga, dengan akun yang sama.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
