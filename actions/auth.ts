"use server";

/**
 * Karsa — actions/auth.ts
 * ----------------------------------------------------------------------------
 * Server Action untuk masuk & keluar.
 *
 *   devLoginAction()     → Dev Quick Login (DEV ONLY, guard lapis 3)
 *   googleSignInAction() → mulai OAuth Google
 *   signOutAction()      → logout
 *
 * Catatan implementasi (verifikasi source `next-auth@5.0.0-beta.25`):
 *   `signIn()` server-side memakai `skipCSRFCheck` + `cookies()` Next, jadi ia
 *   menulis cookie session langsung dari dalam Server Action. Saat berhasil dan
 *   `redirect` aktif (default), ia melempar `NEXT_REDIRECT` — error itu WAJIB
 *   di-rethrow; hanya `AuthError` yang boleh ditangkap jadi pesan UI.
 */
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import {
  DEV_PROVIDER_ID,
  findDevUser,
  isDevAuthEnabled,
  type DevLoginState,
} from "@/lib/dev-users";
import { LOGIN_PATH } from "@/lib/roles";

/**
 * Dev Quick Login — tombol "Masuk sebagai …" di /login.
 *
 * Alur: form → action ini → `signIn("dev-login")` → provider Credentials di
 * `auth.ts` → `authorize()` mencari user di DB → cookie JWT → redirect ke home
 * channel sesuai role (admin → /admin/dashboard, lainnya → /dashboard).
 */
export async function devLoginAction(
  _prevState: DevLoginState | null,
  formData: FormData,
): Promise<DevLoginState> {
  // Guard lapis 3: endpoint harus menolak di production walau dipanggil manual
  // (bukan hanya tombolnya disembunyikan).
  if (!isDevAuthEnabled()) {
    return { error: "Dev Quick Login tidak tersedia di production." };
  }

  const devUser = findDevUser(formData.get("dev_user"));
  if (!devUser) {
    return { error: "User dev tidak dikenal." };
  }

  try {
    await signIn(DEV_PROVIDER_ID, {
      email: devUser.email,
      redirectTo: devUser.home,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          "Gagal masuk sebagai user dev. Pastikan seed sudah dijalankan (npm run db:seed).",
      };
    }
    // NEXT_REDIRECT (sukses) dan error lain diteruskan apa adanya.
    throw error;
  }

  // Tidak tercapai: `signIn()` di atas selalu melempar redirect saat sukses.
  return { error: null };
}

/**
 * Masuk dengan Google (PRD §1 — hanya email kampus).
 * `redirectTo` ke /login: setelah OAuth selesai, halaman /login (server) atau
 * middleware mengarahkan user ke home channel sesuai rolenya — satu sumber
 * kebenaran (`homePathForUser`).
 */
export async function googleSignInAction(): Promise<void> {
  await signIn("google", { redirectTo: LOGIN_PATH });
}

/** Logout: bersihkan cookie session, kembali ke /login. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: LOGIN_PATH });
}
