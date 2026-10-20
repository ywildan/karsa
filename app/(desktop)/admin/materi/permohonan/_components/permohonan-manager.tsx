"use client";

/**
 * Karsa — app/(desktop)/admin/materi/permohonan/_components/permohonan-manager.tsx
 * ----------------------------------------------------------------------------
 * Antrean permohonan: filter status, tabel, dan satu dialog tinjauan.
 *
 * Dialog dipakai untuk tiga hal sekaligus — membaca isi lengkap, membuka
 * tautan berkas, dan menulis catatan — karena permohonan hanya punya sedikit
 * kolom. Otorisasi tetap di server (`tinjauPermohonan`, `hapusPermohonan`).
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Mail, RotateCcw, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { hapusPermohonan, tinjauPermohonan } from "@/actions/permohonan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LABEL_STATUS_PERMOHONAN,
  formatTanggalPermohonan,
  type PermohonanAdmin,
  type StatusPermohonan,
} from "@/lib/permohonan";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PermohonanManager({ daftar }: { daftar: PermohonanAdmin[] }) {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = React.useState<"semua" | StatusPermohonan>(
    "MENUNGGU",
  );
  const [dipilih, setDipilih] = React.useState<PermohonanAdmin | null>(null);
  const [catatan, setCatatan] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const jumlah = React.useMemo(
    () => ({
      MENUNGGU: daftar.filter((item) => item.status === "MENUNGGU").length,
      DISETUJUI: daftar.filter((item) => item.status === "DISETUJUI").length,
      DITOLAK: daftar.filter((item) => item.status === "DITOLAK").length,
    }),
    [daftar],
  );

  const tampil = React.useMemo(
    () =>
      filterStatus === "semua"
        ? daftar
        : daftar.filter((item) => item.status === filterStatus),
    [daftar, filterStatus],
  );

  function bukaDialog(item: PermohonanAdmin) {
    setDipilih(item);
    setCatatan(item.catatan ?? "");
  }

  function putuskan(status: StatusPermohonan) {
    if (!dipilih) return;
    startTransition(async () => {
      const hasil = await tinjauPermohonan({
        id: dipilih.id,
        status,
        catatan: catatan.trim() || undefined,
      });
      if (hasil.ok) {
        toast.success(hasil.message ?? "Permohonan diperbarui.");
        setDipilih(null);
        router.refresh();
      } else {
        toast.error(hasil.error);
      }
    });
  }

  function hapus() {
    if (!dipilih) return;
    startTransition(async () => {
      const hasil = await hapusPermohonan(dipilih.id);
      if (hasil.ok) {
        toast.success(hasil.message ?? "Permohonan dihapus.");
        setDipilih(null);
        router.refresh();
      } else {
        toast.error(hasil.error);
      }
    });
  }

  if (daftar.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-6">
        <p className="text-sm font-medium">Belum ada permohonan masuk.</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Kiriman dari{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/materi/kirim</code>{" "}
          akan muncul di sini dengan status menunggu.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="filter-permohonan-status" className="text-xs text-muted-foreground">
            Status
          </Label>
          <Select
            id="filter-permohonan-status"
            value={filterStatus}
            onValueChange={(nilai) =>
              setFilterStatus(nilai as "semua" | StatusPermohonan)
            }
            className="h-9 w-56"
          >
            <option value="MENUNGGU">Menunggu ({jumlah.MENUNGGU})</option>
            <option value="DISETUJUI">Disetujui ({jumlah.DISETUJUI})</option>
            <option value="DITOLAK">Ditolak ({jumlah.DITOLAK})</option>
            <option value="semua">Semua ({daftar.length})</option>
          </Select>
        </div>
        <p className="pb-2 text-xs text-muted-foreground" aria-live="polite">
          {tampil.length === daftar.length
            ? `${daftar.length} permohonan · ${jumlah.MENUNGGU} menunggu`
            : `${tampil.length} dari ${daftar.length} permohonan`}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pemohon</TableHead>
              <TableHead>Mata kuliah</TableHead>
              <TableHead>Lingkup</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tampil.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Tidak ada permohonan pada status ini.
                </TableCell>
              </TableRow>
            ) : (
              tampil.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-medium">{item.nama}</p>
                    <a
                      href={`mailto:${item.email}`}
                      className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                      {item.email}
                    </a>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{item.matkul}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.jenis}
                      {item.pertemuan ? ` · Pertemuan ${item.pertemuan}` : ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.fakultas ? (
                      <>
                        <p>{item.fakultas}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.prodi ?? "Lintas prodi"}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "DISETUJUI"
                          ? "default"
                          : item.status === "DITOLAK"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {LABEL_STATUS_PERMOHONAN[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatTanggalPermohonan(item.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => bukaDialog(item)}>
                      Tinjau
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(dipilih)} onOpenChange={(buka) => !buka && setDipilih(null)}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dipilih?.matkul}</DialogTitle>
            <DialogDescription>
              {dipilih ? `${dipilih.nama} · ${dipilih.email}` : ""}
            </DialogDescription>
          </DialogHeader>

          {dipilih && (
            <div className="flex flex-col gap-4 text-sm">
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Lingkup
                  </dt>
                  <dd className="mt-1">
                    {dipilih.fakultas ?? "—"}
                    {dipilih.prodi ? ` · ${dipilih.prodi}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Ujian
                  </dt>
                  <dd className="mt-1">
                    {dipilih.jenis}
                    {dipilih.pertemuan ? ` · Pertemuan ${dipilih.pertemuan}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Izin berbagi
                  </dt>
                  <dd className="mt-1">
                    {dipilih.izin ? "Disatakan pemohon" : "Belum dinyatakan"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-1">
                    {LABEL_STATUS_PERMOHONAN[dipilih.status]}
                    {dipilih.reviewedAt ? ` · ${formatTanggalPermohonan(dipilih.reviewedAt)}` : ""}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Ringkasan dari pemohon
                </p>
                <p className="mt-1 whitespace-pre-wrap leading-6">{dipilih.ringkasan}</p>
              </div>

              {dipilih.tautan ? (
                <a
                  href={dipilih.tautan}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Buka berkas <ExternalLink aria-hidden className="size-4" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Pemohon tidak menyertakan tautan berkas — minta lewat email.
                </p>
              )}

              <a
                href={`mailto:${dipilih.email}?subject=${encodeURIComponent(`Materi ${dipilih.matkul} — SiKarsa`)}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Balas lewat email <Mail aria-hidden className="size-4" />
              </a>

              <div className="grid gap-1.5">
                <Label htmlFor="catatan-permohonan">Catatan admin (opsional)</Label>
                <Textarea
                  id="catatan-permohonan"
                  value={catatan}
                  onChange={(event) => setCatatan(event.target.value)}
                  rows={3}
                  maxLength={600}
                  placeholder="mis. deck sudah diterima, menunggu konfirmasi dosen."
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="ghost" onClick={hapus} disabled={pending} className="mr-auto text-destructive">
              <Trash2 aria-hidden /> Hapus
            </Button>
            <Button variant="outline" onClick={() => putuskan("MENUNGGU")} disabled={pending}>
              <RotateCcw aria-hidden /> Antrekan
            </Button>
            <Button variant="outline" onClick={() => putuskan("DITOLAK")} disabled={pending}>
              <X aria-hidden /> Tolak
            </Button>
            <Button onClick={() => putuskan("DISETUJUI")} disabled={pending}>
              <Check aria-hidden /> Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
