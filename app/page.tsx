import Link from "next/link";

import { Button } from "@/components/button";

/**
 * Karsa — app/page.tsx
 * ----------------------------------------------------------------------------
 * Landing sementara Fase 0. Belum menyentuh database maupun auth.
 *
 * Fase berikutnya:
 *  · Fase 1.5 — middleware memindahkan PJ ke (mobile)/catat-poin dan
 *    mahasiswa/admin ke (desktop)/dashboard sebelum halaman ini tampil.
 *  · Fase 0.5 — copywriting di-cek ulang agar tidak ada sisa istilah lama.
 */
export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Ornamen latar: aura hangat dari warna aksen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative w-full max-w-xl text-center animate-slide-up">
        <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Universitas Tidar · Skripsi
        </span>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          Karsa
        </h1>
        <p className="mt-3 text-lg text-primary">Setiap karsa, satu poin.</p>

        <p className="mt-6 text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          Pencatatan poin keaktifan mahasiswa per mata kuliah per kelas.
          PJ mencatat dari HP, mahasiswa melihat rapor secara LIVE.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/login">Masuk dengan Google</Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Khusus mahasiswa UNTIDAR — login dengan email{" "}
          <span className="font-medium text-foreground">@students.untidar.ac.id</span>
        </p>
      </div>
    </main>
  );
}
