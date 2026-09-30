import type { Metadata } from "next";

import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { FacultyManager } from "./_components/faculty-manager";

export const metadata: Metadata = { title: "Kelola Fakultas" };

export default async function AdminFacultyPage() {
  await requireAdmin();
  const faculties = await prisma.faculty.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { prodis: true } } },
  });
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <AdminNav />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Fakultas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola fakultas UNTIDAR. Hubungkan setiap program studi ke fakultasnya di halaman Prodi.
        </p>
      </header>
      <FacultyManager faculties={faculties} />
    </main>
  );
}
