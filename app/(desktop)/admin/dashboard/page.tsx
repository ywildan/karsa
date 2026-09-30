import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  CalendarDays,
  GraduationCap,
  Landmark,
  Layers,
  ScrollText,
  TableProperties,
  Users,
  type LucideIcon,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatDateTimeWib, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Ruang Admin" };

type Metric = {
  label: string;
  description: string;
  value: number;
  icon: LucideIcon;
  href: string;
};

const SHORTCUTS = [
  {
    title: "Kelola kelas",
    description: "Atur kelas dan anggotanya",
    href: "/admin/kelas",
    icon: Layers,
  },
  {
    title: "Buka rekap",
    description: "Lihat poin dan unduh Excel",
    href: "/admin/rekap",
    icon: TableProperties,
  },
  {
    title: "Atur semester",
    description: "Periksa periode yang aktif",
    href: "/admin/semester",
    icon: CalendarDays,
  },
  {
    title: "Audit aktivitas",
    description: "Telusuri riwayat perubahan",
    href: "/admin/audit",
    icon: ScrollText,
  },
] as const;

const AUDIT_LABELS: Record<string, string> = {
  POIN_INPUT: "Poin dicatat",
  POIN_DELETE: "Poin dihapus",
  PJ_ASSIGN: "PJ ditugaskan",
  PJ_REPLACE: "PJ diganti",
  PJ_REMOVE: "PJ dihapus",
  MAHASISWA_ADD: "Mahasiswa ditambahkan",
  MAHASISWA_REMOVE: "Mahasiswa dikeluarkan",
  KELAS_CREATE: "Kelas dibuat",
  KELAS_UPDATE: "Kelas diubah",
  KELAS_DELETE: "Kelas dihapus",
  MATKUL_ASSIGN: "Mata kuliah ditugaskan",
  SEMESTER_SET_ACTIVE: "Semester diaktifkan",
};

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  const [
    facultyCount,
    prodiCount,
    kelasCount,
    matkulCount,
    memberCount,
    activeSemester,
    libQueue,
    recentActivity,
  ] = await Promise.all([
    prisma.faculty.count(),
    prisma.prodi.count(),
    prisma.kelas.count(),
    prisma.matkul.count(),
    prisma.user.count({ where: { kelas_id: { not: null } } }),
    prisma.semester.findFirst({
      where: { is_active: true },
      select: { name: true },
    }),
    Promise.all([
      prisma.libAuthorRequest.count({ where: { status: "PENDING" } }),
      prisma.libReport.count({ where: { status: "PENDING" } }),
    ])
      .then(([authorRequests, reports]) => ({ authorRequests, reports }))
      .catch(() => null),
    prisma.auditLog.findMany({
      orderBy: { created_at: "desc" },
      take: 4,
      select: {
        id: true,
        action: true,
        actor_name: true,
        entity_label: true,
        created_at: true,
      },
    }).catch(() => null),
  ]);

  const pendingTotal = libQueue
    ? libQueue.authorRequests + libQueue.reports
    : null;

  const metrics: Metric[] = [
    {
      label: "Fakultas",
      description: "Fakultas terdaftar",
      value: facultyCount,
      icon: Landmark,
      href: "/admin/fakultas",
    },
    {
      label: "Program studi",
      description: "Prodi terdaftar",
      value: prodiCount,
      icon: GraduationCap,
      href: "/admin/prodi",
    },
    {
      label: "Kelas",
      description: "Semua semester",
      value: kelasCount,
      icon: Layers,
      href: "/admin/kelas",
    },
    {
      label: "Mata kuliah",
      description: "Master mata kuliah",
      value: matkulCount,
      icon: BookOpen,
      href: "/admin/matkul",
    },
    {
      label: "Anggota kelas",
      description: "Kelola melalui kelas",
      value: memberCount,
      icon: Users,
      href: "/admin/kelas",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Ikhtisar ruang admin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Halo, {admin.name?.trim() || admin.email}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pantau hal yang perlu ditangani dan buka pekerjaanmu dari sini.
          </p>
        </div>
        <Link
          href="/admin/semester"
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          {activeSemester ? activeSemester.name : "Belum ada semester aktif"}
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        </Link>
      </header>

      <section
        aria-labelledby="admin-priority-title"
        className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-accent via-card to-card p-6 shadow-soft sm:p-8"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-28 h-72 w-72 rounded-full border-[42px] border-primary/5"
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            Perlu perhatian
          </div>
          <h2 id="admin-priority-title" className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight sm:text-[30px] sm:leading-tight">
            {pendingTotal === null
              ? "Periksa antrean Karsa Lib"
              : pendingTotal === 0
                ? "Semua antrean sudah tertangani"
                : `Ada ${formatNumber(pendingTotal)} hal yang menunggu keputusanmu`}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {pendingTotal === null
              ? "Ringkasan antrean belum tersedia. Buka Karsa Lib untuk memeriksanya."
              : pendingTotal === 0
                ? "Belum ada permohonan penulis atau laporan konten yang menunggu."
                : "Tinjau permohonan penulis dan laporan konten tanpa mencari menu satu per satu."}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <PriorityLink
              href="/admin/karsalib#permohonan-penulis"
              label="Permohonan penulis"
              description="Setujui atau tolak akses menulis"
              count={libQueue?.authorRequests ?? null}
              icon={Users}
            />
            <PriorityLink
              href="/admin/karsalib#laporan-menunggu"
              label="Laporan konten"
              description="Tinjau laporan artikel dan komentar"
              count={libQueue?.reports ?? null}
              icon={BookOpenText}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="admin-shortcuts-title">
        <SectionHeading
          id="admin-shortcuts-title"
          title="Akses cepat"
          description="Pekerjaan yang paling sering dibuka admin."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="group flex min-h-32 flex-col justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold">{shortcut.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{shortcut.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="admin-data-title">
        <SectionHeading
          id="admin-data-title"
          title="Data akademik"
          description="Ringkasan data master dan anggota yang terdaftar."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                </div>
                <p className="mt-5 text-2xl font-semibold tabular-nums tracking-tight">
                  {formatNumber(metric.value)}
                </p>
                <p className="mt-1 text-sm font-medium">{metric.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{metric.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="admin-activity-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            id="admin-activity-title"
            title="Perubahan akademik terbaru"
            description="Jejak singkat aktivitas yang tercatat di sistem."
          />
          <Link href="/admin/audit" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Lihat audit log <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          {recentActivity === null ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">Aktivitas belum dapat dimuat. Coba buka audit log untuk memeriksanya.</p>
          ) : recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">Belum ada perubahan akademik yang tercatat.</p>
          ) : (
            <div className="divide-y divide-border/70">
              {recentActivity.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary/70" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {AUDIT_LABELS[entry.action] || entry.action.replaceAll("_", " ").toLowerCase()}
                      {entry.entity_label ? ` · ${entry.entity_label}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Oleh {entry.actor_name}</p>
                  </div>
                  <time dateTime={entry.created_at.toISOString()} className="text-xs text-muted-foreground">
                    {formatDateTimeWib(entry.created_at)}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

    </main>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 id={id} className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PriorityLink({
  href,
  label,
  description,
  count,
  icon: Icon,
}: {
  href: string;
  label: string;
  description: string;
  count: number | null;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-primary/10 bg-card/90 p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
      </span>
      <span className="text-xl font-semibold tabular-nums">
        {count === null ? "—" : formatNumber(count)}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
