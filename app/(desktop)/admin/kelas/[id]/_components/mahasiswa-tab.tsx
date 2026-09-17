/**
 * Karsa — app/(desktop)/admin/kelas/[id]/_components/mahasiswa-tab.tsx
 * ----------------------------------------------------------------------------
 * Tab "Mahasiswa" di halaman detail kelas (Sub-Fase 2C): tabel anggota + dua
 * jalur menambah + hapus (lepas dari kelas).
 *
 * Pola sama dengan `prodi-manager.tsx` / `kelas-manager.tsx` (Sub-Fase 2A–2B):
 * otorisasi & validasi tetap di Server Action; komponen ini hanya mengurus
 * state dialog, `useTransition`, dan toast Sonner.
 *
 * Dua mode dialog:
 *   1. "Cari user yang sudah ada" — input email → tombol Cari → preview user
 *      (badge PJ/Admin + alasan bila ditolak) → tombol "Tambahkan".
 *      Preview hanya UX; `addMahasiswaToKelas()` memvalidasi ulang di server.
 *   2. "Buat user baru" — nama + NIM + email untuk mahasiswa yang belum pernah
 *      login Google (`createAndAddMahasiswa()`).
 */
"use client";

import * as React from "react";
import { Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  addMahasiswaToKelas,
  createAndAddMahasiswa,
  findUserForKelas,
  removeMahasiswaFromKelas,
} from "@/actions/mahasiswa";
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
import {
  NIM_MESSAGE,
  STUDENT_EMAIL_DOMAIN,
  type MahasiswaRow,
  type UserPreviewResult,
} from "@/lib/mahasiswa";
import { cn } from "@/lib/utils";

type Mode = "cari" | "baru";

/** Badge peran — prioritas admin > PJ > mahasiswa (sama dengan `lib/roles.ts`). */
function PeranBadge({ row }: { row: MahasiswaRow }) {
  if (row.is_admin) return <Badge variant="secondary">Admin</Badge>;
  if (row.is_pj) return <Badge>PJ</Badge>;
  return <Badge variant="outline">Mahasiswa</Badge>;
}

