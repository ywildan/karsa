import Link from "next/link";

import { Button } from "@/components/button";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Halaman tidak ditemukan
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Alamat yang kamu buka tidak tersedia atau sudah dipindahkan.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
