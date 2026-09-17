/**
 * Karsa — app/(desktop)/admin/kelas/[id]/_components/matkul-pj-tab.tsx
 * ----------------------------------------------------------------------------
 * Tab "Matkul & PJ" di halaman detail kelas (Sub-Fase 2D): tabel penugasan
 * matkul + PJ, dialog "Assign Matkul", dan dialog "Edit PJ".
 *
 * Pola sama dengan `mahasiswa-tab.tsx` (Sub-Fase 2C): otorisasi & validasi
 * tetap di Server Action; komponen ini hanya mengurus state dialog,
 * `useTransition`, dan toast Sonner.
 *
 * Dropdown PJ menampilkan mahasiswa kelas ini (non-admin) + akun admin —
 * sejak Fase 3A admin BOLEH merangkap PJ (PRD §6). Daftar kandidatnya dihitung
 * di server (`page.tsx`), dan server tetap memvalidasi ulang (`resolvePj()` di
 * `actions/kelas-matkul.ts`), jadi request manual pun tidak bisa menjadikan
 * user luar kelas sebagai PJ.
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  assignMatkulToKelas,
  removeKelasMatkul,
  updatePjKelasMatkul,
} from "@/actions/kelas-matkul";
import { Button } from "@/components/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  matkulLabel,
  pjKandidatLabel,
  pjLabel,
  type KelasMatkulRow,
  type MatkulOption,
  type PjKandidatOption,
} from "@/lib/kelas-matkul";

type Mode = "assign" | "edit";

export function MatkulPjTab({
  kelasId,
  kelasName,
  kelasMatkul,
  matkuls,
  pjKandidat,
}: {
  kelasId: string;
  kelasName: string;
  kelasMatkul: KelasMatkulRow[];
  matkuls: MatkulOption[];
  /** Mahasiswa kelas ini (non-admin) + admin; dihitung di `page.tsx`. */
  pjKandidat: PjKandidatOption[];
}) {
  // Admin boleh merangkap PJ (Fase 3A) — dipisah hanya untuk pengelompokan
  // tampilan; keputusan sah/tidaknya tetap di server (`resolvePj()`).
  const kandidatMahasiswa = React.useMemo(
    () => pjKandidat.filter((row) => !row.is_admin),
    [pjKandidat],
  );
  const kandidatAdmin = React.useMemo(
    () => pjKandidat.filter((row) => row.is_admin),
    [pjKandidat],
  );
  const matkulTersedia = React.useMemo(() => {
    const terpakai = new Set(kelasMatkul.map((row) => row.matkul.id));
    return matkuls.filter((matkul) => !terpakai.has(matkul.id));
  }, [kelasMatkul, matkuls]);

  const bisaAssign = matkulTersedia.length > 0 && pjKandidat.length > 0;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("assign");
  const [editing, setEditing] = React.useState<KelasMatkulRow | null>(null);
  const [matkulId, setMatkulId] = React.useState("");
  const [pjId, setPjId] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function openAssign() {
    if (!bisaAssign) return;
    setMode("assign");
    setEditing(null);
    setMatkulId(matkulTersedia[0]?.id ?? "");
    setPjId(pjKandidat[0]?.id ?? "");
    setDialogOpen(true);
  }

  function openEdit(row: KelasMatkulRow) {
    setMode("edit");
    setEditing(row);
    setMatkulId(row.matkul.id);
    setPjId(row.pj.id);
    setDialogOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      // --- Mode Edit PJ ---
      if (mode === "edit") {
        if (!editing) return;
        const result = await updatePjKelasMatkul(editing.id, { pj_id: pjId });
        if (result.ok) {
          toast.success(result.message ?? "PJ diperbarui.");
          setDialogOpen(false);
        } else {
          toast.error(result.error);
        }
        return;
      }

      // --- Mode Assign Matkul ---
      if (!matkulId) {
        toast.error("Pilih matkul dulu.");
        return;
      }
      if (!pjId) {
        toast.error("Pilih PJ dulu.");
        return;
      }

      const result = await assignMatkulToKelas(kelasId, {
        matkul_id: matkulId,
        pj_id: pjId,
      });
      if (result.ok) {
        toast.success(result.message ?? "Matkul di-assign.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemove(row: KelasMatkulRow) {
    const confirmed = window.confirm(
      `Hapus penugasan ${matkulLabel(row.matkul)} dari kelas ${kelasName}?\n\n` +
        `PJ ${pjLabel(row.pj)} akan dilepas dari matkul ini. Penghapusan dibatalkan ` +
        `kalau sudah ada poin tercatat, supaya poin mahasiswa tidak ikut hilang.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await removeKelasMatkul(row.id);
      if (result.ok) {
        toast.success(result.message ?? "Penugasan dihapus.");
      } else {
        toast.error(result.error);
      }
    });
  }

  // PJ saat ini pada baris yang sedang diedit, kalau ternyata bukan termasuk
  // kandidat dropdown (kasus langka: PJ-nya sudah tidak ada di kelas ini) —
  // supaya dropdown tidak menampilkan pilihan yang menyesatkan.
  const pjDiLuarKandidat =
    mode === "edit" &&
    editing !== null &&
    !pjKandidat.some((row) => row.id === editing.pj.id)
      ? editing.pj
      : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {kelasMatkul.length} matkul di-assign ke kelas {kelasName}.
        </p>
        <Button
          onClick={openAssign}
          disabled={!bisaAssign || pending}
          title={
            bisaAssign
              ? undefined
              : matkulTersedia.length === 0
                ? "Semua matkul sudah di-assign ke kelas ini."
                : "Tambahkan mahasiswa dulu ke kelas ini (tab Mahasiswa)."
          }
        >
          <Plus aria-hidden />
          Assign Matkul
        </Button>
      </div>

      {!bisaAssign ? (
        <div className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
          {matkulTersedia.length === 0 ? (
            <p>
              Semua matkul sudah di-assign ke kelas ini. Tambah matkul baru dulu
              di{" "}
              <Link
                href="/admin/matkul"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                halaman Matkul
              </Link>{" "}
              kalau masih ada matkul yang belum masuk.
            </p>
          ) : (
            <p className="flex flex-wrap items-center gap-1">
              <UserPlus aria-hidden className="size-4" />
              Tambahkan mahasiswa dulu ke kelas ini
              <span className="font-medium">(tab Mahasiswa)</span> — PJ harus
              mahasiswa kelas ini atau akun admin.
            </p>
          )}
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card shadow-soft">
        {kelasMatkul.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Belum ada matkul yang di-assign.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matkul</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>PJ</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kelasMatkul.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.matkul.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.matkul.code ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{pjLabel(row.pj)}</span>
                      <span className="text-xs text-muted-foreground">
                        {row.pj.nim ?? "NIM belum ada"} · {row.pj.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil aria-hidden />
                        Edit PJ
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleRemove(row)}
                      >
                        <Trash2 aria-hidden />
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {kelasMatkul.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Menghapus penugasan akan ditolak bila sudah ada poin tercatat untuk
          matkul itu — poin mahasiswa tidak boleh ikut terhapus. Ganti PJ tidak
          mengubah riwayat: poin lama tetap tercatat atas nama PJ yang mencatat
          saat itu.
        </p>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" && editing
                ? `Edit PJ — ${editing.matkul.name}`
                : "Assign Matkul"}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? "Pilih PJ baru dari mahasiswa kelas ini atau akun admin. Poin yang sudah tercatat tidak berubah."
                : "Pilih matkul yang belum di-assign dan tentukan PJ-nya (mahasiswa kelas ini atau admin)."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            {mode === "assign" ? (
              <div className="grid gap-2">
                <Label htmlFor="km-matkul">Matkul</Label>
                <Select
                  id="km-matkul"
                  value={matkulId}
                  onValueChange={setMatkulId}
                  disabled={matkulTersedia.length === 0}
                >
                  {matkulTersedia.length === 0 ? (
                    <option value="">Semua matkul sudah di-assign</option>
                  ) : (
                    matkulTersedia.map((matkul) => (
                      <option key={matkul.id} value={matkul.id}>
                        {matkulLabel(matkul)}
                      </option>
                    ))
                  )}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Hanya matkul yang belum di-assign ke kelas ini yang muncul.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Matkul</Label>
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2 text-sm">
                  <span className="font-medium">
                    {editing ? editing.matkul.name : "—"}
                  </span>
                  {editing?.matkul.code ? (
                    <Badge variant="outline">{editing.matkul.code}</Badge>
                  ) : null}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="km-pj">PJ</Label>
              <Select
                id="km-pj"
                value={pjId}
                onValueChange={setPjId}
                disabled={pjKandidat.length === 0}
              >
                {pjKandidat.length === 0 ? (
                  <option value="">Belum ada kandidat PJ</option>
                ) : (
                  <>
                    {kandidatMahasiswa.length > 0 ? (
                      <optgroup label="Mahasiswa kelas ini">
                        {kandidatMahasiswa.map((kandidat) => (
                          <option key={kandidat.id} value={kandidat.id}>
                            {pjKandidatLabel(kandidat)}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {kandidatAdmin.length > 0 ? (
                      <optgroup label="Admin (boleh merangkap PJ)">
                        {kandidatAdmin.map((kandidat) => (
                          <option key={kandidat.id} value={kandidat.id}>
                            {pjKandidatLabel(kandidat)}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </>
                )}
                {pjDiLuarKandidat ? (
                  <option value={pjDiLuarKandidat.id}>
                    {pjLabel(pjDiLuarKandidat)} — PJ saat ini (di luar kandidat)
                  </option>
                ) : null}
              </Select>
              <p className="text-xs text-muted-foreground">
                PJ = mahasiswa kelas ini, atau akun admin yang merangkap PJ.
                User tanpa kelas / dari kelas lain akan ditolak server.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={pending || pjId.length === 0}>
                {pending
                  ? "Menyimpan..."
                  : mode === "edit"
                    ? "Simpan PJ"
                    : "Assign Matkul"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
