import type { Metadata } from "next";

import {
  getAuditActorOptions,
  getAuditKelasOptions,
} from "@/actions/audit";
import { AuditLogView } from "@/components/admin/audit-log-view";
import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth-helpers";

export const metadata: Metadata = {
  title: "Audit Log",
};

export default async function AuditLogPage() {
  await requireAdmin();

  const [kelasOptions, actorOptions] = await Promise.all([
    getAuditKelasOptions(),
    getAuditActorOptions(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />

      <header>
        <h1 className="text-2xl font-semibold">Riwayat Perubahan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jejak lengkap seluruh aktivitas administratif di Karsa. Hanya admin
          yang dapat melihat halaman ini.
        </p>
      </header>

      <AuditLogView kelasOptions={kelasOptions} actorOptions={actorOptions} />
    </main>
  );
}
