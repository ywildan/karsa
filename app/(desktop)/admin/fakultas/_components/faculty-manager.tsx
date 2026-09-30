"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createFaculty, deleteFaculty, updateFaculty } from "@/actions/faculty";
import { Button } from "@/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type FacultyRow = { id: string; name: string; _count: { prodis: number } };

export function FacultyManager({ faculties }: { faculties: FacultyRow[] }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FacultyRow | null>(null);
  const [name, setName] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function showCreate() { setEditing(null); setName(""); setOpen(true); }
  function showEdit(faculty: FacultyRow) { setEditing(faculty); setName(faculty.name); setOpen(true); }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = editing
        ? await updateFaculty(editing.id, { name })
        : await createFaculty({ name });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(result.message ?? "Fakultas tersimpan.");
      setOpen(false);
    });
  }
  function remove(faculty: FacultyRow) {
    if (!window.confirm(`Hapus fakultas “${faculty.name}”?`)) return;
    startTransition(async () => {
      const result = await deleteFaculty(faculty.id);
      if (result.ok) toast.success(result.message ?? "Fakultas dihapus.");
      else toast.error(result.error);
    });
  }

  return <>
    <div className="flex justify-end"><Button onClick={showCreate}><Plus aria-hidden />Tambah Fakultas</Button></div>
    <div className="rounded-lg border border-border bg-card shadow-soft">
      {faculties.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Belum ada fakultas. Tambahkan fakultas terlebih dahulu.</p> : (
        <Table>
          <TableHeader><TableRow><TableHead>Nama fakultas</TableHead><TableHead>Prodi terhubung</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
          <TableBody>{faculties.map((faculty) => <TableRow key={faculty.id}>
            <TableCell className="font-medium">{faculty.name}</TableCell>
            <TableCell>{faculty._count.prodis}</TableCell>
            <TableCell><div className="flex justify-end gap-1.5">
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => showEdit(faculty)}><Pencil aria-hidden />Edit</Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(faculty)}><Trash2 aria-hidden />Hapus</Button>
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table>
      )}
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent><DialogHeader>
        <DialogTitle>{editing ? "Edit Fakultas" : "Tambah Fakultas"}</DialogTitle>
        <DialogDescription>Nama fakultas harus sama dengan nama resmi di UNTIDAR.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="faculty-name">Nama</Label><Input id="faculty-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required placeholder="Fakultas Teknik" /></div>
        <DialogFooter><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
      </form></DialogContent>
    </Dialog>
  </>;
}
