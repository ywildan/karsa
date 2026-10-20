"use server";

/**
 * Karsa — actions/materi.ts
 * ----------------------------------------------------------------------------
 * CRUD materi publik (kisi-kisi/ringkasan ujian) untuk /admin/materi.
 *
 * Aturan yang dijaga di sini (bukan di UI):
 *  · hanya admin (`requireAdmin`);
 *  · `slug` unik & dipakai sebagai URL publik, jadi dinormalisasi;
 *  · lingkup fakultas/prodi dinormalkan — memilih prodi otomatis mengisi
 *    fakultas induknya, supaya materi tidak pernah "yatim" dari pohon
 *    fakultas → prodi;
 *  · deck HTML disimpan apa adanya di kolom `html`; penyajiannya dilakukan
 *    di halaman publik lewat iframe ber-sandbox, bukan di-render ke DOM app;
 *  · setiap perubahan tercatat di audit log (pola `actions/matkul.ts`).
 */
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, revalidatePaths, zodFirstError } from "@/lib/action-utils";
import { auditActor, logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { buatSlug } from "@/lib/materi";
import { prisma } from "@/lib/prisma";

/** Batas aman ukuran deck: di atas ini curl/server action akan bermasalah. */
const MAKS_HTML_BYTE = 1_500_000;

const materiInputSchema = z
  .object({
    judul: z.string().trim().min(3, "Judul minimal 3 karakter.").max(160, "Judul maksimal 160 karakter."),
    matkul: z.string().trim().min(2, "Nama mata kuliah wajib diisi.").max(160, "Nama matkul maksimal 160 karakter."),
    slug: z.string().trim().max(80).optional(),
    jenis: z.enum(["UTS", "UAS", "KUIS"]),
    pertemuan: z.string().trim().max(80).optional(),
    subCpmk: z.string().trim().max(80).optional(),
    bobot: z.coerce.number().int().min(0, "Bobot minimal 0.").max(100, "Bobot maksimal 100.").optional(),
    sumber: z.string().trim().max(240).optional(),
    ringkasan: z
      .string()
      .trim()
      .min(20, "Ringkasan minimal 20 karakter — ini yang tampil di kartu.")
      .max(600, "Ringkasan maksimal 600 karakter."),
    bagian: z.coerce.number().int().min(0, "Jumlah bagian minimal 0.").max(999).optional(),
    /**
     * Opsional: saat membuat materi wajib ada; saat menyunting, kosong berarti
     * "pertahankan deck yang sekarang" — daftar admin tidak membawa HTML 1 MB
     * ke browser hanya untuk membuka dialog edit.
     */
    html: z.string().optional(),
    status: z.enum(["DRAFT", "TERBIT"]),
    facultyId: z.string().trim().optional(),
    prodiId: z.string().trim().optional(),
  })
  .transform((data) => {
    const slug = buatSlug(data.slug?.trim() || data.judul);
    return {
      ...data,
      slug,
      pertemuan: data.pertemuan || null,
      // Nama kolom Prisma untuk field ini snake_case (`sub_cpmk`); key lain
      // kebetulan sama dengan nama kolom. Jangan dikembalikan ke `subCpmk`:
      // Prisma akan menolak dengan "Unknown argument `subCpmk`".
      subCpmk: undefined,
      sub_cpmk: data.subCpmk || null,
      sumber: data.sumber || null,
      bobot: data.bobot ?? null,
      bagian: data.bagian ?? null,
      facultyId: data.facultyId || null,
      prodiId: data.prodiId || null,
    };
  })
  .refine((data) => data.slug.length >= 3, {
    message: "Slug tidak valid. Pakai huruf/angka, minimal 3 karakter.",
    path: ["slug"],
  });

export type MateriInput = z.input<typeof materiInputSchema>;

const REVALIDATE_ADMIN = ["/admin/materi", "/admin/dashboard"] as const;

function revalidateMateri(slug?: string): void {
  revalidatePaths([
    ...REVALIDATE_ADMIN,
    "/",
    "/materi",
    "/sitemap.xml",
    ...(slug ? [`/materi/${slug}`] : []),
  ]);
}

/**
 * Tentukan pasangan fakultas/prodi yang konsisten.
 * Prodi menang: fakultas selalu diturunkan dari prodi yang dipilih.
 */
async function resolveLingkup(
  facultyId: string | null,
  prodiId: string | null,
): Promise<{ ok: true; faculty_id: string | null; prodi_id: string | null } | { ok: false; error: string }> {
  if (!prodiId) {
    if (!facultyId) return { ok: true, faculty_id: null, prodi_id: null };

    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      select: { id: true },
    });
    if (!faculty) return { ok: false, error: "Fakultas tidak ditemukan." };

    return { ok: true, faculty_id: faculty.id, prodi_id: null };
  }

  const prodi = await prisma.prodi.findUnique({
    where: { id: prodiId },
    select: { id: true, faculty_id: true },
  });
  if (!prodi) return { ok: false, error: "Program studi tidak ditemukan." };

  return { ok: true, faculty_id: prodi.faculty_id, prodi_id: prodi.id };
}

