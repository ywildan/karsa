/**
 * Karsa — app/(mobile)/catat-poin/[kelas_matkul_id]/_components/mahasiswa-list.tsx
 * ----------------------------------------------------------------------------
 * List mahasiswa (Fase 3A). Client component karena menyimpan state "siapa yang
 * sheet-nya sedang terbuka"; data & otorisasi tetap dari server component induk.
 *
 * Kotak cari memfilter baris LOKAL (nama/NIM, substring, case-insensitive) —
 * satu kelas hanya berisi puluhan mahasiswa, jadi tidak perlu query server
 * ulang tiap ketikan.
 *
 * Baris milik PJ sendiri tetap ditampilkan tapi tombolnya DINONAKTIFKAN —
 * aturannya terlihat oleh user (PRD §13.2: PJ tidak menilai diri sendiri),
 * sementara `createPoinLog()` tetap menolaknya di server kalau dipaksa lewat
 * devtools.
 */
"use client";

import * as React from "react";

import { Button } from "@/components/button";
import { Input } from "@/components/ui/input";
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
  const [cari, setCari] = React.useState("");

  const hasilCari = React.useMemo(() => {
    const kunci = cari.trim().toLowerCase();
    if (!kunci) return mahasiswa;
    return mahasiswa.filter((row) => {
      const nama = row.name?.toLowerCase() ?? "";
      const nim = row.nim?.toLowerCase() ?? "";
      return nama.includes(kunci) || nim.includes(kunci);
    });
  }, [mahasiswa, cari]);

  function bukaSheet(row: MahasiswaItem) {
    setTerpilih(row);
    setSheetOpen(true);
  }

  const sedangMencari = cari.trim().length > 0;

  return (
    <>
      <div className="grid gap-1.5">
        <label htmlFor="cari-mahasiswa" className="text-sm font-medium">
          Cari mahasiswa
        </label>
        <Input
          id="cari-mahasiswa"
          type="search"
          value={cari}
          onChange={(event) => setCari(event.target.value)}
          placeholder="Nama atau NIM"
          maxLength={100}
          className="h-11"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {sedangMencari ? (
          `${hasilCari.length} dari ${mahasiswa.length} mahasiswa cocok.`
        ) : (
          <>
            {mahasiswa.length} mahasiswa · tap{" "}
            <span className="font-medium">+ Poin</span> untuk mencatat.
          </>
        )}
      </p>

      {hasilCari.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
          Tidak ada mahasiswa yang cocok dengan{" "}
          <span className="font-medium text-foreground">{cari.trim()}</span>.
        </div>
      ) : (
        <ul className="grid gap-2.5">
          {hasilCari.map((row) => (
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
      )}

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
