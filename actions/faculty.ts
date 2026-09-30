"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const idSchema = z.string().trim().min(1).max(128);
const inputSchema = z.object({
  name: z.string().trim().min(2, "Nama fakultas wajib diisi.").max(120),
});
type Input = z.infer<typeof inputSchema>;

function revalidate() {
  for (const path of ["/admin/fakultas", "/admin/prodi", "/admin/karsalib"]) {
    revalidatePath(path);
  }
}

function auditActor(admin: Awaited<ReturnType<typeof requireAdmin>>) {
  return {
    id: admin.id,
    name: admin.name?.trim() || admin.email?.trim() || "Administrator",
    is_admin: admin.is_admin,
  };
}

export async function createFaculty(input: Input): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };
  try {
    await prisma.$transaction(async (tx) => {
      const faculty = await tx.faculty.create({ data: parsed.data });
      await logAudit({
        actor: auditActor(admin), action: "FACULTY_CREATE",
        entity: { type: "Faculty", id: faculty.id, label: faculty.name },
        after: { name: faculty.name },
      }, tx);
    });
  } catch (error) {
    return { ok: false, error: mapPrismaKnownError(error, { P2002: `Fakultas "${parsed.data.name}" sudah ada.` }, "Gagal menyimpan fakultas.") };
  }
  revalidate();
  return { ok: true, message: `Fakultas "${parsed.data.name}" berhasil ditambahkan.` };
}

export async function updateFaculty(id: string, input: Input): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsedId = idSchema.safeParse(id);
  const parsed = inputSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: "ID fakultas tidak valid." };
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };
  const before = await prisma.faculty.findUnique({ where: { id: parsedId.data } });
  if (!before) return { ok: false, error: "Fakultas tidak ditemukan." };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.faculty.update({ where: { id: before.id }, data: parsed.data });
      await tx.libProfile.updateMany({ where: { faculty_id: before.id }, data: { faculty: parsed.data.name } });
      await logAudit({
        actor: auditActor(admin), action: "FACULTY_UPDATE",
        entity: { type: "Faculty", id: before.id, label: parsed.data.name },
        before: { name: before.name }, after: { name: parsed.data.name },
      }, tx);
    });
  } catch (error) {
    return { ok: false, error: mapPrismaKnownError(error, { P2002: `Fakultas "${parsed.data.name}" sudah ada.` }, "Gagal memperbarui fakultas.") };
  }
  revalidate();
  return { ok: true, message: `Fakultas "${parsed.data.name}" berhasil diperbarui.` };
}

export async function deleteFaculty(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "ID fakultas tidak valid." };
  const faculty = await prisma.faculty.findUnique({ where: { id: parsed.data } });
  if (!faculty) return { ok: false, error: "Fakultas tidak ditemukan." };
  const [prodiCount, profileCount] = await Promise.all([
    prisma.prodi.count({ where: { faculty_id: faculty.id } }),
    prisma.libProfile.count({ where: { faculty_id: faculty.id } }),
  ]);
  if (prodiCount || profileCount) {
    return { ok: false, error: `Fakultas ini masih digunakan ${prodiCount} prodi dan ${profileCount} profil Karsa Lib.` };
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.faculty.delete({ where: { id: faculty.id } });
      await logAudit({
        actor: auditActor(admin), action: "FACULTY_DELETE",
        entity: { type: "Faculty", id: faculty.id, label: faculty.name },
        before: { name: faculty.name },
      }, tx);
    });
  } catch (error) {
    return { ok: false, error: mapPrismaKnownError(error, { P2025: "Fakultas tidak ditemukan.", P2003: "Fakultas masih digunakan prodi atau profil." }, "Gagal menghapus fakultas.") };
  }
  revalidate();
  return { ok: true, message: `Fakultas "${faculty.name}" berhasil dihapus.` };
}
