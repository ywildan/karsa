/**
 * Karsa — app/(desktop)/admin/prodi/_components/prodi-manager.tsx
 * ----------------------------------------------------------------------------
 * Tabel + dialog CRUD prodi (client component). Otorisasi tetap dijaga di
 * server action; di sini hanya state dialog, `useTransition`, dan toast.
 */
"use client";

import * as React from "react";
import type { Prodi } from "@prisma/client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createProdi, deleteProdi, updateProdi } from "@/actions/prodi";
import { Button } from "@/components/button";
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

export function ProdiManager({ prodis }: { prodis: Prodi[] }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Prodi | null>(null);
  const [name, setName] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function openCreate() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(prodi: Prodi) {
    setEditing(prodi);
    setName(prodi.name);
    setDialogOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { name };
    startTransition(async () => {
      const result = editing
        ? await updateProdi(editing.id, payload)
        : await createProdi(payload);
      if (result.ok) {
        toast.success(result.message ?? "Berhasil disimpan.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(prodi: Prodi) {
    const confirmed = window.confirm(
      `Hapus prodi "${prodi.name}"? Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteProdi(prodi.id);
      if (result.ok) {
        toast.success(result.message ?? "Prodi dihapus.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus aria-hidden />
          Tambah Prodi
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-soft">
        {prodis.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Belum ada prodi. Tambahkan prodi pertama untuk memulai.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prodis.map((prodi) => (
                <TableRow key={prodi.id}>
                  <TableCell className="font-medium">{prodi.name}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => openEdit(prodi)}
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
                        onClick={() => handleDelete(prodi)}
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
              {editing ? `Edit Prodi ${editing.name}` : "Tambah Prodi"}
            </DialogTitle>
            <DialogDescription>
              Nama prodi harus unik, mis. &quot;Teknik Informatika&quot;.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="prodi-name">Nama</Label>
              <Input
                id="prodi-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Teknik Informatika"
                required
                maxLength={100}
              />
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
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Menyimpan..."
                  : editing
                    ? "Simpan Perubahan"
                    : "Tambah Prodi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
