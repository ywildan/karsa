"use server";

/**
 * Karsa — actions/pengelola.ts
 * ----------------------------------------------------------------------------
 * Penunjukan & pencabutan Pengelola (delegasi wewenang admin terbatas
 * lingkup) + data halaman pengelola.
 *
 * Aturan keras:
 * · Hanya admin penuh yang boleh menunjuk/mencabut pengelola — pengelola
 *   TIDAK bisa mengangkat pengelola lain (anti eskalasi berantai).
 * · Penunjukan berbasis email: bila user belum pernah login, baris tersimpan
 *   PENDING (`user_id` null) dan diklaim otomatis saat login pertama
 *   (`auth.ts` / `lib/user-snapshot.ts`).
 * · Masa berlaku terikat semester aktif saat penunjukan dibuat; hak berhenti
 *   saat semester berganti (penurunan lingkup di `lib/user-snapshot.ts`).
 * · Setiap mutasi menulis AuditLog dalam transaksi yang sama.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auditActor, logAudit } from "@/lib/audit";
import { requireAdmin, requirePengelola } from "@/lib/auth-helpers";
import { filterKelasByScope } from "@/lib/pengelola";
import { prisma } from "@/lib/prisma";
import { isAllowedEmail } from "@/lib/utils";

const idSchema = z.string().trim().min(1).max(128);

const assignSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(320)
    .refine((value) => z.string().email().safeParse(value).success, {
      message: "Format email tidak valid.",
    })
    .refine((value) => isAllowedEmail(value), {
      message: "Email harus memakai domain kampus UNTIDAR.",
    }),
  scope_type: z.enum(["PRODI", "KELAS"]),
  prodi_id: idSchema.nullish().transform((value) => value || null),
  kelas_id: idSchema.nullish().transform((value) => value || null),
});

export interface PengelolaAssignmentRow {
  id: string;
  email: string;
  user_id: string | null;
  user_name: string | null;
  scope_type: string;
  prodi_id: string | null;
  prodi_name: string | null;
  kelas_id: string | null;
  kelas_name: string | null;
  semester_id: string | null;
  semester_name: string | null;
  granted_by_name: string;
  granted_at: string;
  revoked_at: string | null;
  status: "AKTIF" | "PENDING" | "DICABUT" | "KEDALUWARSA";
}

/** Data halaman /admin/pengelola (khusus admin penuh). */
export async function getPengelolaAdminData(): Promise<{
  assignments: PengelolaAssignmentRow[];
  prodis: { id: string; name: string }[];
  kelasOptions: { id: string; name: string; prodi_name: string; semester_name: string }[];
  activeSemester: { id: string; name: string } | null;
}> {
  await requireAdmin();

  const [rows, prodis, kelasList, activeSemester] = await Promise.all([
    prisma.pengelolaAssignment.findMany({
      orderBy: [{ revoked_at: "asc" }, { granted_at: "desc" }],
      take: 200,
      select: {
        id: true,
        email: true,
        user_id: true,
        scope_type: true,
        prodi_id: true,
        kelas_id: true,
        semester_id: true,
        granted_at: true,
        revoked_at: true,
        user: { select: { name: true } },
        prodi: { select: { name: true } },
        kelas: { select: { name: true } },
        semester: { select: { name: true } },
        grantedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.prodi.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.kelas.findMany({
      orderBy: [{ semester: { start_date: "desc" } }, { name: "asc" }],
      take: 300,
      select: {
        id: true,
        name: true,
        prodi: { select: { name: true } },
        semester: { select: { name: true } },
      },
    }),
    prisma.semester.findFirst({
      where: { is_active: true },
      select: { id: true, name: true },
    }),
  ]);

  const assignments: PengelolaAssignmentRow[] = rows.map((row) => {
    let status: PengelolaAssignmentRow["status"] = "AKTIF";
    if (row.revoked_at) status = "DICABUT";
    else if (!row.user_id) status = "PENDING";
    else if (row.semester_id && row.semester_id !== activeSemester?.id) {
      status = "KEDALUWARSA";
    }
    return {
      id: row.id,
      email: row.email,
      user_id: row.user_id,
      user_name: row.user?.name ?? null,
      scope_type: row.scope_type,
      prodi_id: row.prodi_id,
      prodi_name: row.prodi?.name ?? null,
      kelas_id: row.kelas_id,
      kelas_name: row.kelas?.name ?? null,
      semester_id: row.semester_id,
      semester_name: row.semester?.name ?? null,
      granted_by_name: row.grantedBy.name?.trim() || row.grantedBy.email,
      granted_at: row.granted_at.toISOString(),
      revoked_at: row.revoked_at?.toISOString() ?? null,
      status,
    };
  });

  return {
    assignments,
    prodis,
    kelasOptions: kelasList.map((kelas) => ({
      id: kelas.id,
      name: kelas.name,
      prodi_name: kelas.prodi.name,
      semester_name: kelas.semester.name,
    })),
    activeSemester,
  };
}

/** Tunjuk pengelola baru. Hanya admin penuh. */
export async function assignPengelola(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = assignSchema.safeParse({
    email: formData.get("email"),
    scope_type: formData.get("scope_type"),
    prodi_id: formData.get("prodi_id"),
    kelas_id: formData.get("kelas_id"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Penunjukan tidak valid.");
  }
  const { email, scope_type, prodi_id, kelas_id } = parsed.data;

  if (scope_type === "PRODI" && !prodi_id) {
    throw new Error("Pilih prodi lingkup penunjukan.");
  }
  if (scope_type === "KELAS" && !kelas_id) {
    throw new Error("Pilih kelas lingkup penunjukan.");
  }

  const activeSemester = await prisma.semester.findFirst({
    where: { is_active: true },
    select: { id: true, name: true },
  });
  if (!activeSemester) {
    throw new Error("Belum ada semester aktif — penunjukan pengelola membutuhkan semester aktif.");
  }

  // Target harus nyata; label disimpan untuk jejak audit.
  let targetLabel = "";
  if (scope_type === "PRODI") {
    const prodi = await prisma.prodi.findUnique({
      where: { id: prodi_id! },
      select: { name: true },
    });
    if (!prodi) throw new Error("Prodi lingkup tidak ditemukan.");
    targetLabel = prodi.name;
  } else {
    const kelas = await prisma.kelas.findUnique({
      where: { id: kelas_id! },
      select: { name: true, prodi: { select: { name: true } } },
    });
    if (!kelas) throw new Error("Kelas lingkup tidak ditemukan.");
    targetLabel = `${kelas.name} · ${kelas.prodi.name}`;
  }

  const existing = await prisma.pengelolaAssignment.findFirst({
    where: {
      email,
      scope_type,
      revoked_at: null,
      ...(scope_type === "PRODI" ? { prodi_id } : { kelas_id }),
    },
    select: { id: true },
  });
  if (existing) {
    throw new Error("Email ini sudah memegang penunjukan aktif untuk lingkup yang sama.");
  }

  // Bila user-nya sudah ada (pernah login / dibuat admin), langsung AKTIF;
  // bila belum, baris PENDING diklaim otomatis saat login pertamanya.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, is_admin: true },
  });
  if (user?.is_admin) {
    throw new Error("Akun admin penuh tidak memerlukan penunjukan pengelola.");
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.pengelolaAssignment.create({
      data: {
        email,
        user_id: user?.id ?? null,
        scope_type,
        prodi_id: scope_type === "PRODI" ? prodi_id : null,
        kelas_id: scope_type === "KELAS" ? kelas_id : null,
        granted_by_id: admin.id,
        semester_id: activeSemester.id,
      },
    });
    await logAudit(
      {
        actor: auditActor(admin, { role: "ADMIN" }),
        action: "PENGELOLA_ASSIGN",
        entity: { type: "PengelolaAssignment", id: created.id, label: email },
        context:
          scope_type === "KELAS" && kelas_id
            ? { kelas_id, kelas_label: targetLabel }
            : undefined,
        after: {
          email,
          scope_type,
          prodi_id: scope_type === "PRODI" ? prodi_id : null,
          kelas_id: scope_type === "KELAS" ? kelas_id : null,
          target_label: targetLabel,
          semester_id: activeSemester.id,
          status: user ? "AKTIF" : "PENDING",
        },
      },
      tx,
    );
  });

  revalidatePath("/admin/pengelola");
}

/** Cabut penunjukan pengelola. Hanya admin penuh; berlaku seketika. */
export async function revokePengelola(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = idSchema.safeParse(formData.get("id"));
  if (!parsed.success) throw new Error("Penunjukan tidak valid.");

  const assignment = await prisma.pengelolaAssignment.findUnique({
    where: { id: parsed.data },
    select: {
      id: true,
      email: true,
      scope_type: true,
      prodi_id: true,
      kelas_id: true,
      revoked_at: true,
      prodi: { select: { name: true } },
      kelas: { select: { name: true, prodi: { select: { name: true } } } },
    },
  });
  if (!assignment || assignment.revoked_at) {
    throw new Error("Penunjukan aktif tidak ditemukan.");
  }

  const targetLabel =
    assignment.scope_type === "PRODI"
      ? (assignment.prodi?.name ?? assignment.email)
      : assignment.kelas
        ? `${assignment.kelas.name} · ${assignment.kelas.prodi.name}`
        : assignment.email;

  await prisma.$transaction(async (tx) => {
    await tx.pengelolaAssignment.update({
      where: { id: assignment.id },
      data: { revoked_at: new Date() },
    });
    await logAudit(
      {
        actor: auditActor(admin, { role: "ADMIN" }),
        action: "PENGELOLA_REVOKE",
        entity: { type: "PengelolaAssignment", id: assignment.id, label: assignment.email },
        context:
          assignment.kelas_id != null
            ? { kelas_id: assignment.kelas_id, kelas_label: targetLabel }
            : undefined,
        before: { email: assignment.email, scope_type: assignment.scope_type },
        after: { status: "DICABUT", target_label: targetLabel },
      },
      tx,
    );
  });

  revalidatePath("/admin/pengelola");
}

export interface PengelolaHomeKelas {
  id: string;
  name: string;
  prodi_id: string;
  prodi_name: string;
  semester_name: string;
  mahasiswa_count: number;
  matkul_count: number;
}

/**
 * Data beranda /pengelola: hanya kelas & prodi di dalam lingkup aktor.
 * Admin penuh melihat semuanya (halaman ini juga jadi pratinjau baginya).
 */
export async function getPengelolaHomeData(): Promise<{
  kelasList: PengelolaHomeKelas[];
  prodiNames: string[];
}> {
  const user = await requirePengelola();
  const scopes = user.pengelola_scopes;

  const kelasList = await prisma.kelas.findMany({
    orderBy: [{ semester: { start_date: "desc" } }, { name: "asc" }],
    take: 500,
    select: {
      id: true,
      name: true,
      prodi_id: true,
      prodi: { select: { name: true } },
      semester: { select: { name: true } },
      _count: { select: { users: true, kelasMatkul: true } },
    },
  });

  const visible = user.is_admin
    ? kelasList
    : filterKelasByScope(scopes, kelasList);

  const result: PengelolaHomeKelas[] = visible.map((kelas) => ({
    id: kelas.id,
    name: kelas.name,
    prodi_id: kelas.prodi_id,
    prodi_name: kelas.prodi.name,
    semester_name: kelas.semester.name,
    mahasiswa_count: kelas._count.users,
    matkul_count: kelas._count.kelasMatkul,
  }));

  const prodiNames = user.is_admin
    ? [...new Set(visible.map((kelas) => kelas.prodi.name))]
    : await prisma.prodi
        .findMany({
          where: { id: { in: scopes.prodi_ids } },
          select: { name: true },
        })
        .then((rows) => rows.map((row) => row.name));

  return { kelasList: result, prodiNames };
}
