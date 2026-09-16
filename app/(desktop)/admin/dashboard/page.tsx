/**
 * Karsa — app/(desktop)/admin/dashboard/page.tsx
 * ----------------------------------------------------------------------------
 * PLACEHOLDER Fase 1 — target redirect admin setelah login (PRD §7.1).
 * Tanpa halaman ini, `homePathForUser()` untuk admin akan berujung 404.
 *
 * Isi sesungguhnya (ringkasan master data + rekap) dibangun di Fase 5.
 * Guard: `requireAdmin()` → bukan admin diarahkan ke /dashboard, belum login
 * ke /login (dan `middleware.ts` sudah menyaring lebih dulu).
 */
import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/button";
import { requireAdmin } from "@/lib/auth-helpers";
import { HOME_DEFAULT } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Dashboard Admin",
};

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 py-12">
      <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Area Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Halo, {admin.name?.trim() || admin.email}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Dashboard admin masih placeholder (Fase 1). Kelola master
          semester/prodi/matkul/kelas dibangun bertahap, rekap &amp; export di
          Fase 5.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={HOME_DEFAULT}>Lihat /dashboard</Link>
          </Button>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Keluar
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
