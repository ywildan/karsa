"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditActor, logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const idSchema = z.string().trim().min(1).max(128);
const noteSchema = z.string().trim().max(1_000).nullish().transform((value) => value || null);

/** Semua event Karsa Lib di modul ini dilakukan admin, jadi peran-nya eksplisit. */
function auditAdmin(admin: Awaited<ReturnType<typeof requireAdmin>>) {
  return auditActor(admin, { role: "ADMIN" });
}

export async function decideLibAuthorRequestAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z.object({ id: idSchema, decision: z.enum(["APPROVE", "REJECT"]), note: noteSchema }).safeParse({
    id: formData.get("id"), decision: formData.get("decision"), note: formData.get("note"),
  });
  if (!parsed.success) throw new Error("Permohonan penulis tidak valid.");

  await prisma.$transaction(async (tx) => {
    const request = await tx.libAuthorRequest.findUnique({ where: { id: parsed.data.id }, select: { id: true, user_id: true, status: true, user: { select: { name: true, email: true, is_admin: true } } } });
    if (!request || request.status !== "PENDING") throw new Error("Permohonan tidak ditemukan atau sudah ditinjau.");
    if (request.user.is_admin) throw new Error("Akun admin tidak dapat diberi akses penulis mahasiswa.");
    const now = new Date();
    await tx.libAuthorRequest.update({
      where: { id: request.id },
      data: { status: parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED", decision_note: parsed.data.note, decided_by_id: admin.id, decided_at: now },
    });
    if (parsed.data.decision === "APPROVE") {
      await tx.libAuthorAccess.upsert({
        where: { user_id: request.user_id },
        create: { user_id: request.user_id, granted_by_id: admin.id, granted_at: now },
        update: { granted_by_id: admin.id, granted_at: now, revoked_at: null },
      });
    }
    await logAudit({
      actor: auditAdmin(admin), action: `KARSA_LIB_AUTHOR_${parsed.data.decision}`,
      entity: { type: "LibAuthorRequest", id: request.id, label: request.user.name?.trim() || request.user.email },
      after: { status: parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED", decision_note: parsed.data.note },
    }, tx);
  });
  revalidatePath("/admin/karsalib");
}

export async function revokeLibAuthorAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = idSchema.safeParse(formData.get("user_id"));
  if (!parsed.success) throw new Error("Akun penulis tidak valid.");
  const access = await prisma.libAuthorAccess.findUnique({ where: { user_id: parsed.data }, select: { user_id: true, revoked_at: true, user: { select: { name: true, email: true } } } });
  if (!access || access.revoked_at) throw new Error("Akses penulis aktif tidak ditemukan.");
  await prisma.$transaction(async (tx) => {
    await tx.libAuthorAccess.update({ where: { user_id: access.user_id }, data: { revoked_at: new Date() } });
    await logAudit({
      actor: auditAdmin(admin), action: "KARSA_LIB_AUTHOR_REVOKE",
      entity: { type: "LibAuthorAccess", id: access.user_id, label: access.user.name?.trim() || access.user.email },
      after: { revoked: true },
    }, tx);
  });
  revalidatePath("/admin/karsalib");
}

export async function resolveLibReportAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z.object({ id: idSchema, decision: z.enum(["REMOVE", "DISMISS"]), note: noteSchema }).safeParse({
    id: formData.get("id"), decision: formData.get("decision"), note: formData.get("note"),
  });
  if (!parsed.success) throw new Error("Laporan tidak valid.");

  await prisma.$transaction(async (tx) => {
    const report = await tx.libReport.findUnique({ where: { id: parsed.data.id }, select: { id: true, status: true, article_id: true, comment_id: true, reason: true } });
    if (!report || report.status !== "PENDING") throw new Error("Laporan tidak ditemukan atau sudah ditinjau.");
    const now = new Date();
    if (parsed.data.decision === "REMOVE") {
      if (report.comment_id) {
        await tx.libComment.updateMany({
          where: { id: report.comment_id, deleted_at: null },
          data: { body: null, deleted_at: now, deleted_by_id: admin.id, deleted_reason: "Dihapus setelah laporan disetujui admin" },
        });
      } else if (report.article_id) {
        await tx.libArticle.updateMany({
          where: { id: report.article_id, status: "PUBLISHED" },
          data: { status: "ARCHIVED", archived_at: now },
        });
      }
    }
    await tx.libReport.update({
      where: { id: report.id },
      data: { status: parsed.data.decision === "REMOVE" ? "RESOLVED" : "REJECTED", decision_note: parsed.data.note, resolved_by_id: admin.id, resolved_at: now },
    });
    await logAudit({
      actor: auditAdmin(admin), action: `KARSA_LIB_REPORT_${parsed.data.decision}`,
      entity: { type: "LibReport", id: report.id, label: report.reason },
      after: { status: parsed.data.decision === "REMOVE" ? "RESOLVED" : "REJECTED", target_article_id: report.article_id, target_comment_id: report.comment_id, decision_note: parsed.data.note },
    }, tx);
  });
  revalidatePath("/admin/karsalib");
}
