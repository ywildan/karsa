/**
 * Karsa — components/marketing/site-footer.tsx
 * ----------------------------------------------------------------------------
 * Footer bersama halaman marketing (hub brand + halaman produk).
 */
import Link from "next/link";

const FOOTER_LINKS = [
  { label: "SiKarsa", href: "/product/sikarsa" },
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
  { label: "Syarat Penggunaan", href: "/syarat-penggunaan" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6 sm:text-left lg:px-8">
        <p>
          © {year} Karsa · Universitas Tidar
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
