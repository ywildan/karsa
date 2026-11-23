"use client";

/**
 * Karsa — components/karsa-lib/karsa-lib-feed.tsx
 * ----------------------------------------------------------------------------
 * Kartu feed Karsa Lib versi web. Membaca artikel penuh sengaja dikunci:
 * setiap kartu membuka dialog yang mengarahkan pengguna ke APK.
 */
import * as React from "react";
import Link from "next/link";
import {
  BookOpenText,
  Download,
  Eye,
  MessageCircle,
  Smartphone,
  X,
} from "lucide-react";

import { Button } from "@/components/button";
import { getInitials } from "@/lib/utils";

export interface KarsaLibCard {
  id: string;
  title: string;
  excerpt: string;
  authorName: string;
  prodiName: string;
  timeLabel: string;
  readers: number;
  comments: number;
}

export function KarsaLibFeed({
  articles,
  prodiName,
}: {
  articles: KarsaLibCard[];
  prodiName: string;
}) {
  const [selected, setSelected] = React.useState<KarsaLibCard | null>(null);

  if (articles.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <BookOpenText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold tracking-tight">
          Belum ada artikel terbit
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Tulisan dari mahasiswa {prodiName} akan muncul di sini setelah
          diterbitkan lewat APK.
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Terbaru</h2>
        <span className="text-sm text-muted-foreground">
          {articles.length} artikel · {prodiName}
        </span>
      </div>

      <ul className="grid gap-3">
        {articles.map((article) => (
          <li key={article.id}>
            <button
              type="button"
              onClick={() => setSelected(article)}
              className="group w-full rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Baca ${article.title}`}
              aria-haspopup="dialog"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {getInitials(article.authorName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {article.authorName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {article.prodiName} · {article.timeLabel}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {article.prodiName}
                </span>
              </div>

              <h3 className="mt-4 text-lg font-semibold leading-snug tracking-tight">
                {article.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {article.excerpt}
              </p>

              <div className="mt-4 flex items-center gap-5 border-t border-border pt-3 text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  {article.readers} pembaca
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  {article.comments} komentar
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <ArticleLockDialog article={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}

function ArticleLockDialog({
  article,
  onClose,
}: {
  article: KarsaLibCard;
  onClose: () => void;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Tutup dialog"
        onClick={onClose}
        className="absolute inset-0 bg-espresso/45 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="karsa-lib-lock-title"
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-soft"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Smartphone className="h-6 w-6" aria-hidden />
        </div>
        <h2
          id="karsa-lib-lock-title"
          className="mt-4 text-lg font-semibold tracking-tight"
        >
          Baca artikel di APK
        </h2>
        <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
          {article.title}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Baca artikel saat ini hanya bisa dilakukan melalui APK. Unduh SiKarsa
          untuk membaca artikel lengkap dan ikut berdiskusi di kolom komentar.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href="/unduh">
              <Download aria-hidden />
              Unduh APK
            </Link>
          </Button>
          <Button
            ref={closeRef}
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            <X aria-hidden />
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
