/**
 * Karsa — components/marketing/product-mock.tsx
 * ----------------------------------------------------------------------------
 * Visual produk SiKarsa yang digambar native dengan code (bukan
 * screenshot): bingkai HP berisi form catat poin untuk PJ, dan kartu
 * rapor web untuk mahasiswa. Mengikuti token tema sehingga benar di
 * mode terang maupun gelap. Murni dekoratif (aria-hidden); nama dan
 * angka di dalamnya contoh tampilan.
 */
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const CATEGORIES = ["Bertanya", "Menjawab", "Presentasi", "Lainnya"] as const;
const VALUES = [1, 2, 3, 4] as const;

export function PhoneMock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "w-[300px] max-w-full rounded-[2.6rem] border border-border bg-card p-2.5 shadow-2xl",
        className,
      )}
    >
      <div className="rounded-[2.1rem] border border-border/70 bg-background px-4 pb-5 pt-3">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-muted" />

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Catat Poin</p>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            PJ Kelas
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Kelas K1 · Akuntansi Perpajakan</p>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
            RA
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Rani Anggraini</p>
            <p className="text-[11px] text-muted-foreground">Mahasiswa · Kelas K1</p>
          </div>
        </div>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Kategori
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORIES.map((category, index) => (
            <span
              key={category}
              className={
                index === 0
                  ? "rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
                  : "rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
              }
            >
              {category}
            </span>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Nilai karsa
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {VALUES.map((value) => (
            <span
              key={value}
              className={
                value === 3
                  ? "rounded-lg bg-primary py-1.5 text-center text-sm font-semibold text-primary-foreground"
                  : "rounded-lg border border-border py-1.5 text-center text-sm text-muted-foreground"
              }
            >
              {value}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
          <Check className="h-4 w-4" aria-hidden />
          Input Poin
        </div>
      </div>
    </div>
  );
}

const REPORT_ROWS = [
  { initials: "RA", name: "Rani Anggraini", course: "Akuntansi Perpajakan", points: 24, width: "92%" },
  { initials: "SM", name: "Salsa Maharani", course: "Statistika Dasar", points: 21, width: "78%" },
  { initials: "BP", name: "Bagas Prasetyo", course: "Pengantar Ekonomi", points: 18, width: "64%" },
] as const;

export function ReportMock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("w-full rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-6", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Rapor Poin</p>
          <p className="text-xs text-muted-foreground">Semester Ganjil 2026/2027</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          LIVE
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {REPORT_ROWS.map((row) => (
          <div key={row.name} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {row.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-sm font-semibold text-primary">{row.points} karsa</p>
              </div>
              <p className="text-[11px] text-muted-foreground">{row.course}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: row.width }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 border-t border-border pt-3 text-[11px] text-muted-foreground">
        Terakhir diperbarui: baru saja · tercatat otomatis setiap PJ menginput poin
      </p>
    </div>
  );
}

/** Komposisi showcase: kartu rapor web dengan bingkai HP menimpanya. */
export function SikarsaShowcaseMock({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative mx-auto w-full max-w-3xl", className)}>
      <ReportMock className="sm:mr-24" />
      <PhoneMock className="mx-auto mt-6 w-[280px] sm:absolute sm:-bottom-16 sm:right-0 sm:mt-0" />
    </div>
  );
}
