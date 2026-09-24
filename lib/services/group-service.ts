import "server-only";

import { z } from "zod";

import { logAudit } from "@/lib/audit";
import {
  canEditGroupMessage,
  canResolveGroupReport,
  canSendToGroup,
  canUseMobileGroups as canUseGroups,
  isGroupManager,
  shouldAutoHideReportedMessage,
} from "@/lib/mobile/group-policy";
import type { MobileActor } from "@/lib/mobile/auth";
import { prisma } from "@/lib/prisma";

export const GROUP_MESSAGE_MAX_LENGTH = 2_000;
export const GROUP_MESSAGE_PAGE_DEFAULT = 30;
export const GROUP_MESSAGE_PAGE_MAX = 50;
export const GROUP_MESSAGE_RATE_PER_MINUTE = 12;

const idSchema = z.string().trim().min(1).max(128);

export const groupMessageInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong.")
    .max(GROUP_MESSAGE_MAX_LENGTH, `Pesan maksimal ${GROUP_MESSAGE_MAX_LENGTH} karakter.`),
  reply_to_id: idSchema.nullish().transform((value) => value || null),
});

export const groupMessageQuerySchema = z.object({
  cursor: idSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(GROUP_MESSAGE_PAGE_MAX)
    .default(GROUP_MESSAGE_PAGE_DEFAULT),
});

const groupLockInputSchema = z.object({ locked: z.boolean() });
const groupPinInputSchema = z.object({ pinned: z.boolean() });
const groupHideInputSchema = z
  .object({
    hidden: z.boolean(),
    reason: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((value, context) => {
    if (value.hidden && !value.reason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Alasan wajib diisi saat menyembunyikan pesan.",
      });
    }
  });
const groupReportInputSchema = z.object({
  reason: z.enum(["SPAM", "HARASSMENT", "INAPPROPRIATE", "MISINFORMATION", "OTHER"]),
  details: z.string().trim().max(500).optional().transform((value) => value || null),
});
const groupReportResolutionSchema = z.object({
  action: z.enum(["DISMISS", "HIDE"]),
});

type GroupFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

type GroupSuccess<T> = { ok: true; data: T };
export type GroupResult<T> = GroupSuccess<T> | GroupFailure;

function failure(status: number, code: string, message: string): GroupFailure {
  return { ok: false, status, code, message };
}

async function resolveGroup(actor: MobileActor, assignmentId: string) {
  if (!canUseGroups(actor) || !idSchema.safeParse(assignmentId).success) return null;

  return prisma.kelasMatkul.findFirst({
    where: { id: assignmentId, kelas_id: actor.kelas_id },
    select: {
      id: true,
      kelas_id: true,
      pj_id: true,
      group_locked_at: true,
      matkul: { select: { id: true, name: true, code: true } },
      pj: { select: { id: true, name: true, image: true } },
      kelas: {
        select: {
          name: true,
          prodi: { select: { name: true } },
          semester: { select: { name: true } },
        },
      },
    },
  });
}

const messageSelect = {
  id: true,
  kelas_matkul_id: true,
  author_id: true,
  body: true,
  edited_at: true,
  deleted_at: true,
  hidden_at: true,
  hidden_reason: true,
  pinned_at: true,
  created_at: true,
  updated_at: true,
  author: { select: { id: true, name: true, image: true } },
  replyTo: {
    select: {
      id: true,
      author_id: true,
      body: true,
      deleted_at: true,
      hidden_at: true,
      author: { select: { id: true, name: true } },
    },
  },
} as const;

interface MessageRow {
  id: string;
  kelas_matkul_id: string;
  author_id: string;
  body: string | null;
  edited_at: Date | null;
  deleted_at: Date | null;
  hidden_at: Date | null;
  hidden_reason: string | null;
  pinned_at: Date | null;
  created_at: Date;
  updated_at: Date;
  author: { id: string; name: string | null; image: string | null };
  replyTo: {
    id: string;
    author_id: string;
    body: string | null;
    deleted_at: Date | null;
    hidden_at: Date | null;
    author: { id: string; name: string | null };
  } | null;
}

