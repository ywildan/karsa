/**
 * Karsa — components/leaderboard/leaderboard-view.tsx
 * ----------------------------------------------------------------------------
 * Tampilan leaderboard desktop. Metadata dan pilihan matkul datang dari
 * Server Component; ranking diambil ulang lewat Server Action saat filter
 * berubah agar guard otorisasi tetap selalu dijalankan di server.
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";

import {
  getLeaderboard,
  type LeaderboardMeta,
  type LeaderboardOption,
} from "@/actions/leaderboard";
import { Button } from "@/components/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeaderboardRow } from "@/lib/leaderboard";
import { cn, formatNumber } from "@/lib/utils";

export function LeaderboardView({
  options,
  meta,
}: {
  options: LeaderboardOption[];
  meta: LeaderboardMeta;
}) {
  const [selectedKelasMatkulId, setSelectedKelasMatkulId] = React.useState<
    string | null
  >(options[0]?.id ?? null);
  const [rows, setRows] = React.useState<LeaderboardRow[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(Boolean(options[0]?.id));
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!selectedKelasMatkulId) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    let dibatalkan = false;
    setLoading(true);
    setError(null);

    void getLeaderboard(selectedKelasMatkulId)
      .then((result) => {
        if (dibatalkan) return;

        if (!result.ok) {
          setRows([]);
          setError(result.error);
          return;
        }

        setRows(result.data);
      })
      .catch(() => {
        if (!dibatalkan) {
          setRows([]);
          setError("Leaderboard tidak dapat dimuat. Coba lagi.");
        }
      })
      .finally(() => {
        if (!dibatalkan) setLoading(false);
      });

    return () => {
      dibatalkan = true;
    };
  }, [reloadKey, selectedKelasMatkulId]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 sm:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Leaderboard kelas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Peringkat keaktifan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta.kelasName} · {meta.prodiName} · {meta.semesterName}
          </p>
        </div>

        <Button asChild variant="outline" className="w-fit">
          <Link href="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </header>

      {options.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            Belum ada mata kuliah
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Belum ada mata kuliah yang ditugaskan untuk kelas ini pada semester
            aktif.
          </p>
        </section>
      ) : (
        <>
          <section aria-labelledby="filter-matkul-heading">
            <h2
              id="filter-matkul-heading"
              className="text-sm font-medium text-muted-foreground"
            >
              Mata kuliah
            </h2>
            <div
              role="radiogroup"
              aria-labelledby="filter-matkul-heading"
              className="mt-3 -mx-6 flex gap-2 overflow-x-auto px-6 pb-2 sm:-mx-8 sm:px-8"
            >
              {options.map((option) => {
                const selected = option.id === selectedKelasMatkulId;

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedKelasMatkulId(option.id)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="ranking-heading">
            <div className="flex items-baseline justify-between gap-4">
              <h2
                id="ranking-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Ranking
              </h2>
              {!loading && !error && rows.length > 0 ? (
                <span className="text-sm text-muted-foreground">
                  {rows.length} mahasiswa berpoin
                </span>
              ) : null}
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {loading ? (
                <LeaderboardSkeleton />
              ) : error ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setReloadKey((current) => current + 1)}
                  >
                    Coba lagi
                  </Button>
                </div>
              ) : rows.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Belum ada poin untuk matkul ini.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead className="whitespace-nowrap">NIM</TableHead>
                      <TableHead className="whitespace-nowrap text-right">
                        Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.userId}
                        className={cn(
                          row.isCurrentUser &&
                            "bg-accent font-semibold hover:bg-accent",
                        )}
                      >
                        <TableCell>
                          {row.rank === 1 ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                            >
                              <Trophy
                                aria-hidden
                                className="size-3.5 text-amber-500"
                              />
                              <span className="sr-only">Peringkat </span>
                              1
                            </Badge>
                          ) : (
                            row.rank
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {row.nama}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {row.nim ?? "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(row.totalPoin)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="h-10 rounded-md bg-muted" />
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="mt-3 grid grid-cols-[4rem_1fr_7rem_6rem] gap-3"
        >
          <div className="h-5 rounded bg-muted" />
          <div className="h-5 rounded bg-muted" />
          <div className="h-5 rounded bg-muted" />
          <div className="h-5 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
