"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Halaman ini menggantikan root layout (termasuk globals.css), jadi tema
  // dibaca manual dari cookie `karsa_theme` yang ditulis toggle tema.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    console.error("Karsa root layout error", error);
  }, [error]);

  useEffect(() => {
    setIsDark(/(?:^|;\s*)karsa_theme=dark(?:;|$)/.test(document.cookie));
  }, []);

  const palette = isDark
    ? { background: "#141417", color: "#f5f0e8", muted: "#a1a1aa", buttonBg: "#f59e0b", buttonColor: "#141417" }
    : { background: "#f8fafc", color: "#18181b", muted: "#52525b", buttonBg: "#18181b", buttonColor: "#ffffff" };

  return (
    <html lang="id" className={isDark ? "dark" : undefined}>
      <body
        style={{
          margin: 0,
          background: palette.background,
          color: palette.color,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
          }}
        >
          <section style={{ maxWidth: "480px", textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: "24px" }}>
              Karsa tidak dapat dimuat
            </h1>
            <p style={{ margin: "12px 0 24px", color: palette.muted }}>
              Muat ulang aplikasi untuk mencoba kembali.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                minHeight: "44px",
                border: 0,
                borderRadius: "8px",
                padding: "10px 18px",
                background: palette.buttonBg,
                color: palette.buttonColor,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Muat ulang
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
