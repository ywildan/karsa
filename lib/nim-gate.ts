/**
 * Karsa — lib/nim-gate.ts
 * ----------------------------------------------------------------------------
 * Policy gerbang "lengkapi NIM" (murni — tanpa Prisma/DOM, aman untuk Edge
 * middleware maupun server component).
 *
 * Latar: akun yang dibuatkan admin lewat `createAndAddMahasiswa` terisi NIM
 * sejak awal, tetapi mahasiswa yang login Google sendiri hanya membawa nama
 * + email dari Google sehingga `User.nim` kosong. NIM adalah identitas resmi
 * mahasiswa (unik, tampil di rekap & ekspor), jadi mahasiswa wajib
 * melengkapinya sebelum memakai aplikasi.
 *
 * Yang WAJIB melewati gerbang: user email domain mahasiswa
 * (`@students.untidar.ac.id`) dengan NIM kosong, KECUALI admin dan
 * pengelola (keduanya bukan peran mahasiswa murni dan tidak diganggu).
 * Email domain lain (dosen/staf `@untidar.ac.id`) tidak diwajibkan NIM.
 */

import { isStudentEmail } from "@/lib/mahasiswa";

/** Path halaman gerbang lengkapi NIM. */
export const NIM_GATE_PATH = "/lengkapi-nim";

/** Klaim minimum untuk menilai gerbang NIM. */
export interface NimGateClaims {
  email?: string | null;
  nim?: string | null;
  is_admin?: boolean;
  is_pengelola?: boolean;
}

/** True bila user harus diarahkan mengisi NIM sebelum memakai aplikasi. */
export function needsNimCompletion(
  claims: NimGateClaims | null | undefined,
): boolean {
  if (!claims) return false;
  if (claims.is_admin || claims.is_pengelola) return false;
  if (!isStudentEmail(claims.email)) return false;
  return !claims.nim?.trim();
}