function displayName(value: string | null): string {
  return value?.trim() || "Tanpa nama";
}

function auditActor(actor: MobileActor, managerId: string) {
  return {
    id: actor.id,
    name: displayName(actor.name) || actor.email,
    is_admin: false,
    role: isGroupManager(actor.id, managerId) ? ("PJ" as const) : ("MAHASISWA" as const),
  };
}

function serializeMessage(
  row: MessageRow,
  actorId: string,
  managerId: string,
  blockedIds: ReadonlySet<string> = new Set(),
) {
  const state = row.deleted_at
    ? "deleted"
    : row.hidden_at
      ? "hidden"
      : blockedIds.has(row.author_id)
        ? "blocked"
        : "active";
  const replyState = row.replyTo?.deleted_at
    ? "deleted"
    : row.replyTo?.hidden_at
      ? "hidden"
      : row.replyTo && blockedIds.has(row.replyTo.author_id)
        ? "blocked"
        : "active";
  return {
    id: row.id,
    state,
    text: state === "active" ? row.body : null,
    hidden_reason: state === "hidden" ? row.hidden_reason : null,
    edited_at: row.edited_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_pinned: row.pinned_at !== null,
    is_own: row.author_id === actorId,
    can_edit: canEditGroupMessage({
      actorId,
      authorId: row.author_id,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
      hiddenAt: row.hidden_at,
      now: new Date(),
    }),
    can_delete: state === "active" && row.author_id === actorId,
    can_manage: managerId === actorId,
    author: {
      id: row.author.id,
      name: displayName(row.author.name),
      image: row.author.image,
      is_group_manager: row.author_id === managerId,
    },
    reply_to: row.replyTo
      ? {
          id: row.replyTo.id,
          state: replyState,
          text: replyState === "active" ? row.replyTo.body : null,
          author: {
            id: row.replyTo.author.id,
            name: displayName(row.replyTo.author.name),
            is_group_manager: row.replyTo.author_id === managerId,
          },
        }
      : null,
  };
}

