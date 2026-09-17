/**
 * Karsa — app/(mobile)/catat-poin/[kelas_matkul_id]/_components/mahasiswa-list.tsx
 * ----------------------------------------------------------------------------
 * List mahasiswa (Fase 3A). Client component karena menyimpan state "siapa yang
 * sheet-nya sedang terbuka"; data & otorisasi tetap dari server component induk.
 *
 * Baris milik PJ sendiri tetap ditampilkan tapi tombolnya DINONAKTIFKAN —
 * aturannya terlihat oleh user (PRD §13.2: PJ tidak menilai diri sendiri),
 * sementara `createPoinLog()` tetap menolaknya di server kalau dipaksa lewat
 * devtools.
 */
"use client";

import * as React from "react";

import { Button } from "@/components/button";
import { mahasiswaLabel, type KategoriItem, type MahasiswaItem } from "@/lib/poin";
import { getInitials } from "@/lib/utils";

import { PoinFormSheet } from "./poin-form-sheet";

export function MahasiswaList({
  kelasMatkulId,
  mahasiswa,
  kategori,
}: {
  kelasMatkulId: string;
  mahasiswa: MahasiswaItem[];
  kategori: KategoriItem[];
}) {
  const [terpilih, setTerpilih] = React.useState<MahasiswaItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  function bukaSheet(row: MahasiswaItem) {
    setTerpilih(row);
    setSheetOpen(true);
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {mahasiswa.length} mahasiswa · tap{" "}
        <span className="font-medium">+ Poin</span> untuk mencatat.
      </p>

      <ul className="grid gap-2.5">
        {mahasiswa.map((row) => (
          <li
            key={row.id}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft"
          >
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
            >
              {getInitials(row.name)}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{mahasiswaLabel(row)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.nim ?? "NIM belum ada"}
                {row.isDiriSendiri ? " · ini kamu" : ""}
              </p>
            </div>

            {row.isDiriSendiri ? (
              <Button type="button" variant="outline" size="sm" disabled>
                + Poin
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => bukaSheet(row)}
                aria-label={`Catat poin untuk ${mahasiswaLabel(row)}`}
              >
                + Poin
              </Button>
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Poin 1–4 per pencatatan. PJ tidak bisa memberi poin untuk dirinya
        sendiri.
      </p>

      <PoinFormSheet
        kelasMatkulId={kelasMatkulId}
        mahasiswa={terpilih}
        kategori={kategori}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
