import assert from "node:assert/strict";
import test from "node:test";

import {
  canAssignPj,
  canManageKelas,
  canManageProdi,
  derivePengelolaScopes,
  filterKelasByScope,
  isPengelola,
  type PengelolaAssignmentLike,
} from "../lib/pengelola";

const ACTIVE_SEMESTER = "semester-active";

function assignment(
  partial: Partial<PengelolaAssignmentLike>,
): PengelolaAssignmentLike {
  return {
    scope_type: "PRODI",
    prodi_id: null,
    kelas_id: null,
    revoked_at: null,
    semester_id: ACTIVE_SEMESTER,
    ...partial,
  };
}

test("derivePengelolaScopes collects active prodi and kelas scopes", () => {
  const scopes = derivePengelolaScopes(
    [
      assignment({ scope_type: "PRODI", prodi_id: "prodi-a" }),
      assignment({ scope_type: "KELAS", kelas_id: "kelas-1", prodi_id: null }),
    ],
    ACTIVE_SEMESTER,
  );
  assert.deepEqual(scopes.prodi_ids, ["prodi-a"]);
  assert.deepEqual(scopes.kelas_ids, ["kelas-1"]);
  assert.equal(isPengelola(scopes), true);
});

test("revoked and other-semester assignments grant nothing", () => {
  const scopes = derivePengelolaScopes(
    [
      assignment({ prodi_id: "prodi-a", revoked_at: new Date() }),
      assignment({ prodi_id: "prodi-b", semester_id: "semester-lama" }),
      assignment({ scope_type: "KELAS", kelas_id: "kelas-9", semester_id: "semester-lama" }),
    ],
    ACTIVE_SEMESTER,
  );
  assert.deepEqual(scopes, { prodi_ids: [], kelas_ids: [] });
  assert.equal(isPengelola(scopes), false);
});

test("pending rows (no user linked yet) still derive by their own fields", () => {
  // Baris PENDING belum punya user_id; penurunan lingkup hanya peduli
  // scope/revoked/semester. Snapshot hanya memuat baris milik user terkait.
  const scopes = derivePengelolaScopes(
    [assignment({ scope_type: "PRODI", prodi_id: "prodi-a", semester_id: null })],
    null,
  );
  assert.deepEqual(scopes.prodi_ids, ["prodi-a"]);
});

test("malformed rows fail closed", () => {
  const scopes = derivePengelolaScopes(
    [
      assignment({ scope_type: "PRODI", prodi_id: null }),
      assignment({ scope_type: "KELAS", kelas_id: null }),
      assignment({ scope_type: "UNIVERSITAS", prodi_id: "prodi-a" }),
    ],
    ACTIVE_SEMESTER,
  );
  assert.deepEqual(scopes, { prodi_ids: [], kelas_ids: [] });
});

test("prodi scope inherits every kelas in that prodi, kelas scope does not leak", () => {
  const prodiScopes = { prodi_ids: ["prodi-a"], kelas_ids: [] };
  const kelasScopes = { prodi_ids: [], kelas_ids: ["kelas-1"] };
  assert.equal(canManageProdi(prodiScopes, "prodi-a"), true);
  assert.equal(canManageProdi(prodiScopes, "prodi-b"), false);
  assert.equal(canManageKelas(prodiScopes, { id: "kelas-99", prodi_id: "prodi-a" }), true);
  assert.equal(canManageKelas(prodiScopes, { id: "kelas-99", prodi_id: "prodi-b" }), false);
  assert.equal(canManageKelas(kelasScopes, { id: "kelas-1", prodi_id: "prodi-b" }), true);
  assert.equal(canManageKelas(kelasScopes, { id: "kelas-2", prodi_id: "prodi-b" }), false);
  assert.equal(canManageKelas(null, { id: "kelas-1", prodi_id: "prodi-a" }), false);
});

test("canAssignPj blocks a manager enrolled as a student in the same kelas", () => {
  const scopes = { prodi_ids: ["prodi-a"], kelas_ids: ["kelas-1"] };
  const kelas = { id: "kelas-1", prodi_id: "prodi-a" };
  assert.equal(canAssignPj(scopes, null, kelas), true);
  assert.equal(canAssignPj(scopes, "kelas-lain", kelas), true);
  assert.equal(canAssignPj(scopes, "kelas-1", kelas), false);
  assert.equal(canAssignPj({ prodi_ids: [], kelas_ids: [] }, null, kelas), false);
});

test("filterKelasByScope keeps only in-scope kelas", () => {
  const scopes = { prodi_ids: ["prodi-a"], kelas_ids: ["kelas-7"] };
  const list = [
    { id: "kelas-1", prodi_id: "prodi-a" },
    { id: "kelas-2", prodi_id: "prodi-b" },
    { id: "kelas-7", prodi_id: "prodi-b" },
  ];
  assert.deepEqual(
    filterKelasByScope(scopes, list).map((k) => k.id),
    ["kelas-1", "kelas-7"],
  );
});
