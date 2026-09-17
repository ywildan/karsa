"use server";

/**
 * Karsa — actions/rapor.ts
 * ----------------------------------------------------------------------------
 * Query rapor mahasiswa Fase 4A. Semua data rapor dibatasi ke user session dan
 * semester aktif agar poin dari kelas/semester lama tidak ikut tampil.
 */
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type {
  RaporMahasiswaResult,
  RaporMatkulItem,
  RaporPoinItem,
} from "@/lib/rapor";

/**
 * Ambil rapor mahasiswa untuk semester aktif.
 *
 * `PoinLog` tidak menyimpan semester secara langsung, sehingga filter semester
 * dilakukan lewat `PoinLog.kelasMatkul.kelas.semester_id`. Riwayat selalu
 * memakai relasi `PoinLog.pj` agar nama PJ mencerminkan pembuat input saat itu.
 */
export async function getRaporMahasiswa(): Promise<RaporMahasiswaResult> {
  const user = await requireUser();

  // Tidak ada kelas → tidak ada query akademik tambahan.
  if (!user.kelas_id) {
    return { ok: true, empty: true };
  }

  const semesterAktif = await prisma.semester.findFirst({
    where: { is_active: true },
    select: { id: true, name: true },
  });

  // Invarian sistem: selalu ada tepat satu semester aktif (PRD §9).
  if (!semesterAktif) {
    throw new Error("Semester aktif belum ditetapkan.");
  }

  const [kelas, kelasMatkuls, poinLogs] = await Promise.all([
    prisma.kelas.findUnique({
      where: { id: user.kelas_id },
      select: {
        id: true,
        name: true,
        prodi: { select: { name: true } },
      },
    }),
    prisma.kelasMatkul.findMany({
      where: { kelas_id: user.kelas_id },
      select: {
        id: true,
        matkul: { select: { name: true, code: true } },
        // PJ penugasan saat ini — berbeda dari PJ historis di PoinLog.
        pj: { select: { name: true } },
      },
      orderBy: { matkul: { name: "asc" } },
    }),
    prisma.poinLog.findMany({
      where: {
        mahasiswa_id: user.id,
        kelasMatkul: {
          kelas: { semester_id: semesterAktif.id },
        },
      },
      select: {
        id: true,
        kelas_matkul_id: true,
        poin: true,
        catatan: true,
        created_at: true,
        kategori: { select: { name: true } },
        // PJ yang benar-benar mencatat poin ini.
        pj: { select: { name: true } },
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  // Klaim session bisa tertinggal bila kelas dihapus setelah JWT diterbitkan.
  if (!kelas) {
    return { ok: true, empty: true };
  }

  const riwayatPerMatkul = new Map<string, RaporPoinItem[]>();
  for (const poinLog of poinLogs) {
    const riwayat = riwayatPerMatkul.get(poinLog.kelas_matkul_id) ?? [];
    riwayat.push({
      id: poinLog.id,
      poin: poinLog.poin,
      catatan: poinLog.catatan,
      created_at: poinLog.created_at,
      kategori: poinLog.kategori,
      pj: poinLog.pj,
    });
    riwayatPerMatkul.set(poinLog.kelas_matkul_id, riwayat);
  }

  const matkuls: RaporMatkulItem[] = kelasMatkuls.map((kelasMatkul) => {
    const riwayat = riwayatPerMatkul.get(kelasMatkul.id) ?? [];
    const totalPoin = riwayat.reduce((total, item) => total + item.poin, 0);

    return {
      id: kelasMatkul.id,
      matkul: kelasMatkul.matkul,
      pj: kelasMatkul.pj,
      totalPoin,
      riwayat,
    };
  });

  return {
    ok: true,
    empty: false,
    data: {
      semester: semesterAktif,
      kelas: { id: kelas.id, name: kelas.name },
      prodi: kelas.prodi,
      matkuls,
      totalPoin: matkuls.reduce((total, matkul) => total + matkul.totalPoin, 0),
    },
  };
}
