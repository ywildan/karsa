"use client";

/**
 * SiKarsa — app/(public)/materi/_components/daftar-materi-publik.tsx
 * ----------------------------------------------------------------------------
 * Indeks materi publik + dua dropdown penyaring (fakultas, program studi),
 * dengan dua tab: "Materi" dan "Artikel".
 *
 * Tab "Materi" tetap seperti sebelumnya (Umum → Fakultas → Lintas prodi →
 * Prodi, kartu penuh). Tab "Artikel" hanya menampilkan JUDUL artikel Karsa Lib:
 * isinya sengaja tidak dipublikasikan di web — klik judul memunculkan dialog
 * yang menjelaskan bahwa artikel hanya dibaca di Karsa mobile, tempat daftar
 * artikel otomatis disaring sesuai fakultas & prodi tiap mahasiswa.
 *
 * Kenapa komponen klien: daftar kecil (belasan materi, ratusan judul), jadi
 * penyaringan dan perpindahan tab di browser lebih cepat daripada memuat ulang
 * dari server. Kedua panel selalu ada di HTML pertama (panel non-aktif hanya
 * `hidden`), sehingga mesin pencari tetap melihat seluruh isi.
 */
import * as React from "react";

import { Button } from "@/components/button";
import { MateriCard } from "@/components/landing/materi-card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  kelompokkanArtikel,
  type ArtikelJudul,
  type KelompokArtikel,
} from "@/lib/artikel-query";
import {
  kelompokkanMateri,
  type KelompokFakultas,
  type MateriPublik,
} from "@/lib/materi";

/** Kanal unduh yang sama dengan footer publik. */
const KANAL_UNDUH = "https://github.com/ywildan/karsa/releases/latest";

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

type Tab = "materi" | "artikel";

