/**
 * Karsa — lib/user-snapshot.ts
 * ----------------------------------------------------------------------------
 * Satu-satunya tempat yang membaca profil user + status PJ dari database.
 *
 * Kenapa file terpisah dari `lib/auth-helpers.ts`?
 *   `auth.ts` (konfigurasi NextAuth) perlu memanggil `loadUserSnapshot()`,
 *   sedangkan `lib/auth-helpers.ts` perlu `auth()` dari `auth.ts`. Kalau
 *   fungsi utamanya ditulis di auth-helpers, dua modul itu saling impor
 *   (circular import). Jadi: query DB di sini, orkestrasi session di
 *   `lib/auth-helpers.ts`.
 *
 * `is_pj` dihitung dari relasi `KelasMatkul.pj_id` — bukan dari kolom di
 * `User` — sesuai definisi Fase 1: "true jika user punya ≥1 KelasMatkul
 * dengan pj_id = user.id" (PRD §6).
 */
import { prisma } from "@/lib/prisma";

/** Profil ringkas user — dipakai untuk klaim JWT & otorisasi server. */
export interface UserSnapshot {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  nim: string | null;
  is_admin: boolean;
  kelas_id: string | null;
  is_pj: boolean;
}

/**
 * Kolom yang diambil untuk klaim session.
 * `kelasMatkulAsPj` di-`take: 1` → cukup untuk menjawab "punya ≥1 atau tidak"
 * tanpa menarik semua baris.
 */
const snapshotSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  nim: true,
  is_admin: true,
  kelas_id: true,
  kelasMatkulAsPj: { select: { id: true }, take: 1 },
};

/**
 * Bentuk baris hasil `snapshotSelect` di atas.
 * Ditulis manual (bukan `Prisma.UserGetPayload`) supaya modul ini tetap
 * ter-typecheck walau `prisma generate` belum dijalankan — Prisma Client yang
 * belum di-generate hanya mengekspor tipe `any`. Hasil query asli tetap
 * kompatibel persis dengan interface ini (nama kolom sama).
 */
interface SnapshotRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  nim: string | null;
  is_admin: boolean;
  kelas_id: string | null;
  kelasMatkulAsPj: { id: string }[];
}

function toSnapshot(row: SnapshotRow): UserSnapshot {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    nim: row.nim,
    is_admin: row.is_admin,
    kelas_id: row.kelas_id,
    is_pj: row.kelasMatkulAsPj.length > 0,
  };
}

/**
 * Baca profil user berdasarkan id (= `token.sub` di JWT).
 * Dipakai `callbacks.jwt` untuk refresh klaim tiap request.
 * Mengembalikan `null` bila user sudah tidak ada di DB.
 */
export async function loadUserSnapshot(
  userId: string,
): Promise<UserSnapshot | null> {
  const row: SnapshotRow | null = await prisma.user.findUnique({
    where: { id: userId },
    select: snapshotSelect,
  });

  return row ? toSnapshot(row) : null;
}

/**
 * Baca profil user berdasarkan email.
 * Dipakai `authorize()` Dev Quick Login: cari lewat email (bukan id seed) supaya
 * tetap jalan kalau user-nya terlanjur dibuat Google OAuth dengan id cuid acak
 * (kasus yang diperingatkan `prisma/seed.ts`).
 */
export async function loadUserSnapshotByEmail(
  email: string,
): Promise<UserSnapshot | null> {
  const row: SnapshotRow | null = await prisma.user.findUnique({
    where: { email },
    select: snapshotSelect,
  });

  return row ? toSnapshot(row) : null;
}
