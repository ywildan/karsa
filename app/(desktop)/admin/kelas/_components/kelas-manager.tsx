/**
 * Karsa — app/(desktop)/admin/kelas/_components/kelas-manager.tsx
 * ----------------------------------------------------------------------------
 * Tabel + dialog CRUD kelas (client component). Otorisasi tetap dijaga di
 * server action; di sini hanya state dialog, `useTransition`, dan toast.
 * Pola mengikuti `prodi-manager.tsx` (Sub-Fase 2A).
 */
"use client";

import * as React from "react";
import Link from "next/link";
import type { Prisma, Prodi, Semester } from "@prisma/client";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createKelas, deleteKelas, updateKelas } from "@/actions/kelas";
import { Button } from "@/components/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type KelasRow = Prisma.KelasGetPayload<{
  include: {
    prodi: true;
    semester: true;
    _count: { select: { users: true; kelasMatkul: true } };
  };
}>;

export function KelasManager({
  kelas,
  prodis,
  semesters,
}: {
  kelas: KelasRow[];
  prodis: Prodi[];
  semesters: Semester[];
}) {
  const canCreate = prodis.length > 0 && semesters.length > 0;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<KelasRow | null>(null);
  const [name, setName] = React.useState("");
  const [prodiId, setProdiId] = React.useState("");
  const [semesterId, setSemesterId] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function openCreate() {
    if (!canCreate) return;
    setEditing(null);
    setName("");
    setProdiId(prodis[0]?.id ?? "");
    setSemesterId(semesters[0]?.id ?? "");
    setDialogOpen(true);
  }

  function openEdit(row: KelasRow) {
    setEditing(row);
    setName(row.name);
    setProdiId(row.prodi_id);
    setSemesterId(row.semester_id);
    setDialogOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { name, prodi_id: prodiId, semester_id: semesterId };
    startTransition(async () => {
      const result = editing
        ? await updateKelas(editing.id, payload)
        : await createKelas(payload);
      if (result.ok) {
        toast.success(result.message ?? "Berhasil disimpan.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(row: KelasRow) {
    const confirmed = window.confirm(
      `Hapus kelas "${row.name}"? Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteKelas(row.id);
      if (result.ok) {
        toast.success(result.message ?? "Kelas dihapus.");
      } else {
        toast.error(result.error);
      }
    });
  }

  // Edge case: butuh minimal satu prodi & satu semester sebelum bisa membuat
  // kelas — tampilkan pesan + link, sembunyikan tombol & tabel.
  if (!canCreate) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
        Tambahkan minimal satu{" "}
        <Link
          href="/admin/prodi"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          prodi
        </Link>{" "}
        dan satu{" "}
        <Link
          href="/admin/semester"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          semester
        </Link>{" "}
        terlebih dahulu sebelum membuat kelas.
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus aria-hidden />
          Tambah Kelas
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-soft">
        {kelas.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Belum ada kelas. Klik &quot;Tambah Kelas&quot; untuk memulai.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Prodi</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead className="text-right">Mahasiswa</TableHead>
                <TableHead className="text-right">Matkul</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kelas.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.prodi.name}</TableCell>
                  <TableCell>{row.semester.name}</TableCell>
                  <TableCell className="text-right">{row._count.users}</TableCell>
                  <TableCell className="text-right">
                    {row._count.kelasMatkul}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/admin/kelas/${row.id}`}>
                          Detail
                          <ChevronRight aria-hidden />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil aria-hidden />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(row)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit Kelas ${editing.name}` : "Tambah Kelas"}
            </DialogTitle>
            <DialogDescription>
              Nama kelas unik per kombinasi prodi + semester.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="kelas-name">Nama</Label>
              <Input
                id="kelas-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="TI-01"
                required
                maxLength={50}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kelas-prodi">Prodi</Label>
              <Select
                id="kelas-prodi"
                value={prodiId}
                onValueChange={setProdiId}
              >
                {prodis.map((prodi) => (
                  <option key={prodi.id} value={prodi.id}>
                    {prodi.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="kelas-semester">Semester</Label>
              <Select
                id="kelas-semester"
                value={semesterId}
                onValueChange={setSemesterId}
              >
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name}
                  </option>
                ))}
              </Select>
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
              <Button
                type="submit"
                disabled={pending || !prodiId || !semesterId}
              >
                {pending
                  ? "Menyimpan..."
                  : editing
                    ? "Simpan Perubahan"
                    : "Tambah Kelas"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
