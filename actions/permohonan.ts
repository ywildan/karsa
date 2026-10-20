"use server";

/**
 * Karsa — actions/permohonan.ts
 * ----------------------------------------------------------------------------
 * Dua sisi satu tabel:
 *
 *  · `kirimPermohonan` — PUBLIK, tanpa login, dipanggil form /materi/kirim.
 *    Karena terbuka, semua yang masuk dianggap tidak tepercaya: validasi zod
 *    ketat, honeypot anti-bot, batas panjang, dan satu permohonan tertunda per
 *    (email, matkul) supaya tidak ada banjir duplikat.
 *  · `tinjauPermohonan` / `hapusPermohonan` — hanya admin (`requireAdmin`),
 *    tercatat di audit log.
 *
 * Permohonan TIDAK langsung membuat materi: admin tetap meninjau isinya dan
 * menyusun deck sendiri, jadi tidak ada jalur di mana kiriman publik langsung
 * tayang di /materi.
 */
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, revalidatePaths, zodFirstError } from "@/lib/action-utils";
import { auditActor, logAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth-helpers";
import { STATUS_PERMOHONAN, type StatusPermohonan } from "@/lib/permohonan";
import { prisma } from "@/lib/prisma";

const kirimSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(3, "Nama minimal 3 karakter.")
    .max(80, "Nama maksimal 80 karakter."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email tidak valid.")
    .max(160, "Email maksimal 160 karakter."),
  fakultas: z.string().trim().max(120).optional(),
  prodi: z.string().trim().max(120).optional(),
  matkul: z
    .string()
    .trim()
    .min(2, "Nama mata kuliah wajib diisi.")
    .max(160, "Nama mata kuliah maksimal 160 karakter."),
  jenis: z.enum(["UTS", "UAS", "KUIS"]),
  pertemuan: z.string().trim().max(60).optional(),
  ringkasan: z
    .string()
    .trim()
    .min(20, "Ceritakan isinya minimal 20 karakter.")
    .max(1200, "Ringkasan maksimal 1.200 karakter."),
  tautan: z.union([z.literal(""), z.string().trim().url("Tautan harus URL lengkap, mis. https://drive.google.com/…").max(400)]).optional(),
  izin: z.literal("on", {
    errorMap: () => ({ message: "Centang pernyataan izin berbagi dulu." }),
  }),
  /** Honeypot: kolom tak terlihat. Bot mengisinya, manusia tidak. */
  situs: z.string().max(0).optional(),
});

/** Normalisasi opsional: "" → undefined supaya kolom nullable tetap bersih. */
function opsional(nilai: FormDataEntryValue | null): string | undefined {
  const teks = typeof nilai === "string" ? nilai.trim() : "";
  return teks.length > 0 ? teks : undefined;
}

/**
 * Kirim permohonan materi — dipakai `useActionState`, jadi menerima state
 * sebelumnya sebagai argumen pertama.
 */
