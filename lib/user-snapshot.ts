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
import {
  derivePengelolaScopes,
  EMPTY_PENGELOLA_SCOPES,
  isPengelola as hasPengelolaScope,
  type PengelolaScopes,
} from "@/lib/pengelola";
import { prisma } from "@/lib/prisma";

/** Profil ringkas user — dipakai untuk klaim JWT & otorisasi server. */
export interface UserSnapshot {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  nim: string | null;
  is_admin: boolean;
  /** Tier langganan web search: "free" | "premium" | "plus". */
  premium_tier: string;
  /** Limit khusus Teman Baca per user (NULL = ikut bawaan tier/env). */
  ai_chat_limit_override: number | null;
  ai_summary_limit_override: number | null;
  ai_web_search_limit_override: number | null;
  kelas_id: string | null;
  is_pj: boolean;
  /**
   * Pengelola bila punya ≥1 penunjukan aktif di `PengelolaAssignment`.
   * Diturunkan dari relasi penugasan (seperti `is_pj`), bukan kolom `User`.
   */
  is_pengelola: boolean;
  /** Lingkup penunjukan aktif milik user (prodi & kelas yang boleh dikelola). */
  pengelola_scopes: PengelolaScopes;
  libProfile: {
    display_name: string;
    faculty: string;
    faculty_id: string | null;
    prodi_id: string;
    kelas_id: string | null;
  } | null;
  is_lib_writer: boolean;
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
  premium_tier: true,
  kelas_id: true,
  kelasMatkulAsPj: { select: { id: true }, take: 1 },
  libProfile: {
    select: {
      display_name: true,
      faculty: true,
      faculty_id: true,
      prodi_id: true,
      kelas_id: true,
    },
  },
  libAuthorAccess: {
    select: { revoked_at: true },
  },
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
  premium_tier: string;
  kelas_id: string | null;
  kelasMatkulAsPj: { id: string }[];
  libProfile: UserSnapshot["libProfile"];
  libAuthorAccess: { revoked_at: Date | null } | null;
}

/**
 * Klaim penunjukan pengelola yang masih PENDING (berbasis email, `user_id`
 * masih null) ke user ini, lalu turunkan lingkup efektifnya.
 *
 * Klaim di sini adalah jalur cadangan yang idempoten: jalur utama ada di
 * `events.signIn` (`auth.ts`), tapi user yang barisnya dibuat manual oleh
 * admin sebelum login pertama (pola `createAndAddMahasiswa`) tetap tertaut
 * lewat jalur ini pada snapshot pertamanya.
 *
 * Kegagalan klaim tidak meledakkan snapshot — lingkup dari baris yang sudah
 * tertaut tetap dibaca; klaim dicoba lagi di request berikutnya.
 */
async function loadPengelolaScopes(row: SnapshotRow): Promise<PengelolaScopes> {
  // SELURUH bacaan penunjukan dibungkus try/catch: bila tabel
  // `PengelolaAssignment` belum dimigrasikan ke database (mis. kode baru
  // ter-deploy sebelum `pengelola-scope.sql` dijalankan), snapshot TIDAK
  // boleh ikut gagal — cukup kembalikan lingkup kosong (fail-closed untuk
  // peran pengelola) supaya login & klaim lain tidak terganggu.
  try {
    await prisma.pengelolaAssignment.updateMany({
      where: {
        user_id: null,
        revoked_at: null,
        OR: [{ email: row.email }, { email: row.email.toLowerCase() }],
      },
      data: { user_id: row.id },
    });

    const [assignments, activeSemester] = await Promise.all([
      prisma.pengelolaAssignment.findMany({
        where: { user_id: row.id, revoked_at: null },
        select: {
          scope_type: true,
          prodi_id: true,
          kelas_id: true,
          revoked_at: true,
          semester_id: true,
        },
      }),
      prisma.semester.findFirst({
        where: { is_active: true },
        select: { id: true },
      }),
    ]);

    return derivePengelolaScopes(assignments, activeSemester?.id ?? null);
  } catch (error) {
    console.error(
      "[snapshot] gagal membaca penunjukan pengelola — lingkup dikosongkan.",
      error,
    );
    return EMPTY_PENGELOLA_SCOPES;
  }
}

/**
 * Limit khusus Teman Baca per user, dibaca TERPISAH dari snapshot utama dan
 * dibungkus try/catch penuh (pola yang sama dengan penunjukan pengelola):
 * bila kolomnya belum dimigrasikan (`ai-premium-admin.sql` belum dijalankan),
 * snapshot tidak boleh ikut gagal — cukup perlakukan sebagai tanpa override.
 */
async function loadAiLimitOverrides(userId: string): Promise<{
  ai_chat_limit_override: number | null;
  ai_summary_limit_override: number | null;
  ai_web_search_limit_override: number | null;
}> {
  const none = {
    ai_chat_limit_override: null,
    ai_summary_limit_override: null,
    ai_web_search_limit_override: null,
  };
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ai_chat_limit_override: true,
        ai_summary_limit_override: true,
        ai_web_search_limit_override: true,
      },
    });
    return {
      ai_chat_limit_override: row?.ai_chat_limit_override ?? null,
      ai_summary_limit_override: row?.ai_summary_limit_override ?? null,
      ai_web_search_limit_override: row?.ai_web_search_limit_override ?? null,
    };
  } catch (error) {
    console.error(
      "[snapshot] gagal membaca limit khusus AI — dianggap tanpa override.",
      error,
    );
    return none;
  }
}

async function toSnapshot(row: SnapshotRow): Promise<UserSnapshot> {
  const [pengelolaScopes, aiOverrides] = await Promise.all([
    loadPengelolaScopes(row),
    loadAiLimitOverrides(row.id),
  ]);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    nim: row.nim,
    is_admin: row.is_admin,
    premium_tier: row.premium_tier,
    ai_chat_limit_override: aiOverrides.ai_chat_limit_override,
    ai_summary_limit_override: aiOverrides.ai_summary_limit_override,
    ai_web_search_limit_override: aiOverrides.ai_web_search_limit_override,
    kelas_id: row.kelas_id,
    is_pj: row.kelasMatkulAsPj.length > 0,
    is_pengelola: hasPengelolaScope(pengelolaScopes),
    pengelola_scopes: pengelolaScopes,
    libProfile: row.libProfile,
    is_lib_writer: row.libAuthorAccess?.revoked_at === null,
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

  return row ? await toSnapshot(row) : null;
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

  return row ? await toSnapshot(row) : null;
}
