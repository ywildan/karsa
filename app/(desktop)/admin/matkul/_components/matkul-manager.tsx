/**
 * Karsa — app/(desktop)/admin/matkul/_components/matkul-manager.tsx
 * ----------------------------------------------------------------------------
 * Tabel + dialog CRUD matkul (client component). Otorisasi tetap dijaga di
 * server action; di sini hanya state dialog, `useTransition`, dan toast.
 */
"use client";

import * as React from "react";
import type { Matkul } from "@prisma/client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createMatkul, deleteMatkul, updateMatkul } from "@/actions/matkul";
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

type MatkulFormState = { name: string; code: string };

const EMPTY_FORM: MatkulFormState = { name: "", code: "" };

export function MatkulManager({ matkuls }: { matkuls: Matkul[] }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Matkul | null>(null);
  const [form, setForm] = React.useState<MatkulFormState>(EMPTY_FORM);
  const [pending, startTransition] = React.useTransition();

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(matkul: Matkul) {
    setEditing(matkul);
    setForm({ name: matkul.name, code: matkul.code ?? "" });
    setDialogOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...form };
    startTransition(async () => {
      const result = editing
        ? await updateMatkul(editing.id, payload)
        : await createMatkul(payload);
      if (result.ok) {
        toast.success(result.message ?? "Berhasil disimpan.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(matkul: Matkul) {
    const confirmed = window.confirm(
      `Hapus matkul "${matkul.name}"? Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteMatkul(matkul.id);
      if (result.ok) {
        toast.success(result.message ?? "Matkul dihapus.");
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
          Tambah Matkul
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-soft">
        {matkuls.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Belum ada matkul. Tambahkan matkul pertama untuk memulai.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matkuls.map((matkul) => (
                <TableRow key={matkul.id}>
                  <TableCell className="font-medium">{matkul.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {matkul.code ?? "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => openEdit(matkul)}
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
                        onClick={() => handleDelete(matkul)}
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
              {editing ? `Edit Matkul ${editing.name}` : "Tambah Matkul"}
            </DialogTitle>
            <DialogDescription>
              Kode bersifat opsional dan harus unik bila diisi.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="matkul-name">Nama</Label>
              <Input
                id="matkul-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Pemrograman Web"
                required
                maxLength={100}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="matkul-code">Kode (opsional)</Label>
              <Input
                id="matkul-code"
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder="TIF1101"
                maxLength={20}
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
                    : "Tambah Matkul"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
