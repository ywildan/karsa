"use client";

import * as React from "react";
import { Download, LoaderCircle } from "lucide-react";

import {
  getRekapByKelas,
  type RekapData,
  type RekapKelasOption,
} from "@/actions/rekap";
import { Button } from "@/components/button";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";

export function RekapView({
  kelasOptions,
}: {
  kelasOptions: RekapKelasOption[];
}) {
  const [selectedKelasId, setSelectedKelasId] = React.useState("");
  const [data, setData] = React.useState<RekapData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    if (!selectedKelasId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let dibatalkan = false;
    setLoading(true);
    setError(null);
    setExportError(null);

    void getRekapByKelas(selectedKelasId)
      .then((result) => {
        if (dibatalkan) return;

        if (!result.ok) {
          setData(null);
          setError(result.error);
          return;
        }

        setData(result.data);
      })
      .catch(() => {
        if (!dibatalkan) {
          setData(null);
          setError("Rekap tidak dapat dimuat. Coba lagi.");
        }
      })
      .finally(() => {
        if (!dibatalkan) setLoading(false);
      });

    return () => {
      dibatalkan = true;
    };
  }, [reloadKey, selectedKelasId]);

  async function handleExport() {
    if (!selectedKelasId || !data || exporting) return;

    setExporting(true);
    setExportError(null);

    try {
      const response = await fetch(
        `/api/rekap/export/${encodeURIComponent(selectedKelasId)}`,
      );

      if (!response.ok) {
        throw new Error("Export gagal.");
      }

      const blob = await response.blob();
      const filenameMatch = /filename="([^"]+)"/i.exec(
        response.headers.get("Content-Disposition") ?? "",
      );
      const filename = filenameMatch?.[1] ?? "rekap.xlsx";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Excel tidak dapat diunduh. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="flex flex-col gap-6" aria-label="Rekap poin kelas">
      <div className="max-w-md">
        <label
          htmlFor="kelas-rekap"
          className="text-sm font-medium text-foreground"
        >
          Kelas
        </label>
        <Select
          id="kelas-rekap"
          value={selectedKelasId}
          onValueChange={(value) => {
            setSelectedKelasId(value);
          }}
          className="mt-2"
          disabled={kelasOptions.length === 0}
        >
          <option value="">
            {kelasOptions.length === 0
              ? "Belum ada kelas pada semester aktif"
              : "Pilih kelas"}
          </option>
          {kelasOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {!selectedKelasId ? (
        <EmptyState
          title="Pilih kelas dulu"
          description="Pilih kelas untuk melihat rekap poin mahasiswa."
        />
      ) : loading ? (
        <RekapSkeleton />
      ) : error ? (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Coba lagi
          </Button>
        </section>
      ) : data?.mahasiswa.length === 0 ? (
        <EmptyState
          title="Belum ada mahasiswa di kelas ini"
          description="Tambahkan mahasiswa ke kelas ini terlebih dahulu untuk membuat rekap."
        />
      ) : data?.matkuls.length === 0 ? (
        <EmptyState
          title="Belum ada mata kuliah di kelas ini"
          description="Assign mata kuliah ke kelas ini dulu di halaman Detail Kelas."
        />
      ) : data ? (
        <section className="rounded-lg border border-border bg-card shadow-soft">
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold tracking-tight">
                {data.kelas.name} · {data.prodi.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Data semester: {data.semester.name}
              </p>
            </div>

            <Button
              type="button"
              onClick={() => void handleExport()}
              disabled={!data || exporting}
            >
              {exporting ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Download aria-hidden />
              )}
              {exporting ? "Menyiapkan Excel..." : "Export Excel"}
            </Button>
          </div>

          {exportError ? (
            <p className="px-4 pt-4 text-sm text-destructive" role="alert">
              {exportError}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">Nama</TableHead>
                  <TableHead className="min-w-32">NIM</TableHead>
                  {data.matkuls.map((matkul) => (
                    <TableHead
                      key={matkul.id}
                      className="min-w-36 whitespace-nowrap text-right"
                    >
                      {matkul.code
                        ? `${matkul.name} (${matkul.code})`
                        : matkul.name}
                    </TableHead>
                  ))}
                  <TableHead className="min-w-24 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.mahasiswa.map((mahasiswa) => (
                  <TableRow key={mahasiswa.id}>
                    <TableCell className="font-medium">
                      {mahasiswa.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {mahasiswa.nim ?? "-"}
                    </TableCell>
                    {data.matkuls.map((matkul) => (
                      <TableCell key={matkul.id} className="text-right">
                        {formatNumber(mahasiswa.perMatkul[matkul.id] ?? 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold">
                      {formatNumber(mahasiswa.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}
    </section>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <h2 className="font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </section>
  );
}

function RekapSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card p-4">
      <div className="h-11 w-48 rounded-md bg-muted" />
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="grid grid-cols-4 gap-3">
            <div className="h-5 rounded bg-muted" />
            <div className="h-5 rounded bg-muted" />
            <div className="h-5 rounded bg-muted" />
            <div className="h-5 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
