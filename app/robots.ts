import type { MetadataRoute } from "next";

/**
 * SiKarsa — app/robots.ts
 * ----------------------------------------------------------------------------
 * Publik: halaman depan, materi, dan dokumen layanan. Area aplikasi ditutup
 * seluruhnya — halaman itu juga tidak punya `metadata.robots` yang membuka
 * indeks, jadi dua lapis (robots.txt + meta) sama-sama menutup.
 */
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sikarsa.id";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/materi", "/materi/", "/syarat-penggunaan", "/kebijakan-privasi"],
        disallow: [
          "/admin",
          "/dashboard",
          "/pengelola",
          "/catat-poin",
          "/riwayat-poin",
          "/poin-saya",
          "/lengkapi-nim",
          "/login",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
