/**
 * Karsa — app/(desktop)/akun/page.tsx
 * ----------------------------------------------------------------------------
 * Halaman akun web: identitas, peran & akses, data akademik/Karsa Lib, legal,
 * serta aksi sesi. Klaim dibaca segar dari snapshot user pada request ini.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  FileText,
  GraduationCap,
  Lock,
  MessageCircle,
  PenLine,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AccountActions } from "@/components/account/account-actions";
import { Button } from "@/components/button";
import { requireUser } from "@/lib/auth-helpers";
import { mobileUserPayload } from "@/lib/mobile/auth";
import { prisma } from "@/lib/prisma";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Akun",
};

export default async function AkunPage() {
  const user = await requireUser();
  const payload = await mobileUserPayload(user.id);
  const libProfile = payload?.lib_profile ?? null;

  let facultyName = libProfile?.faculty?.trim() || null;
  let prodiName: string | null = null;
  let kelasName: string | null = null;
  let semesterName: string | null = null;

  if (libProfile) {
    const prodi = await prisma.prodi.findUnique({
      where: { id: libProfile.prodi_id },
      select: { name: true, faculty: { select: { name: true } } },
    });
    prodiName = prodi?.name ?? null;
    facultyName = facultyName ?? prodi?.faculty?.name ?? null;

    if (libProfile.kelas_id) {
      const kelas = await prisma.kelas.findUnique({
        where: { id: libProfile.kelas_id },
        select: { name: true, semester: { select: { name: true } } },
      });
      kelasName = kelas?.name ?? null;
      semesterName = kelas?.semester.name ?? null;
    }
  }

  const kelasId = user.kelas_id ?? null;
  if ((!prodiName || !kelasName) && kelasId) {
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelasId },
      select: {
        name: true,
        prodi: { select: { name: true, faculty: { select: { name: true } } } },
        semester: { select: { name: true } },
      },
    });
    prodiName = prodiName ?? kelas?.prodi.name ?? null;
    facultyName = facultyName ?? kelas?.prodi.faculty?.name ?? null;
    kelasName = kelasName ?? kelas?.name ?? null;
    semesterName = semesterName ?? kelas?.semester.name ?? null;
  }

  let authorStatus:
    | "DISETUJUI"
    | "MENUNGGU TINJAUAN"
    | "DITOLAK"
    | "DICABUT"
    | "BELUM DIAJUKAN" = "BELUM DIAJUKAN";
  if (payload?.capabilities.write_karsa_lib) {
    authorStatus = "DISETUJUI";
  } else {
    const [access, request] = await Promise.all([
      prisma.libAuthorAccess.findUnique({
        where: { user_id: user.id },
        select: { revoked_at: true },
      }),
      prisma.libAuthorRequest.findFirst({
        where: { user_id: user.id },
        orderBy: { submitted_at: "desc" },
        select: { status: true },
      }),
    ]);
    if (access?.revoked_at) authorStatus = "DICABUT";
    else if (request?.status === "APPROVED") authorStatus = "DISETUJUI";
    else if (request?.status === "PENDING") authorStatus = "MENUNGGU TINJAUAN";
    else if (request?.status === "REJECTED") authorStatus = "DITOLAK";
  }

  const roleLabels: string[] = [];
  if (user.is_admin) roleLabels.push("Admin");
  if (user.is_pengelola) roleLabels.push("Pengelola");
  if (user.is_pj) roleLabels.push("PJ");
  if (roleLabels.length === 0) roleLabels.push("Mahasiswa");

  const scopes: string[] = [];
  if (user.is_admin) scopes.push("Panel admin");
  if (user.is_pengelola) scopes.push("Panel pengelola");
  if (payload?.capabilities.view_karsa_lib) scopes.push("Karsa Lib");
  if (payload?.capabilities.write_karsa_lib) scopes.push("Tulis artikel");
  if (payload?.capabilities.record_points) scopes.push("Catat poin");
  if (payload?.capabilities.view_report) scopes.push("Laporan");
  if (payload?.capabilities.view_leaderboard) scopes.push("Peringkat");
  if (kelasId && !user.is_admin) scopes.push("Grup kelas");

  const name = payload?.name?.trim() || user.name?.trim() || "Pengguna Karsa";
  const email = payload?.email || user.email || "—";
  const nim = payload?.nim ?? user.nim ?? null;
  const hasLib = payload?.capabilities.view_karsa_lib === true;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-6 py-10 sm:px-8">
      <header className="border-b border-border pb-5">
        <p className="text-sm text-muted-foreground">Profil</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Akun</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identitas, akses, dan informasi sesi akun kampusmu.
        </p>
      </header>

      <section className="relative overflow-hidden rounded-[28px] bg-espresso p-6 text-white sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/25 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl font-semibold">
            {getInitials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {name}
            </h2>
            <p className="mt-1 truncate text-sm text-white/60">{email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {roleLabels.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">
              NIM
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
              {nim ?? "—"}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Identitas dan akses
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <InfoRow icon={ShieldCheck} label="Peran">
            {roleLabels.join(" · ")}
          </InfoRow>
          <InfoRow icon={Users} label="Akses fitur">
            {scopes.length > 0 ? scopes.join(" · ") : "Belum ada akses tambahan"}
          </InfoRow>
          <InfoRow icon={Building2} label="Fakultas">
            {facultyName || "Belum diatur"}
          </InfoRow>
          <InfoRow icon={GraduationCap} label="Program studi">
            {prodiName || "Belum diatur"}
          </InfoRow>
          <InfoRow icon={Users} label="Kelas">
            {kelasName
              ? `${kelasName}${semesterName ? ` · ${semesterName}` : ""}`
              : "Belum diatur"}
          </InfoRow>
          <InfoRow icon={PenLine} label="Status menulis Karsa Lib">
            {hasLib ? (
              <AuthorBadge status={authorStatus} />
            ) : (
              "Belum aktif untuk akun ini"
            )}
          </InfoRow>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Informasi aplikasi
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <InfoRow icon={FileText} label="Syarat Penggunaan" href="/syarat-penggunaan">
            Dokumen resmi penggunaan SiKarsa
          </InfoRow>
          <InfoRow icon={Lock} label="Kebijakan Privasi" href="/kebijakan-privasi">
            Cara data akun dikelola
          </InfoRow>
          <InfoRow
            icon={MessageCircle}
            label="Bantuan dan masukan"
            href="mailto:admin@sikarsa.id?subject=Bantuan%20SiKarsa"
          >
            admin@sikarsa.id
          </InfoRow>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold tracking-tight">Sesi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Segarkan profil untuk mengambil klaim peran terbaru, atau keluar dari
          perangkat ini.
        </p>
        <div className="mt-4">
          <AccountActions />
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        SiKarsa Web · Akun kampus Universitas Tidar
      </p>

      {hasLib ? (
        <div className="text-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/karsa-lib">Buka Karsa Lib</Link>
          </Button>
        </div>
      ) : null}
    </main>
  );
}

function InfoRow({
  icon: Icon,
  label,
  href,
  children,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  children: ReactNode;
}) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {children}
        </span>
      </span>
      {href ? (
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent/30"
      >
        {content}
      </Link>
    );
  }
  return <div className="flex items-start gap-3 px-4 py-3.5">{content}</div>;
}

function AuthorBadge({
  status,
}: {
  status: "DISETUJUI" | "MENUNGGU TINJAUAN" | "DITOLAK" | "DICABUT" | "BELUM DIAJUKAN";
}) {
  const tone =
    status === "DISETUJUI"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : status === "MENUNGGU TINJAUAN"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : status === "DITOLAK" || status === "DICABUT"
          ? "border-destructive/25 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}>
      {status}
    </span>
  );
}
