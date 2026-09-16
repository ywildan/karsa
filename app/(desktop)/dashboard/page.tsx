/**
 * Karsa — app/(desktop)/dashboard/page.tsx
 * ----------------------------------------------------------------------------
 * PLACEHOLDER Fase 1 — cukup untuk memverifikasi auth & klaim session bekerja:
 *   · "Halo, [nama]" + role + kelas_id   (permintaan Fase 1)
 *   · NIM, email, id user, is_pj         (verifikasi klaim refresh dari DB)
 *   · tombol logout
 *   · empty state PRD §7.4 untuk user tanpa kelas
 *
 * Halaman rapor yang sesungguhnya (total poin, kartu matkul, popup riwayat)
 * menyusul di Fase 4A. Route group `(desktop)` belum punya layout sendiri —
 * shell desktop dipasang di Fase 1.5.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/button";
import { requireUser } from "@/lib/auth-helpers";
import { HOME_ADMIN, roleLabel } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Dashboard",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="max-w-[60%] break-all text-right font-mono text-xs">
        {value}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const displayName = user.name?.trim() || user.email || "Pengguna Karsa";
  const tanpaKelas = !user.is_admin && !user.kelas_id;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 py-12">
      <div className="rounded-lg border border-border bg-card p-6 shadow-soft">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {roleLabel(user)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Halo, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fase 1 — halaman ini sementara, dipakai untuk memverifikasi login &
          klaim session.
        </p>

        <dl className="mt-5">
          <DetailRow label="role" value={roleLabel(user)} />
          <DetailRow label="kelas_id" value={user.kelas_id ?? "null"} />
          <DetailRow label="nim" value={user.nim ?? "null"} />
          <DetailRow label="email" value={user.email ?? "-"} />
          <DetailRow label="user.id" value={user.id} />
          <DetailRow label="is_admin" value={String(user.is_admin)} />
          <DetailRow label="is_pj" value={String(user.is_pj)} />
        </dl>

        <div className="mt-6 flex flex-wrap gap-3">
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Keluar
            </Button>
          </form>

          {user.is_admin && (
            <Button asChild>
              <Link href={HOME_ADMIN}>Buka Dashboard Admin</Link>
            </Button>
          )}
        </div>
      </div>

      {tanpaKelas && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-card p-6">
          <h2 className="text-sm font-medium">Belum terdaftar di kelas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kamu belum terdaftar di kelas manapun. Hubungi admin.
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Fase 1 · Auth + Dev Quick Login — rapor (Fase 4A) & shell desktop (Fase
        1.5) menyusul.
      </p>
    </main>
  );
}
