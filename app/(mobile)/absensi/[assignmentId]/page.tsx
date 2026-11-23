/**
 * Karsa — app/(mobile)/absensi/[assignmentId]/page.tsx
 * ----------------------------------------------------------------------------
 * Detail absensi satu penugasan matkul. ID dari URL tidak dipercaya: service
 * memeriksa `pj_id` dan semester aktif; bukan milik PJ → 404.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { AttendancePjPanel } from "@/components/absensi/attendance-pj-panel";
import { todayIsoWib } from "@/lib/absensi-view";
import { requireUser } from "@/lib/auth-helpers";
import { getPjAttendanceAssignment } from "@/lib/services/attendance-service";

export const metadata: Metadata = {
  title: "Absensi matkul",
};

export default async function AbsensiDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const user = await requireUser();
  const { assignmentId } = await params;
  const detail = await getPjAttendanceAssignment(user.id, assignmentId);
  if (!detail) notFound();

  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <Link
        href="/absensi"
        className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="size-4" />
        Semua absensi
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {detail.assignment.matkul.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelas {detail.assignment.kelas.name} ·{" "}
          {detail.assignment.kelas.prodi.name} · Semester{" "}
          {detail.assignment.kelas.semester.name}
          {detail.assignment.matkul.code
            ? ` · ${detail.assignment.matkul.code}`
            : ""}
        </p>
      </header>

      <AttendancePjPanel detail={detail} today={todayIsoWib()} />
    </main>
  );
}
