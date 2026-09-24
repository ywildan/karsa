import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test, { after } from "node:test";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100";

type Envelope = {
  ok: boolean;
  data?: any;
  error?: { code?: string; message?: string };
};

const tokens = {
  admin: "admin-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  budi: "budi-token-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  siti: "siti-token-ccccccccccccccccccccccccccccccccccccc",
  agus: "agus-token-ddddddddddddddddddddddddddddddddddddd",
  noClass: "noclass-token-eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  extra: "extra-token-fffffffffffffffffffffffffffffffffffff",
  other: "other-token-ggggggggggggggggggggggggggggggggggggg",
} as const;

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function issueSession(userId: string, token: string): Promise<void> {
  await prisma.mobileSession.create({
    data: {
      id: `session_${userId}`,
      user_id: userId,
      access_token_hash: hash(token),
      refresh_token_hash: hash(`refresh-${userId}`),
      access_expires_at: new Date(Date.now() + 60 * 60 * 1000),
      refresh_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      device_name: "CI smoke test",
    },
  });
}

async function api(
  path: string,
  options: {
    token?: string;
    method?: string;
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<{ status: number; body: Envelope; cacheControl: string | null }> {
  const response = await fetch(`${baseUrl}/api/mobile/v1${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.idempotencyKey
        ? { "Idempotency-Key": options.idempotencyKey }
        : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return {
    status: response.status,
    body: (await response.json()) as Envelope,
    cacheControl: response.headers.get("cache-control"),
  };
}

function expectError(
  response: { status: number; body: Envelope },
  status: number,
  code: string,
): void {
  assert.equal(response.status, status);
  assert.equal(response.body.ok, false);
  assert.equal(response.body.error?.code, code);
}

after(async () => {
  await prisma.$disconnect();
});

test("mobile group API enforces membership, contextual PJ rights, and abuse rules", async () => {
  const semester = await prisma.semester.findFirstOrThrow({ where: { is_active: true } });

  await prisma.user.create({
    data: {
      id: "usr_extra",
      name: "Extra Reporter",
      email: "extra@students.untidar.ac.id",
      nim: "2310501004",
      kelas_id: "kelas_ti01",
    },
  });
  await prisma.kelas.create({
    data: {
      id: "kelas_other",
      name: "TI-02",
      prodi_id: "prodi_ti",
      semester_id: semester.id,
    },
  });
  await prisma.user.create({
    data: {
      id: "usr_other",
      name: "Other Class",
      email: "other@students.untidar.ac.id",
      nim: "2310502001",
      kelas_id: "kelas_other",
    },
  });
  await prisma.kelasMatkul.create({
    data: {
      id: "km_other",
      kelas_id: "kelas_other",
      matkul_id: "matkul_algo",
      pj_id: "usr_other",
    },
  });

  await Promise.all([
    issueSession("usr_admin", tokens.admin),
    issueSession("usr_pj_budi", tokens.budi),
    issueSession("usr_siti", tokens.siti),
    issueSession("usr_agus", tokens.agus),
    issueSession("usr_user_baru", tokens.noClass),
    issueSession("usr_extra", tokens.extra),
    issueSession("usr_other", tokens.other),
  ]);

  expectError(await api("/groups"), 401, "UNAUTHENTICATED");
  expectError(await api("/groups", { token: tokens.admin }), 403, "GROUP_FORBIDDEN");
  expectError(
    await api("/groups", { token: tokens.noClass }),
    403,
    "GROUP_FORBIDDEN",
  );

  const groups = await api("/groups", { token: tokens.budi });
  assert.equal(groups.status, 200);
  assert.equal(groups.cacheControl, "no-store");
  assert.equal(groups.body.data.length, 2);
  const algorithm = groups.body.data.find((group: any) => group.id === "km_algo_ti01");
  const web = groups.body.data.find((group: any) => group.id === "km_pweb_ti01");
  assert.equal(algorithm.is_manager, true);
  assert.equal(web.is_manager, false);

  const sitiGroups = await api("/groups", { token: tokens.siti });
  assert.equal(
    sitiGroups.body.data.find((group: any) => group.id === "km_pweb_ti01").is_manager,
    true,
  );
  assert.equal(
    sitiGroups.body.data.find((group: any) => group.id === "km_algo_ti01").is_manager,
    false,
  );

  expectError(
    await api("/groups/km_other/messages", { token: tokens.agus }),
    404,
    "GROUP_NOT_FOUND",
  );

  const firstSend = await api("/groups/km_algo_ti01/messages", {
    token: tokens.agus,
    method: "POST",
    idempotencyKey: "smoke-message-key-0001",
    body: { text: "Pesan smoke test" },
  });
  assert.equal(firstSend.status, 201);
  const firstMessageId = firstSend.body.data.id as string;

  const duplicateSend = await api("/groups/km_algo_ti01/messages", {
    token: tokens.agus,
    method: "POST",
    idempotencyKey: "smoke-message-key-0001",
    body: { text: "Pesan smoke test" },
  });
  assert.equal(duplicateSend.status, 201);
  assert.equal(duplicateSend.body.data.id, firstMessageId);
  assert.equal(await prisma.groupMessage.count({ where: { author_id: "usr_agus" } }), 1);

  expectError(
    await api("/groups/km_pweb_ti01/messages", {
      token: tokens.agus,
      method: "POST",
      idempotencyKey: "smoke-message-key-0002",
      body: { text: "Reply lintas grup", reply_to_id: firstMessageId },
    }),
    422,
    "MESSAGE_REJECTED",
  );

  expectError(
    await api(`/groups/km_algo_ti01/messages/${firstMessageId}/pin`, {
      token: tokens.siti,
      method: "POST",
      body: { pinned: true },
    }),
    403,
    "GROUP_MANAGER_REQUIRED",
  );
  assert.equal(
    (
      await api(`/groups/km_algo_ti01/messages/${firstMessageId}/pin`, {
        token: tokens.budi,
        method: "POST",
        body: { pinned: true },
      })
    ).status,
    200,
  );

  assert.equal(
    (
      await api("/groups/km_algo_ti01/lock", {
        token: tokens.budi,
        method: "POST",
        body: { locked: true },
      })
    ).status,
    200,
  );
  for (const [token, key] of [
    [tokens.agus, "smoke-locked-key-0001"],
    [tokens.siti, "smoke-locked-key-0002"],
  ] as const) {
    expectError(
      await api("/groups/km_algo_ti01/messages", {
        token,
        method: "POST",
        idempotencyKey: key,
        body: { text: "Tidak boleh masuk saat lock" },
      }),
      409,
      "GROUP_LOCKED",
    );
  }

  const managerMessage = await api("/groups/km_algo_ti01/messages", {
    token: tokens.budi,
    method: "POST",
    idempotencyKey: "smoke-manager-key-0001",
    body: { text: "Pesan PJ saat grup dikunci" },
  });
  assert.equal(managerMessage.status, 201);
  const managerMessageId = managerMessage.body.data.id as string;

  await prisma.groupMessage.create({
    data: {
      id: "message_expired_edit",
      kelas_matkul_id: "km_algo_ti01",
      author_id: "usr_agus",
      body: "Pesan lama",
      idempotency_key: "usr_agus:expired-edit",
      created_at: new Date(Date.now() - 16 * 60 * 1000),
    },
  });
  expectError(
    await api("/groups/km_algo_ti01/messages/message_expired_edit", {
      token: tokens.agus,
      method: "PATCH",
      body: { text: "Edit terlambat" },
    }),
    409,
    "EDIT_WINDOW_EXPIRED",
  );

  const deleted = await api(`/groups/km_algo_ti01/messages/${firstMessageId}`, {
    token: tokens.agus,
    method: "DELETE",
  });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.data.state, "deleted");
  assert.equal(deleted.body.data.text, null);

  expectError(
    await api(`/groups/km_algo_ti01/messages/${managerMessageId}/reports`, {
      token: tokens.budi,
      method: "POST",
      body: { reason: "OTHER" },
    }),
    403,
    "SELF_REPORT_FORBIDDEN",
  );

  const firstReport = await api(
    `/groups/km_algo_ti01/messages/${managerMessageId}/reports`,
    {
      token: tokens.siti,
      method: "POST",
      body: { reason: "SPAM" },
    },
  );
  assert.equal(firstReport.status, 201);
  assert.equal(firstReport.body.data.auto_hidden, false);
  const reportId = firstReport.body.data.report.id as string;

  const managerReports = await api("/groups/km_algo_ti01/reports", {
    token: tokens.budi,
  });
  assert.equal(managerReports.status, 200);
  assert.equal(managerReports.body.data.length, 0);
  expectError(
    await api(`/groups/km_algo_ti01/reports/${reportId}/resolve`, {
      token: tokens.budi,
      method: "POST",
      body: { action: "HIDE" },
    }),
    403,
    "SELF_MODERATION_FORBIDDEN",
  );

  for (const [token, expectedHidden] of [
    [tokens.agus, false],
    [tokens.extra, true],
  ] as const) {
    const report = await api(
      `/groups/km_algo_ti01/messages/${managerMessageId}/reports`,
      {
        token,
        method: "POST",
        body: { reason: "INAPPROPRIATE" },
      },
    );
    assert.equal(report.status, 201);
    assert.equal(report.body.data.auto_hidden, expectedHidden);
  }

  const hiddenRow = await prisma.groupMessage.findUniqueOrThrow({
    where: { id: managerMessageId },
  });
  assert.notEqual(hiddenRow.hidden_at, null);
  assert.equal(hiddenRow.pinned_at, null);

  expectError(
    await api("/groups/blocks/usr_agus", { token: tokens.agus, method: "PUT" }),
    400,
    "INVALID_INPUT",
  );
  expectError(
    await api("/groups/blocks/usr_other", { token: tokens.agus, method: "PUT" }),
    404,
    "USER_NOT_FOUND",
  );

  await prisma.mobileSession.update({
    where: { id: "session_usr_agus" },
    data: { revoked_at: new Date() },
  });
  expectError(await api("/groups", { token: tokens.agus }), 401, "UNAUTHENTICATED");
});
