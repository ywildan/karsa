"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Karsa route error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-2xl items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
        <h1 className="text-2xl font-semibold tracking-tight">
          Terjadi kesalahan
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Kami tidak dapat memuat halaman ini. Coba lagi.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={reset}>
            Coba lagi
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
