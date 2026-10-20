"use client";

/**
 * Karsa — app/(desktop)/admin/materi/_components/materi-manager.tsx
 * ----------------------------------------------------------------------------
 * Tabel + dialog CRUD materi (client). Otorisasi tetap di server action;
 * di sini hanya state, unggahan berkas (dibaca di browser), dan toast.
 *
 * Tabel datar satu tingkat; lingkup tiap materi tampil sebagai label di
 * barisnya sendiri (Umum / fakultas / prodi), lalu disaring lewat dropdown
 * Status · Fakultas · Program studi di atas tabel.
 */
import * as React from "react";
import Link from "next/link";
import { FileUp, Inbox, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createMateri,
  deleteMateri,
  setStatusMateri,
  updateMateri,
} from "@/actions/materi";
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
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  formatTanggalMateri,
  JENIS_UJIAN,
  LABEL_JENIS,
  type JenisUjian,
  type StatusMateri,
} from "@/lib/materi";
import { cn } from "@/lib/utils";

export type MateriAdmin = {
  id: string;
  slug: string;
  judul: string;
  matkul: string;
  jenis: JenisUjian;
  pertemuan: string | null;
  subCpmk: string | null;
  bobot: number | null;
  sumber: string | null;
  ringkasan: string;
  bagian: number | null;
  status: StatusMateri;
  diperbarui: string;
  facultyId: string | null;
  prodiId: string | null;
  fakultas: string | null;
  prodi: string | null;
};

export type FakultasPilihan = {
  id: string;
  name: string;
  prodi: { id: string; name: string }[];
};

type FormState = {
  judul: string;
  slug: string;
  matkul: string;
  jenis: JenisUjian;
  pertemuan: string;
  subCpmk: string;
  bobot: string;
  bagian: string;
  sumber: string;
  ringkasan: string;
  status: StatusMateri;
  facultyId: string;
  prodiId: string;
};

const EMPTY_FORM: FormState = {
  judul: "",
  slug: "",
  matkul: "",
  jenis: "UTS",
  pertemuan: "",
  subCpmk: "",
  bobot: "",
  bagian: "",
  sumber: "",
  ringkasan: "",
  status: "DRAFT",
  facultyId: "",
  prodiId: "",
};

