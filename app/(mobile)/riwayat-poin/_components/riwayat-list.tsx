/**
 * Karsa — riwayat-list.tsx
 * ----------------------------------------------------------------------------
 * Filter dan penghapusan riwayat poin PJ (Fase 3B). Data telah dibatasi ke PJ
 * aktif oleh server action; action hapus tetap memverifikasi kepemilikan lagi.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deletePoinLog } from "@/actions/poin";
import { Button } from "@/components/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type { MatkulFilterOption, RiwayatPoinRow } from "@/lib/poin";
import { formatDateTimeShortWib, formatRelativeTime } from "@/lib/utils";

export function RiwayatList({
  poinLogs,
  matkuls,
}: {
  poinLogs: RiwayatPoinRow[];
  matkuls: MatkulFilterOption[];
}) {
  const router = useRouter();
  const [selectedKelasMatkulId, setSelectedKelasMatkulId] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const filteredPoinLogs = React.useMemo(
    () =>
      selectedKelasMatkulId
        ? poinLogs.filter(
            (poinLog) =>
              poinLog.kelas_matkul_id === selectedKelasMatkulId,
          )
        : poinLogs,
    [poinLogs, selectedKelasMatkulId],
  );

  function handleDelete(id: string) {
    if (!window.confirm("Hapus poin ini secara permanen?")) return;

    startTransition(async () => {
      try {
        const result = await deletePoinLog(id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success(result.message ?? "Poin berhasil dihapus.");
        router.refresh();
      } catch {
        toast.error("Gagal menghapus poin. Silakan coba lagi.");
      }
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <label
          htmlFor="riwayat-matkul-filter"
          className="text-sm font-medium"
        >
          Filter matkul
        </label>
        <Select
          id="riwayat-matkul-filter"
          value={selectedKelasMatkulId}
          onValueChange={setSelectedKelasMatkulId}
          disabled={pending}
        >
          <option value="">Semua matkul</option>
          {matkuls.map((matkul) => (
            <option key={matkul.id} value={matkul.id}>
              {matkul.label}
            </option>
          ))}
        </Select>
      </div>

      {filteredPoinLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
          Tidak ada poin untuk matkul ini.
        </div>
      ) : (
        <ul className="grid gap-3">
          {filteredPoinLogs.map((poinLog) => {
            const namaMahasiswa = poinLog.mahasiswa.name ?? "Tanpa nama";

            return (
              <li
                key={poinLog.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{namaMahasiswa}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {poinLog.mahasiswa.nim
                        ? `NIM ${poinLog.mahasiswa.nim}`
                        : "NIM belum ada"}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus poin untuk ${namaMahasiswa}`}
                    title="Hapus poin"
                    disabled={pending}
                    onClick={() => handleDelete(poinLog.id)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary">{poinLog.kategori.name}</Badge>
                  <span className="text-2xl font-semibold leading-none">
                    +{poinLog.poin}
                  </span>
                  <span className="text-sm text-muted-foreground">poin</span>
                </div>

                {poinLog.catatan ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {poinLog.catatan}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                  <time
                    dateTime={new Date(poinLog.created_at).toISOString()}
                    title={formatDateTimeShortWib(poinLog.created_at)}
                  >
                    {formatRelativeTime(poinLog.created_at)}
                  </time>
                  <p>
                    {poinLog.matkul.name} · {poinLog.kelas.name} ·{" "}
                    {poinLog.prodi.name}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
