/**
 * Karsa — app/(desktop)/pengelola/rekap/page.tsx
 * ----------------------------------------------------------------------------
 * Rekap poin untuk pengelola. Opsi kelas sudah disaring ke lingkup aktor
 * di `getKelasOptionsForRekap()` dan export Excel diperiksa ulang per kelas
 * di route API-nya.
 */
import type { Metadata } from "next";

import { getKelasOptionsForRekap } from "@/actions/rekap";
import { RekapView } from "@/components/admin/rekap-view";
import { requirePengelola } from "@/lib/auth-helpers";

export const metadata: Metadata = {
  title: "Rekap — Pengelola",
};

export default async function PengelolaRekapPage() {
  await requirePengelola();

  const kelasOptions = await getKelasOptionsForRekap();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Rekap poin kelas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hanya kelas dalam lingkup penunjukanmu yang tampil. Unduh rekapnya
          dalam Excel bila diperlukan.
        </p>
      </header>

      <RekapView kelasOptions={kelasOptions} />
    </main>
  );
}
