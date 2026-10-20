import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDeckMateri } from "@/lib/materi-query";

/**
 * SiKarsa — app/(public)/materi/[slug]/page.tsx
 * ----------------------------------------------------------------------------
 * Menyajikan deck materi sebagai dokumen HTML mandiri.
 *
 * Kenapa iframe `srcdoc` ber-sandbox, bukan `dangerouslySetInnerHTML`:
 *  · deck punya CSS & skrip sendiri; menyuntikkannya ke DOM app akan
 *    membocorkan token desain dan bisa menabrak style app;
 *  · `sandbox="allow-scripts"` TANPA `allow-same-origin` memberi dokumen
 *    origin opaque — skrip di dalam deck tidak bisa membaca cookie sesi,
 *    localStorage, atau DOM induk. Ini batas keamanan yang disengaja:
 *    jangan tambahkan `allow-same-origin` walau deck "butuh".
 */
type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const deck = await getDeckMateri(slug);

  if (!deck) return { title: "Materi tidak ditemukan", robots: { index: false } };

  return {
    title: `${deck.judul} — ${deck.matkul}`,
    description: `Materi ${deck.matkul}: kisi-kisi, ringkasan, latihan soal, dan kartu hafalan.`,
    alternates: { canonical: `/materi/${slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${deck.judul} · SiKarsa`,
      description: `Materi ${deck.matkul} — terbuka tanpa login.`,
      locale: "id_ID",
      type: "article",
    },
  };
}

export default async function DeckMateriPage({ params }: Params) {
  const { slug } = await params;
  const deck = await getDeckMateri(slug);
  if (!deck) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-6">
        <Link
          href="/materi"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Semua materi
        </Link>
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {deck.matkul} · {deck.judul}
        </p>
      </div>

      <iframe
        title={`Deck ${deck.judul}`}
        srcDoc={deck.html}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="h-[calc(100dvh-2.75rem)] w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
