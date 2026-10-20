/**
 * SiKarsa — components/landing/site-footer.tsx
 * ----------------------------------------------------------------------------
 * Footer publik minimal: identitas, tautan dokumen layanan, kanal unduh, dan
 * satu alamat kontak. Tanpa kolom dekoratif.
 */
import Link from "next/link";

const TAUTAN = [
  { href: "/materi", label: "Materi & kisi-kisi" },
  { href: "/syarat-penggunaan", label: "Syarat Penggunaan" },
  { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
  {
    href: "https://github.com/ywildan/karsa/releases/latest",
    label: "APK Android",
    external: true,
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <p className="text-sm font-bold tracking-tight">SiKarsa</p>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Sistem poin keaktifan mahasiswa Universitas Tidar. Setiap karsa,
              satu poin.
            </p>
          </div>

          <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {TAUTAN.map((item) =>
              "external" in item && item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SiKarsa · Universitas Tidar</p>
          <p>
            Kendala atau koreksi data:{" "}
            <a
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href="mailto:yuwiaffa@gmail.com"
            >
              yuwiaffa@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
