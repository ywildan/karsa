import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Smartphone } from "lucide-react";

import { Button } from "@/components/button";
import { SikarsaShowcaseMock } from "@/components/marketing/product-mock";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteNav } from "@/components/marketing/site-nav";
import {
  AudienceSection,
  CapabilitiesSection,
  FactsSection,
  FaqSection,
  FeaturesSection,
  IdeaSection,
  ProblemSection,
  RoadmapSection,
  SecuritySection,
  StepsSection,
} from "@/components/marketing/sikarsa-sections";
import { marketingSerif } from "@/lib/marketing-font";
import { ANDROID_DOWNLOAD_URL } from "@/lib/marketing-links";
import { cn } from "@/lib/utils";
import { THEME_COOKIE, themeFromCookieValue } from "@/lib/theme";

/**
 * Karsa — app/(public)/product/sikarsa/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman produk SiKarsa di `/product/sikarsa`: rumah publik bagi produk
 * pencatat poin keaktifan di bawah domain induk sikarsa.id. Halaman ini
 * publik penuh (di luar whitelist matcher middleware), bisa dibuka tamu
 * maupun user yang sudah login.
 */

export const metadata: Metadata = {
  title: "SiKarsa — Pencatatan Poin Keaktifan Mahasiswa UNTIDAR",
  description:
    "SiKarsa mencatat poin keaktifan mahasiswa Universitas Tidar per mata kuliah per kelas. PJ mencatat dari HP, mahasiswa melihat rapor poin secara live, lengkap dengan Karsa Lib dan Teman Baca AI.",
};

export default async function SikarsaProductPage() {
  const isDark =
    themeFromCookieValue((await cookies()).get(THEME_COOKIE)?.value) === "dark";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <SiteNav initialDark={isDark} />

      <main className="relative flex-1">
        {/* Hero produk */}
        <section className="mx-auto w-full max-w-4xl px-6 pb-10 pt-16 text-center animate-slide-up sm:pt-24">
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Produk Karsa · Universitas Tidar
          </span>

          <h1
            className={cn(
              marketingSerif.className,
              "mt-7 text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl",
            )}
          >
            Setiap karsa, <span className="italic text-primary">satu poin</span>.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
            SiKarsa adalah aplikasi pencatatan poin keaktifan mahasiswa
            Universitas Tidar per mata kuliah per kelas. PJ mencatat poin dari
            HP saat perkuliahan berjalan, dan mahasiswa memantau rapor
            poinnya secara live, tanpa rekap manual di akhir semester.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/login">Masuk dengan Google</Link>
            </Button>
            {ANDROID_DOWNLOAD_URL ? (
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <a href={ANDROID_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                  <Smartphone className="mr-1.5 h-4 w-4" aria-hidden />
                  Unduh Android
                </a>
              </Button>
            ) : null}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Web & Android · Khusus akun{" "}
            <span className="font-medium text-foreground">@students.untidar.ac.id</span>
          </p>
        </section>

        {/* Visual produk */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-28 lg:px-8">
          <SikarsaShowcaseMock />
        </section>

        <ProblemSection />
        <IdeaSection />
        <StepsSection />
        <CapabilitiesSection />
        <AudienceSection />
        <FeaturesSection />
        <FactsSection />
        <SecuritySection />
        <RoadmapSection />
        <FaqSection />

        {/* CTA penutup */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center sm:py-24">
            <h2
              className={cn(
                marketingSerif.className,
                "text-4xl leading-tight sm:text-5xl lg:text-6xl",
              )}
            >
              Dirancang untuk lingkungan UNTIDAR.{" "}
              <span className="italic text-primary">Siap untuk uji coba terbatas.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance leading-relaxed text-muted-foreground sm:text-lg">
              Jelajahi versi yang berjalan saat ini dengan akun Google
              UNTIDAR-mu, atau unduh aplikasi Android-nya untuk mencatat poin
              langsung dari kelas.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/login">Masuk dengan Google</Link>
              </Button>
              {ANDROID_DOWNLOAD_URL ? (
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <a href={ANDROID_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                    <Smartphone className="mr-1.5 h-4 w-4" aria-hidden />
                    Unduh Android
                  </a>
                </Button>
              ) : null}
            </div>
            <p className="mt-10">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Kembali ke beranda Karsa
              </Link>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
