/**
 * Karsa — components/rapor/rapor-view.tsx
 * ----------------------------------------------------------------------------
 * Tampilan rapor mahasiswa desktop (Fase 4A). Semua data diterima dari Server
 * Component; komponen ini hanya mengelola animasi dan state popup.
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { animate, motion, useMotionValue } from "framer-motion";
import { ChevronRight, Trophy } from "lucide-react";

import { Button } from "@/components/button";
import { PoinDetailPopup } from "@/components/rapor/poin-detail-popup";
import type { RaporMahasiswaData } from "@/lib/rapor";
import { formatNumber } from "@/lib/utils";

export function RaporView({
  data,
  mahasiswa,
}: {
  data: RaporMahasiswaData;
  mahasiswa: {
    name: string | null;
    nim: string | null;
  };
}) {
  const nilaiAnimasi = useMotionValue(0);
  const [totalTampil, setTotalTampil] = React.useState(0);
  const [selectedMatkulId, setSelectedMatkulId] = React.useState<
    string | null
  >(null);
  const [lastVisibleMatkulId, setLastVisibleMatkulId] = React.useState<
    string | null
  >(null);

  React.useEffect(() => {
    nilaiAnimasi.set(0);
    const stopObserve = nilaiAnimasi.on("change", (nilai) => {
      setTotalTampil(Math.round(nilai));
    });
    const controls = animate(nilaiAnimasi, data.totalPoin, {
      duration: 1.5,
      ease: "easeOut",
    });

    return () => {
      stopObserve();
      controls.stop();
    };
  }, [data.totalPoin, nilaiAnimasi]);

  React.useEffect(() => {
    if (selectedMatkulId) setLastVisibleMatkulId(selectedMatkulId);
  }, [selectedMatkulId]);

  const maxPoin = Math.max(
    0,
    ...data.matkuls.map((matkul) => matkul.totalPoin),
  );
  const selectedMatkul =
    data.matkuls.find((matkul) => matkul.id === selectedMatkulId) ?? null;
  const visibleMatkul =
    data.matkuls.find((matkul) => matkul.id === lastVisibleMatkulId) ?? null;
  const namaMahasiswa = mahasiswa.name?.trim() || "Mahasiswa";

  return (
    <>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10 sm:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Rapor keaktifan</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {namaMahasiswa}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mahasiswa.nim ? `NIM ${mahasiswa.nim} · ` : ""}
              {data.kelas.name} · {data.prodi.name} · {data.semester.name}
            </p>
          </div>

          <Button asChild variant="outline" className="w-fit">
            <Link href="/leaderboard">
              <Trophy aria-hidden />
              Leaderboard
            </Link>
          </Button>
        </header>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-muted-foreground">
            Total poin semester ini
          </p>
          <p className="mt-2 text-5xl font-semibold tracking-tight sm:text-6xl">
            {formatNumber(totalTampil)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            dari seluruh matkul di semester {data.semester.name}
          </p>
        </section>

        <section aria-labelledby="rapor-matkul-heading">
          <div className="flex items-baseline justify-between gap-4">
            <h2
              id="rapor-matkul-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Mata kuliah
            </h2>
            <span className="text-sm text-muted-foreground">
              {data.matkuls.length} matkul
            </span>
          </div>

          {data.matkuls.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              Belum ada mata kuliah yang ditugaskan untuk kelas ini.
            </div>
          ) : (
            <ul className="mt-4 grid gap-3">
              {data.matkuls.map((matkul) => {
                const progress =
                  maxPoin > 0
                    ? Math.min(100, (matkul.totalPoin / maxPoin) * 100)
                    : 0;
                const namaPj = matkul.pj.name?.trim() || "Belum ditentukan";

                return (
                  <li key={matkul.id}>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSelectedMatkulId(matkul.id)}
                      className="w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Buka detail poin ${matkul.matkul.name}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {matkul.matkul.name}
                          </p>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {matkul.matkul.code
                              ? `${matkul.matkul.code} · `
                              : ""}
                            PJ: {namaPj}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-lg font-semibold">
                            {formatNumber(matkul.totalPoin)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            poin
                          </span>
                          <ChevronRight
                            aria-hidden
                            className="size-5 text-muted-foreground"
                          />
                        </div>
                      </div>

                      <div
                        className="mt-4 h-2 overflow-hidden rounded-full bg-secondary"
                        aria-label={`${formatNumber(matkul.totalPoin)} poin`}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={Math.max(1, maxPoin)}
                        aria-valuenow={matkul.totalPoin}
                      >
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </motion.button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <PoinDetailPopup
        open={selectedMatkul !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMatkulId(null);
        }}
        kelasMatkulId={visibleMatkul?.id ?? ""}
        matkulName={visibleMatkul?.matkul.name ?? ""}
        totalPoin={visibleMatkul?.totalPoin ?? 0}
        riwayat={visibleMatkul?.riwayat ?? []}
      />
    </>
  );
}
