/**
 * Karsa — app/(desktop)/admin/kelas/[id]/_components/kelas-detail-tabs.tsx
 * ----------------------------------------------------------------------------
 * Tab switcher halaman detail kelas (Sub-Fase 2C). Client component karena
 * hanya menyimpan satu potong state (`panel`); data & otorisasi tetap berasal
 * dari server component induk (`page.tsx` → `requireAdmin()`).
 *
 * Default tab = Mahasiswa (PRD §7.1 langkah 3). Tab "Matkul & PJ" sengaja
 * tetap bisa diklik dan menampilkan placeholder — diisi Sub-Fase 2D.
 */
"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { MahasiswaTab } from "./mahasiswa-tab";
import type { MahasiswaRow } from "@/lib/mahasiswa";

type Panel = "mahasiswa" | "matkul";

export function KelasDetailTabs({
  kelasId,
  kelasName,
  mahasiswa,
  jumlahMatkul,
}: {
  kelasId: string;
  kelasName: string;
  mahasiswa: MahasiswaRow[];
  jumlahMatkul: number;
}) {
  const [panel, setPanel] = React.useState<Panel>("mahasiswa");

  const TABS: { id: Panel; label: string }[] = [
    { id: "mahasiswa", label: `Mahasiswa (${mahasiswa.length})` },
    { id: "matkul", label: `Matkul & PJ (${jumlahMatkul})` },
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
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
            <p className="font-medium text-foreground">Matkul &amp; PJ</p>
            <p className="mt-1">
              Akan tersedia di Sub-Fase 2D — di situ admin bisa meng-assign
              matkul ke kelas ini beserta penanggung jawab (PJ)-nya.
            </p>
            <p className="mt-2">
              Catatan: penggantian PJ dilakukan di tab ini, jadi mahasiswa yang
              masih PJ belum bisa dikeluarkan dari kelas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