/** Tambah materi baru (default draf bila status tidak dikirim). */
export async function createMateri(input: MateriInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (input.html && Buffer.byteLength(input.html, "utf8") > MAKS_HTML_BYTE) {
    return { ok: false, error: "Berkas deck terlalu besar (maksimal 1,5 MB)." };
  }

  const parsed = materiInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { facultyId, prodiId, html, ...data } = parsed.data;

  if (!html || html.length < 200) {
    return { ok: false, error: "Isi deck wajib diunggah (berkas HTML utuh)." };
  }

  const lingkup = await resolveLingkup(facultyId, prodiId);
  if (!lingkup.ok) return { ok: false, error: lingkup.error };

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.materi.create({
        data: {
          ...data,
          html,
          faculty_id: lingkup.faculty_id,
          prodi_id: lingkup.prodi_id,
        },
      });

      await logAudit(
        {
          actor: auditActor(admin),
          action: "MATERI_CREATE",
          entity: { type: "Materi", id: created.id, label: data.judul },
          after: {
            slug: data.slug,
            jenis: data.jenis,
            status: data.status,
            prodi_id: lingkup.prodi_id,
            faculty_id: lingkup.faculty_id,
          },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        { P2002: `Slug "${data.slug}" sudah dipakai materi lain. Ganti judul atau slug.` },
        "Gagal menyimpan materi. Silakan coba lagi.",
      ),
    };
  }

  revalidateMateri(data.slug);
  return {
    ok: true,
    message:
      data.status === "TERBIT"
        ? `Materi "${data.judul}" diterbitkan.`
        : `Materi "${data.judul}" disimpan sebagai draf.`,
  };
}

/** Perbarui materi. */
export async function updateMateri(id: string, input: MateriInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  if (input.html && Buffer.byteLength(input.html, "utf8") > MAKS_HTML_BYTE) {
    return { ok: false, error: "Berkas deck terlalu besar (maksimal 1,5 MB)." };
  }

  const parsed = materiInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodFirstError(parsed.error) };

  const { facultyId, prodiId, html, ...data } = parsed.data;

  const before = await prisma.materi.findUnique({
    where: { id },
    select: { judul: true, slug: true, status: true, faculty_id: true, prodi_id: true },
  });
  if (!before) return { ok: false, error: "Materi tidak ditemukan. Mungkin sudah dihapus." };

  const lingkup = await resolveLingkup(facultyId, prodiId);
  if (!lingkup.ok) return { ok: false, error: lingkup.error };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.materi.update({
        where: { id },
        data: {
          ...data,
          // Deck hanya ditimpa bila admin mengunggah berkas baru.
          ...(html && html.length >= 200 ? { html } : {}),
          faculty_id: lingkup.faculty_id,
          prodi_id: lingkup.prodi_id,
        },
      });

      await logAudit(
        {
          actor: auditActor(admin),
          action: "MATERI_UPDATE",
          entity: { type: "Materi", id, label: data.judul },
          before,
          after: {
            slug: data.slug,
            jenis: data.jenis,
            status: data.status,
            prodi_id: lingkup.prodi_id,
            faculty_id: lingkup.faculty_id,
          },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {
          P2002: `Slug "${data.slug}" sudah dipakai materi lain.`,
          P2025: "Materi tidak ditemukan. Mungkin sudah dihapus.",
        },
        "Gagal menyimpan perubahan materi.",
      ),
    };
  }

  revalidateMateri(data.slug);
  if (before.slug !== data.slug) revalidateMateri(before.slug);
  return { ok: true, message: `Materi "${data.judul}" diperbarui.` };
}

/** Terbitkan atau tarik materi (tanpa mengubah isi). */
export async function setStatusMateri(
  id: string,
  status: "DRAFT" | "TERBIT",
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const materi = await prisma.materi.findUnique({
    where: { id },
    select: { judul: true, slug: true, status: true },
  });
  if (!materi) return { ok: false, error: "Materi tidak ditemukan." };

  if (materi.status === status) {
    return {
      ok: true,
      message: status === "TERBIT" ? "Materi sudah terbit." : "Materi sudah berupa draf.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.materi.update({ where: { id }, data: { status } });

      await logAudit(
        {
          actor: auditActor(admin),
          action: "MATERI_STATUS",
          entity: { type: "Materi", id, label: materi.judul },
          before: { status: materi.status },
          after: { status },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        { P2025: "Materi tidak ditemukan." },
        "Gagal mengubah status materi.",
      ),
    };
  }

  revalidateMateri(materi.slug);
  return {
    ok: true,
    message:
      status === "TERBIT"
        ? `Materi "${materi.judul}" diterbitkan.`
        : `Materi "${materi.judul}" ditarik ke draf.`,
  };
}

/** Hapus materi permanen. */
export async function deleteMateri(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const materi = await prisma.materi.findUnique({
    where: { id },
    select: { judul: true, slug: true, status: true },
  });
  if (!materi) return { ok: false, error: "Materi tidak ditemukan. Mungkin sudah dihapus." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.materi.delete({ where: { id } });

      await logAudit(
        {
          actor: auditActor(admin),
          action: "MATERI_DELETE",
          entity: { type: "Materi", id, label: materi.judul },
          before: { slug: materi.slug, status: materi.status },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        { P2025: "Materi tidak ditemukan. Mungkin sudah dihapus." },
        "Gagal menghapus materi.",
      ),
    };
  }

  revalidateMateri(materi.slug);
  return { ok: true, message: `Materi "${materi.judul}" dihapus.` };
}
