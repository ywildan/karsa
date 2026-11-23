/**
 * Karsa — app/(mobile)/aktivitas/laporan/page.tsx
 * ----------------------------------------------------------------------------
 * Laporan poin pribadi PJ di channel mobile web. Sumber data sama dengan
 * rapor mahasiswa pada semester aktif.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, FileBarChart } from "lucide-react";

import { Button } from "@/components/button";
import { getRaporMahasiswa } from "@/actions/rapor";
import { formatDateTimeShortWib, formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Laporan Saya",
};

export default async function AktivitasLaporanPage() {
  const rapor = await getRaporMahasiswa();

  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <Link
        href="/aktivitas"
        className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Kembali ke aktivitas
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Laporan Saya</h1>
        <p className="text-sm text-muted-foreground">
          Poin keaktifanmu sebagai mahasiswa pada semester aktif.
        </p>
      </header>

      {!rapor.ok || rapor.empty ? (
        <section className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <FileBarChart className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">Laporan belum tersedia</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {rapor.ok && rapor.empty
              ? rapor.reason === "belum_aktif"
                ? "Admin belum menetapkan semester aktif untuk prodi dan angkatanmu."
                : "Kamu belum terdaftar di kelas."
              : "Laporan tidak dapat dimuat saat ini."}
          </p>
          <Button asChild className="mt-4 w-fit">
            <Link href="/aktivitas">Kembali ke aktivitas</Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="rounded-[24px] border border-border bg-espresso p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Total poin semester ini
            </p>
            <p className="mt-2 text-5xl font-extrabold leading-none tabular-nums">
              {formatNumber(rapor.data.totalPoin)}
            </p>
            <p className="mt-2 text-xs text-white/60">
              {rapor.data.kelas.name} · {rapor.data.prodi.name} ·{" "}
              {rapor.data.semester.name}
            </p>
          </section>

          <section className="grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                Mata kuliah
              </h2>
              <span className="text-xs text-muted-foreground">
                {rapor.data.matkuls.length} matkul
              </span>
            </div>

            {rapor.data.matkuls.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
                Belum ada mata kuliah yang ditugaskan untuk kelas ini.
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {rapor.data.matkuls.map((matkul) => (
                  <li
                    key={matkul.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {matkul.matkul.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {matkul.matkul.code ? `${matkul.matkul.code} · ` : ""}
                          PJ {matkul.pj.name?.trim() || "Belum ditentukan"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold tabular-nums">
                          {formatNumber(matkul.totalPoin)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">poin</p>
                      </div>
                    </div>

                    {matkul.riwayat.length > 0 ? (
                      <details className="group border-t border-border bg-muted/30">
                        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                          <span>{matkul.riwayat.length} riwayat</span>
                          <span>Buka</span>
                        </summary>
                        <ul className="divide-y divide-border/60 border-t border-border/60">
                          {matkul.riwayat.map((entry) => (
                            <li
                              key={entry.id}
                              className="flex items-start gap-2.5 px-4 py-2.5"
                            >
                              <span className="mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-lg bg-accent px-1 text-xs font-bold text-accent-foreground">
                                +{entry.poin}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium">
                                  {entry.kategori.name}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {formatDateTimeShortWib(entry.created_at)}
                                  {entry.pj.name
                                    ? ` · PJ ${entry.pj.name}`
                                    : ""}
                                </p>
                                {entry.catatan ? (
                                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                                    {entry.catatan}
                                  </p>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                        Belum ada poin pada mata kuliah ini.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
