/**
 * Karsa — app/(desktop)/admin/kelas/[id]/page.tsx
 * ----------------------------------------------------------------------------
 * Detail kelas (placeholder Sub-Fase 2C, PRD §7.1 langkah 3).
 * Server component: `requireAdmin()` + `findUnique`; `notFound()` bila hilang.
 * `params` di-await (Next.js 15 — params sekarang berupa Promise).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/button";

export const metadata: Metadata = {
  title: "Detail Kelas",
};

export default async function AdminKelasDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const kelas = await prisma.kelas.findUnique({
    where: { id },
    include: { prodi: true, semester: true },
  });

  if (!kelas) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header className="flex flex-col gap-3">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/admin/kelas">
            <ChevronLeft aria-hidden />
            Kembali
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{kelas.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prodi {kelas.prodi.name} · Semester {kelas.semester.name}
          </p>
        </div>
      </header>

      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
        Detail kelas menyusul di Sub-Fase 2C.
      </div>
    </main>
  );
}
