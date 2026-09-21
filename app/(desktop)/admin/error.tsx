"use client";

import { useEffect } from "react";
import Link from "next/link";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/button";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Karsa admin route error", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <h1 className="text-2xl font-semibold tracking-tight">
          Terjadi kesalahan
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Kami tidak dapat memuat halaman admin ini. Coba lagi.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={reset}>
            Coba lagi
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Kembali ke dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
