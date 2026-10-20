import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/button";
import { MateriCard } from "@/components/landing/materi-card";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getMateriTerbit } from "@/lib/materi-query";

/**
 * SiKarsa — app/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman depan domain untuk pengunjung yang BELUM login. Middleware tetap
 * mengarahkan user yang sudah masuk ke home channel-nya, jadi halaman ini
 * tidak pernah berebut dengan aplikasi.
 *
 * Keputusan bentuk (lihat riwayat: hub editorial PR #75/#76 di-revert):
 *  · BUKAN gerbang login — tombol Masuk ada, tapi tidak mendominasi;
 *  · BUKAN brosur — tiap bagian harus menjawab satu pertanyaan nyata;
 *  · komposisi asimetris: kiri penjelasan + aksi, kanan isi yang benar-benar
 *    ada di dalam situs (materi terbaru), supaya tidak ada mockup palsu;
 *  · tipografi memakai Inter milik app (tanpa font marketing terpisah).
 */
export const metadata: Metadata = {
  title: {
    absolute: "SiKarsa — Poin keaktifan mahasiswa UNTIDAR",
  },
  description:
    "SiKarsa mencatat poin keaktifan mahasiswa Universitas Tidar per mata kuliah per kelas: PJ mencatat dari HP, rapor diperbarui langsung, pengelola mengekspor tanpa hitung ulang. Plus kisi-kisi ujian terbuka untuk semua.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "SiKarsa — Poin keaktifan mahasiswa UNTIDAR",
    description:
      "Poin keaktifan tercatat saat kelas berjalan. Kisi-kisi ujian terbuka untuk semua.",
    locale: "id_ID",
    type: "website",
  },
};

const LANGKAH = [
  {
    judul: "PJ mencatat di kelas",
    isi: "Buka kelas dari HP, tekan satu tombol per mahasiswa. Tidak ada kertas, tidak ada rekap ulang di akhir semester.",
  },
  {
    judul: "Mahasiswa melihat langsung",
    isi: "Rapor poin per mata kuliah diperbarui saat dicatat — bukan setelah semua kelas selesai.",
  },
  {
    judul: "Pengelola merekap sekali klik",
    isi: "Rekap per kelas dan per prodi siap diekspor ke Excel untuk laporan keaktifan.",
  },
] as const;

const TANYA = [
  {
    q: "Siapa yang bisa masuk?",
    a: "Mahasiswa Universitas Tidar dengan email kampus @students.untidar.ac.id. Akun PJ dan pengelola ditunjuk lewat data kelas dan program studi, jadi tidak semua orang melihat menu yang sama.",
  },
  {
    q: "Apakah materi harus login dulu?",
    a: "Tidak. Semua materi dan kisi-kisi ujian di /materi terbuka untuk siapa saja, termasuk dari luar UNTIDAR. Login hanya diperlukan untuk fitur poin keaktifan.",
  },
  {
    q: "Poin keaktifan itu apa?",
    a: "Catatan per kegiatan di kelas — bertanya, menjawab, presentasi, dan seterusnya — dengan skala 1 sampai 4 per kegiatan, per mata kuliah, per kelas. PJ mata kuliah yang mencatatnya.",
  },
  {
    q: "Apakah ada aplikasi Android?",
    a: "Ada, untuk PJ yang mencatat langsung dari HP saat kelas berjalan. APK dirilis lewat GitHub Releases dan versi terbarunya tertaut di footer halaman ini.",
  },
] as const;

export default async function HomePage() {
  // Materi dibaca dari database; bila tabelnya belum ada, helper ini jatuh
  // ke daftar statis sehingga halaman depan tidak pernah kosong.
  const { daftar } = await getMateriTerbit();
  const unggulan = daftar[0] ?? null;
  const lainnya = daftar.slice(1);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-40 h-80 w-[34rem] rounded-full bg-primary/[0.07] blur-3xl"
          />

          <div className="relative mx-auto max-w-5xl px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:pb-24">
            <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
              <div className="animate-slide-up">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Universitas Tidar · Poin keaktifan
                </p>

                <h1 className="mt-4 text-[2rem] font-bold leading-[1.1] tracking-tight sm:text-5xl sm:leading-[1.05]">
                  Poin keaktifan, tercatat saat kelas berjalan.
                </h1>

                <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
                  SiKarsa menggantikan rekap manual: PJ mencatat dari HP di
                  kelas, mahasiswa melihat rapor poinnya langsung, dan pengelola
                  mengekspor rekap tanpa menghitung ulang.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/login">Masuk dengan Google</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Link href="/materi">Jelajahi materi</Link>
                  </Button>
                </div>

                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  Khusus email kampus{" "}
                  <span className="font-medium text-foreground">
                    @students.untidar.ac.id
                  </span>
                  . Materi bisa dibaca tanpa akun.
                </p>
              </div>

              {/* Isi nyata situs, bukan tangkapan layar palsu. */}
              {unggulan && (
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Materi terbaru
                    </p>
                    <Link
                      href="/materi"
                      className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Semua materi
                    </Link>
                  </div>
                  <div className="mt-3">
                    <MateriCard materi={unggulan} variant="featured" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Cara kerja ─────────────────────────────────────────────────── */}
        <section id="cara-kerja" className="border-b border-border">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Cara kerja
              </p>
              <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Tiga langkah, satu sumber angka.
              </h2>
            </div>

            <ol>
              {LANGKAH.map((langkah, index) => (
                <li
                  key={langkah.judul}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 border-t border-border py-6 first:border-t-0 first:pt-0 sm:grid-cols-[3rem_minmax(0,1fr)]"
                >
                  <span className="text-sm font-bold tabular-nums text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight">
                      {langkah.judul}
                    </h3>
                    <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
                      {langkah.isi}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Sisa materi (hanya bila sudah lebih dari satu) ─────────────── */}
        {lainnya.length > 0 && (
          <section className="border-b border-border">
            <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Materi lain
                </h2>
                <Link
                  href="/materi"
                  className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Semua materi →
                </Link>
              </div>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {lainnya.map((materi) => (
                  <li key={materi.slug} className="flex">
                    <MateriCard materi={materi} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Ajakan masuk ───────────────────────────────────────────────── */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
            <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Sudah punya akun kampus?
                </h2>
                <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
                  Masuk untuk mencatat poin kalau kamu PJ, atau melihat rapor
                  poinmu kalau kamu mahasiswa.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/login">Masuk dengan Google</Link>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href="https://github.com/ywildan/karsa/releases/latest">
                    APK Android
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tanya jawab ────────────────────────────────────────────────── */}
        <section id="tanya">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Tanya jawab
              </p>
              <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Yang biasanya ditanya.
              </h2>
            </div>

            <div>
              {TANYA.map((item) => (
                <details
                  key={item.q}
                  className="group border-t border-border py-5 last:border-b last:pb-6"
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-base font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                    <span>{item.q}</span>
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-lg leading-none text-primary transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
