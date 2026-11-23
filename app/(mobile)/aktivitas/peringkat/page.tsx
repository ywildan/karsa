/**
 * Karsa — app/(mobile)/aktivitas/peringkat/page.tsx
 * ----------------------------------------------------------------------------
 * Ringkasan peringkat PJ per mata kuliah pada semester aktif. Baris dihitung
 * dari leaderboard kelas yang sama, dengan nama mahasiswa lain tetap disamarkan.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Trophy } from "lucide-react";

import {
  getKelasMatkulOptionsForLeaderboard,
  getLeaderboard,
} from "@/actions/leaderboard";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Peringkat Kelas",
};

interface RankRow {
  label: string;
  rank: number;
  totalPoin: number;
  peers: number;
}

export default async function AktivitasPeringkatPage() {
  const options = await getKelasMatkulOptionsForLeaderboard();
  const results = await Promise.all(
    options.map(async (option) => {
      const result = await getLeaderboard(option.id);
      if (!result.ok) return null;
      const me = result.data.find((row) => row.isCurrentUser);
      return me
        ? {
            label: option.label,
            rank: me.rank,
            totalPoin: me.totalPoin,
            peers: result.data.length,
          }
        : null;
    }),
  );
  const ranks = results
    .filter((row): row is RankRow => row !== null)
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label, "id"));

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
        <h1 className="text-xl font-semibold tracking-tight">Peringkat Kelas</h1>
        <p className="text-sm text-muted-foreground">
          Posisi poinmu di kelas pada tiap mata kuliah semester aktif.
        </p>
      </header>

      {ranks.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
          <Trophy className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">Belum ada peringkat</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Peringkat muncul setelah ada poin yang tercatat pada mata kuliah
            kelasmu.
          </p>
        </section>
      ) : (
        <ul className="grid gap-2.5">
          {ranks.map((row) => (
            <li
              key={row.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Trophy className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{row.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatNumber(row.totalPoin)} poin · dari {row.peers} mahasiswa
                </p>
              </div>
              <p className="shrink-0 text-2xl font-extrabold tabular-nums">
                #{row.rank}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Nama mahasiswa lain disamarkan. Peringkat memakai dense rank: poin sama
        mendapat peringkat sama.
      </p>
    </main>
  );
}