export async function listGroups(actor: MobileActor): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }

  const [rows, memberCount, blocks] = await Promise.all([
    prisma.kelasMatkul.findMany({
      where: { kelas_id: actor.kelas_id },
      select: {
        id: true,
        pj_id: true,
        group_locked_at: true,
        matkul: { select: { id: true, name: true, code: true } },
        pj: { select: { id: true, name: true, image: true } },
        kelas: {
          select: {
            name: true,
            prodi: { select: { name: true } },
            semester: { select: { name: true } },
          },
        },
        groupMessages: {
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            body: true,
            deleted_at: true,
            hidden_at: true,
            created_at: true,
            author: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { matkul: { name: "asc" } },
    }),
    prisma.user.count({ where: { kelas_id: actor.kelas_id, is_admin: false } }),
    prisma.groupBlock.findMany({
      where: { blocker_id: actor.id },
      select: { blocked_id: true },
    }),
  ]);
  const blockedIds = new Set(blocks.map((block) => block.blocked_id));

  return {
    ok: true,
    data: rows.map((row) => {
      const latest = row.groupMessages[0];
      const latestState = latest?.deleted_at
        ? "deleted"
        : latest?.hidden_at
          ? "hidden"
          : latest && blockedIds.has(latest.author.id)
            ? "blocked"
            : "active";
      return {
        id: row.id,
        matkul: row.matkul,
        kelas: row.kelas,
        pj: {
          id: row.pj.id,
          name: displayName(row.pj.name),
          image: row.pj.image,
        },
        member_count: memberCount,
        is_manager: isGroupManager(actor.id, row.pj_id),
        is_locked: row.group_locked_at !== null,
        last_message: latest
          ? {
              id: latest.id,
              state: latestState,
              text: latestState === "active" ? latest.body : null,
              created_at: latest.created_at,
              author: {
                id: latest.author.id,
                name: displayName(latest.author.name),
              },
            }
          : null,
      };
    }),
  };
}

export async function listGroupMessages(
  actor: MobileActor,
  assignmentId: string,
  query: unknown,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }

  const parsed = groupMessageQuerySchema.safeParse(query);
  if (!parsed.success) {
    return failure(400, "INVALID_INPUT", "Cursor atau jumlah pesan tidak valid.");
  }

  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }

  if (parsed.data.cursor) {
    const cursorExists = await prisma.groupMessage.findFirst({
      where: { id: parsed.data.cursor, kelas_matkul_id: group.id },
      select: { id: true },
    });
    if (!cursorExists) {
      return failure(400, "INVALID_INPUT", "Cursor pesan tidak valid.");
    }
  }

  const [rows, pinnedRows, blocks] = await Promise.all([
    prisma.groupMessage.findMany({
      where: { kelas_matkul_id: group.id },
      select: messageSelect,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: parsed.data.limit + 1,
      ...(parsed.data.cursor ? { cursor: { id: parsed.data.cursor }, skip: 1 } : {}),
    }),
    prisma.groupMessage.findMany({
      where: {
        kelas_matkul_id: group.id,
        pinned_at: { not: null },
        deleted_at: null,
        hidden_at: null,
      },
      select: messageSelect,
      orderBy: { pinned_at: "desc" },
      take: 10,
    }),
    prisma.groupBlock.findMany({
      where: { blocker_id: actor.id },
      select: { blocked_id: true },
    }),
  ]);
  const typedRows = rows as MessageRow[];
  const blockedIds = new Set(blocks.map((block) => block.blocked_id));
  const hasMore = typedRows.length > parsed.data.limit;
  const page = hasMore ? typedRows.slice(0, parsed.data.limit) : typedRows;

  return {
    ok: true,
    data: {
      group: {
        id: group.id,
        matkul: group.matkul,
        kelas: group.kelas,
        pj: { ...group.pj, name: displayName(group.pj.name) },
        is_manager: isGroupManager(actor.id, group.pj_id),
        is_locked: group.group_locked_at !== null,
      },
      messages: page
        .map((row) => serializeMessage(row, actor.id, group.pj_id, blockedIds))
        .reverse(),
      pinned_messages: (pinnedRows as MessageRow[]).map((row) =>
        serializeMessage(row, actor.id, group.pj_id, blockedIds),
      ),
      next_cursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    },
  };
}

