/**
 * Karsa — app/(desktop)/pengelola/page.tsx
 * ----------------------------------------------------------------------------
 * Beranda pengelola: daftar kelas yang berada dalam lingkup penunjukannya
 * (hasil saringan server di `getPengelolaHomeData`). Kelas di luar lingkup
 * tidak pernah sampai ke halaman ini.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Layers, Users } from "lucide-react";

import { getPengelolaHomeData } from "@/actions/pengelola";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ruang Pengelola",
};

export default async function PengelolaHomePage() {
  const { kelasList, prodiNames } = await getPengelolaHomeData();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Kelas dalam lingkupmu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {prodiNames.length > 0
            ? `Lingkup prodi: ${prodiNames.join(", ")}. `
            : ""}
          Kamu bisa mengelola mahasiswa, penugasan matkul &amp; PJ, dan rekap
          untuk kelas-kelas di bawah ini.
        </p>
      </header>

      {kelasList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">Belum ada kelas dalam lingkupmu</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Penunjukanmu aktif, tetapi belum ada kelas pada prodi/kelas yang
            ditunjuk — atau kelasnya belum dibuat. Hubungi admin bila ini
            tidak sesuai.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {kelasList.map((kelas) => (
            <Link
              key={kelas.id}
              href={`/pengelola/kelas/${kelas.id}`}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold tracking-tight">{kelas.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {kelas.prodi_name} · {kelas.semester_name}
                  </p>
                </div>
                <ArrowRight
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </div>
              <div className="mt-4 flex gap-5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" aria-hidden />
                  {formatNumber(kelas.mahasiswa_count)} mahasiswa
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  {formatNumber(kelas.matkul_count)} matkul
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
