/**
 * Karsa — app/(mobile)/aktivitas/page.tsx
 * ----------------------------------------------------------------------------
 * Hub aktivitas PJ (channel mobile web): ringkasan 7 hari, pintasan input &
 * absensi, riwayat terbaru, serta laporan dan peringkat.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  FileBarChart,
  History,
  NotebookPen,
  Trophy,
} from "lucide-react";

import { Button } from "@/components/button";
import { getKelasMatkulOptionsForLeaderboard, getLeaderboard } from "@/actions/leaderboard";
import { getPoinLogsByPj } from "@/actions/poin";
import { getRaporMahasiswa } from "@/actions/rapor";
import { requireUser } from "@/lib/auth-helpers";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Aktivitas PJ",
};

interface MatkulRank {
  label: string;
  rank: number;
  totalPoin: number;
  peers: number;
}

export default async function AktivitasPjPage() {
  const user = await requireUser();
  const [history, rapor, options] = await Promise.all([
    getPoinLogsByPj(),
    getRaporMahasiswa(),
    getKelasMatkulOptionsForLeaderboard(),
  ]);

  const now = Date.now();
  const week = history.filter(
    (entry) => now - entry.created_at.getTime() < 7 * 86_400_000,
  );
  const studentKeys = new Set(
    week.map(
      (entry) =>
        entry.mahasiswa.nim ??
        entry.mahasiswa.name ??
        `${entry.id}`,
    ),
  );

  const rankResults = await Promise.all(
    options.map(async (option): Promise<MatkulRank | null> => {
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
  const ranks = rankResults.filter((row): row is MatkulRank => row !== null);
  const bestRank = ranks.reduce<MatkulRank | null>(
    (best, row) => (!best || row.rank < best.rank ? row : best),
    null,
  );

  const totalPoin =
    rapor.ok && !rapor.empty ? rapor.data.totalPoin : 0;
  const namaPanggilan = user.name?.trim().split(/\s+/)[0] ?? "PJ";

  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          Aktivitas
        </p>
        <h1 className="text-xl font-semibold tracking-tight">Ruang PJ</h1>
        <p className="text-sm text-muted-foreground">
          Halo {namaPanggilan}. Pantau poin yang kamu catat untuk kelas.
        </p>
      </header>

      <section className="relative overflow-hidden rounded-[26px] bg-espresso p-5 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/30 blur-3xl"
        />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            7 hari terakhir
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div>
              <p className="text-3xl font-extrabold leading-none tabular-nums">
                {week.length}
              </p>
              <p className="mt-1 text-[11px] text-white/55">Entri</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold leading-none tabular-nums">
                {studentKeys.size}
              </p>
              <p className="mt-1 text-[11px] text-white/55">Mahasiswa</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold leading-none tabular-nums">
                {week.reduce((sum, entry) => sum + entry.poin, 0)}
              </p>
              <p className="mt-1 text-[11px] text-white/55">Total poin</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <Button asChild className="w-full">
              <Link href="/catat-poin">
                <NotebookPen aria-hidden />
                Input poin mahasiswa
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/absensi">
                <CheckCircle2 aria-hidden />
                Catat absensi kelas
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Link
        href="/riwayat-poin"
        className="rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <History className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold tracking-tight">Riwayat Poin</p>
            <p className="text-xs text-muted-foreground">
              {history.length} entri tercatat
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>

        <div className="mt-3 grid gap-1.5">
          {history.slice(0, 2).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card text-xs font-bold text-primary">
                +{entry.poin}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">
                {entry.mahasiswa.name?.trim() ||
                  entry.mahasiswa.nim ||
                  "Mahasiswa"}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatRelativeTime(entry.created_at)}
              </span>
            </div>
          ))}
          {history.length === 0 ? (
            <p className="rounded-xl bg-secondary px-3 py-4 text-center text-xs text-muted-foreground">
              Belum ada entri. Mulai catat kontribusi pertama.
            </p>
          ) : null}
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/aktivitas/laporan"
          className="relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-2xl bg-primary p-4 text-primary-foreground shadow-soft transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <FileBarChart className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-3xl font-extrabold leading-none tabular-nums">
              {totalPoin}
            </p>
            <p className="mt-1 text-sm font-semibold">Laporan Saya</p>
          </div>
        </Link>

        <Link
          href="/aktivitas/peringkat"
          className="flex min-h-[148px] flex-col justify-between rounded-2xl bg-accent p-4 text-accent-foreground shadow-soft transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/70">
            <Trophy className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-3xl font-extrabold leading-none tabular-nums">
              {bestRank ? `#${bestRank.rank}` : "—"}
            </p>
            <p className="mt-1 text-sm font-semibold">Peringkat Kelas</p>
            {bestRank ? (
              <p className="mt-0.5 truncate text-[11px] opacity-70">
                {bestRank.label}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] opacity-70">
                Belum ada peringkat
              </p>
            )}
          </div>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Riwayat lengkap dan detail peringkat ada di halaman masing-masing.
      </p>
    </main>
  );
}
