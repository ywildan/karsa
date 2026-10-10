/**
 * Karsa — app/(desktop)/admin/pengelola/page.tsx
 * ----------------------------------------------------------------------------
 * Kelola penunjukan Pengelola (khusus admin penuh): form tunjuk berbasis
 * email + daftar penunjukan beserta statusnya (AKTIF / PENDING /
 * KEDALUWARSA / DICABUT) dan tombol cabut. Data & mutasi lewat
 * `actions/pengelola.ts`; halaman ini murni server component.
 */
import type { Metadata } from "next";
import { UserCog } from "lucide-react";

import {
  getPengelolaAdminData,
  revokePengelola,
  type PengelolaAssignmentRow,
} from "@/actions/pengelola";
import { PengelolaAssignForm } from "@/components/admin/pengelola-assign-form";
import { requireAdmin } from "@/lib/auth-helpers";
import { formatDateTimeWib } from "@/lib/utils";

export const metadata: Metadata = { title: "Pengelola" };

const STATUS_STYLES: Record<PengelolaAssignmentRow["status"], string> = {
  AKTIF: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  KEDALUWARSA: "bg-muted text-muted-foreground",
  DICABUT: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<PengelolaAssignmentRow["status"], string> = {
  AKTIF: "Aktif",
  PENDING: "Menunggu login pertama",
  KEDALUWARSA: "Kedaluwarsa (semester berganti)",
  DICABUT: "Dicabut",
};

function targetLabel(row: PengelolaAssignmentRow): string {
  if (row.scope_type === "PRODI") return `Prodi ${row.prodi_name ?? "—"}`;
  return `Kelas ${row.kelas_name ?? "—"}`;
}

export default async function AdminPengelolaPage() {
  await requireAdmin();
  const { assignments, prodis, kelasOptions, activeSemester } =
    await getPengelolaAdminData();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pengelola</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Delegasikan pengelolaan kelas &amp; mahasiswa ke orang tepercaya
          TANPA memberi akses admin penuh. Pengelola hanya bisa bekerja di
          prodi/kelas yang kamu tunjuk, dan setiap tindakannya tercatat di
          audit log sebagai PENGELOLA.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <UserCog className="h-5 w-5 text-primary" aria-hidden />
          Tunjuk pengelola baru
        </h2>
        <div className="mt-4">
          {activeSemester ? (
            <PengelolaAssignForm
              prodis={prodis}
              kelasOptions={kelasOptions}
              activeSemesterName={activeSemester.name}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada semester aktif. Aktifkan semester dulu di menu
              Semester — penunjukan pengelola terikat pada semester aktif.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <h2 className="px-5 pt-5 text-base font-semibold">Daftar penunjukan</h2>
        {assignments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Belum ada penunjukan pengelola.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {assignments.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.user_name || row.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.email} · {targetLabel(row)}
                    {row.semester_name ? ` · ${row.semester_name}` : ""} ·
                    ditunjuk {row.granted_by_name} pada{" "}
                    {formatDateTimeWib(new Date(row.granted_at))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[row.status]}`}
                  >
                    {STATUS_LABELS[row.status]}
                  </span>
                  {row.status === "AKTIF" || row.status === "PENDING" ? (
                    <form action={revokePengelola}>
                      <input type="hidden" name="id" value={row.id} />
                      <button className="h-8 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent">
                        Cabut
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
