/**
 * Karsa — lib/theme.ts
 * ----------------------------------------------------------------------------
 * Konstanta tema web (terang/gelap). Murni & aman diimpor dari server maupun
 * client component.
 *
 * Mekanisme: class `dark` di <html> (strategi `darkMode: ["class"]` Tailwind)
 * + palet `.dark` di `app/globals.css`. Pilihan disimpan di cookie
 * `karsa_theme` supaya root layout bisa me-render class yang benar dari
 * server — tanpa kedip tema saat halaman dimuat.
 */

export const THEME_COOKIE = "karsa_theme";

export type ThemeMode = "light" | "dark";

/** Nilai cookie → mode. Nilai apa pun selain "dark" dianggap terang. */
export function themeFromCookieValue(value: string | undefined | null): ThemeMode {
  return value === "dark" ? "dark" : "light";
}
