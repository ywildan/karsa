import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getJudulArtikelTerbit } from "@/lib/artikel-query";
import { getMateriTerbit } from "@/lib/materi-query";

import { DaftarMateriPublik } from "./_components/daftar-materi-publik";

/**
 * SiKarsa — app/(public)/materi/page.tsx
 * ----------------------------------------------------------------------------
 * Indeks materi publik, terbuka tanpa login dan sengaja diindeks mesin pencari.
 *
 * Hierarki tampilan mengikuti struktur akademik:
 *   Umum (semua fakultas) → Fakultas → (Lintas prodi) → Prodi
 * Penyaringan fakultas/prodi dan perpindahan tab ada di komponen klien
 * `DaftarMateriPublik`; halaman ini tetap server component supaya metadata &
 * SEO utuh. (Halaman dirender per permintaan — `SiteHeader` membaca cookie tema
 * — jadi judul artikel baru dari Karsa Lib langsung ikut tanpa menunggu build.)
 */
export const metadata: Metadata = {
  title: "Materi & kisi-kisi ujian",
  description:
    "Ringkasan dan kisi-kisi ujian mata kuliah Universitas Tidar, tersusun per fakultas dan program studi: cakupan materi, tabel pembeda, latihan soal, dan kartu hafalan. Terbuka tanpa login.",
  alternates: { canonical: "/materi" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Materi & kisi-kisi ujian · SiKarsa",
    description:
      "Ringkasan dan kisi-kisi ujian mata kuliah Universitas Tidar. Terbuka tanpa login.",
    locale: "id_ID",
    type: "website",
  },
};

export default async function MateriIndexPage() {
  const [{ daftar }, artikel] = await Promise.all([
    getMateriTerbit(),
    getJudulArtikelTerbit(),
  ]);
  const total = daftar.length;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Materi
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          Kisi-kisi ujian, disusun per fakultas dan prodi.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Setiap materi memuat cakupan yang diukur, tabel pembeda, latihan soal
          bergaya ujian beserta rubriknya, dan kartu hafalan. Materi terbuka
          tanpa akun; artikel mahasiswa dari Karsa Lib hanya bisa dibaca di
          aplikasi Karsa mobile.
        </p>

        {total === 0 && artikel.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm leading-6 text-muted-foreground">
            Belum ada materi yang terbit. Materi ditambahkan dari ruang admin dan
            akan muncul di sini setelah diterbitkan.
          </p>
        ) : (
          <DaftarMateriPublik daftar={daftar} artikel={artikel} />
        )}

        <div className="mt-14 rounded-xl border border-dashed border-border bg-secondary/40 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Menyusul
          </p>
          <h2 className="mt-3 text-lg font-bold tracking-tight">
            Materi mata kuliah lain
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Materi ditambah per mata kuliah dan per ujian. Kalau kamu punya
            ringkasan yang sudah rapi dan boleh dibagikan, kirim ke pengelola
            untuk ditinjau.
          </p>
          <Link
            href="/materi/kirim"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Kirim materi
            <span aria-hidden>→</span>
          </Link>
        </div>

        <p className="mt-8 rounded-lg border border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
          Materi disusun ulang dari modul resmi mata kuliah dan tidak menggantikan
          modul, RPS, atau penjelasan dosen. Bila ada perbedaan, yang berlaku
          adalah dokumen akademik resmi.
        </p>

        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Kembali ke beranda
        </Link>
      </main>

      <SiteFooter />
    </div>
  );
}
