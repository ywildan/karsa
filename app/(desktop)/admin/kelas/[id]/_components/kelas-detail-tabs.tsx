/**
 * Karsa — app/(desktop)/admin/kelas/[id]/_components/kelas-detail-tabs.tsx
 * ----------------------------------------------------------------------------
 * Tab switcher halaman detail kelas (Sub-Fase 2C + 2D). Client component karena
 * hanya menyimpan satu potong state (`panel`); data & otorisasi tetap berasal
 * dari server component induk (`page.tsx` → `requireAdmin()`).
 *
 * Default tab = Mahasiswa (PRD §7.1 langkah 3). Tab kedua "Matkul & PJ"
 * (Sub-Fase 2D) me-render `MatkulPjTab` untuk assign matkul + kelola PJ.
 */
"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { MahasiswaTab } from "./mahasiswa-tab";
import { MatkulPjTab } from "./matkul-pj-tab";
import type {
  KelasMatkulRow,
  MatkulOption,
  PjKandidatOption,
} from "@/lib/kelas-matkul";
import type { MahasiswaRow } from "@/lib/mahasiswa";

type Panel = "mahasiswa" | "matkul";

export function KelasDetailTabs({
  kelasId,
  kelasName,
  mahasiswa,
  kelasMatkul,
  matkuls,
  pjKandidat,
}: {
  kelasId: string;
  kelasName: string;
  mahasiswa: MahasiswaRow[];
  kelasMatkul: KelasMatkulRow[];
  matkuls: MatkulOption[];
  /** Semua anggota kelas + admin di luar kelas — lihat `lib/kelas-matkul.ts`. */
  pjKandidat: PjKandidatOption[];
}) {
  const [panel, setPanel] = React.useState<Panel>("mahasiswa");

  const TABS: { id: Panel; label: string }[] = [
    { id: "mahasiswa", label: `Mahasiswa (${mahasiswa.length})` },
    { id: "matkul", label: `Matkul & PJ (${kelasMatkul.length})` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Bagian detail kelas"
        className="flex w-fit flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1"
      >
        {TABS.map((tab) => {
          const active = panel === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`kelas-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`kelas-panel-${tab.id}`}
              onClick={() => setPanel(tab.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`kelas-panel-${panel}`}
        aria-labelledby={`kelas-tab-${panel}`}
      >
        {panel === "mahasiswa" ? (
          <MahasiswaTab
            kelasId={kelasId}
            kelasName={kelasName}
            mahasiswa={mahasiswa}
          />
        ) : (
          <MatkulPjTab
            kelasId={kelasId}
            kelasName={kelasName}
            kelasMatkul={kelasMatkul}
            matkuls={matkuls}
            pjKandidat={pjKandidat}
          />
        )}
      </div>
    </div>
  );
}
