/**
 * Karsa — app/(desktop)/leaderboard/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman leaderboard desktop. Data awal filter dan metadata diambil di
 * server; tabel ranking berikutnya dimuat oleh LeaderboardView.
 */
import type { Metadata } from "next";
import Link from "next/link";

import {
  getKelasMatkulOptionsForLeaderboard,
  getLeaderboardMeta,
} from "@/actions/leaderboard";
import { Button } from "@/components/button";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";
import { requireUser } from "@/lib/auth-helpers";

export const metadata: Metadata = {
  title: "Leaderboard",
};

export default async function LeaderboardPage() {
  const user = await requireUser();

  if (!user.kelas_id) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl items-center px-6 py-12">
        <section className="w-full rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Belum terdaftar di kelas
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Kamu belum terdaftar di kelas manapun. Hubungi admin.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </section>
      </main>
    );
  }

  const [options, meta] = await Promise.all([
    getKelasMatkulOptionsForLeaderboard(),
    getLeaderboardMeta(),
  ]);

  if (!meta) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl items-center px-6 py-12">
        <section className="w-full rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Leaderboard belum tersedia
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Kelas kamu tidak terdaftar pada semester aktif saat ini.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </section>
      </main>
    );
  }

  return <LeaderboardView options={options} meta={meta} />;
}
