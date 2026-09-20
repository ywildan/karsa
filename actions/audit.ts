"use server";

/**
 * Karsa — actions/audit.ts
 * ----------------------------------------------------------------------------
 * Query audit trail sistemik untuk admin. Semua filter digabung dengan AND;
 * akses dan query selalu dijaga di server oleh `requireAdmin()`.
 */
import type { Prisma } from "@prisma/client";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const AUDIT_ACTION_CATEGORIES = [
  "POIN",
  "PJ",
  "MAHASISWA",
  "KELAS",
  "MATKUL",
  "SEMESTER",
] as const;

export type AuditActionCategory = (typeof AUDIT_ACTION_CATEGORIES)[number];

export type AuditLogFilters = {
  kelas_id?: string;
  action?: string;
  action_category?: AuditActionCategory;
  actor_id?: string;
  search?: string;
  date_from?: Date;
  date_to?: Date;
  limit?: number;
  offset?: number;
};

export type AuditLogRow = {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  kelas_id: string | null;
  kelas_label: string | null;
  matkul_id: string | null;
  matkul_label: string | null;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  /** ISO 8601 agar payload Server Action stabil di client. */
  created_at: string;
};

export type AuditKelasOption = {
  id: string;
  label: string;
};

export type AuditActorOption = {
  id: string;
  name: string;
};

/** `Date` valid yang aman diteruskan sebagai filter Prisma. */
function isValidDate(value: Date | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** Batas pagination untuk mencegah query audit tak terbatas dari client. */
function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(Math.max(Math.trunc(value ?? 100), 1), 500);
}

/** Offset selalu bilangan bulat non-negatif. */
function normalizeOffset(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(Math.trunc(value ?? 0), 0);
}

/**
 * Mengambil event audit terbaru dengan kombinasi filter AND.
 *
 * Search mencocokkan label entitas atau nama aktor. Kategori aksi dipetakan
 * ke prefix taxonomy, misalnya `POIN` → seluruh aksi `POIN_*`.
 */
export async function getAuditLog(
  filters: AuditLogFilters = {},
): Promise<AuditLogRow[]> {
  await requireAdmin();

  const conditions: Prisma.AuditLogWhereInput[] = [];
  const kelasId = filters.kelas_id?.trim();
  const action = filters.action?.trim();
  const actorId = filters.actor_id?.trim();
  const search = filters.search?.trim();

  if (kelasId) {
    conditions.push({ kelas_id: kelasId });
  }
  if (action) {
    conditions.push({ action });
  }
  if (filters.action_category) {
    conditions.push({
      action: { startsWith: `${filters.action_category}_` },
    });
  }
  if (actorId) {
    conditions.push({ actor_id: actorId });
  }
  if (search) {
    conditions.push({
      OR: [
        { entity_label: { contains: search, mode: "insensitive" } },
        { actor_name: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (isValidDate(filters.date_from)) {
    conditions.push({ created_at: { gte: filters.date_from } });
  }
  if (isValidDate(filters.date_to)) {
    conditions.push({ created_at: { lte: filters.date_to } });
  }

  const rows = await prisma.auditLog.findMany({
    where: conditions.length > 0 ? { AND: conditions } : undefined,
    orderBy: { created_at: "desc" },
    take: normalizeLimit(filters.limit),
    skip: normalizeOffset(filters.offset),
    select: {
      id: true,
      actor_id: true,
      actor_name: true,
      actor_role: true,
      action: true,
      entity_type: true,
      entity_id: true,
      entity_label: true,
      kelas_id: true,
      kelas_label: true,
      matkul_id: true,
      matkul_label: true,
      before: true,
      after: true,
      metadata: true,
      created_at: true,
    },
  });

  return rows.map((row) => ({
    ...row,
    created_at: row.created_at.toISOString(),
  }));
}

/** Opsi dropdown kelas dari kelas pada semester aktif. */
export async function getAuditKelasOptions(): Promise<AuditKelasOption[]> {
  await requireAdmin();

  return prisma.kelas.findMany({
    where: { semester: { is_active: true } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  }).then((rows) =>
    rows.map((row) => ({
      id: row.id,
      label: row.name,
    })),
  );
}

/**
 * Opsi dropdown aktor dari snapshot AuditLog, termasuk PJ non-admin yang
 * pernah melakukan aksi poin. `distinct` memilih snapshot terbaru per aktor.
 */
export async function getAuditActorOptions(): Promise<AuditActorOption[]> {
  await requireAdmin();

  const rows = await prisma.auditLog.findMany({
    distinct: ["actor_id"],
    orderBy: { created_at: "desc" },
    select: {
      actor_id: true,
      actor_name: true,
    },
  });

  return rows
    .map((row) => ({
      id: row.actor_id,
      name: row.actor_name,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "id"));
}
