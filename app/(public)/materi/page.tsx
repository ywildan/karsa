import type { Metadata } from "next";
import Link from "next/link";

import { MateriCard } from "@/components/landing/materi-card";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { getMateriTerbit } from "@/lib/materi-query";
import {
  kelompokkanMateri,
  jumlahMateri,
  type KelompokFakultas,
  type MateriPublik,
} from "@/lib/materi";

/**
 * SiKarsa — app/(public)/materi/page.tsx
 * ----------------------------------------------------------------------------
 * Indeks materi publik, terbuka tanpa login dan sengaja diindeks mesin pencari.
 *
 * Hierarki tampilan mengikuti struktur akademik:
 *   Umum (semua fakultas) → Fakultas → (Lintas prodi) → Prodi
 * Pengelompokan memakai `kelompokkanMateri` yang sama dengan tabel admin,
 * supaya urutan di dua tempat itu tidak pernah berbeda.
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
  const { daftar } = await getMateriTerbit();
  const kelompok = kelompokkanMateri(daftar);
  const total = jumlahMateri(kelompok);

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
          bergaya ujian beserta rubriknya, dan kartu hafalan. Tidak perlu akun
          untuk membaca.
        </p>

        {total === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm leading-6 text-muted-foreground">
            Belum ada materi yang terbit. Materi ditambahkan dari ruang admin dan
            akan muncul di sini setelah diterbitkan.
          </p>
        ) : (
          <div className="mt-12 flex flex-col gap-14">
            {kelompok.umum.length > 0 && (
              <SeksiUmum daftar={kelompok.umum} />
            )}

            {kelompok.fakultas.map((fakultas) => (
              <section
                key={fakultas.nama}
                aria-labelledby={`fakultas-${buatId(fakultas.nama)}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground/80 pt-4">
                  <h2
                    id={`fakultas-${buatId(fakultas.nama)}`}
                    className="text-xl font-bold tracking-tight sm:text-2xl"
                  >
                    {fakultas.nama}
                  </h2>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {jumlahFakultas(fakultas)} materi
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-8">
                  {fakultas.lintasProdi.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Lintas prodi
                      </h3>
                      <div className="mt-3">
                        <DaftarKartu daftar={fakultas.lintasProdi} />
                      </div>
                    </div>
                  )}

                  {fakultas.prodi.map((prodi) => (
                    <div key={prodi.nama}>
                      <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold tracking-tight">
                        {prodi.nama}
                        <span className="text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground">
                          {prodi.materi.length} materi
                        </span>
                      </h3>
                      <div className="mt-3">
                        <DaftarKartu daftar={prodi.materi} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
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
          <a
            href="mailto:yuwiaffa@gmail.com?subject=Kirim%20materi%20SiKarsa"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Kirim materi
            <span aria-hidden>→</span>
          </a>
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

/** "Fakultas Teknik" → "fakultas-teknik" (untuk id anchor). */
function buatId(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function jumlahFakultas(fakultas: KelompokFakultas): number {
  return (
    fakultas.lintasProdi.length +
    fakultas.prodi.reduce((total, prodi) => total + prodi.materi.length, 0)
  );
}

function SeksiUmum({ daftar }: { daftar: MateriPublik[] }) {
  return (
    <section aria-labelledby="seksi-umum">
      <div className="border-t-2 border-foreground/80 pt-4">
        <h2 id="seksi-umum" className="text-xl font-bold tracking-tight sm:text-2xl">
          Umum
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Berlaku untuk semua fakultas
        </p>
      </div>
      <div className="mt-5">
        <DaftarKartu daftar={daftar} />
      </div>
    </section>
  );
}

function DaftarKartu({ daftar }: { daftar: MateriPublik[] }) {
  return (
    <ul
      className="grid gap-4 sm:grid-cols-2 sm:[&>li:last-child:nth-child(odd)]:col-span-2"
    >
      {daftar.map((materi) => (
        <li key={materi.slug} className="flex">
          <MateriCard materi={materi} />
        </li>
      ))}
    </ul>
  );
}
