/**
 * Karsa — app/(desktop)/karsa-lib/page.tsx
 * ----------------------------------------------------------------------------
 * Feed Karsa Lib versi web. Artikel ditampilkan seperti di APK (per prodi,
 * terbaru dulu), tetapi pembacaannya dikunci ke APK lewat dialog di client.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, ChevronLeft } from "lucide-react";

import { Button } from "@/components/button";
import {
  KarsaLibFeed,
  type KarsaLibCard,
} from "@/components/karsa-lib/karsa-lib-feed";
import { articleBodyPreview } from "@/lib/karsa-lib/markdown";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Karsa Lib",
};

export default async function KarsaLibPage() {
  const user = await requireUser();

  const profile = await prisma.libProfile.findUnique({
    where: { user_id: user.id },
    select: { prodi_id: true, prodi: { select: { name: true } } },
  });

  let prodiId = profile?.prodi_id ?? null;
  let prodiName = profile?.prodi.name ?? null;

  if (!prodiId && user.kelas_id) {
    const kelas = await prisma.kelas.findUnique({
      where: { id: user.kelas_id },
      select: { prodi_id: true, prodi: { select: { name: true } } },
    });
    prodiId = kelas?.prodi_id ?? null;
    prodiName = kelas?.prodi.name ?? null;
  }

  const rows = prodiId
    ? await prisma.libArticle.findMany({
        where: {
          prodi_id: prodiId,
          status: "PUBLISHED",
          published_at: { not: null },
        },
        orderBy: [{ published_at: "desc" }, { id: "desc" }],
        take: 30,
        select: {
          id: true,
          title: true,
          body: true,
          published_at: true,
          author_id: true,
          author: {
            select: { libProfile: { select: { display_name: true } } },
          },
          _count: { select: { views: true, comments: true } },
        },
      })
    : [];

  const articles: KarsaLibCard[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: articleBodyPreview(row.body),
    authorName: row.author.libProfile?.display_name?.trim() || "Mahasiswa Karsa",
    prodiName: prodiName ?? "Karsa Lib",
    timeLabel: formatRelativeTime(row.published_at ?? new Date()),
    readers: row._count.views,
    comments: row._count.comments,
  }));

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
        <p className="text-sm text-muted-foreground">Perpustakaan prodi</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BookOpenText className="h-6 w-6 text-primary" aria-hidden />
          Karsa Lib
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {prodiName
            ? `Tulisan mahasiswa ${prodiName} pada semester ini.`
            : "Tulisan mahasiswa Karsa Lib."}
        </p>
      </header>

      {prodiId ? (
        <KarsaLibFeed articles={articles} prodiName={prodiName ?? "prodimu"} />
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <BookOpenText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold tracking-tight">
            Profil Karsa Lib belum ada
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Kamu belum terdaftar di kelas, atau profil Karsa Lib belum dibuat.
            Lengkapi profil lewat APK untuk melihat tulisan dari prodimu.
          </p>
          <Button asChild className="mt-5 w-fit">
            <Link href="/unduh">Unduh APK</Link>
          </Button>
        </section>
      )}
    </main>
  );
}
