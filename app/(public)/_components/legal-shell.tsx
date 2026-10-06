import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type LegalShellProps = {
  title: string;
  summary: string;
  active: "terms" | "privacy";
  children: ReactNode;
};

export function LegalShell({ title, summary, active, children }: LegalShellProps) {
  return (
    <div className="min-h-dvh bg-[#fcf8f2] text-[#2f241c]">
      <header className="border-b border-[#eaded0] bg-white/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#cf6a12]">
            <Image src="/icon.svg" alt="Logo Karsa" width={42} height={42} className="rounded-xl" />
            <span className="text-lg font-bold tracking-tight">SiKarsa</span>
          </Link>
          <nav aria-label="Dokumen layanan" className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/syarat-penggunaan"
              aria-current={active === "terms" ? "page" : undefined}
              className={`rounded-full px-4 py-2 transition-colors ${active === "terms" ? "bg-[#cf6a12] font-semibold text-white hover:bg-[#b85d0e]" : "text-[#654e3b] hover:bg-[#f7ebdf]"}`}
            >
              Syarat Penggunaan
            </Link>
            <Link
              href="/kebijakan-privasi"
              aria-current={active === "privacy" ? "page" : undefined}
              className={`rounded-full px-4 py-2 transition-colors ${active === "privacy" ? "bg-[#cf6a12] font-semibold text-white hover:bg-[#b85d0e]" : "text-[#654e3b] hover:bg-[#f7ebdf]"}`}
            >
              Kebijakan Privasi
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ad560e]">Dokumen layanan Karsa</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-base leading-7 text-[#715f50]">{summary}</p>
          <p className="mt-5 text-sm text-[#796c61]">Versi 1.1 · Berlaku sejak 6 Oktober 2026</p>
        </div>

        <article className="mt-9 max-w-3xl space-y-8 rounded-3xl border border-[#eaded0] bg-white p-6 shadow-[0_12px_42px_rgba(82,49,19,0.06)] sm:p-10">
          {children}
        </article>
        <p className="mt-8 max-w-3xl text-sm leading-6 text-[#715f50]">
          Ada pertanyaan tentang dokumen ini? Hubungi pengelola Karsa di{" "}
          <a className="font-semibold text-[#ad560e] underline underline-offset-4" href="mailto:yuwiaffa@gmail.com">yuwiaffa@gmail.com</a>.
        </p>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-[#f0e7dd] pt-7 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-bold tracking-tight text-[#2f241c] sm:text-xl">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-[#574b40] sm:text-[15px]">{children}</div>
    </section>
  );
}
