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
      actor_role: input.actor.is_admin ? "ADMIN" : "PJ",
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