export async function createGroupMessage(
  actor: MobileActor,
  assignmentId: string,
  input: unknown,
  idempotencyKey: string,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }

  const parsed = groupMessageInputSchema.safeParse(input);
  if (!parsed.success) {
    return failure(
      400,
      "INVALID_INPUT",
      parsed.error.errors[0]?.message ?? "Pesan tidak valid.",
    );
  }

  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }
  if (!canSendToGroup(actor.id, group.pj_id, group.group_locked_at)) {
    return failure(409, "GROUP_LOCKED", "Grup sedang dikunci oleh PJ mata kuliah.");
  }

  const storedKey = `${actor.id}:${idempotencyKey}`;
  const existing = (await prisma.groupMessage.findUnique({
    where: { idempotency_key: storedKey },
    select: messageSelect,
  })) as MessageRow | null;
  if (existing) {
    if (existing.kelas_matkul_id !== group.id) {
      return failure(409, "IDEMPOTENCY_CONFLICT", "Idempotency-Key sudah digunakan.");
    }
    return {
      ok: true,
      data: serializeMessage(existing, actor.id, group.pj_id),
    };
  }

  if (parsed.data.reply_to_id) {
    const replyTarget = await prisma.groupMessage.findFirst({
      where: {
        id: parsed.data.reply_to_id,
        kelas_matkul_id: group.id,
        deleted_at: null,
        hidden_at: null,
      },
      select: { id: true },
    });
    if (!replyTarget) {
      return failure(422, "MESSAGE_REJECTED", "Pesan yang dibalas tidak tersedia.");
    }
  }

  const recentCount = await prisma.groupMessage.count({
    where: {
      author_id: actor.id,
      created_at: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recentCount >= GROUP_MESSAGE_RATE_PER_MINUTE) {
    return failure(429, "RATE_LIMITED", "Terlalu banyak pesan. Coba lagi sebentar.");
  }

  try {
    const created = (await prisma.groupMessage.create({
      data: {
        kelas_matkul_id: group.id,
        author_id: actor.id,
        reply_to_id: parsed.data.reply_to_id,
        body: parsed.data.text,
        idempotency_key: storedKey,
      },
      select: messageSelect,
    })) as MessageRow;
    return {
      ok: true,
      data: serializeMessage(created, actor.id, group.pj_id),
    };
  } catch (error) {
    const raced = (await prisma.groupMessage.findUnique({
      where: { idempotency_key: storedKey },
      select: messageSelect,
    })) as MessageRow | null;
    if (raced?.kelas_matkul_id === group.id) {
      return {
        ok: true,
        data: serializeMessage(raced, actor.id, group.pj_id),
      };
    }
    throw error;
  }
}

export async function editGroupMessage(
  actor: MobileActor,
  assignmentId: string,
  messageId: string,
  input: unknown,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }
  const parsed = groupMessageInputSchema.pick({ text: true }).safeParse(input);
  if (!parsed.success || !idSchema.safeParse(messageId).success) {
    return failure(
      400,
      "INVALID_INPUT",
      parsed.success
        ? "ID pesan tidak valid."
        : parsed.error.errors[0]?.message ?? "Pesan tidak valid.",
    );
  }

  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }
  const message = await prisma.groupMessage.findFirst({
    where: { id: messageId, kelas_matkul_id: group.id },
    select: { id: true, author_id: true, created_at: true, deleted_at: true, hidden_at: true },
  });
  if (!message) return failure(404, "MESSAGE_NOT_FOUND", "Pesan tidak ditemukan.");
  if (message.author_id !== actor.id) {
    return failure(403, "MESSAGE_FORBIDDEN", "Kamu hanya dapat mengedit pesanmu sendiri.");
  }
  if (message.deleted_at || message.hidden_at) {
    return failure(409, "MESSAGE_UNAVAILABLE", "Pesan ini tidak dapat diedit.");
  }

  const now = new Date();
  if (
    !canEditGroupMessage({
      actorId: actor.id,
      authorId: message.author_id,
      createdAt: message.created_at,
      deletedAt: message.deleted_at,
      hiddenAt: message.hidden_at,
      now,
    })
  ) {
    return failure(409, "EDIT_WINDOW_EXPIRED", "Batas edit 15 menit sudah lewat.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.groupMessage.updateMany({
      where: {
        id: message.id,
        author_id: actor.id,
        deleted_at: null,
        hidden_at: null,
        created_at: { gt: new Date(now.getTime() - 15 * 60 * 1000) },
      },
      data: { body: parsed.data.text, edited_at: now },
    });
    if (changed.count !== 1) return null;

    await logAudit(
      {
        actor: auditActor(actor, group.pj_id),
        action: "GROUP_MESSAGE_EDIT",
        entity: { type: "GroupMessage", id: message.id },
        context: {
          kelas_id: group.kelas_id,
          kelas_label: group.kelas.name,
          matkul_id: group.matkul.id,
          matkul_label: group.matkul.name,
        },
        metadata: { source: "native_mobile" },
      },
      tx,
    );
    return tx.groupMessage.findUnique({ where: { id: message.id }, select: messageSelect });
  });

  if (!updated) {
    return failure(409, "EDIT_WINDOW_EXPIRED", "Pesan tidak lagi dapat diedit.");
  }
  return {
    ok: true,
    data: serializeMessage(updated as MessageRow, actor.id, group.pj_id),
  };
}

