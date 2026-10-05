/**
 * Karsa — lib/audit.ts
 * ----------------------------------------------------------------------------
 * Helper terpusat untuk menulis event audit sistemik.
 *
 * Panggil hanya setelah operasi Prisma utama sukses. Snapshot actor, kelas,
 * dan matkul sengaja disimpan agar event historis tetap terbaca saat data
 * sumber berubah atau dihapus.
 */
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AuditActor = {
  id: string;
  name: string;
  is_admin: boolean;
  role?: "ADMIN" | "PJ" | "MAHASISWA";
};

/**
 * Subset klaim session yang dibutuhkan untuk menyusun `actor`.
 *
 * Sengaja structural (bukan `SessionUser`) supaya modul ini tetap bebas
 * `next-auth` dan bisa dipakai dari mana saja tanpa menarik rantai
 * `auth.ts` → Prisma.
 */
export type AuditActorSource = {
  id: string;
  name?: string | null;
  email?: string | null;
  is_admin: boolean;
};

export type AuditInput = {
  actor: AuditActor;
  action: string;
  entity: {
    type: string;
    id: string;
    label?: string;
  };
  context?: {
    kelas_id?: string;
    kelas_label?: string;
    matkul_id?: string;
    matkul_label?: string;
  };
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Susun `actor` dari user hasil `requireAdmin()` / `requireUser()`.
 *
 * Setiap action memakai bentuk yang sama —
 * `{ id, name: name?.trim() || email?.trim() || "…", is_admin }` — dan
 * sebelumnya blok itu ditulis ulang 21 kali, ditambah dua helper lokal yang
 * salinannya (`actions/faculty.ts`, `actions/karsa-lib-admin.ts`). Satu helper
 * ini menjaga nama tampilan dan fallback tetap konsisten di semua event audit.
 *
 * `fallbackName` dipakai actor non-admin (mis. PJ) supaya labelnya tidak
 * menyamar jadi "Administrator".
 */
export function auditActor(
  user: AuditActorSource,
  options: {
    fallbackName?: string;
    role?: AuditActor["role"];
  } = {},
): AuditActor {
  const actor: AuditActor = {
    id: user.id,
    name:
      user.name?.trim() ||
      user.email?.trim() ||
      options.fallbackName ||
      "Administrator",
    is_admin: user.is_admin,
  };
  // `role` tidak selalu diisi: `logAudit` menurunkannya dari `is_admin`.
  if (options.role !== undefined) actor.role = options.role;
  return actor;
}

/**
 * Mencatat satu event audit setelah mutasi domain berhasil.
 *
 * `InputJsonValue` dipakai, bukan `JsonValue`, agar payload JSON dapat
 * langsung diterima oleh Prisma tanpa ambiguitas SQL NULL versus JSON null.
 *
 * ⚠️ Helper TIDAK membungkus error. Jika write gagal, exception propagate ke
 * caller. Tanpa `tx`, data utama mungkin sudah commit; bila diberi transaction
 * client, error akan me-rollback mutasi utama dan event audit secara atomic.
 */
export async function logAudit(
  input: AuditInput,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;

  await client.auditLog.create({
    data: {
      actor_id: input.actor.id,
      actor_name: input.actor.name,
      actor_role: input.actor.role ?? (input.actor.is_admin ? "ADMIN" : "PJ"),
      action: input.action,
      entity_type: input.entity.type,
      entity_id: input.entity.id,
      entity_label: input.entity.label,
      kelas_id: input.context?.kelas_id,
      kelas_label: input.context?.kelas_label,
      matkul_id: input.context?.matkul_id,
      matkul_label: input.context?.matkul_label,
      before: input.before,
      after: input.after,
      metadata: input.metadata,
    },
  });
}
