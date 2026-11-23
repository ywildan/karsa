/**
 * Karsa — app/(desktop)/grup/page.tsx
 * ----------------------------------------------------------------------------
 * Daftar grup mata kuliah untuk anggota kelas. Pesan hanya bisa dibaca;
 * pengiriman diarahkan ke APK.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  MessagesSquare,
  Users,
} from "lucide-react";

import { Button } from "@/components/button";
import {
  formatChatTime,
  groupLastMessagePreview,
  type GroupSummaryView,
} from "@/lib/group-view";
import { requireUser } from "@/lib/auth-helpers";
import { mobileUserPayload } from "@/lib/mobile/auth";
import { listGroups } from "@/lib/services/group-service";

export const metadata: Metadata = {
  title: "Grup kelas",
};

export default async function GrupPage() {
  const user = await requireUser();
  const payload = await mobileUserPayload(user.id);

  if (!payload) {
    return <GrupEmpty message="Sesi kamu tidak valid. Silakan masuk ulang." />;
  }

  const result = await listGroups({ ...payload, session_id: "web" });
  if (!result.ok) {
    return <GrupEmpty message={result.message} />;
  }

  const groups = result.data as GroupSummaryView[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-6 py-10 sm:px-8">
      <div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/dashboard">
            <ChevronLeft aria-hidden />
            Kembali ke rapor
          </Link>
        </Button>
      </div>

      <header className="border-b border-border pb-6">
        <p className="text-sm text-muted-foreground">Diskusi kelas</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <MessagesSquare className="h-6 w-6 text-primary" aria-hidden />
          Grup kelas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Satu grup per mata kuliah. Pesan bisa dibaca di web; membalas tetap
          lewat APK.
        </p>
      </header>

      {groups.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <MessagesSquare className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold tracking-tight">
            Belum ada grup
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Grup muncul setelah kelasmu punya mata kuliah. Hubungi admin bila
            kelas belum memiliki mata kuliah.
          </p>
        </section>
      ) : (
        <ul className="grid gap-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/grup/${group.id}`}
                className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <MessagesSquare className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold tracking-tight">
                      {group.matkul.name}
                    </p>
                    {group.is_locked ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        <Lock className="h-3 w-3" aria-hidden />
                        Dikunci
                      </span>
                    ) : null}
                    {group.is_manager ? (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Kamu PJ
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {group.kelas.name} · {group.kelas.prodi.name} ·{" "}
                    {group.kelas.semester.name}
                  </p>
                  <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
                    {groupLastMessagePreview(group.last_message)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {group.member_count} anggota
                    </span>
                    {group.last_message ? (
                      <span>{formatChatTime(group.last_message.created_at)}</span>
                    ) : null}
                    <span>PJ {group.pj.name}</span>
                  </div>
                </div>
                <ChevronRight
                  className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function GrupEmpty({ message }: { message: string }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-12 sm:px-8">
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link href="/dashboard">
          <ChevronLeft aria-hidden />
          Kembali ke rapor
        </Link>
      </Button>
      <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <MessagesSquare className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold tracking-tight">
          Grup tidak tersedia
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {message}
        </p>
      </section>
    </main>
  );
}
