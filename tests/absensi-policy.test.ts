import assert from "node:assert/strict";
import test from "node:test";

import {
  ABSENSI_ALPHA_LIMIT,
  absensiQuota,
  countAbsensiStatuses,
  emptyAbsensiCounts,
  formatAbsensiDate,
  isAbsensiStatus,
  parseAbsensiDate,
} from "../lib/absensi";

test("limit tanpa keterangan adalah dua per matkul", () => {
  assert.equal(ABSENSI_ALPHA_LIMIT, 2);
});

test("hanya TANPA_KETERANGAN yang dihitung sebagai alpha", () => {
  const counts = countAbsensiStatuses([
    { status: "TANPA_KETERANGAN" },
    { status: "SAKIT" },
    { status: "IZIN" },
    { status: "TANPA_KETERANGAN" },
  ]);
  assert.deepEqual(counts, { tanpa_keterangan: 2, sakit: 1, izin: 1 });
});

test("status tak dikenal diabaikan, bukan dihitung sebagai alpha", () => {
  const counts = countAbsensiStatuses([{ status: "LAINNYA" }]);
  assert.deepEqual(counts, emptyAbsensiCounts());
});

test("kuota penuh menampilkan sisa nol", () => {
  const quota = absensiQuota({ tanpa_keterangan: 2, sakit: 0, izin: 0 });
  assert.deepEqual(quota, {
    limit: 2,
    alpha: 2,
    remaining: 0,
    over: 0,
    exhausted: true,
  });
});

test("alpha ke-3 tetap dihitung sebagai melewati kuota", () => {
  const quota = absensiQuota({ tanpa_keterangan: 3, sakit: 1, izin: 0 });
  assert.equal(quota.remaining, 0);
  assert.equal(quota.over, 1);
  assert.equal(quota.exhausted, true);
});

test("sakit dan izin tidak memakai kuota", () => {
  const quota = absensiQuota({ tanpa_keterangan: 0, sakit: 4, izin: 3 });
  assert.equal(quota.remaining, 2);
  assert.equal(quota.over, 0);
  assert.equal(quota.exhausted, false);
});

test("tanggal harus berupa kalender nyata", () => {
  assert.ok(parseAbsensiDate("2026-11-22"));
  assert.equal(parseAbsensiDate("2026-02-30"), null);
  assert.equal(parseAbsensiDate("2026-13-01"), null);
  assert.equal(parseAbsensiDate("22-11-2026"), null);
  assert.equal(parseAbsensiDate("2026-11-22T10:00:00Z"), null);
});

test("tanggal disimpan dan dibaca sebagai YYYY-MM-DD", () => {
  const parsed = parseAbsensiDate("2026-11-22");
  assert.ok(parsed);
  assert.equal(formatAbsensiDate(parsed), "2026-11-22");
});

test("guard status hanya menerima tiga nilai resmi", () => {
  assert.equal(isAbsensiStatus("TANPA_KETERANGAN"), true);
  assert.equal(isAbsensiStatus("SAKIT"), true);
  assert.equal(isAbsensiStatus("IZIN"), true);
  assert.equal(isAbsensiStatus("HADIR"), false);
  assert.equal(isAbsensiStatus(null), false);
});
