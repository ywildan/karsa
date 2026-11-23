/**
 * Karsa — app/(desktop)/grup/[assignmentId]/page.tsx
 * ----------------------------------------------------------------------------
 * Chat grup mata kuliah (read-only). Otorisasi dari service grup: hanya
 * anggota kelas; ID asing → 404. Pengiriman pesan diarahkan ke APK.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";
import { notFound } from "next/navigation";

import { GroupChat } from "@/components/group/group-chat";
import { Button } from "@/components/button";
import type { GroupDetailView } from "@/lib/group-view";
import { requireUser } from "@/lib/auth-helpers";
import { mobileUserPayload } from "@/lib/mobile/auth";
import { listGroupMessages } from "@/lib/services/group-service";

export const metadata: Metadata = {
  title: "Grup matkul",
};

export default async function GrupDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const user = await requireUser();
  const { assignmentId } = await params;
  const payload = await mobileUserPayload(user.id);
  if (!payload) notFound();

  const result = await listGroupMessages(
    { ...payload, session_id: "web" },
    assignmentId,
    { limit: 50 },
  );

  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-6 py-12 sm:px-8">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/grup">
            <ChevronLeft aria-hidden />
            Semua grup
          </Link>
        </Button>
        <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold tracking-tight">
            Grup tidak tersedia
          </h1>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {result.message}
          </p>
        </section>
      </main>
    );
  }

  const data = result.data as GroupDetailView;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 py-8 sm:px-8">
      <div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/grup">
            <ChevronLeft aria-hidden />
            Semua grup
          </Link>
        </Button>
      </div>

      <header className="border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">Grup mata kuliah</p>
          {data.group.is_locked ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              <Lock className="h-3 w-3" aria-hidden />
              Dikunci PJ
            </span>
          ) : null}
          {data.group.is_manager ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Kamu PJ
            </span>
          ) : null}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {data.group.matkul.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.group.kelas.name} · {data.group.kelas.prodi.name} ·{" "}
          {data.group.kelas.semester.name}
          {data.group.matkul.code ? ` · ${data.group.matkul.code}` : ""} · PJ{" "}
          {data.group.pj.name}
        </p>
      </header>

      <GroupChat data={data} />
    </main>
  );
}
