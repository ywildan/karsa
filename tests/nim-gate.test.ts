import assert from 'node:assert/strict';
import test from 'node:test';

import { needsNimCompletion } from '../lib/nim-gate';

const STUDENT = 'budi@students.untidar.ac.id';
const STAFF = 'dosen@untidar.ac.id';

test('mahasiswa tanpa NIM wajib melewati gerbang', () => {
  assert.equal(needsNimCompletion({ email: STUDENT, nim: null }), true);
  assert.equal(needsNimCompletion({ email: STUDENT, nim: '' }), true);
  assert.equal(needsNimCompletion({ email: STUDENT, nim: '   ' }), true);
  assert.equal(needsNimCompletion({ email: STUDENT }), true);
});

test('mahasiswa yang NIM-nya sudah terisi bebas', () => {
  assert.equal(needsNimCompletion({ email: STUDENT, nim: '2310501011' }), false);
});

test('admin dan pengelola tidak diganggu gerbang', () => {
  assert.equal(
    needsNimCompletion({ email: STUDENT, nim: null, is_admin: true }),
    false,
  );
  assert.equal(
    needsNimCompletion({ email: STUDENT, nim: null, is_pengelola: true }),
    false,
  );
});

test('email non-mahasiswa tidak diwajibkan NIM', () => {
  assert.equal(needsNimCompletion({ email: STAFF, nim: null }), false);
  assert.equal(needsNimCompletion({ email: 'orang@gmail.com', nim: null }), false);
  assert.equal(needsNimCompletion({ email: null, nim: null }), false);
});

test('klaim kosong tidak memicu gerbang', () => {
  assert.equal(needsNimCompletion(null), false);
  assert.equal(needsNimCompletion(undefined), false);
  assert.equal(needsNimCompletion({}), false);
});
