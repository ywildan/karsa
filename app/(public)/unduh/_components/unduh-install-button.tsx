"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/button";

/**
 * SiKarsa — app/(public)/unduh/_components/unduh-install-button.tsx
 * ----------------------------------------------------------------------------
 * Tombol instal di halaman /unduh. Perilakunya sama seperti tombol unduh
 * di situs Karsa Business:
 *
 * Klik tidak menavigasi browser ke github.com. Navigasi biasa (termasuk
 * tanpa target="_blank") tetap meninggalkan situs di Chrome Android:
 * halaman berubah jadi tab github.com bertuliskan "Mendownload...".
 * Karena itu unduhan dipicu lewat iframe tersembunyi berisi URL APK —
 * respons Content-Disposition: attachment dari GitHub masuk ke proses
 * unduh browser sementara pengunjung tetap di halaman ini. Selama
 * unduhan disiapkan, tombol menampilkan ikon berputar; persen nyata
 * tidak bisa ditampilkan karena unduhan berjalan di luar halaman.
 *
 * URL APK biasanya sudah dibawa dari server (props apkUrl). Bila server
 * gagal mengambil info rilis, tombol mencoba lagi dari sisi klien ke
 * API GitHub yang sama; bila itu pun gagal, tombol menampilkan keadaan
 * gagal beserta tautan halaman rilis sebagai jalan terakhir.
 */

type Status = "idle" | "loading" | "started" | "failed";

async function fetchLatestApkUrl(): Promise<string | null> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/ywildan/karsa/releases/latest",
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      assets?: { name?: string; browser_download_url?: string }[];
    };
    const assets = data.assets ?? [];
    const apk =
      assets.find((a) => a.name?.endsWith("-arm64-v8a.apk")) ??
      assets.find((a) => a.name?.endsWith(".apk"));
    return apk?.browser_download_url ?? null;
  } catch {
    return null;
  }
}

export function UnduhInstallButton({
  apkUrl,
  releaseUrl,
}: {
  apkUrl: string | null;
  releaseUrl: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const startDownload = async () => {
    if (status === "loading") return;
    setStatus("loading");

    const url = apkUrl ?? (await fetchLatestApkUrl());
    if (!url) {
      setStatus("failed");
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = url;
    document.body.appendChild(iframe);

    timers.current.push(
      setTimeout(() => setStatus("started"), 4000),
      setTimeout(() => setStatus("idle"), 8000),
      setTimeout(() => iframe.remove(), 60000),
    );
  };

  return (
    <div>
      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        disabled={status === "loading"}
        aria-busy={status === "loading"}
        onClick={startDownload}
      >
        {status === "loading" && <Loader2 className="animate-spin" aria-hidden="true" />}
        {status === "loading"
          ? "Mengunduh..."
          : status === "started"
            ? "Unduhan Dimulai"
            : status === "failed"
              ? "Coba lagi"
              : "Unduh Aplikasi"}
      </Button>
      {status === "failed" && (
        <p className="mt-3 text-sm text-muted-foreground">
          Info rilis terbaru belum bisa dimuat. Coba lagi, atau unduh dari{" "}
          <a
            href={releaseUrl}
            className="font-semibold text-primary underline underline-offset-4"
          >
            halaman rilis GitHub
          </a>
          .
        </p>
      )}
    </div>
  );
}
