import assert from "node:assert/strict";
import test from "node:test";

import {
  canEditGroupMessage,
  canResolveGroupReport,
  canSendToGroup,
  canUseMobileGroups,
  isGroupManager,
  shouldAutoHideReportedMessage,
} from "../lib/mobile/group-policy";

const student = { id: "student-a", kelas_id: "class-a", is_admin: false };

test("mobile groups fail closed for admins and users without a class", () => {
  assert.equal(canUseMobileGroups(student), true);
  assert.equal(canUseMobileGroups({ ...student, is_admin: true }), false);
  assert.equal(canUseMobileGroups({ ...student, kelas_id: null }), false);
});

test("manager authority is scoped to the exact subject group", () => {
  assert.equal(isGroupManager("pj-algorithm", "pj-algorithm"), true);
  assert.equal(isGroupManager("pj-algorithm", "pj-web"), false);
});

test("a locked group only accepts messages from its own manager", () => {
  const lockedAt = new Date("2026-09-24T00:00:00.000Z");
  assert.equal(canSendToGroup("student-a", "pj-algorithm", lockedAt), false);
  assert.equal(canSendToGroup("pj-web", "pj-algorithm", lockedAt), false);
  assert.equal(canSendToGroup("pj-algorithm", "pj-algorithm", lockedAt), true);
  assert.equal(canSendToGroup("student-a", "pj-algorithm", null), true);
});

test("message editing is own-message only and expires exactly at 15 minutes", () => {
  const createdAt = new Date("2026-09-24T00:00:00.000Z");
  const base = {
    actorId: "student-a",
    authorId: "student-a",
    createdAt,
    deletedAt: null,
    hiddenAt: null,
  };

  assert.equal(
    canEditGroupMessage({ ...base, now: new Date("2026-09-24T00:14:59.999Z") }),
    true,
  );
  assert.equal(
    canEditGroupMessage({ ...base, now: new Date("2026-09-24T00:15:00.000Z") }),
    false,
  );
  assert.equal(
    canEditGroupMessage({ ...base, actorId: "student-b", now: createdAt }),
    false,
  );
  assert.equal(
    canEditGroupMessage({ ...base, deletedAt: createdAt, now: createdAt }),
    false,
  );
  assert.equal(
    canEditGroupMessage({ ...base, hiddenAt: createdAt, now: createdAt }),
    false,
  );
});

test("three open reports auto-hide once, not before", () => {
  assert.equal(shouldAutoHideReportedMessage(2, null), false);
  assert.equal(shouldAutoHideReportedMessage(3, null), true);
  assert.equal(shouldAutoHideReportedMessage(9, new Date()), false);
});

test("a group manager cannot adjudicate a report against their own message", () => {
  assert.equal(canResolveGroupReport("pj-a", "pj-a", "student-a"), true);
  assert.equal(canResolveGroupReport("pj-a", "pj-b", "student-a"), false);
  assert.equal(canResolveGroupReport("pj-a", "pj-a", "pj-a"), false);
});
