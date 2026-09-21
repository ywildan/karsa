"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Karsa root layout error", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          background: "#f8fafc",
          color: "#18181b",
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
            <p style={{ margin: "12px 0 24px", color: "#52525b" }}>
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
                background: "#18181b",
                color: "#ffffff",
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
