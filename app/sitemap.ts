import type { MetadataRoute } from "next";

import { getMateriUntukSitemap } from "@/lib/materi-query";
import { materiHref } from "@/lib/materi";

/**
 * SiKarsa — app/sitemap.ts
 * ----------------------------------------------------------------------------
 * Hanya halaman publik yang masuk sitemap: beranda, indeks materi, tiap deck
 * yang sudah terbit, dan dokumen layanan. Area aplikasi (dashboard, admin,
 * catat-poin, …) memang tidak diindeks — lihat juga `app/robots.ts`.
 *
 * Deck dibaca dari database, jadi materi baru otomatis masuk tanpa deploy.
 */
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sikarsa.id";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const materi = await getMateriUntukSitemap();

  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${BASE_URL}/materi`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...materi.map((item) => ({
      // Entri statis pra-migrasi disajikan sebagai berkas .html.
      url: `${BASE_URL}${item.statis ? `/materi/${item.slug}.html` : materiHref(item.slug)}`,
      lastModified: new Date(`${item.diperbarui}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${BASE_URL}/syarat-penggunaan`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/kebijakan-privasi`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
