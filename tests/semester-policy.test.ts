import assert from "node:assert/strict";
import test from "node:test";

import {
  angkatanFromNim,
  angkatanMismatchMessage,
  cohortKey,
} from "../lib/semester";

test("angkatanFromNim reads the first two NIM digits", () => {
  assert.equal(angkatanFromNim("2310501001"), 2023);
  assert.equal(angkatanFromNim(" 2610501009 "), 2026);
  assert.equal(angkatanFromNim("0010501001"), 2000);
});

test("angkatanFromNim is safe for empty and malformed NIM", () => {
  assert.equal(angkatanFromNim(null), null);
  assert.equal(angkatanFromNim(undefined), null);
  assert.equal(angkatanFromNim(""), null);
  assert.equal(angkatanFromNim("ab10501001"), null);
  assert.equal(angkatanFromNim("2"), null);
});

test("cohortKey is stable and scoped by prodi", () => {
  assert.equal(cohortKey("prodi_pajak", 2026), "prodi_pajak:2026");
  assert.notEqual(cohortKey("prodi_pajak", 2026), cohortKey("prodi_ti", 2026));
});

test("mismatch message names both angkatan", () => {
  const message = angkatanMismatchMessage(2025, 2026);
  assert.match(message, /2025/);
  assert.match(message, /2026/);
});
