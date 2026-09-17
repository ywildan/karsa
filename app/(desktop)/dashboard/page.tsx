/**
 * Karsa — app/(desktop)/dashboard/page.tsx
 * ----------------------------------------------------------------------------
 * Rapor mahasiswa desktop (Fase 4A). Shell header/logout tetap disediakan
 * layout `(desktop)`; halaman ini hanya menangani data rapor dan empty state.
 */
import type { Metadata } from "next";

import { signOutAction } from "@/actions/auth";
import { getRaporMahasiswa } from "@/actions/rapor";
import { Button } from "@/components/button";
import { RaporView } from "@/components/rapor/rapor-view";
import { requireUser } from "@/lib/auth-helpers";

export const metadata: Metadata = {
  title: "Rapor saya",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const rapor = await getRaporMahasiswa();

  if (rapor.empty) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl items-center px-6 py-12">
        <section className="w-full rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Belum terdaftar di kelas
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Kamu belum terdaftar di kelas manapun. Hubungi admin.
          </p>
          <form action={signOutAction} className="mt-6">
            <Button type="submit" variant="outline">
              Keluar
            </Button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <RaporView
      data={rapor.data}
      mahasiswa={{
        name: user.name ?? null,
        nim: user.nim ?? null,
      }}
    />
  );
}