export async function deleteGroupMessage(
  actor: MobileActor,
  assignmentId: string,
  messageId: string,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }
  if (!idSchema.safeParse(messageId).success) {
    return failure(400, "INVALID_INPUT", "ID pesan tidak valid.");
  }

  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }
  const message = await prisma.groupMessage.findFirst({
    where: { id: messageId, kelas_matkul_id: group.id },
    select: { id: true, author_id: true, deleted_at: true },
  });
  if (!message) return failure(404, "MESSAGE_NOT_FOUND", "Pesan tidak ditemukan.");
  if (message.author_id !== actor.id) {
    return failure(403, "MESSAGE_FORBIDDEN", "Kamu hanya dapat menghapus pesanmu sendiri.");
  }
  if (message.deleted_at) {
    const existing = (await prisma.groupMessage.findUnique({
      where: { id: message.id },
      select: messageSelect,
    })) as MessageRow;
    return { ok: true, data: serializeMessage(existing, actor.id, group.pj_id) };
  }

  const now = new Date();
  const deleted = await prisma.$transaction(async (tx) => {
    const changed = await tx.groupMessage.updateMany({
      where: { id: message.id, author_id: actor.id, deleted_at: null },
      data: {
        deleted_at: now,
        pinned_at: null,
        pinned_by_id: null,
      },
    });
    if (changed.count !== 1) return null;

    await logAudit(
      {
        actor: auditActor(actor, group.pj_id),
        action: "GROUP_MESSAGE_DELETE",
        entity: { type: "GroupMessage", id: message.id },
        context: {
          kelas_id: group.kelas_id,
          kelas_label: group.kelas.name,
          matkul_id: group.matkul.id,
          matkul_label: group.matkul.name,
        },
        metadata: { source: "native_mobile" },
      },
      tx,
    );
    return tx.groupMessage.findUnique({ where: { id: message.id }, select: messageSelect });
  });

  if (!deleted) return failure(409, "MESSAGE_UNAVAILABLE", "Pesan tidak lagi tersedia.");
  return {
    ok: true,
    data: serializeMessage(deleted as MessageRow, actor.id, group.pj_id),
  };
}

export async function setGroupMessagePinned(
  actor: MobileActor,
  assignmentId: string,
  messageId: string,
  input: unknown,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }
  const parsed = groupPinInputSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(messageId).success) {
    return failure(400, "INVALID_INPUT", "Permintaan pin tidak valid.");
  }

  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }
  if (!isGroupManager(actor.id, group.pj_id)) {
    return failure(
      403,
      "GROUP_MANAGER_REQUIRED",
      "Hanya PJ mata kuliah ini yang dapat menyematkan pesan.",
    );
  }

  const now = new Date();
  const changed = await prisma.$transaction(async (tx) => {
    const update = await tx.groupMessage.updateMany({
      where: {
        id: messageId,
        kelas_matkul_id: group.id,
        deleted_at: null,
        hidden_at: null,
      },
      data: parsed.data.pinned
        ? { pinned_at: now, pinned_by_id: actor.id }
        : { pinned_at: null, pinned_by_id: null },
    });
    if (update.count !== 1) return null;

    await logAudit(
      {
        actor: auditActor(actor, group.pj_id),
        action: parsed.data.pinned ? "GROUP_MESSAGE_PIN" : "GROUP_MESSAGE_UNPIN",
        entity: { type: "GroupMessage", id: messageId },
        context: {
          kelas_id: group.kelas_id,
          kelas_label: group.kelas.name,
          matkul_id: group.matkul.id,
          matkul_label: group.matkul.name,
        },
        metadata: { source: "native_mobile" },
      },
      tx,
    );
    return tx.groupMessage.findUnique({ where: { id: messageId }, select: messageSelect });
  });

  if (!changed) return failure(404, "MESSAGE_NOT_FOUND", "Pesan tidak ditemukan.");
  return {
    ok: true,
    data: serializeMessage(changed as MessageRow, actor.id, group.pj_id),
  };
}

