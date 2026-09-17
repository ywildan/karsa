/**
 * Karsa — app/(desktop)/admin/dashboard/page.tsx
 * ----------------------------------------------------------------------------
 * Dashboard admin (diisi mulai Sub-Fase 2A; sebelumnya placeholder Fase 1).
 * Menampilkan ringkasan jumlah master data + navigasi cepat ke halaman CRUD
 * (PRD §7.1 langkah 1–2).
 *
 * Server component: otorisasi `requireAdmin()` + semua query count di server.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Layers,
  Users,
  type LucideIcon,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

import { AdminNav } from "@/components/admin-nav";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard Admin",
};

type StatCard = {
  label: string;
  description: string;
  value: number;
  icon: LucideIcon;
  /** `null` → halaman CRUD-nya belum dibangun (lihat catatan tiap kartu). */
  href: string | null;
};

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  // Empat hitungan independen dijalankan paralel (PRD §16: hindari query
  // berantai). Semua pakai `prisma.count()` sesuai scope Sub-Fase 2A.
  const [prodiCount, kelasCount, matkulCount, mahasiswaCount] =
    await Promise.all([
      prisma.prodi.count(),
      prisma.kelas.count(),
      prisma.matkul.count(),
      // DEFINISI "Mahasiswa" (keputusan Sub-Fase 2A, A1):
      // user dengan `is_admin = false`. Termasuk PJ (mis. Budi) karena PJ
      // juga mahasiswa, dan termasuk user yang belum punya kelas.
      // Jangan ubah definisi ini tanpa menyelaraskan laporan/PRD.
      prisma.user.count({ where: { is_admin: false } }),
    ]);

  const cards: StatCard[] = [
    {
      label: "Prodi",
      description: "Program studi terdaftar",
      value: prodiCount,
      icon: GraduationCap,
      href: "/admin/prodi",
    },
    {
      label: "Kelas",
      description: "Rombel semua semester",
      value: kelasCount,
      icon: Layers,
      href: "/admin/kelas",
    },
    {
      label: "Matkul",
      description: "Mata kuliah master",
      value: matkulCount,
      icon: BookOpen,
      href: "/admin/matkul",
    },
    {
      label: "Mahasiswa",
      description: "Semua user non-admin",
      value: mahasiswaCount,
      icon: Users,
      // Pengelolaan mahasiswa per kelas dibangun mulai Sub-Fase 2C.
      href: null,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {admin.name?.trim() || admin.email}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ringkasan master data Karsa. Pilih kategori untuk mengelola.
        </p>
      </header>

      <section
        aria-label="Statistik master data"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((card) =>
          card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-lg border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/40"
            >
              <StatCardBody card={card} />
            </Link>
          ) : (
            <div
              key={card.label}
              className="rounded-lg border border-border bg-card p-5 shadow-soft"
            >
              <StatCardBody card={card} />
            </div>
          ),
        )}
      </section>
    </main>
  );
}

function StatCardBody({ card }: { card: StatCard }) {
  const Icon = card.icon;
  return (
    <>
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        {card.href ? (
          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Kelola
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">
        {formatNumber(card.value)}
      </p>
      <p className="mt-1 text-sm font-medium">{card.label}</p>
      <p className="text-xs text-muted-foreground">
        {card.href ? card.description : `${card.description} — CRUD menyusul`}
      </p>
    </>
  );
}
