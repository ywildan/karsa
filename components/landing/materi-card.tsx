/**
 * SiKarsa — components/landing/materi-card.tsx
 * ----------------------------------------------------------------------------
 * Kartu materi untuk halaman depan & indeks `/materi`.
 *
 * Hierarki sengaja dari teks, bukan dari ikon atau garis aksen: baris meta
 * (jenis ujian, bobot, Sub-CPMK) → judul → ringkasan → sumber. Satu-satunya
 * warna aksen dipakai di penanda jenis ujian.
 *
 * Semua field opsional ditangani eksplisit: kartu tidak boleh menampilkan
 * "null", "· null", atau "Bobot 0" saat admin mengosongkan sebuah isian.
 */
import Link from "next/link";

import {
  formatTanggalMateri,
  LABEL_JENIS,
  labelLingkup,
  type MateriPublik,
} from "@/lib/materi";
import { cn } from "@/lib/utils";

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
      {children}
    </span>
  );
}

export function MateriCard({
  materi,
  variant = "default",
}: {
  materi: MateriPublik;
  variant?: "default" | "featured";
}) {
  const featured = variant === "featured";

  const meta = [materi.matkul, materi.pertemuan, labelLingkup(materi)]
    .filter((bagian): bagian is string => Boolean(bagian))
    .join(" · ");

  const rincian = [
    materi.bagian !== null ? `${materi.bagian} bagian` : null,
    `Diperbarui ${formatTanggalMateri(materi.diperbarui)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={materi.href}
      className={cn(
        "group flex w-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6",
        featured && "shadow-soft",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-primary">
          {LABEL_JENIS[materi.jenis]}
        </span>
        {materi.bobot !== null && <MetaPill>Bobot {materi.bobot}</MetaPill>}
        {materi.subCpmk && <MetaPill>{materi.subCpmk}</MetaPill>}
      </div>

      <h3
        className={cn(
          "mt-4 font-bold tracking-tight text-foreground",
          featured ? "text-2xl sm:text-[28px] sm:leading-9" : "text-lg leading-6",
        )}
      >
        {materi.judul}
      </h3>

      <p className="mt-1.5 text-sm text-muted-foreground">{meta}</p>

      <p
        className={cn(
          "mt-3 text-sm leading-6 text-muted-foreground",
          !featured && "line-clamp-3",
        )}
      >
        {materi.ringkasan}
      </p>

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <p className="min-w-0 text-xs leading-5 text-muted-foreground">
          {rincian}
          {materi.sumber && (
            <span className="mt-0.5 block">Sumber: {materi.sumber}</span>
          )}
        </p>
        <span className="inline-flex items-center gap-1.5 self-end text-sm font-semibold text-primary sm:self-auto">
          Buka
          <span
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
