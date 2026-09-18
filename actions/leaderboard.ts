"use server";

/**
 * Karsa — actions/leaderboard.ts
 * ----------------------------------------------------------------------------
 * Query leaderboard mahasiswa Fase 4C. Seluruh query dibatasi oleh kelas
 * session dan semester aktif; ID KelasMatkul dari kelas lain selalu ditolak
 * di server, bukan hanya disembunyikan dari UI.
 */
import { requireUser } from "@/lib/auth-helpers";
import {
  denseRank,
  maskName,
  maskNim,
  type LeaderboardRow,
  type UnrankedLeaderboardRow,
} from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";

export interface LeaderboardOption {
  id: string;
  label: string;
}

export interface LeaderboardMeta {
  kelasName: string;
  prodiName: string;
  semesterName: string;
}

export type LeaderboardResult =
  | { ok: true; data: LeaderboardRow[] }
  | { ok: false; error: string };

async function getSemesterAktif() {
  const semesterAktif = await prisma.semester.findFirst({
    where: { is_active: true },
    select: { id: true, name: true },
  });

  // Invarian sistem: selalu ada tepat satu semester aktif (PRD §9).
  if (!semesterAktif) {
    throw new Error("Semester aktif belum ditetapkan.");
  }

  return semesterAktif;
}

/**
 * Ambil ranking untuk satu matkul di kelas user pada semester aktif.
 *
 * Agregat hanya memuat mahasiswa yang telah memiliki PoinLog pada matkul
 * tersebut. Karena itu, hasil kosong berarti belum ada poin sama sekali.
 */
export async function getLeaderboard(
  kelasMatkulId: string,
): Promise<LeaderboardResult> {
  const user = await requireUser();

  if (!user.kelas_id) {
    return { ok: false, error: "Kamu belum terdaftar di kelas." };
  }

  const semesterAktif = await getSemesterAktif();
  const kelasMatkul = await prisma.kelasMatkul.findUnique({
    where: { id: kelasMatkulId },
    select: {
      kelas_id: true,
      kelas: { select: { semester_id: true } },
    },
  });

  if (!kelasMatkul || kelasMatkul.kelas_id !== user.kelas_id) {
    return { ok: false, error: "Tidak boleh lihat kelas lain." };
  }

  if (kelasMatkul.kelas.semester_id !== semesterAktif.id) {
    return {
      ok: false,
      error: "Mata kuliah ini tidak tersedia pada semester aktif.",
    };
  }

  const [mahasiswa, totalPoinPerMahasiswa] = await Promise.all([
    prisma.user.findMany({
      where: {
        kelas_id: user.kelas_id,
      },
      select: {
        id: true,
        name: true,
        nim: true,
      },
    }),
    prisma.poinLog.groupBy({
      by: ["mahasiswa_id"],
      where: {
        kelas_matkul_id: kelasMatkulId,
        mahasiswa: {
          kelas_id: user.kelas_id,
        },
      },
      _sum: { poin: true },
      orderBy: {
        _sum: { poin: "desc" },
      },
    }),
  ]);

  const mahasiswaPerId = new Map(mahasiswa.map((item) => [item.id, item]));
  const rows: UnrankedLeaderboardRow[] = [];

  for (const total of totalPoinPerMahasiswa) {
    const mahasiswaItem = mahasiswaPerId.get(total.mahasiswa_id);

    // PoinLog historis dapat merujuk user yang sudah dipindah kelas. Filter
    // relasi di query seharusnya sudah mencegahnya; guard ini menjaga hasil
    // tetap class-scoped bila data berubah di antara dua query.
    if (!mahasiswaItem) continue;

    const isCurrentUser = mahasiswaItem.id === user.id;
    rows.push({
      userId: mahasiswaItem.id,
      nama: isCurrentUser
        ? mahasiswaItem.name?.trim() || "Tanpa Nama"
        : maskName(mahasiswaItem.name),
      nim: isCurrentUser ? mahasiswaItem.nim : maskNim(mahasiswaItem.nim),
      totalPoin: total._sum.poin ?? 0,
      isCurrentUser,
    });
  }

  rows.sort(
    (a, b) =>
      b.totalPoin - a.totalPoin || a.nama.localeCompare(b.nama, "id"),
  );

  return { ok: true, data: denseRank(rows) };
}

/**
 * Daftar matkul kelas user pada semester aktif untuk pill filter. Matkul
 * tanpa PoinLog tetap dikirim agar user dapat melihat empty state.
 */
export async function getKelasMatkulOptionsForLeaderboard(): Promise<
  LeaderboardOption[]
> {
  const user = await requireUser();

  if (!user.kelas_id) return [];

  const semesterAktif = await getSemesterAktif();
  const kelasMatkuls = await prisma.kelasMatkul.findMany({
    where: {
      kelas_id: user.kelas_id,
      kelas: { semester_id: semesterAktif.id },
    },
    select: {
      id: true,
      matkul: {
        select: {
          name: true,
          code: true,
        },
      },
    },
    orderBy: {
      matkul: { name: "asc" },
    },
  });

  return kelasMatkuls.map((kelasMatkul) => ({
    id: kelasMatkul.id,
    label: kelasMatkul.matkul.code
      ? `${kelasMatkul.matkul.name} (${kelasMatkul.matkul.code})`
      : kelasMatkul.matkul.name,
  }));
}

/** Ambil identitas akademik untuk header leaderboard pada semester aktif. */
export async function getLeaderboardMeta(): Promise<LeaderboardMeta | null> {
  const user = await requireUser();

  if (!user.kelas_id) return null;

  const semesterAktif = await getSemesterAktif();
  const kelas = await prisma.kelas.findFirst({
    where: {
      id: user.kelas_id,
      semester_id: semesterAktif.id,
    },
    select: {
      name: true,
      prodi: { select: { name: true } },
      semester: { select: { name: true } },
    },
  });

  if (!kelas) return null;

  return {
    kelasName: kelas.name,
    prodiName: kelas.prodi.name,
    semesterName: kelas.semester.name,
  };
}