export async function kirimPermohonan(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const mentah = {
    situs: opsional(formData.get("situs")),
    nama: formData.get("nama") ?? "",
    email: formData.get("email") ?? "",
    fakultas: opsional(formData.get("fakultas")),
    prodi: opsional(formData.get("prodi")),
    matkul: formData.get("matkul") ?? "",
    jenis: formData.get("jenis") ?? "UTS",
    pertemuan: opsional(formData.get("pertemuan")),
    ringkasan: formData.get("ringkasan") ?? "",
    tautan: (formData.get("tautan") as string | null) ?? "",
    izin: formData.get("izin") ?? "",
  };

  // Honeypot terisi → hampir pasti bot. Dibalas "sukses" palsu supaya bot
  // tidak belajar apa pun, tetapi tidak ada baris yang ditulis.
  if (mentah.situs) {
    return { ok: true, message: "Permohonan terkirim." };
  }

  let data: z.infer<typeof kirimSchema>;
  try {
    data = kirimSchema.parse(mentah);
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: zodFirstError(error) };
    return { ok: false, error: "Data tidak valid." };
  }

  try {
    const duplikat = await prisma.materiPermohonan.findFirst({
      where: {
        email: data.email,
        matkul: { equals: data.matkul, mode: "insensitive" },
        status: "MENUNGGU",
      },
      select: { id: true },
    });

    if (duplikat) {
      return {
        ok: true,
        message: "Permohonan untuk mata kuliah ini sudah masuk dan sedang ditinjau. Terima kasih!",
      };
    }

    await prisma.materiPermohonan.create({
      data: {
        nama: data.nama,
        email: data.email,
        fakultas: data.fakultas ?? null,
        prodi: data.prodi ?? null,
        matkul: data.matkul,
        jenis: data.jenis,
        pertemuan: data.pertemuan ?? null,
        ringkasan: data.ringkasan,
        tautan: data.tautan && data.tautan.length > 0 ? data.tautan : null,
        izin: true,
        status: "MENUNGGU",
      },
    });

    revalidatePaths(["/admin/materi/permohonan", "/admin/materi"]);

    return {
      ok: true,
      message: "Permohonan terkirim. Pengelola akan meninjau dan menghubungi lewat email.",
    };
  } catch (error) {
    console.error("[permohonan] gagal menyimpan", error);
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        {},
        "Gagal mengirim permohonan. Coba lagi sebentar lagi.",
      ),
    };
  }
}

const tinjauSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(STATUS_PERMOHONAN),
  catatan: z.string().trim().max(600, "Catatan maksimal 600 karakter.").optional(),
});

/** Setujui / tolak / kembalikan ke antrean. Khusus admin. */
export async function tinjauPermohonan(input: {
  id: string;
  status: StatusPermohonan;
  catatan?: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();

  let data: z.infer<typeof tinjauSchema>;
  try {
    data = tinjauSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: zodFirstError(error) };
    return { ok: false, error: "Data tidak valid." };
  }

  const permohonan = await prisma.materiPermohonan.findUnique({
    where: { id: data.id },
    select: { matkul: true, nama: true, status: true },
  });
  if (!permohonan) return { ok: false, error: "Permohonan tidak ditemukan." };

  const selesai = data.status !== "MENUNGGU";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.materiPermohonan.update({
        where: { id: data.id },
        data: {
          status: data.status,
          catatan: data.catatan && data.catatan.length > 0 ? data.catatan : null,
          reviewed_at: selesai ? new Date() : null,
          reviewed_by: selesai ? admin.id : null,
        },
      });

      await logAudit(
        {
          actor: auditActor(admin),
          action: "PERMOHONAN_STATUS",
          entity: {
            type: "MateriPermohonan",
            id: data.id,
            label: `${permohonan.matkul} — ${permohonan.nama}`,
          },
          before: { status: permohonan.status },
          after: { status: data.status, catatan: data.catatan ?? null },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        { P2025: "Permohonan tidak ditemukan." },
        "Gagal memperbarui permohonan.",
      ),
    };
  }

  revalidatePaths(["/admin/materi/permohonan", "/admin/materi"]);

  const pesan =
    data.status === "DISETUJUI"
      ? "Permohonan disetujui."
      : data.status === "DITOLAK"
        ? "Permohonan ditolak."
        : "Permohonan dikembalikan ke antrean.";
  return { ok: true, message: pesan };
}

/** Hapus permanen — untuk spam / kiriman keliru. Khusus admin. */
export async function hapusPermohonan(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();

  const permohonan = await prisma.materiPermohonan.findUnique({
    where: { id },
    select: { matkul: true, nama: true },
  });
  if (!permohonan) return { ok: false, error: "Permohonan tidak ditemukan." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.materiPermohonan.delete({ where: { id } });
      await logAudit(
        {
          actor: auditActor(admin),
          action: "PERMOHONAN_DELETE",
          entity: {
            type: "MateriPermohonan",
            id,
            label: `${permohonan.matkul} — ${permohonan.nama}`,
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
        { P2025: "Permohonan tidak ditemukan." },
        "Gagal menghapus permohonan.",
      ),
    };
  }

  revalidatePaths(["/admin/materi/permohonan", "/admin/materi"]);
  return { ok: true, message: "Permohonan dihapus." };
}
