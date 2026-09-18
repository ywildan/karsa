"use server";

/**
 * Karsa — actions/rekap.ts
 * ----------------------------------------------------------------------------
 * Query rekap poin per kelas untuk admin. Semua Server Action dijaga
 * `requireAdmin()`; helper Excel dipakai API route setelah route itu sendiri
 * memverifikasi session admin.
 */
import ExcelJS from "exceljs";

import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type RekapMatkul = {
  id: string;
  name: string;
  code: string | null;
};

export type RekapMahasiswa = {
  id: string;
  nim: string | null;
  name: string;
  perMatkul: Record<string, number>;
  total: number;
};

export type RekapData = {
  kelas: { id: string; name: string };
  prodi: { name: string };
  semester: { id: string; name: string };
  matkuls: RekapMatkul[];
  mahasiswa: RekapMahasiswa[];
};

export type RekapResult =
  | { ok: true; data: RekapData }
  | { ok: false; error: string };

export type RekapKelasOption = {
  id: string;
  label: string;
};

export type BuildRekapResult =
  | { ok: true; bytes: Buffer; filename: string }
  | { ok: false; reason: "not_found" | "unknown" };

async function loadRekapByKelas(kelasId: string): Promise<RekapResult> {
  const [kelas, kelasMatkuls, mahasiswa, poinPerMahasiswaMatkul] =
    await Promise.all([
      prisma.kelas.findUnique({
        where: { id: kelasId },
        select: {
          id: true,
          name: true,
          prodi: { select: { name: true } },
          semester: { select: { id: true, name: true } },
        },
      }),
      prisma.kelasMatkul.findMany({
        where: { kelas_id: kelasId },
        select: {
          id: true,
          matkul: { select: { name: true, code: true } },
        },
        orderBy: { matkul: { name: "asc" } },
      }),
      prisma.user.findMany({
        where: { kelas_id: kelasId },
        select: { id: true, nim: true, name: true },
      }),
      prisma.poinLog.groupBy({
        by: ["mahasiswa_id", "kelas_matkul_id"],
        where: {
          kelasMatkul: { kelas_id: kelasId },
          mahasiswa: { kelas_id: kelasId },
        },
        _sum: { poin: true },
      }),
    ]);

  if (!kelas) {
    return { ok: false, error: "Kelas tidak ditemukan." };
  }

  const matkuls = kelasMatkuls.map((item) => ({
    id: item.id,
    name: item.matkul.name,
    code: item.matkul.code,
  }));
  const poinIndex = new Map(
    poinPerMahasiswaMatkul.map((item) => [
      `${item.mahasiswa_id}:${item.kelas_matkul_id}`,
      item._sum.poin ?? 0,
    ]),
  );

  const rows = mahasiswa.map((item) => {
    const perMatkul = Object.fromEntries(
      matkuls.map((matkul) => [
        matkul.id,
        poinIndex.get(`${item.id}:${matkul.id}`) ?? 0,
      ]),
    );

    return {
      id: item.id,
      nim: item.nim,
      name: item.name?.trim() || "Tanpa Nama",
      perMatkul,
      total: Object.values(perMatkul).reduce((sum, poin) => sum + poin, 0),
    };
  });

  rows.sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name, "id"),
  );

  return {
    ok: true,
    data: {
      kelas: { id: kelas.id, name: kelas.name },
      prodi: kelas.prodi,
      semester: kelas.semester,
      matkuls,
      mahasiswa: rows,
    },
  };
}

export async function getRekapByKelas(kelasId: string): Promise<RekapResult> {
  await requireAdmin();
  return loadRekapByKelas(kelasId);
}

export async function getKelasOptionsForRekap(): Promise<RekapKelasOption[]> {
  await requireAdmin();

  const kelas = await prisma.kelas.findMany({
    where: { semester: { is_active: true } },
    select: {
      id: true,
      name: true,
      prodi: { select: { name: true } },
    },
    orderBy: [{ prodi: { name: "asc" } }, { name: "asc" }],
  });

  return kelas.map((item) => ({
    id: item.id,
    label: `${item.name} · ${item.prodi.name}`,
  }));
}

function sanitizeFilenamePart(value: string) {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*\s]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "tanpa-nama"
  );
}

function wibDateStamp(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${value.year}${value.month}${value.day}`;
}

/**
 * Helper server-only tanpa guard. API route memverifikasi session admin
 * sebelum memanggilnya; Server Action di atas memasang requireAdmin().
 */
export async function buildRekapExcelFile(
  kelasId: string,
): Promise<BuildRekapResult> {
  try {
    const result = await loadRekapByKelas(kelasId);
    if (!result.ok) {
      return { ok: false, reason: "not_found" };
    }

    const { data } = result;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rekap Poin");
    const matkulHeaders = data.matkuls.map((matkul) =>
      matkul.code ? `${matkul.name} (${matkul.code})` : matkul.name,
    );

    worksheet.addRow(["Rekap Poin Keaktifan"]);
    worksheet.addRow([
      `Kelas: ${data.kelas.name} · ${data.prodi.name} · ${data.semester.name}`,
    ]);
    worksheet.addRow([]);
    worksheet.addRow(["Nama", "NIM", ...matkulHeaders, "Total"]);

    for (const mahasiswa of data.mahasiswa) {
      worksheet.addRow([
        mahasiswa.name,
        mahasiswa.nim ?? "-",
        ...data.matkuls.map((matkul) => mahasiswa.perMatkul[matkul.id] ?? 0),
        mahasiswa.total,
      ]);
    }

    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(4).alignment = { vertical: "middle", wrapText: true };
    worksheet.views = [{ state: "frozen", ySplit: 4 }];
    worksheet.columns = [
      { width: 28 },
      { width: 16 },
      ...data.matkuls.map(() => ({ width: 18 })),
      { width: 12 },
    ];

    const bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    const filename =
      [
        "rekap",
        sanitizeFilenamePart(data.kelas.name),
        sanitizeFilenamePart(data.semester.name),
        wibDateStamp(),
      ].join("_") + ".xlsx";

    return { ok: true, bytes, filename };
  } catch {
    return { ok: false, reason: "unknown" };
  }
}
