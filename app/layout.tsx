import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";

import { THEME_COOKIE, themeFromCookieValue } from "@/lib/theme";

import "./globals.css";

/**
 * Karsa — root layout
 * ----------------------------------------------------------------------------
 * Root layout memegang <html> / <body> dan penyedia notifikasi global
 * (Sonner). Shell per channel — bottom nav mobile dan header desktop —
 * dipasang di layout masing-masing route group pada Fase 1.5.
 */

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  // PRD Fase 0.5: meta title → "Karsa — Sistem Poin UNTIDAR"
  title: {
    default: "Karsa — Sistem Poin UNTIDAR",
    template: "%s · Karsa",
  },
  description:
    "Karsa mencatat dan menampilkan poin keaktifan mahasiswa Universitas Tidar per mata kuliah per kelas. Setiap karsa, satu poin.",
  applicationName: "Karsa",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  appleWebApp: {
    capable: true,
    title: "Karsa",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Karsa — Sistem Poin UNTIDAR",
    description: "Setiap karsa, satu poin.",
    locale: "id_ID",
    type: "website",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf7" },
    { media: "(prefers-color-scheme: dark)", color: "#141417" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Tema dibaca dari cookie di server supaya <html> langsung memakai class
  // yang benar sejak render pertama — tidak ada kedip terang→gelap.
  const theme = themeFromCookieValue((await cookies()).get(THEME_COOKIE)?.value);
  const isDark = theme === "dark";

  return (
    <html
      lang="id"
      className={isDark ? "dark" : undefined}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <body className={`${inter.variable} min-h-dvh font-sans`}>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          theme={theme}
          toastOptions={{ className: "text-sm" }}
        />
      </body>
    </html>
  );
}