export async function setGroupLocked(
  actor: MobileActor,
  assignmentId: string,
  input: unknown,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }
  const parsed = groupLockInputSchema.safeParse(input);
  if (!parsed.success) {
    return failure(400, "INVALID_INPUT", "Status kunci grup tidak valid.");
  }

  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }
  if (!isGroupManager(actor.id, group.pj_id)) {
    return failure(
      403,
      "GROUP_MANAGER_REQUIRED",
      "Hanya PJ mata kuliah ini yang dapat mengunci grup.",
    );
  }

  const now = new Date();
  const locked = await prisma.$transaction(async (tx) => {
    const changed = await tx.kelasMatkul.updateMany({
      where: { id: group.id, pj_id: actor.id, kelas_id: actor.kelas_id },
      data: parsed.data.locked
        ? { group_locked_at: now, group_locked_by_id: actor.id }
        : { group_locked_at: null, group_locked_by_id: null },
    });
    if (changed.count !== 1) return false;

    await logAudit(
      {
        actor: auditActor(actor, group.pj_id),
        action: parsed.data.locked ? "GROUP_LOCK" : "GROUP_UNLOCK",
        entity: { type: "KelasMatkul", id: group.id, label: group.matkul.name },
        context: {
          kelas_id: group.kelas_id,
          kelas_label: group.kelas.name,
          matkul_id: group.matkul.id,
          matkul_label: group.matkul.name,
        },
        metadata: { source: "native_mobile" },
      },
      tx,
    );
    return true;
  });

  if (!locked) {
    return failure(
      403,
      "GROUP_MANAGER_REQUIRED",
      "Penanggung jawab grup sudah berubah. Muat ulang lalu coba lagi.",
    );
  }

  return { ok: true, data: { is_locked: parsed.data.locked } };
}

export async function setGroupMessageHidden(
  actor: MobileActor,
  assignmentId: string,
  messageId: string,
  input: unknown,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }
  const parsed = groupHideInputSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(messageId).success) {
    return failure(
      400,
      "INVALID_INPUT",
      parsed.success
        ? "ID pesan tidak valid."
        : parsed.error.errors[0]?.message ?? "Permintaan moderasi tidak valid.",
    );
  }

  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }
  if (!isGroupManager(actor.id, group.pj_id)) {
    return failure(
      403,
      "GROUP_MANAGER_REQUIRED",
      "Hanya PJ mata kuliah ini yang dapat memoderasi pesan.",
    );
  }

  const message = await prisma.groupMessage.findFirst({
    where: { id: messageId, kelas_matkul_id: group.id, deleted_at: null },
    select: { id: true, author_id: true },
  });
  if (!message) return failure(404, "MESSAGE_NOT_FOUND", "Pesan tidak ditemukan.");
  if (message.author_id === actor.id) {
    return failure(
      403,
      "SELF_MODERATION_FORBIDDEN",
      "Gunakan edit atau hapus untuk mengelola pesanmu sendiri.",
    );
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.groupMessage.updateMany({
      where: { id: message.id, kelas_matkul_id: group.id, deleted_at: null },
      data: parsed.data.hidden
        ? {
            hidden_at: now,
            hidden_by_id: actor.id,
            hidden_reason: parsed.data.reason,
            pinned_at: null,
            pinned_by_id: null,
          }
        : { hidden_at: null, hidden_by_id: null, hidden_reason: null },
    });
    if (changed.count !== 1) return null;

    await logAudit(
      {
        actor: auditActor(actor, group.pj_id),
        action: parsed.data.hidden ? "GROUP_MESSAGE_HIDE" : "GROUP_MESSAGE_UNHIDE",
        entity: { type: "GroupMessage", id: message.id },
        context: {
          kelas_id: group.kelas_id,
          kelas_label: group.kelas.name,
          matkul_id: group.matkul.id,
          matkul_label: group.matkul.name,
        },
        metadata: { source: "native_mobile" },
      },
      tx,
    );
    return tx.groupMessage.findUnique({ where: { id: message.id }, select: messageSelect });
  });

  if (!updated) return failure(409, "MESSAGE_UNAVAILABLE", "Pesan tidak lagi tersedia.");
  return {
    ok: true,
    data: serializeMessage(updated as MessageRow, actor.id, group.pj_id),
  };
}

