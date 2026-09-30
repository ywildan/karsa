import assert from "node:assert/strict";
import test from "node:test";

import { buildUserGrowth } from "../lib/admin/user-growth";

test("grafik mingguan kumulatif dan hanya menghitung login pertama", () => {
  const now = new Date("2026-10-01T12:00:00+07:00");
  const logins = [
    ...Array.from({ length: 30 }, () => new Date("2026-09-24T10:00:00+07:00")),
    ...Array.from({ length: 40 }, () => new Date("2026-09-30T10:00:00+07:00")),
  ];
  const result = buildUserGrowth(logins, now);
  assert.equal(result.total, 70);
  assert.deepEqual(result.weekly.values.slice(-2), [30, 70]);
  assert.equal(result.weekly.gained, 40);
  assert.deepEqual(result.monthly.values.slice(-2), [70, 70]);
});

test("batas minggu dan bulan memakai WIB, bukan UTC server", () => {
  const now = new Date("2026-10-01T00:30:00+07:00");
  const result = buildUserGrowth([
    new Date("2026-09-30T23:59:00+07:00"),
    new Date("2026-10-01T00:01:00+07:00"),
  ], now);
  assert.deepEqual(result.monthly.values.slice(-2), [1, 2]);
  assert.equal(result.monthly.gained, 1);
  assert.equal(result.weekly.gained, 2);
});

test("tanpa pengguna, grafik tetap valid dan dimulai dari nol", () => {
  const result = buildUserGrowth([], new Date("2026-10-01T00:00:00+07:00"));
  assert.equal(result.total, 0);
  assert.deepEqual(result.weekly.values, Array(8).fill(0));
  assert.deepEqual(result.monthly.values, Array(6).fill(0));
});
