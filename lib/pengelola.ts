/**
 * Karsa — lib/pengelola.ts
 * ----------------------------------------------------------------------------
 * Kebijakan murni peran Pengelola (delegasi wewenang admin terbatas lingkup).
 *
 * Modul ini SENGAJA murni — tanpa Prisma & tanpa `next-auth` — mengikuti pola
 * `lib/mobile/group-policy.ts`, supaya seluruh aturan lingkup bisa diuji unit
 * tanpa database (lihat `tests/pengelola-policy.test.ts`).
 *
 * Sumber kebenaran peran ini adalah tabel `PengelolaAssignment` (penunjukan
 * oleh admin penuh), BUKAN flag di `User` — meniru cara PJ diturunkan dari
 * `KelasMatkul.pj_id`. Klaim session (`pengelola_scopes`) dibangun di
 * `lib/user-snapshot.ts` dari baris penunjukan aktif.
 */

/** Jenis lingkup penunjukan. String, tanpa enum native (konvensi schema). */
export type PengelolaScopeType = "PRODI" | "KELAS";

/** Lingkup efektif seorang pengelola, hasil penurunan dari penunjukan aktif. */
export interface PengelolaScopes {
  prodi_ids: string[];
  kelas_ids: string[];
}

/** Lingkup kosong — pengelola tanpa hak apa pun (fail-closed). */
export const EMPTY_PENGELOLA_SCOPES: PengelolaScopes = {
  prodi_ids: [],
  kelas_ids: [],
};

/** Bentuk minimum baris penunjukan yang dibutuhkan kebijakan ini. */
export interface PengelolaAssignmentLike {
  scope_type: string;
  prodi_id: string | null;
  kelas_id: string | null;
  revoked_at: Date | string | null;
  semester_id: string | null;
}

/**
 * Turunkan lingkup efektif dari baris-baris penunjukan seorang user.
 *
 * Baris diabaikan bila:
 * - sudah dicabut (`revoked_at` terisi), atau
 * - terikat semester lain (`semester_id` terisi dan bukan semester aktif) —
 *   penunjukan berhenti memberi hak begitu semester berganti, atau
 * - targetnya tidak konsisten dengan `scope_type` (data rusak → fail-closed).
 *
 * `activeSemesterId` boleh null (mis. belum ada semester aktif): penunjukan
 * yang terikat semester tertentu lalu dianggap belum/tidak berlaku, sedangkan
 * penunjukan tanpa ikatan semester tetap berlaku.
 */
export function derivePengelolaScopes(
  rows: readonly PengelolaAssignmentLike[],
  activeSemesterId: string | null,
): PengelolaScopes {
  const prodiIds = new Set<string>();
  const kelasIds = new Set<string>();

  for (const row of rows) {
    if (row.revoked_at) continue;
    if (row.semester_id && row.semester_id !== activeSemesterId) continue;
    if (row.scope_type === "PRODI" && row.prodi_id) {
      prodiIds.add(row.prodi_id);
    } else if (row.scope_type === "KELAS" && row.kelas_id) {
      kelasIds.add(row.kelas_id);
    }
  }

  return { prodi_ids: [...prodiIds], kelas_ids: [...kelasIds] };
}

/** Punya minimal satu lingkup aktif? */
export function isPengelola(scopes: PengelolaScopes | null | undefined): boolean {
  return Boolean(
    scopes && (scopes.prodi_ids.length > 0 || scopes.kelas_ids.length > 0),
  );
}

/** Boleh mengelola satu prodi (mahasiswa, kelas, penunjukan PJ di prodinya)? */
export function canManageProdi(
  scopes: PengelolaScopes | null | undefined,
  prodiId: string,
): boolean {
  return Boolean(scopes?.prodi_ids.includes(prodiId));
}

/**
 * Boleh mengelola satu kelas? Pewarisan lingkup: pengelola PRODI mewarisi
 * semua kelas di prodi itu; pengelola KELAS hanya kelas yang ditunjuk.
 */
export function canManageKelas(
  scopes: PengelolaScopes | null | undefined,
  kelas: { id: string; prodi_id: string },
): boolean {
  if (!scopes) return false;
  return scopes.kelas_ids.includes(kelas.id) || scopes.prodi_ids.includes(kelas.prodi_id);
}

/**
 * Boleh menunjuk/mengubah PJ untuk kelas ini? Aturan konflik kepentingan:
 * pengelola yang terdaftar sebagai mahasiswa di kelas yang sama TIDAK boleh
 * mengatur PJ di kelas itu (perpanjangan larangan menilai diri sendiri).
 *
 * `actorKelasId` adalah `User.kelas_id` milik aktor (kelas tempat ia
 * terdaftar sebagai mahasiswa), bukan lingkup penunjukannya.
 */
export function canAssignPj(
  scopes: PengelolaScopes | null | undefined,
  actorKelasId: string | null | undefined,
  kelas: { id: string; prodi_id: string },
): boolean {
  if (!canManageKelas(scopes, kelas)) return false;
  if (actorKelasId && actorKelasId === kelas.id) return false;
  return true;
}

/**
 * Saring daftar kelas menjadi yang berada dalam lingkup pengelola.
 * Dipakai halaman daftar & rekap supaya data di luar lingkup tidak pernah
 * ikut terkirim ke klien.
 */
export function filterKelasByScope<T extends { id: string; prodi_id: string }>(
  scopes: PengelolaScopes | null | undefined,
  kelasList: readonly T[],
): T[] {
  return kelasList.filter((kelas) => canManageKelas(scopes, kelas));
}