export async function reportGroupMessage(
  actor: MobileActor,
  assignmentId: string,
  messageId: string,
  input: unknown,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }
  const parsed = groupReportInputSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(messageId).success) {
    return failure(400, "INVALID_INPUT", "Laporan tidak valid.");
  }

  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }
  const message = await prisma.groupMessage.findFirst({
    where: { id: messageId, kelas_matkul_id: group.id, deleted_at: null },
    select: { id: true, author_id: true, hidden_at: true },
  });
  if (!message) return failure(404, "MESSAGE_NOT_FOUND", "Pesan tidak ditemukan.");
  if (message.author_id === actor.id) {
    return failure(403, "SELF_REPORT_FORBIDDEN", "Kamu tidak dapat melaporkan pesanmu sendiri.");
  }

  const existing = await prisma.groupReport.findUnique({
    where: { message_id_reporter_id: { message_id: message.id, reporter_id: actor.id } },
    select: { id: true, status: true, reason: true, created_at: true },
  });
  if (existing) return { ok: true, data: { report: existing, auto_hidden: false } };

  const result = await prisma.$transaction(async (tx) => {
    const report = await tx.groupReport.create({
      data: {
        message_id: message.id,
        reporter_id: actor.id,
        reason: parsed.data.reason,
        details: parsed.data.details,
      },
      select: { id: true, status: true, reason: true, created_at: true },
    });
    const reportCount = await tx.groupReport.count({
      where: { message_id: message.id, status: "OPEN" },
    });
    const autoHidden = shouldAutoHideReportedMessage(reportCount, message.hidden_at);
    if (autoHidden) {
      await tx.groupMessage.updateMany({
        where: { id: message.id, deleted_at: null, hidden_at: null },
        data: {
          hidden_at: new Date(),
          hidden_by_id: null,
          hidden_reason: "Dilaporkan oleh beberapa anggota.",
          pinned_at: null,
          pinned_by_id: null,
        },
      });
    }

    await logAudit(
      {
        actor: auditActor(actor, group.pj_id),
        action: "GROUP_MESSAGE_REPORT",
        entity: { type: "GroupReport", id: report.id },
        context: {
          kelas_id: group.kelas_id,
          kelas_label: group.kelas.name,
          matkul_id: group.matkul.id,
          matkul_label: group.matkul.name,
        },
        metadata: {
          source: "native_mobile",
          message_id: message.id,
          reason: parsed.data.reason,
          auto_hidden: autoHidden,
        },
      },
      tx,
    );
    return { report, auto_hidden: autoHidden };
  });

  return { ok: true, data: result };
}

