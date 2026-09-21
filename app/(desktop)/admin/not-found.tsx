import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/button";

export default function AdminNotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Halaman admin tidak ditemukan
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Data atau halaman admin yang kamu cari tidak tersedia.
        </p>
        <Button asChild className="mt-6">
          <Link href="/admin/dashboard">Kembali ke dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
