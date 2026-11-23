"use client";

/**
 * Karsa — components/absensi/attendance-pj-panel.tsx
 * ----------------------------------------------------------------------------
 * Form catat absensi massal + roster riwayat untuk PJ. Data & otorisasi dari
 * server; setiap mutasi memanggil Server Action yang memverifikasi kepemilikan.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { catatAbsensiAction, hapusAbsensiAction, resetAbsensiAction } from "@/actions/absensi";
import { QuotaDots } from "@/components/absensi/quota-dots";
import { Button } from "@/components/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ABSENSI_STATUSES } from "@/lib/absensi";
import {
  absensiStatusLabel,
  absensiStatusShortLabel,
  absensiStatusTone,
  formatTanggalAbsensi,
  type AbsensiHistoryItem,
  type PjAbsensiDetail,
} from "@/lib/absensi-view";

export function AttendancePjPanel({
  detail,
  today,
}: {
  detail: PjAbsensiDetail;
  today: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = React.useActionState(catatAbsensiAction, null);
  const [tanggal, setTanggal] = React.useState(today);
  const [status, setStatus] = React.useState<string>("TANPA_KETERANGAN");
  const [dipilih, setDipilih] = React.useState<Set<string>>(new Set());
  const [cari, setCari] = React.useState("");
  const [catatan, setCatatan] = React.useState("");
  const [menghapus, startHapus] = React.useTransition();
  const [mereset, startReset] = React.useTransition();

  const sudahDicatat = React.useMemo(
    () =>
      new Set(
        detail.students
          .filter((student) =>
            student.history.some((record) => record.tanggal === tanggal),
          )
          .map((student) => student.id),
      ),
    [detail.students, tanggal],
  );

  React.useEffect(() => {
    setDipilih((previous) => {
      let berubah = false;
      const next = new Set<string>();
      previous.forEach((id) => {
        if (sudahDicatat.has(id)) berubah = true;
        else next.add(id);
      });
      return berubah ? next : previous;
    });
  }, [sudahDicatat]);

  React.useEffect(() => {
    if (!state) return;
    if (!state.ok) {
      toast.error(state.error);
      return;
    }
    toast.success(state.message);
    if (state.warnings && state.warnings.length > 0) {
      const nama = state.warnings
        .slice(0, 2)
        .map((warning) => warning.name)
        .join(", ");
      const sisa =
        state.warnings.length > 2 ? ` +${state.warnings.length - 2}` : "";
      toast.warning(
        `${nama}${sisa} melewati jatah ${detail.limit} tanpa keterangan. Catatan tetap disimpan.`,
      );
    }
    setDipilih(new Set());
    setCatatan("");
    router.refresh();
  }, [state, detail.limit, router]);

  const kunci = cari.trim().toLowerCase();
  const hasil = React.useMemo(() => {
    if (!kunci) return detail.students;
    return detail.students.filter((student) => {
      const nama = student.name?.toLowerCase() ?? "";
      const nim = student.nim?.toLowerCase() ?? "";
      return nama.includes(kunci) || nim.includes(kunci);
    });
  }, [detail.students, kunci]);

  const terpilih = detail.students.filter(
    (student) => dipilih.has(student.id) && !sudahDicatat.has(student.id),
  );
  const akanMelewati =
    status === "TANPA_KETERANGAN" &&
    terpilih.some(
      (student) => student.counts.tanpa_keterangan + 1 > detail.limit,
    );

  const totalCatatan = detail.students.reduce(
    (sum, student) => sum + student.history.length,
    0,
  );
  const totalAlpha = detail.students.reduce(
    (sum, student) => sum + student.counts.tanpa_keterangan,
    0,
  );

  function toggle(id: string) {
    if (sudahDicatat.has(id)) return;
    setDipilih((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function hapus(record: AbsensiHistoryItem, nama: string) {
    if (
      !window.confirm(
        `Hapus catatan ${absensiStatusLabel(record.status).toLowerCase()} untuk ${nama} pada ${formatTanggalAbsensi(record.tanggal)}?`,
      )
    ) {
      return;
    }
    startHapus(async () => {
      try {
        const result = await hapusAbsensiAction(record.id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(result.message);
        router.refresh();
      } catch {
        toast.error("Gagal menghapus catatan. Silakan coba lagi.");
      }
    });
  }

  function reset() {
    if (
      !window.confirm(
        `Reset SEMUA catatan absensi ${detail.assignment.matkul.name}? Jatah tanpa keterangan semua mahasiswa kembali ke ${detail.limit}. Tindakan ini tercatat di audit log.`,
      )
    ) {
      return;
    }
    startReset(async () => {
      try {
        const result = await resetAbsensiAction(detail.assignment.id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(result.message);
        setDipilih(new Set());
        router.refresh();
      } catch {
        toast.error("Gagal mereset catatan. Silakan coba lagi.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-3 gap-2" aria-label="Ringkasan absensi">
        <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
          <p className="text-lg font-semibold tabular-nums">
            {detail.assignment.student_count}
          </p>
          <p className="text-[11px] text-muted-foreground">Mahasiswa</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
          <p className="text-lg font-semibold tabular-nums">{totalCatatan}</p>
          <p className="text-[11px] text-muted-foreground">Catatan</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-3 py-3 text-center">
          <p className="text-lg font-semibold tabular-nums text-destructive">
            {totalAlpha}
          </p>
          <p className="text-[11px] text-muted-foreground">Tanpa ket.</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold">Catat absensi</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={mereset || totalCatatan === 0}
          >
            <RotateCcw aria-hidden />
            {mereset ? "Mereset..." : "Reset catatan"}
          </Button>
        </div>

        <form action={formAction} className="grid gap-4 px-4 py-4">
          <input
            type="hidden"
            name="kelas_matkul_id"
            value={detail.assignment.id}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="absensi-tanggal">Tanggal</Label>
              <Input
                id="absensi-tanggal"
                name="tanggal"
                type="date"
                value={tanggal}
                max={today}
                required
                onChange={(event) => setTanggal(event.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Satu mahasiswa hanya boleh punya satu catatan per tanggal.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="absensi-status">Status</Label>
              <select
                id="absensi-status"
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ABSENSI_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {absensiStatusShortLabel(option)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Hanya tanpa keterangan yang memakai jatah {detail.limit}.
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="absensi-cari">Mahasiswa</Label>
              <span className="text-xs font-medium text-primary">
                {terpilih.length} dipilih
              </span>
            </div>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="absensi-cari"
                type="search"
                value={cari}
                onChange={(event) => setCari(event.target.value)}
                placeholder="Cari nama atau NIM"
                className="h-11 pl-9"
                maxLength={100}
              />
            </div>

            {hasil.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                Tidak ada mahasiswa yang cocok.
              </p>
            ) : (
              <ul className="divide-y divide-border/70 rounded-lg border border-border">
                {hasil.map((student) => {
                  const sudah = sudahDicatat.has(student.id);
                  const dipilihSekarang = dipilih.has(student.id) && !sudah;
                  const nama = student.name?.trim() || student.nim || "Mahasiswa";
                  return (
                    <li
                      key={student.id}
                      className={dipilihSekarang ? "bg-accent/40" : undefined}
                    >
                      <div className="flex items-start gap-3 px-3 py-3">
                        <input
                          id={`pilih-${student.id}`}
                          type="checkbox"
                          name="student_ids"
                          value={student.id}
                          checked={dipilihSekarang}
                          disabled={sudah}
                          onChange={() => toggle(student.id)}
                          className="mt-1 h-4 w-4 accent-primary disabled:opacity-50"
                        />
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor={`pilih-${student.id}`}
                            className={`block text-sm font-medium ${sudah ? "text-muted-foreground" : ""}`}
                          >
                            {nama}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {student.nim ?? "NIM belum ada"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <QuotaDots
                              alpha={student.counts.tanpa_keterangan}
                              limit={student.alpha_limit}
                            />
                            <span className="text-[11px] text-muted-foreground">
                              sakit {student.counts.sakit} · keterangan{" "}
                              {student.counts.izin}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {student.is_self ? (
                            <Badge variant="outline">PJ</Badge>
                          ) : null}
                          {sudah ? (
                            <Badge variant="secondary">Sudah dicatat</Badge>
                          ) : student.alpha_over > 0 ? (
                            <Badge variant="destructive">
                              Lewat {student.alpha_over}
                            </Badge>
                          ) : student.alpha_remaining === 0 ? (
                            <Badge variant="destructive">Habis</Badge>
                          ) : (
                            <Badge variant="secondary">
                              Sisa {student.alpha_remaining}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {student.history.length > 0 ? (
                        <details className="border-t border-border/70 bg-muted/30">
                          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
                            <span>
                              Riwayat ({student.history.length})
                            </span>
                            <span>Buka</span>
                          </summary>
                          <ul className="divide-y divide-border/60 border-t border-border/60">
                            {student.history.map((record) => (
                              <li
                                key={record.id}
                                className="flex flex-wrap items-center gap-2 px-3 py-2"
                              >
                                <CalendarDays
                                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                                  aria-hidden
                                />
                                <span className="text-xs font-medium">
                                  {formatTanggalAbsensi(record.tanggal)}
                                </span>
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${absensiStatusTone(record.status)}`}
                                >
                                  {absensiStatusLabel(record.status)}
                                </span>
                                {record.catatan ? (
                                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                                    {record.catatan}
                                  </span>
                                ) : (
                                  <span className="min-w-0 flex-1" />
                                )}
                                <button
                                  type="button"
                                  onClick={() => hapus(record, nama)}
                                  disabled={menghapus}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                                  aria-label={`Hapus catatan ${nama} ${formatTanggalAbsensi(record.tanggal)}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {kunci
                ? `${hasil.length} dari ${detail.students.length} mahasiswa cocok.`
                : `${detail.students.length} mahasiswa di kelas ini.`}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="absensi-catatan">Catatan (opsional)</Label>
            <Textarea
              id="absensi-catatan"
              name="catatan"
              value={catatan}
              onChange={(event) => setCatatan(event.target.value)}
              placeholder="Mis. keterangan dokter atau alasan izin"
              maxLength={500}
            />
          </div>

          {akanMelewati ? (
            <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-xs leading-5 text-amber-800 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Sebagian mahasiswa sudah {detail.limit}/{detail.limit} tanpa
              keterangan. Catatan tetap disimpan dengan peringatan.
            </p>
          ) : null}

          <Button type="submit" disabled={pending || terpilih.length === 0} className="w-full">
            <Check aria-hidden />
            {pending
              ? "Menyimpan..."
              : `Simpan absensi${terpilih.length > 0 ? ` (${terpilih.length})` : ""}`}
          </Button>
        </form>
      </section>

      <p className="text-xs leading-5 text-muted-foreground">
        Menghapus catatan mengembalikan jatah mahasiswa. Reset menghapus semua
        status pada matkul ini dan tercatat di audit log.
      </p>
    </div>
  );
}