export async function listGroupReports(
  actor: MobileActor,
  assignmentId: string,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }
  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }
  if (!isGroupManager(actor.id, group.pj_id)) {
    return failure(
      403,
      "GROUP_MANAGER_REQUIRED",
      "Hanya PJ mata kuliah ini yang dapat melihat laporan grup.",
    );
  }

  const reports = await prisma.groupReport.findMany({
    where: {
      status: "OPEN",
      message: { kelas_matkul_id: group.id, author_id: { not: actor.id } },
    },
    select: {
      id: true,
      reason: true,
      details: true,
      created_at: true,
      reporter: { select: { id: true, name: true } },
      message: {
        select: {
          id: true,
          body: true,
          deleted_at: true,
          hidden_at: true,
          author: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { created_at: "asc" },
    take: 100,
  });
  return { ok: true, data: reports };
}

export async function resolveGroupReport(
  actor: MobileActor,
  assignmentId: string,
  reportId: string,
  input: unknown,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }
  const parsed = groupReportResolutionSchema.safeParse(input);
  if (!parsed.success || !idSchema.safeParse(reportId).success) {
    return failure(400, "INVALID_INPUT", "Tindakan laporan tidak valid.");
  }
  const group = await resolveGroup(actor, assignmentId);
  if (!group) {
    return failure(404, "GROUP_NOT_FOUND", "Grup tidak tersedia untuk kelasmu.");
  }
  if (!isGroupManager(actor.id, group.pj_id)) {
    return failure(
      403,
      "GROUP_MANAGER_REQUIRED",
      "Hanya PJ mata kuliah ini yang dapat menangani laporan.",
    );
  }

  const report = await prisma.groupReport.findFirst({
    where: { id: reportId, status: "OPEN", message: { kelas_matkul_id: group.id } },
    select: { id: true, message_id: true, message: { select: { author_id: true } } },
  });
  if (!report) return failure(404, "REPORT_NOT_FOUND", "Laporan tidak ditemukan.");
  if (!canResolveGroupReport(actor.id, group.pj_id, report.message.author_id)) {
    return failure(
      403,
      "SELF_MODERATION_FORBIDDEN",
      "Laporan terhadap PJ tidak dapat ditangani oleh PJ yang dilaporkan.",
    );
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    if (parsed.data.action === "HIDE") {
      await tx.groupMessage.updateMany({
        where: { id: report.message_id, deleted_at: null },
        data: {
          hidden_at: now,
          hidden_by_id: actor.id,
          hidden_reason: "Disembunyikan PJ setelah laporan.",
          pinned_at: null,
          pinned_by_id: null,
        },
      });
      await tx.groupReport.updateMany({
        where: { message_id: report.message_id, status: "OPEN" },
        data: { status: "ACTIONED", resolved_at: now, resolved_by_id: actor.id },
      });
    } else {
      await tx.groupReport.update({
        where: { id: report.id },
        data: { status: "DISMISSED", resolved_at: now, resolved_by_id: actor.id },
      });
    }

    await logAudit(
      {
        actor: auditActor(actor, group.pj_id),
        action:
          parsed.data.action === "HIDE" ? "GROUP_REPORT_ACTION" : "GROUP_REPORT_DISMISS",
        entity: { type: "GroupReport", id: report.id },
        context: {
          kelas_id: group.kelas_id,
          kelas_label: group.kelas.name,
          matkul_id: group.matkul.id,
          matkul_label: group.matkul.name,
        },
        metadata: { source: "native_mobile", message_id: report.message_id },
      },
      tx,
    );
  });

  return { ok: true, data: { status: parsed.data.action === "HIDE" ? "ACTIONED" : "DISMISSED" } };
}

export async function setGroupBlock(
  actor: MobileActor,
  userId: string,
  blocked: boolean,
): Promise<GroupResult<unknown>> {
  if (!canUseGroups(actor)) {
    return failure(403, "GROUP_FORBIDDEN", "Grup hanya tersedia untuk anggota kelas.");
  }
  if (!idSchema.safeParse(userId).success || userId === actor.id) {
    return failure(400, "INVALID_INPUT", "Pengguna yang diblokir tidak valid.");
  }
  const target = await prisma.user.findFirst({
    where: { id: userId, kelas_id: actor.kelas_id, is_admin: false },
    select: { id: true },
  });
  if (!target) return failure(404, "USER_NOT_FOUND", "Pengguna tidak ditemukan di kelasmu.");

  if (blocked) {
    await prisma.groupBlock.upsert({
      where: { blocker_id_blocked_id: { blocker_id: actor.id, blocked_id: target.id } },
      update: {},
      create: { blocker_id: actor.id, blocked_id: target.id },
    });
  } else {
    await prisma.groupBlock.deleteMany({
      where: { blocker_id: actor.id, blocked_id: target.id },
    });
  }
  return { ok: true, data: { user_id: target.id, is_blocked: blocked } };
}
