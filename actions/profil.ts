/**
 * Karsa — actions/profil.ts
 * ----------------------------------------------------------------------------
 * Aksi profil milik user sendiri. Saat ini satu-satunya aksi: melengkapi NIM
 * untuk gerbang `lib/nim-gate.ts` (mahasiswa yang login Google sendiri belum
 * punya NIM karena akunnya tidak dibuatkan admin).
 *
 * Aturan pengisian:
 *   · hanya bila NIM di DB masih kosong — NIM yang sudah terisi tidak bisa
 *     diganti dari sini (koreksi lewat admin) agar identitas tidak berpindah
 *     tangan;
 *   · format 5–15 digit angka (`NIM_REGEX`) dan unik per user; pesan bentrok
 *     menyebut jelas bahwa NIM sudah dipakai akun lain;
 *   · mutasi + `AuditLog` dalam satu transaksi (pola repo).
 */
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-utils";
import { mapPrismaKnownError, zodFirstError } from "@/lib/action-utils";
import { auditActorFromSession, logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth-helpers";
import { NIM_MESSAGE, NIM_REGEX } from "@/lib/mahasiswa";
import { NIM_GATE_PATH } from "@/lib/nim-gate";
import { prisma } from "@/lib/prisma";

const completeNimSchema = z.object({
  nim: z.string().trim().regex(NIM_REGEX, NIM_MESSAGE),
});

export async function completeNim(input: { nim: string }): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = completeNimSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: zodFirstError(parsed.error) };
  }
  const { nim } = parsed.data;

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { nim: true },
  });
  if (!current) {
    return { ok: false, error: "Akun tidak ditemukan. Silakan login ulang." };
  }
  if (current.nim) {
    return {
      ok: false,
      error: "NIM kamu sudah terisi. Hubungi admin bila ada kesalahan.",
    };
  }

  const taken = await prisma.user.findUnique({
    where: { nim },
    select: { id: true },
  });
  if (taken) {
    return {
      ok: false,
      error: "NIM ini sudah dipakai akun lain. Periksa kembali NIM kamu.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { nim },
      });

      await logAudit(
        {
          actor: auditActorFromSession(user),
          action: "USER_NIM_SET",
          entity: { type: "User", id: user.id, label: user.name ?? user.email ?? user.id },
          after: { nim },
        },
        tx,
      );
    });
  } catch (error) {
    return {
      ok: false,
      error: mapPrismaKnownError(
        error,
        { P2002: "NIM ini sudah dipakai akun lain. Periksa kembali NIM kamu." },
        "Gagal menyimpan NIM. Silakan coba lagi.",
      ),
    };
  }

  revalidatePath(NIM_GATE_PATH);
  revalidatePath("/dashboard");
  return { ok: true, message: "NIM tersimpan. Selamat datang di Karsa!" };
}