export function DaftarMateriPublik({
  daftar,
  artikel,
}: {
  daftar: MateriPublik[];
  artikel: ArtikelJudul[];
}) {
  const [tab, setTab] = React.useState<Tab>("materi");
  const [fakultas, setFakultas] = React.useState<string>("semua");
  const [prodi, setProdi] = React.useState<string>("semua");
  const [artikelDibuka, setArtikelDibuka] = React.useState<ArtikelJudul | null>(
    null,
  );

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

  /* Artikel tidak punya lingkup fakultas maupun "umum": setiap artikel selalu
     milik satu prodi. Karena itu pilihan "Umum" dan "Lintas prodi" tidak
     menghasilkan apa pun — ditangani sebagai keterangan, bukan daftar kosong
     tanpa penjelasan. */
  const artikelTersaring = React.useMemo(
    () =>
      artikel.filter((item) => {
        if (fakultas === "umum") return false;
        if (fakultas !== "semua" && item.fakultas !== fakultas) return false;
        if (prodi === "lintas") return false;
        if (prodi !== "semua" && item.prodi !== prodi) return false;
        return true;
      }),
    [artikel, fakultas, prodi],
  );

  const artikelKelompok = React.useMemo(
    () => kelompokkanArtikel(artikelTersaring),
    [artikelTersaring],
  );

  const menyaring = fakultas !== "semua" || prodi !== "semua";
  const lingkupTidakRelevan =
    tab === "artikel" && (fakultas === "umum" || prodi === "lintas");

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

  const labelHitung =
    tab === "materi"
      ? `${tersaring.length} dari ${daftar.length} materi ditampilkan`
      : `${artikelTersaring.length} dari ${artikel.length} artikel ditampilkan`;

  return (
    <>
      {/* Dua tab: kisi-kisi resmi dan artikel mahasiswa. */}
      <div className="mt-10 flex justify-center">
        <div
          role="tablist"
          aria-label="Jenis konten"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 p-1 backdrop-blur-xl"
        >
          <TabTombol
            aktif={tab === "materi"}
            label="Materi"
            jumlah={daftar.length}
            kontrol="panel-materi"
            onClick={() => setTab("materi")}
          />
          <TabTombol
            aktif={tab === "artikel"}
            label="Artikel"
            jumlah={artikel.length}
            kontrol="panel-artikel"
            onClick={() => setTab("artikel")}
          />
        </div>
      </div>

      {/* Filter diletakkan di tengah dan langsung bisa dipakai: prodi tidak
          menunggu fakultas dipilih. */}
      {/* Kaca: pendar hangat tipis di belakang supaya efek blur punya sesuatu
          untuk diolah, lalu panel semi-transparan dengan backdrop blur. */}
      <div className="relative mx-auto mt-4 w-full max-w-full sm:w-fit">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 -top-3 -bottom-3 rounded-[28px] bg-primary/20 blur-2xl"
        />
        <div className="relative rounded-2xl border border-border bg-card/60 p-4 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150">
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
                    {/* Lintas prodi hanya ada di materi, bukan artikel. */}
                    {tab === "materi" && (
                      <option value="lintas">
                        Lintas prodi — tingkat fakultas
                      </option>
                    )}
                    {semuaProdi.map((item) => (
                      <option key={item.prodi} value={item.prodi}>
                        {item.prodi} — {item.fakultas}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    {tab === "materi" && daftarProdi.length > 0 && (
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

            {/* Jumlah sengaja tidak ditampilkan lagi di sini: angka yang sama
                sudah ada di judul tiap fakultas/prodi. Disisakan sebagai live
                region tak terlihat supaya pembaca layar tetap mendapat umpan
                balik saat filter berubah. */}
            <p className="sr-only" aria-live="polite">
              {menyaring ? labelHitung : null}
            </p>
          </div>

          {menyaring && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={reset}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Tampilkan semua {tab === "materi" ? "materi" : "artikel"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Panel materi ---------------- */}
      <div
        id="panel-materi"
        role="tabpanel"
        aria-labelledby="tab-materi"
        hidden={tab !== "materi"}
      >
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
      </div>

      {/* ---------------- Panel artikel ---------------- */}
      <div
        id="panel-artikel"
        role="tabpanel"
        aria-labelledby="tab-artikel"
        hidden={tab !== "artikel"}
      >
        {artikel.length > 0 && (
          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            Judul bisa dilihat di sini; isi artikel dibaca di aplikasi Karsa
            mobile.
          </p>
        )}

        {artikel.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm leading-6 text-muted-foreground">
            Belum ada artikel yang terbit. Artikel ditulis mahasiswa lewat Karsa
            Lib dan muncul di sini setelah diterbitkan.
          </p>
        ) : lingkupTidakRelevan ? (
          <p className="mt-6 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm leading-6 text-muted-foreground">
            Artikel selalu terikat pada satu program studi, jadi tidak ada
            artikel untuk lingkup{" "}
            {fakultas === "umum" ? "Umum" : "Lintas prodi"}. Pilih fakultas dan
            prodi tertentu, atau{" "}
            <button
              type="button"
              onClick={reset}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              tampilkan semua artikel
            </button>
            .
          </p>
        ) : artikelTersaring.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-sm leading-6 text-muted-foreground">
            Belum ada artikel untuk pilihan itu.{" "}
            <button
              type="button"
              onClick={reset}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Tampilkan semua artikel
            </button>
          </p>
        ) : (
          <div className="mt-10 flex flex-col gap-10">
            {artikelKelompok.map((item) => (
              <SeksiArtikel
                key={item.nama}
                kelompok={item}
                onBuka={setArtikelDibuka}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={artikelDibuka !== null}
        onOpenChange={(buka) => {
          if (!buka) setArtikelDibuka(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pr-6">
              Baca artikelnya di Karsa mobile
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              {artikelDibuka?.judul}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              Halaman artikel hanya bisa dibuka di aplikasi{" "}
              <strong className="font-semibold text-foreground">
                Karsa mobile (SiKarsa)
              </strong>
              . Di web, yang tersedia hanya judulnya.
            </p>
            <p>
              Di aplikasi, setiap mahasiswa hanya melihat artikel sesuai{" "}
              <strong className="font-semibold text-foreground">
                fakultas dan program studi
              </strong>{" "}
              masing-masing, jadi yang tampil selalu relevan dengan prodimu.
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Tutup</Button>
            </DialogClose>
            <Button asChild>
              <a href={KANAL_UNDUH} target="_blank" rel="noreferrer">
                Unduh Karsa mobile
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabTombol({
  aktif,
  label,
  jumlah,
  kontrol,
  onClick,
}: {
  aktif: boolean;
  label: string;
  jumlah: number;
  kontrol: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${label.toLowerCase()}`}
      aria-selected={aktif}
      aria-controls={kontrol}
      onClick={onClick}
      className={
        aktif
          ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          : "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      }
    >
      {label}
      <span className="text-xs font-normal tabular-nums opacity-70">
        {jumlah}
      </span>
    </button>
  );
}

function SeksiArtikel({
  kelompok,
  onBuka,
}: {
  kelompok: KelompokArtikel;
  onBuka: (artikel: ArtikelJudul) => void;
}) {
  return (
    <section aria-labelledby={`artikel-${buatId(kelompok.nama)}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground/80 pt-4">
        <h2
          id={`artikel-${buatId(kelompok.nama)}`}
          className="text-xl font-bold tracking-tight sm:text-2xl"
        >
          {kelompok.nama}
        </h2>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {kelompok.jumlah} artikel
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-7">
        {kelompok.prodi.map((grup) => (
          <div key={grup.nama}>
            <h3 className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold tracking-tight">
              {grup.nama}
              <span className="text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground">
                {grup.artikel.length} artikel
              </span>
            </h3>

            <ul className="mt-2 divide-y divide-border border-y border-border">
              {grup.artikel.map((artikel) => (
                <li key={artikel.id}>
                  <button
                    type="button"
                    onClick={() => onBuka(artikel)}
                    className="group flex w-full items-start justify-between gap-4 py-3 text-left text-sm font-medium leading-6 transition-colors hover:text-primary"
                  >
                    <span>{artikel.judul}</span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    >
                      ›
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
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
