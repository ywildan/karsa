/**
 * Karsa — components/marketing/site-footer.tsx
 * ----------------------------------------------------------------------------
 * Footer multi-kolom untuk halaman marketing (hub brand + halaman
 * produk): brand & ringkasan, Produk, Bantuan, Institusi.
 */
import Image from "next/image";
import Link from "next/link";

import { ANDROID_DOWNLOAD_URL } from "@/lib/marketing-links";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <Image
                src="/icon.svg"
                alt=""
                width={28}
                height={28}
                unoptimized
                className="rounded-md"
              />
              <span>Karsa</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Rumah bagi produk digital untuk mahasiswa, dosen, dan pengelola
              Universitas Tidar. Satu akun Google UNTIDAR untuk semua produk.
            </p>
          </div>

          <nav aria-label="Produk">
            <p className="text-sm font-semibold">Produk</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/product/sikarsa" className="transition-colors hover:text-foreground">
                  SiKarsa
                </Link>
              </li>
              {ANDROID_DOWNLOAD_URL ? (
                <li>
                  <a
                    href={ANDROID_DOWNLOAD_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    Unduh Android
                  </a>
                </li>
              ) : null}
              <li>
                <Link href="/login" className="transition-colors hover:text-foreground">
                  Masuk
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Bantuan">
            <p className="text-sm font-semibold">Bantuan</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/kebijakan-privasi" className="transition-colors hover:text-foreground">
                  Kebijakan Privasi
                </Link>
              </li>
              <li>
                <Link href="/syarat-penggunaan" className="transition-colors hover:text-foreground">
                  Syarat Penggunaan
                </Link>
              </li>
              <li>
                <Link href="/product/sikarsa#faq" className="transition-colors hover:text-foreground">
                  FAQ SiKarsa
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Institusi">
            <p className="text-sm font-semibold">Institusi</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://untidar.ac.id"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-foreground"
                >
                  Universitas Tidar
                </a>
              </li>
              <li>
                <Link href="/" className="transition-colors hover:text-foreground">
                  Beranda Karsa
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 border-t border-border pt-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>© {year} Karsa · Universitas Tidar</p>
          <p>Setiap karsa, satu poin.</p>
        </div>
      </div>
    </footer>
  );
}
