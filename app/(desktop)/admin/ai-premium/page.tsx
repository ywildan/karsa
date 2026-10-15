import type { Metadata } from "next";

import { AiPremiumManager } from "@/components/admin/ai-premium-manager";
import { getAiPremiumSettingsView, listAiSubscribers } from "@/lib/admin/ai-premium";
import { requireAdmin } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Langganan AI" };

export default async function AiPremiumPage() {
  await requireAdmin();

  const [settings, subscribers] = await Promise.all([
    getAiPremiumSettingsView(),
    listAiSubscribers(""),
  ]);

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="text-2xl font-semibold">Langganan AI</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          Kelola tier langganan Teman Baca per mahasiswa, jatah token bulanan
          per tier dan per mahasiswa, limit request khusus, limit global AI,
          dan base URL provider. API key dan model tetap diatur lewat env
          server. Kolom jatah token per mahasiswa memerlukan{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            prisma/ai-token-quota.sql
          </code>{" "}
          dijalankan sekali di Supabase SQL Editor.
        </p>
      </div>

      {!settings.settingsAvailable ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-6 text-amber-700 dark:text-amber-300">
          Tabel pengaturan AI belum ada di database. Jalankan{" "}
          <code className="rounded bg-background/60 px-1.5 py-0.5 text-xs">
            prisma/ai-premium-admin.sql
          </code>{" "}
          di Supabase SQL Editor agar tier, limit khusus, dan limit global bisa
          disimpan. Selama belum dijalankan, semua limit mengikuti env.
        </div>
      ) : null}

      {!settings.aiEnabled ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
          Fitur AI sedang nonaktif dari env (<code>AI_ENABLED</code>/
          <code>AI_API_KEY</code>/<code>AI_MODEL</code> belum lengkap). Pengaturan
          di halaman ini tetap bisa disiapkan dan akan berlaku saat AI diaktifkan.
        </div>
      ) : null}

      <AiPremiumManager settings={settings} initialSubscribers={subscribers} />
    </section>
  );
}
