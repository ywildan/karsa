"use client";

/**
 * SiKarsa — app/(public)/materi/_components/daftar-materi-publik.tsx
 * ----------------------------------------------------------------------------
 * Indeks materi publik + dua dropdown penyaring (fakultas, program studi).
 *
 * Kenapa komponen klien: daftar materi kecil (belasan), jadi penyaringan di
 * browser jauh lebih cepat daripada memuat ulang dari server, dan halaman
 * /materi tetap dirender statis. Kondisi awal selalu "semua", sehingga seluruh
 * kartu tetap ada di HTML pertama — penting karena halaman ini diindeks mesin
 * pencari.
 *
 * Hierarki tampilan tetap seperti sebelumnya:
 *   Umum (semua fakultas) → Fakultas → (Lintas prodi) → Prodi
 * dan memakai `kelompokkanMateri` yang sama dengan tabel admin.
 */
import * as React from "react";

import { MateriCard } from "@/components/landing/materi-card";
import {
  kelompokkanMateri,
  type KelompokFakultas,
  type MateriPublik,
} from "@/lib/materi";

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

const SELECT_KELAS =
  "h-11 w-full rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60";

export function DaftarMateriPublik({ daftar }: { daftar: MateriPublik[] }) {
  const [fakultas, setFakultas] = React.useState<string>("semua");
  const [prodi, setProdi] = React.useState<string>("semua");

  // Pilihan diambil dari data yang benar-benar ada, bukan daftar fakultas
  // statis — supaya dropdown tidak menawarkan fakultas tanpa satu pun materi.
  const daftarFakultas = React.useMemo(() => {
    const nama = new Set<string>();
    for (const materi of daftar) {
      if (materi.fakultas) nama.add(materi.fakultas);
    }
    return [...nama].sort((a, b) => a.localeCompare(b, "id"));
  }, [daftar]);

  const adaUmum = React.useMemo(
    () => daftar.some((materi) => !materi.fakultas),
    [daftar],
  );

  const daftarProdi = React.useMemo(() => {
    if (!fakultas || fakultas === "semua" || fakultas === "umum") return [];
    const nama = new Set<string>();
    for (const materi of daftar) {
      if (materi.fakultas === fakultas && materi.prodi) nama.add(materi.prodi);
    }
    return [...nama].sort((a, b) => a.localeCompare(b, "id"));
  }, [daftar, fakultas]);

  // Saat fakultas belum dipilih, prodi tetap bisa dipilih langsung: daftar
  // memuat semua prodi yang ada, berlabel fakultasnya. Memilih salah satu
  // sekaligus mengisi dropdown fakultas, jadi dua kontrol tidak pernah
  // bertentangan. Tidak ada keadaan "tunggu pilih fakultas dulu".
  const semuaProdi = React.useMemo(() => {
    const peta = new Map<string, { prodi: string; fakultas: string }>();
    for (const materi of daftar) {
      if (!materi.prodi || !materi.fakultas) continue;
      if (!peta.has(materi.prodi)) {
        peta.set(materi.prodi, {
          prodi: materi.prodi,
          fakultas: materi.fakultas,
        });
      }
    }
    return [...peta.values()].sort((a, b) =>
      a.prodi.localeCompare(b.prodi, "id"),
    );
  }, [daftar]);

  const tersaring = React.useMemo(
    () =>
      daftar.filter((materi) => {
        if (fakultas === "umum") return !materi.fakultas;
        if (fakultas !== "semua" && materi.fakultas !== fakultas) return false;
        if (prodi === "lintas") return Boolean(materi.fakultas) && !materi.prodi;
        if (prodi !== "semua" && materi.prodi !== prodi) return false;
        return true;
      }),
    [daftar, fakultas, prodi],
  );

  const kelompok = React.useMemo(() => kelompokkanMateri(tersaring), [tersaring]);
  const menyaring = fakultas !== "semua" || prodi !== "semua";

  function ubahFakultas(nilai: string) {
    setFakultas(nilai);
    // Prodi dari fakultas lain tidak mungkin cocok lagi.
    setProdi("semua");
  }

  function ubahProdi(nilai: string) {
    setProdi(nilai);
    // Prodi menentukan fakultasnya: kalau fakultas belum dipilih, isi sekalian
    // supaya dua dropdown tidak pernah menunjuk ke kombinasi yang mustahil.
    if (nilai !== "semua" && nilai !== "lintas" && fakultas === "semua") {
      const fakultasProdi = daftar.find(
        (materi) => materi.prodi === nilai,
      )?.fakultas;
      if (fakultasProdi) setFakultas(fakultasProdi);
    }
  }

  function reset() {
    setFakultas("semua");
    setProdi("semua");
  }

  return (
    <>
      {/* Filter diletakkan di tengah dan langsung bisa dipakai: prodi tidak
          menunggu fakultas dipilih. */}
      <div className="mx-auto mt-10 w-full max-w-full rounded-2xl border border-border bg-card p-4 sm:w-fit">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center">
          <div className="grid w-full gap-1.5 sm:w-56">
            <label
              htmlFor="pilih-fakultas"
              className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Fakultas
            </label>
            <select
              id="pilih-fakultas"
              value={fakultas}
              onChange={(event) => ubahFakultas(event.target.value)}
              className={SELECT_KELAS}
            >
              <option value="semua">Semua fakultas</option>
              {adaUmum && (
                <option value="umum">Umum — berlaku semua fakultas</option>
              )}
              {daftarFakultas.map((nama) => (
                <option key={nama} value={nama}>
                  {nama} (
                  {daftar.filter((materi) => materi.fakultas === nama).length})
                </option>
              ))}
            </select>
          </div>

          <div className="grid w-full gap-1.5 sm:w-64">
            <label
              htmlFor="pilih-prodi"
              className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Program studi
            </label>
            <select
              id="pilih-prodi"
              value={prodi}
              onChange={(event) => ubahProdi(event.target.value)}
              disabled={fakultas === "umum"}
              className={SELECT_KELAS}
            >
              <option value="semua">Semua prodi</option>
              {fakultas === "semua" ? (
                <>
                  <option value="lintas">Lintas prodi — tingkat fakultas</option>
                  {semuaProdi.map((item) => (
                    <option key={item.prodi} value={item.prodi}>
                      {item.prodi} — {item.fakultas}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  {daftarProdi.length > 0 && (
                    <option value="lintas">Lintas prodi</option>
                  )}
                  {daftarProdi.map((nama) => (
                    <option key={nama} value={nama}>
                      {nama}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Jumlah materi sengaja tidak ditampilkan lagi di sini: angka yang
              sama sudah ada di judul tiap fakultas/prodi. Disisakan sebagai
              live region tak terlihat supaya pembaca layar tetap mendapat
              umpan balik saat filter berubah. */}
          <p className="sr-only" aria-live="polite">
            {menyaring
              ? `${tersaring.length} dari ${daftar.length} materi ditampilkan`
              : `${daftar.length} materi ditampilkan`}
          </p>
        </div>

        {menyaring && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={reset}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              Tampilkan semua materi
            </button>
          </div>
        )}
      </div>

      {tersaring.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm leading-6 text-muted-foreground">
          Belum ada materi untuk pilihan itu.{" "}
          <button
            type="button"
            onClick={reset}
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Tampilkan semua materi
          </button>
        </p>
      ) : (
        <div className="mt-12 flex flex-col gap-14">
          {kelompok.umum.length > 0 && <SeksiUmum daftar={kelompok.umum} />}

          {kelompok.fakultas.map((item) => (
            <section
              key={item.nama}
              aria-labelledby={`fakultas-${buatId(item.nama)}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground/80 pt-4">
                <h2
                  id={`fakultas-${buatId(item.nama)}`}
                  className="text-xl font-bold tracking-tight sm:text-2xl"
                >
                  {item.nama}
                </h2>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {jumlahFakultas(item)} materi
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-8">
                {item.lintasProdi.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Lintas prodi
                    </h3>
                    <div className="mt-3">
                      <DaftarKartu daftar={item.lintasProdi} />
                    </div>
                  </div>
                )}

                {item.prodi.map((grup) => (
                  <div key={grup.nama}>
                    <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold tracking-tight">
                      {grup.nama}
                      <span className="text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground">
                        {grup.materi.length} materi
                      </span>
                    </h3>
                    <div className="mt-3">
                      <DaftarKartu daftar={grup.materi} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
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
    <ul className="grid gap-4 sm:grid-cols-2 sm:[&>li:last-child:nth-child(odd)]:col-span-2">
      {daftar.map((materi) => (
        <li key={materi.slug} className="flex">
          <MateriCard materi={materi} />
        </li>
      ))}
    </ul>
  );
}