export function MahasiswaTab({
  kelasId,
  kelasName,
  mahasiswa,
}: {
  kelasId: string;
  kelasName: string;
  mahasiswa: MahasiswaRow[];
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("cari");
  const [pending, startTransition] = React.useTransition();
  const [cariPending, startCariTransition] = React.useTransition();

  // Mode 1 — cari user yang sudah ada.
  const [email, setEmail] = React.useState("");
  const [preview, setPreview] = React.useState<UserPreviewResult | null>(null);

  // Mode 2 — buat user baru.
  const [name, setName] = React.useState("");
  const [nim, setNim] = React.useState("");
  const [emailBaru, setEmailBaru] = React.useState("");

  function openDialog() {
    setMode("cari");
    setEmail("");
    setPreview(null);
    setName("");
    setNim("");
    setEmailBaru("");
    setDialogOpen(true);
  }

  /** Pindah ke mode 2 dengan email yang tadi dicari sudah terisi. */
  function switchToCreate(seedEmail: string) {
    setMode("baru");
    setEmailBaru(seedEmail);
    setPreview(null);
  }

  function handleCari(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startCariTransition(async () => {
      const result = await findUserForKelas(kelasId, { email });
      setPreview(result);
      if (!result.ok) toast.error(result.error);
    });
  }

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter di field email = "lakukan yang masuk akal": kalau user belum
    // di-preview/siap, jalankan pencarian; kalau sudah siap, tambahkan.
    if (!preview || preview.ok === false || preview.status !== "siap") {
      handleCari(event);
      return;
    }
    startTransition(async () => {
      const result = await addMahasiswaToKelas(kelasId, { email });
      if (result.ok) {
        toast.success(result.message ?? "Mahasiswa ditambahkan.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
        // Segarkan preview supaya alasan penolakan terlihat di dialog
        // (mis. kelas berubah antara pencarian & penambahan).
        setPreview(await findUserForKelas(kelasId, { email }));
      }
    });
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createAndAddMahasiswa(kelasId, { name, nim, email: emailBaru });
      if (result.ok) {
        toast.success(result.message ?? "Mahasiswa baru ditambahkan.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemove(row: MahasiswaRow) {
    if (row.is_pj) {
      toast.error(
        "Mahasiswa ini masih PJ. PJ-nya harus diganti dulu sebelum bisa dihapus dari kelas.",
      );
      return;
    }

    const nama = row.name?.trim() || row.email;
    const confirmed = window.confirm(
      `Keluarkan ${nama} dari kelas ${kelasName}?\n\nAkunnya tetap bisa login — hanya kelasnya yang dilepas.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await removeMahasiswaFromKelas(row.id);
      if (result.ok) {
        toast.success(result.message ?? "Mahasiswa dikeluarkan dari kelas.");
      } else {
        toast.error(result.error);
      }
    });
  }

  const bisaDitambahkan =
    preview?.ok === true && preview.status === "siap" && !cariPending && !pending;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {mahasiswa.length} mahasiswa terdaftar di kelas {kelasName}.
        </p>
        <Button onClick={openDialog}>
          <UserPlus aria-hidden />
          Tambah Mahasiswa
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-soft">
        {mahasiswa.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Belum ada mahasiswa di kelas ini. Klik &quot;Tambah Mahasiswa&quot;
            untuk menambahkan.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>NIM</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mahasiswa.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.name?.trim() || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.nim ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.email}
                  </TableCell>
                  <TableCell>
                    <PeranBadge row={row} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending || row.is_pj}
                        title={
                          row.is_pj
                            ? "Masih PJ — ganti PJ-nya dulu (tab Matkul & PJ, Sub-Fase 2D)."
                            : undefined
                        }
                        className={cn(
                          "text-destructive hover:bg-destructive/10 hover:text-destructive",
                          row.is_pj &&
                            "text-muted-foreground hover:bg-transparent hover:text-muted-foreground",
                        )}
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

      {mahasiswa.some((row) => row.is_pj) ? (
        <p className="text-xs text-muted-foreground">
          Tombol Hapus dinonaktifkan untuk mahasiswa yang masih PJ: PJ harus
          diganti dulu di tab <span className="font-medium">Matkul &amp; PJ</span>{" "}
          sebelum ia bisa dikeluarkan dari kelas.
        </p>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Mahasiswa</DialogTitle>
            <DialogDescription>
              {mode === "cari"
                ? "Cari user yang sudah pernah login Google, lalu tambahkan ke kelas ini."
                : "Buat akun untuk mahasiswa yang belum pernah login, langsung sekaligus masuk kelas ini."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 rounded-md border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("cari")}
              className={cn(
                "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "cari"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Cari user yang sudah ada
            </button>
            <button
              type="button"
              onClick={() => setMode("baru")}
              className={cn(
                "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "baru"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Buat user baru
            </button>
          </div>

          {mode === "cari" ? (
            <form onSubmit={handleAdd} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mhs-email">Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="mhs-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setPreview(null);
                    }}
                    placeholder={`nama@${STUDENT_EMAIL_DOMAIN}`}
                    required
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={cariPending || email.trim().length === 0}
                    onClick={() => {
                      startCariTransition(async () => {
                        const result = await findUserForKelas(kelasId, { email });
                        setPreview(result);
                        if (!result.ok) toast.error(result.error);
                      });
                    }}
                  >
                    <Search aria-hidden />
                    {cariPending ? "Mencari..." : "Cari"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hanya email @{STUDENT_EMAIL_DOMAIN}. User yang belum pernah
                  login Google belum ada di sistem — pakai mode &quot;Buat user
                  baru&quot;.
                </p>
              </div>

              {preview ? (
                <div
                  className={cn(
                    "grid gap-2 rounded-md border p-3 text-sm",
                    preview.ok && preview.status === "siap"
                      ? "border-primary/40 bg-accent text-accent-foreground"
                      : "border-destructive/40 bg-destructive/10 text-destructive",
                  )}
                >
                  {preview.ok && preview.status !== "tidak_ditemukan" ? (
                    <div className="grid gap-1">
                      <p className="font-medium text-foreground">
                        {preview.user.name?.trim() || "Tanpa nama"}
                        {preview.user.is_pj ? (
                          <Badge className="ml-2 align-middle">PJ</Badge>
                        ) : null}
                        {preview.user.is_admin ? (
                          <Badge variant="secondary" className="ml-2 align-middle">
                            Admin
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {preview.user.nim ?? "NIM belum ada"} ·{" "}
                        {preview.user.email}
                      </p>
                    </div>
                  ) : null}

                  <p>
                    {preview.ok ? preview.message : preview.error}
                  </p>

                  {preview.ok && preview.status === "tidak_ditemukan" ? (
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => switchToCreate(email)}
                      >
                        <UserPlus aria-hidden />
                        Buat user baru dengan email ini
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={!bisaDitambahkan}>
                  {pending ? "Menambahkan..." : "Tambahkan"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mhs-baru-nama">Nama</Label>
                <Input
                  id="mhs-baru-nama"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama lengkap mahasiswa"
                  required
                  maxLength={100}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mhs-baru-nim">NIM</Label>
                <Input
                  id="mhs-baru-nim"
                  value={nim}
                  onChange={(event) => setNim(event.target.value)}
                  placeholder="2310501004"
                  required
                  inputMode="numeric"
                  pattern="\d{5,15}"
                  title={NIM_MESSAGE}
                />
                <p className="text-xs text-muted-foreground">{NIM_MESSAGE}</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mhs-baru-email">Email</Label>
                <Input
                  id="mhs-baru-email"
                  type="email"
                  value={emailBaru}
                  onChange={(event) => setEmailBaru(event.target.value)}
                  placeholder={`nama@${STUDENT_EMAIL_DOMAIN}`}
                  required
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Akun dibuat tanpa baris OAuth: saat mahasiswa login Google
                  dengan email ini, akunnya otomatis tertaut dan kelasnya tetap.
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setMode("cari");
                    setPreview(null);
                  }}
                >
                  Kembali ke pencarian
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Menyimpan..." : "Simpan & Tambahkan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
