import type { Metadata } from "next";

import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatDateTimeShortWib } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Audit Poin",
};

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AuditPoinPage({ searchParams }: PageProps) {
  await requireAdmin();

  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const events = await prisma.poinAuditLog.findMany({
    where: query
      ? {
          OR: [
            { mahasiswa_nim: { contains: query, mode: "insensitive" } },
            { mahasiswa_name: { contains: query, mode: "insensitive" } },
            { mahasiswa_id: query },
          ],
        }
      : undefined,
    orderBy: [{ occurred_at: "desc" }, { id: "desc" }],
    take: 100,
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header>
        <h1 className="text-2xl font-semibold">Riwayat perubahan poin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Input dan penghapusan poin melalui aplikasi, termasuk PJ pelakunya.
          Hanya admin yang dapat melihat halaman ini.
        </p>
      </header>

      <form method="get" className="flex flex-wrap gap-2">
        <label htmlFor="audit-search" className="sr-only">
          Cari mahasiswa berdasarkan NIM atau nama
        </label>
        <input
          id="audit-search"
          name="q"
          defaultValue={query}
          maxLength={100}
          placeholder="Cari NIM atau nama mahasiswa"
          className="min-w-64 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Cari
        </button>
      </form>

      <p className="text-xs text-muted-foreground">
        Menampilkan maksimal 100 peristiwa terbaru{query ? " yang cocok" : ""}.
        Poin sebelum fitur ini aktif tidak memiliki peristiwa input historis.
      </p>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          Belum ada riwayat yang cocok.
        </div>
      ) : (
        <ol className="grid gap-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      event.action === "HAPUS"
                        ? "rounded bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive"
                        : "rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
                    }
                  >
                    {event.action}
                  </span>
                  <span className="font-medium">
                    {event.mahasiswa_name ?? "Tanpa nama"}
                    {event.mahasiswa_nim ? ` · ${event.mahasiswa_nim}` : ""}
                  </span>
                </div>
                <time dateTime={event.occurred_at.toISOString()} className="text-xs text-muted-foreground">
                  {formatDateTimeShortWib(event.occurred_at)}
                </time>
              </div>

              <p className="mt-2 text-sm">
                {event.poin} poin · {event.kategori_name} · {event.matkul_name} · {event.kelas_name}
              </p>
              {event.catatan ? (
                <p className="mt-1 text-sm text-muted-foreground">Catatan: {event.catatan}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                PJ: {event.pj_name ?? event.pj_email ?? event.pj_id}
                {event.pj_email ? ` (${event.pj_email})` : ""} · ID poin: {event.poin_log_id}
              </p>
              {event.action === "HAPUS" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Poin semula dicatat {formatDateTimeShortWib(event.poin_created_at)}.
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
