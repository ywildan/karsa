/**
 * Karsa — app/(mobile)/riwayat-poin/page.tsx
 * ----------------------------------------------------------------------------
 * Riwayat input milik PJ yang sedang login (Fase 3B). Data dan otorisasi
 * dimuat di server; interaksi filter/hapus tinggal di client component.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { getMatkulsWithPoinAsPj, getPoinLogsByPj } from "@/actions/poin";
import { Button } from "@/components/button";
import { requireUser } from "@/lib/auth-helpers";

import { RiwayatList } from "./_components/riwayat-list";

export const metadata: Metadata = {
  title: "Riwayat poin",
};

export default async function RiwayatPoinPage() {
  await requireUser();

  const [poinLogs, matkuls] = await Promise.all([
    getPoinLogsByPj(),
    getMatkulsWithPoinAsPj(),
  ]);

  return (
    <main className="flex flex-col gap-5 px-4 py-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Riwayat poin</h1>
        <p className="text-sm text-muted-foreground">
          Poin yang pernah kamu catat sebagai PJ.
        </p>
      </header>

      {poinLogs.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada poin yang kamu catat. Mulai dari tab Input.
          </p>
          <Button asChild className="mt-4">
            <Link href="/catat-poin">Ke tab Input</Link>
          </Button>
        </section>
      ) : (
        <RiwayatList poinLogs={poinLogs} matkuls={matkuls} />
      )}
    </main>
  );
}