export function MateriManager({
  daftar,
  fakultas,
  jumlahPermohonan = 0,
}: {
  daftar: MateriAdmin[];
  fakultas: FakultasPilihan[];
  /** Jumlah permohonan berstatus menunggu — ditampilkan di tombol Permohonan. */
  jumlahPermohonan?: number;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MateriAdmin | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [html, setHtml] = React.useState<string>("");
  const [namaBerkas, setNamaBerkas] = React.useState<string>("");
  // Filter tampilan: status, fakultas, prodi. Semuanya di sisi klien dari
  // daftar yang sudah dikirim server — tidak ada query ulang saat diubah.
  const [filterStatus, setFilterStatus] = React.useState<
    "semua" | StatusMateri
  >("semua");
  // "semua" | "umum" (tanpa fakultas) | id fakultas
  const [filterFakultas, setFilterFakultas] = React.useState<string>("semua");
  // "semua" | "lintas" (fakultas tanpa prodi) | id prodi
  const [filterProdi, setFilterProdi] = React.useState<string>("semua");
  const [pending, startTransition] = React.useTransition();

  const jumlahTerbit = daftar.filter((item) => item.status === "TERBIT").length;
  const jumlahDraf = daftar.length - jumlahTerbit;
  const jumlahUmum = daftar.filter((item) => !item.facultyId).length;

  const tampil = React.useMemo(
    () =>
      daftar.filter((item) => {
        if (filterStatus !== "semua" && item.status !== filterStatus) {
          return false;
        }
        if (filterFakultas === "umum" && item.facultyId) return false;
        if (
          filterFakultas !== "semua" &&
          filterFakultas !== "umum" &&
          item.facultyId !== filterFakultas
        ) {
          return false;
        }
        if (filterProdi === "lintas" && (!item.facultyId || item.prodiId)) {
          return false;
        }
        if (
          filterProdi !== "semua" &&
          filterProdi !== "lintas" &&
          item.prodiId !== filterProdi
        ) {
          return false;
        }
        return true;
      }),
    [daftar, filterStatus, filterFakultas, filterProdi],
  );

  const pilihanProdi =
    filterFakultas === "umum"
      ? []
      : filterFakultas === "semua"
        ? fakultas.flatMap((item) => item.prodi)
        : (fakultas.find((item) => item.id === filterFakultas)?.prodi ?? []);

  function ubahFakultas(nilai: string) {
    setFilterFakultas(nilai);
    // Prodi milik fakultas lain tidak mungkin cocok lagi dengan saringan baru.
    setFilterProdi("semua");
  }

  function resetFilter() {
    setFilterStatus("semua");
    setFilterFakultas("semua");
    setFilterProdi("semua");
  }

  const prodiTersedia = React.useMemo(() => {
    if (!form.facultyId) return fakultas.flatMap((item) => item.prodi);
    return fakultas.find((item) => item.id === form.facultyId)?.prodi ?? [];
  }, [fakultas, form.facultyId]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setHtml("");
    setNamaBerkas("");
    setDialogOpen(true);
  }

  function openEdit(materi: MateriAdmin) {
    setEditing(materi);
    setForm({
      judul: materi.judul,
      slug: materi.slug,
      matkul: materi.matkul,
      jenis: materi.jenis,
      pertemuan: materi.pertemuan ?? "",
      subCpmk: materi.subCpmk ?? "",
      bobot: materi.bobot === null ? "" : String(materi.bobot),
      bagian: materi.bagian === null ? "" : String(materi.bagian),
      sumber: materi.sumber ?? "",
      ringkasan: materi.ringkasan,
      status: materi.status,
      facultyId: materi.facultyId ?? "",
      prodiId: materi.prodiId ?? "",
    });
    // Deck lama tidak dikirim ke browser; kosong = pertahankan yang ada.
    setHtml("");
    setNamaBerkas("");
    setDialogOpen(true);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 1_500_000) {
      toast.error("Berkas lebih dari 1,5 MB. Kecilkan deck dulu.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      setHtml(text);
      setNamaBerkas(file.name);
    } catch {
      toast.error("Berkas tidak bisa dibaca.");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing && html.trim().length < 200) {
      toast.error("Unggah berkas HTML deck dulu.");
      return;
    }

    const payload = {
      judul: form.judul,
      slug: form.slug || undefined,
      matkul: form.matkul,
      jenis: form.jenis,
      pertemuan: form.pertemuan,
      subCpmk: form.subCpmk,
      bobot: form.bobot ? Number(form.bobot) : undefined,
      bagian: form.bagian ? Number(form.bagian) : undefined,
      sumber: form.sumber,
      ringkasan: form.ringkasan,
      status: form.status,
      facultyId: form.facultyId || undefined,
      prodiId: form.prodiId || undefined,
      html: html.trim().length >= 200 ? html : undefined,
    };

    startTransition(async () => {
      const result = editing
        ? await updateMateri(editing.id, payload)
        : await createMateri(payload);

      if (result.ok) {
        toast.success(result.message ?? "Berhasil disimpan.");
        setDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleStatus(materi: MateriAdmin) {
    const next: StatusMateri = materi.status === "TERBIT" ? "DRAFT" : "TERBIT";
    startTransition(async () => {
      const result = await setStatusMateri(materi.id, next);
      if (result.ok) toast.success(result.message ?? "Status diubah.");
      else toast.error(result.error);
    });
  }

  function handleDelete(materi: MateriAdmin) {
    const confirmed = window.confirm(
      `Hapus materi "${materi.judul}"? Deck yang sudah terbit akan langsung hilang dari /materi.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteMateri(materi.id);
      if (result.ok) toast.success(result.message ?? "Materi dihapus.");
      else toast.error(result.error);
    });
  }

  const belumAdaFakultas = fakultas.length === 0;

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-start gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/materi/permohonan">
              {/* Ikon berubah jadi angka saat ada antrean: 0 → ikon kotak masuk,
                  >0 → angka permohonan yang menunggu (maks 99+). */}
              {jumlahPermohonan > 0 ? (
                <span
                  aria-hidden
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-none text-primary-foreground"
                >
                  {jumlahPermohonan > 99 ? "99+" : jumlahPermohonan}
                </span>
              ) : (
                <Inbox aria-hidden />
              )}
              Permohonan
              {jumlahPermohonan > 0 && (
                <span className="sr-only">
                  {jumlahPermohonan} permohonan menunggu
                </span>
              )}
            </Link>
          </Button>
          <Button onClick={openCreate} disabled={pending}>
            <Plus aria-hidden />
            Tambah materi
          </Button>
        </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="filter-materi" className="text-xs font-medium text-muted-foreground">
                Status
              </Label>
              <Select
                id="filter-materi"
                value={filterStatus}
                onValueChange={(value) =>
                  setFilterStatus(value as "semua" | StatusMateri)
                }
                className="h-9 w-44"
              >
                <option value="semua">Semua ({daftar.length})</option>
                <option value="TERBIT">Terbit ({jumlahTerbit})</option>
                <option value="DRAFT">Draf ({jumlahDraf})</option>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="filter-fakultas" className="text-xs font-medium text-muted-foreground">
                Fakultas
              </Label>
              <Select
                id="filter-fakultas"
                value={filterFakultas}
                onValueChange={ubahFakultas}
                className="h-9 w-56"
              >
                <option value="semua">Semua fakultas</option>
                <option value="umum">Umum — lintas fakultas ({jumlahUmum})</option>
                {fakultas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (
                    {daftar.filter((materi) => materi.facultyId === item.id).length})
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="filter-prodi" className="text-xs font-medium text-muted-foreground">
                Program studi
              </Label>
              <Select
                id="filter-prodi"
                value={filterProdi}
                onValueChange={setFilterProdi}
                className="h-9 w-56"
                disabled={filterFakultas === "umum"}
              >
                <option value="semua">
                  {filterFakultas === "semua" ? "Semua prodi" : "Semua prodi fakultas ini"}
                </option>
                {filterFakultas !== "umum" && (
                  <option value="lintas">Lintas prodi (tanpa prodi)</option>
                )}
                {pilihanProdi.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
            <p className="pb-2 text-xs text-muted-foreground" aria-live="polite">
              {tampil.length === daftar.length
                ? `${daftar.length} materi · ${jumlahTerbit} terbit`
                : `${tampil.length} dari ${daftar.length} materi · ${jumlahTerbit} terbit`}
            </p>
          </div>
      </div>

      {daftar.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6">
          <p className="text-sm font-medium">Belum ada materi di database.</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Tambahkan materi pertama dengan mengunggah deck HTML. Selama materi
            masih kosong, halaman <code className="rounded bg-muted px-1 py-0.5 text-xs">/materi</code>{" "}
            menampilkan daftar statis bawaan repo.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Materi</TableHead>
                <TableHead className="w-24">Jenis</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Diperbarui</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tampil.map((materi) => (
                <BarisMateri
                  key={materi.slug}
                  materi={materi}
                  pending={pending}
                  onEdit={openEdit}
                  onStatus={handleStatus}
                  onDelete={handleDelete}
                />
              ))}

              {tampil.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada materi yang cocok dengan filter ini.{" "}
                    <button
                      type="button"
                      onClick={resetFilter}
                      className="font-semibold text-primary hover:underline"
                    >
                      Tampilkan semua materi
                    </button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit materi ${editing.judul}` : "Tambah materi"}
            </DialogTitle>
            <DialogDescription>
              Deck disimpan sebagai HTML mandiri dan disajikan di dalam iframe
              ber-sandbox. Skrip di dalam deck tidak bisa menyentuh sesi login.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="materi-judul">Judul</Label>
              <Input
                id="materi-judul"
                value={form.judul}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, judul: event.target.value }))
                }
                placeholder="Budaya & Karakter TIDAR"
                required
                maxLength={160}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="materi-matkul">Mata kuliah</Label>
                <Input
                  id="materi-matkul"
                  value={form.matkul}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, matkul: event.target.value }))
                  }
                  placeholder="Budaya & Karakter TIDAR"
                  required
                  maxLength={160}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="materi-slug">Slug URL</Label>
                <Input
                  id="materi-slug"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, slug: event.target.value }))
                  }
                  placeholder="otomatis dari judul"
                  maxLength={80}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="materi-jenis">Jenis ujian</Label>
                <Select
                  id="materi-jenis"
                  value={form.jenis}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, jenis: value as JenisUjian }))
                  }
                >
                  {JENIS_UJIAN.map((jenis) => (
                    <option key={jenis} value={jenis}>
                      {LABEL_JENIS[jenis]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="materi-pertemuan">Pertemuan</Label>
                <Input
                  id="materi-pertemuan"
                  value={form.pertemuan}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, pertemuan: event.target.value }))
                  }
                  placeholder="Pertemuan 8"
                  maxLength={80}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="materi-bobot">Bobot (%)</Label>
                <Input
                  id="materi-bobot"
                  type="number"
                  min={0}
                  max={100}
                  value={form.bobot}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, bobot: event.target.value }))
                  }
                  placeholder="20"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="materi-subcpmk">Sub-CPMK</Label>
                <Input
                  id="materi-subcpmk"
                  value={form.subCpmk}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, subCpmk: event.target.value }))
                  }
                  placeholder="Sub-CPMK 1–2"
                  maxLength={80}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="materi-bagian">Jumlah bagian di deck</Label>
                <Input
                  id="materi-bagian"
                  type="number"
                  min={0}
                  max={999}
                  value={form.bagian}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, bagian: event.target.value }))
                  }
                  placeholder="17"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="materi-sumber">Sumber</Label>
              <Input
                id="materi-sumber"
                value={form.sumber}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sumber: event.target.value }))
                }
                placeholder="Modul Budaya & Karakter TIDAR, hal. 8–80"
                maxLength={240}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="materi-ringkasan">Ringkasan kartu</Label>
              <Textarea
                id="materi-ringkasan"
                value={form.ringkasan}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ringkasan: event.target.value }))
                }
                placeholder="Dua-tiga baris: apa yang ada di dalam deck."
                required
                maxLength={600}
                rows={3}
              />
            </div>

            <fieldset className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
              <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Lingkup
              </legend>

              <div className="grid gap-2">
                <Label htmlFor="materi-fakultas">Fakultas</Label>
                <Select
                  id="materi-fakultas"
                  value={form.facultyId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, facultyId: value, prodiId: "" }))
                  }
                >
                  <option value="">Umum (semua fakultas)</option>
                  {fakultas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="materi-prodi">Program studi</Label>
                <Select
                  id="materi-prodi"
                  value={form.prodiId}
                  onValueChange={(value) => {
                    const induk = fakultas.find((item) =>
                      item.prodi.some((prodi) => prodi.id === value),
                    );
                    setForm((prev) => ({
                      ...prev,
                      prodiId: value,
                      facultyId: induk ? induk.id : prev.facultyId,
                    }));
                  }}
                >
                  <option value="">Lintas prodi</option>
                  {prodiTersedia.map((prodi) => (
                    <option key={prodi.id} value={prodi.id}>
                      {prodi.name}
                    </option>
                  ))}
                </Select>
                {belumAdaFakultas && (
                  <p className="text-xs text-muted-foreground">
                    Belum ada data fakultas/prodi. Tambahkan lewat menu Fakultas
                    dan Program studi dulu.
                  </p>
                )}
              </div>
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="materi-berkas">Berkas deck (.html)</Label>
              <input
                id="materi-berkas"
                type="file"
                accept=".html,text/html"
                onChange={handleFile}
                className="flex w-full cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {namaBerkas
                  ? `${namaBerkas} — ${(html.length / 1024).toFixed(0)} KB siap disimpan.`
                  : editing
                    ? "Biarkan kosong untuk mempertahankan deck yang sekarang."
                    : "Maksimal 1,5 MB. Deck harus satu berkas mandiri."}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="materi-status">Status</Label>
              <Select
                id="materi-status"
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as StatusMateri }))
                }
              >
                <option value="DRAFT">Draf — hanya terlihat admin</option>
                <option value="TERBIT">Terbit — tampil di /materi</option>
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
              <Button type="submit" disabled={pending}>
                {pending
                  ? "Menyimpan..."
                  : editing
                    ? "Simpan perubahan"
                    : "Simpan materi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BarisMateri({
  materi,
  pending,
  onEdit,
  onStatus,
  onDelete,
}: {
  materi: MateriAdmin;
  pending: boolean;
  onEdit: (materi: MateriAdmin) => void;
  onStatus: (materi: MateriAdmin) => void;
  onDelete: (materi: MateriAdmin) => void;
}) {
  const terbit = materi.status === "TERBIT";

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{materi.judul}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {materi.matkul} · /materi/{materi.slug}
        </p>
        {/* Lingkup dulu disampaikan lewat baris grup; sekarang tiap baris
            membawa labelnya sendiri supaya tabel bisa difilter bebas. */}
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {materi.fakultas ?? "Umum · lintas fakultas"}
          </span>
          {(materi.prodi || materi.fakultas) && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {materi.prodi ?? "Lintas prodi"}
            </span>
          )}
        </p>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {LABEL_JENIS[materi.jenis]}
        {materi.bobot !== null ? ` · ${materi.bobot}%` : ""}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
            terbit
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {terbit ? "Terbit" : "Draf"}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatTanggalMateri(materi.diperbarui)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => onEdit(materi)}
          >
            <Pencil aria-hidden />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => onStatus(materi)}
          >
            <FileUp aria-hidden />
            {terbit ? "Tarik" : "Terbitkan"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(materi)}
          >
            <Trash2 aria-hidden />
            Hapus
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
