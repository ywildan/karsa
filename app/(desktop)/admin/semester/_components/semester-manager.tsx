/**
 * Karsa — app/(desktop)/admin/semester/_components/semester-manager.tsx
 * ----------------------------------------------------------------------------
 * Tabel + dialog CRUD semester (client component). Server action tetap
 * menjaga otorisasi (`requireAdmin()` di setiap action) — komponen ini hanya
 * UX: state dialog, loading `useTransition`, dan toast Sonner.
 */
"use client";

import * as React from "react";
import type { Semester } from "@prisma/client";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createSemester,
  deleteSemester,
  setActiveSemester,
  updateSemester,
} from "@/actions/semester";
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
import { formatDateWib, toDateInputWib } from "@/lib/utils";

type SemesterFormState = {
  name: string;
  start_date: string;
  end_date: string;
};

const EMPTY_FORM: SemesterFormState = { name: "", start_date: "", end_date: "" };

export function SemesterManager({ semesters }: { semesters: Semester[] }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Semester | null>(null);
  const [form, setForm] = React.useState<SemesterFormState>(EMPTY_FORM);
  const [pending, startTransition] = React.useTransition();

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(semester: Semester) {
    setEditing(semester);
    setForm({
      name: semester.name,
      // Hitung dalam WIB supaya tanggal di form = tanggal yang tersimpan.
      start_date: toDateInputWib(semester.start_date),
      end_date: toDateInputWib(semester.end_date),
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...form };
    startTransition(async () => {
      const result = editing
        ? await updateSemester(editing.id, payload)
        : await createSemester(payload);
      if (result.ok) {
        toast.success(result.message ?? "Berhasil disimpan.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSetActive(semester: Semester) {
    startTransition(async () => {
      const result = await setActiveSemester(semester.id);
      if (result.ok) {
        toast.success(result.message ?? "Semester aktif diganti.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(semester: Semester) {
    const confirmed = window.confirm(
      `Hapus semester "${semester.name}"? Tindakan ini tidak bisa dibatalkan.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteSemester(semester.id);
      if (result.ok) {
        toast.success(result.message ?? "Semester dihapus.");
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
          Tambah Semester
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-soft">
        {semesters.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Belum ada semester. Tambahkan semester pertama untuk memulai.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tanggal Mulai</TableHead>
                <TableHead>Tanggal Akhir</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semesters.map((semester) => (
                <TableRow key={semester.id}>
                  <TableCell className="font-medium">{semester.name}</TableCell>
                  <TableCell>{formatDateWib(semester.start_date)}</TableCell>
                  <TableCell>{formatDateWib(semester.end_date)}</TableCell>
                  <TableCell>
                    {semester.is_active ? (
                      <Badge>Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Tidak aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending || semester.is_active}
                        onClick={() => handleSetActive(semester)}
                      >
                        <Star aria-hidden />
                        Set Aktif
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => openEdit(semester)}
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
                        onClick={() => handleDelete(semester)}
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
              {editing ? `Edit Semester ${editing.name}` : "Tambah Semester"}
            </DialogTitle>
            <DialogDescription>
              Contoh nama: &quot;Ganjil 2026/2027&quot;. Semester baru dibuat
              dalam status tidak aktif.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="semester-name">Nama</Label>
              <Input
                id="semester-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Ganjil 2026/2027"
                required
                maxLength={100}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="semester-start">Tanggal Mulai</Label>
                <Input
                  id="semester-start"
                  type="date"
                  value={form.start_date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      start_date: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="semester-end">Tanggal Akhir</Label>
                <Input
                  id="semester-end"
                  type="date"
                  value={form.end_date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, end_date: event.target.value }))
                  }
                  required
                />
              </div>
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
                    : "Tambah Semester"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
