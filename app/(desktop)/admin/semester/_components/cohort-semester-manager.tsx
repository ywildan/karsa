/**
 * Karsa — app/(desktop)/admin/semester/_components/cohort-semester-manager.tsx
 * ----------------------------------------------------------------------------
 * Tabel penetapan semester aktif per (prodi, angkatan). Satu baris per cohort;
 * dua kelas dalam angkatan yang sama mengikuti pilihan yang sama.
 * Otorisasi tetap di server action (`setCohortActiveSemester`).
 */
"use client";

import * as React from "react";
import type { Semester } from "@prisma/client";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { setCohortActiveSemester } from "@/actions/semester";
import { Button } from "@/components/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CohortRow = {
  prodi_id: string;
  prodi_name: string;
  angkatan: number;
  semester_id: string | null;
};

function CohortRowEditor({
  cohort,
  semesters,
}: {
  cohort: CohortRow;
  semesters: Semester[];
}) {
  const [semesterId, setSemesterId] = React.useState(cohort.semester_id ?? "");
  const [pending, startTransition] = React.useTransition();

  const changed = semesterId !== (cohort.semester_id ?? "");

  function handleSave() {
    if (!semesterId || !changed) return;
    startTransition(async () => {
      const result = await setCohortActiveSemester({
        prodi_id: cohort.prodi_id,
        angkatan: cohort.angkatan,
        semester_id: semesterId,
      });
      if (result.ok) {
        toast.success(result.message ?? "Semester aktif disimpan.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{cohort.prodi_name}</TableCell>
      <TableCell className="tabular-nums">{cohort.angkatan}</TableCell>
      <TableCell className="min-w-[220px]">
        <Select
          value={semesterId}
          onValueChange={setSemesterId}
          disabled={pending}
          aria-label={`Semester aktif ${cohort.prodi_name} ${cohort.angkatan}`}
        >
          <option value="">— Belum ditetapkan —</option>
          {semesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </Select>
      </TableCell>
      <TableCell>
        {cohort.semester_id ? (
          <Badge>Aktif</Badge>
        ) : (
          <Badge variant="secondary">Belum ditetapkan</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || !changed || !semesterId}
          onClick={handleSave}
        >
          <Check aria-hidden />
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function CohortSemesterManager({
  cohorts,
  semesters,
}: {
  cohorts: CohortRow[];
  semesters: Semester[];
}) {
  if (cohorts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground shadow-soft">
        Belum ada kelas dengan angkatan. Isi angkatan pada kelas di{" "}
        <span className="font-medium text-foreground">Kelola Kelas</span> agar
        cohort bisa ditetapkan di sini.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-soft">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prodi</TableHead>
            <TableHead>Angkatan</TableHead>
            <TableHead>Semester aktif</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cohorts.map((cohort) => (
            <CohortRowEditor
              key={`${cohort.prodi_id}:${cohort.angkatan}`}
              cohort={cohort}
              semesters={semesters}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
