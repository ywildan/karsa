"use client";

import * as React from "react";
import {
  Activity,
  Bot,
  CircleDollarSign,
  Coins,
  Gauge,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";

import { getAiUsage, type AiUsageFilters } from "@/actions/ai-usage";
import { AiCurrencyToggle } from "@/components/admin/ai-currency-toggle";
import { Button } from "@/components/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AiUsageAnalytics, AiUsageMode, AiUsageStatus } from "@/lib/admin/ai-usage";
import { aiSuccessRate, formatAiCost, type AiCurrency } from "@/lib/karsa-lib/ai-usage";
import { cn, formatDateTimeWib, formatNumber } from "@/lib/utils";

export type AiUsageProdiOption = { id: string; name: string };

type Preset = "7" | "30" | "90" | "custom";

function wibToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + delta));
  return shifted.toISOString().slice(0, 10);
}

function presetRange(preset: Exclude<Preset, "custom">): { start: string; end: string } {
  const end = wibToday();
  return { start: shiftDay(end, -(Number(preset) - 1)), end };
}

function formatLatency(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${formatNumber(ms)} ms`;
  return `${(ms / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} dtk`;
}

function formatDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, date)));
}

function MetricCard({
  label, value, description, icon: Icon,
}: {
  label: string; value: string; description: string; icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-label="Memuat analitik penggunaan AI">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-muted" />
      <div className="h-72 rounded-2xl bg-muted" />
    </div>
  );
}

export function AiUsageView({
  prodiOptions,
  usdIdrRate,
  initialCurrency,
}: {
  prodiOptions: AiUsageProdiOption[];
  usdIdrRate: number;
  initialCurrency: AiCurrency;
}) {
  const initialRange = React.useMemo(() => presetRange("30"), []);
  const [preset, setPreset] = React.useState<Preset>("30");
  const [start, setStart] = React.useState(initialRange.start);
  const [end, setEnd] = React.useState(initialRange.end);
  const [prodiId, setProdiId] = React.useState("");
  const [mode, setMode] = React.useState<AiUsageMode>("ALL");
  const [status, setStatus] = React.useState<AiUsageStatus>("ALL");
  const [userSearch, setUserSearch] = React.useState("");
  const [data, setData] = React.useState<AiUsageAnalytics | null>(null);
  const [currency, setCurrency] = React.useState<AiCurrency>(initialCurrency);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const filters = React.useMemo<AiUsageFilters>(
    () => ({ start, end, prodiId: prodiId || null, mode, status }),
    [start, end, prodiId, mode, status],
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void getAiUsage(filters)
      .then((result) => {
        if (cancelled) return;
        if (result == null) setFailed(true);
        else setData(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, reloadKey]);

  function applyPreset(next: Preset) {
    setPreset(next);
    if (next !== "custom") {
      const range = presetRange(next);
      setStart(range.start);
      setEnd(range.end);
    }
  }

  React.useEffect(() => {
    setCurrency(initialCurrency);
  }, [initialCurrency]);

  const fmtCost = React.useCallback(
    (nanoUsd: string) => formatAiCost(BigInt(nanoUsd), currency, usdIdrRate),
    [currency, usdIdrRate],
  );

  const summary = data?.summary;
  const maxDaily = Math.max(1, ...(data?.daily.map((day) => day.requests) ?? [1]));
  const visibleUsers = (data?.users ?? []).filter((user) => {
    const needle = userSearch.trim().toLowerCase();
    if (!needle) return true;
    return [user.name, user.email, user.nim ?? ""].some((value) => value.toLowerCase().includes(needle));
  });
  const costCoverage = summary && summary.totalRequests > 0
    ? Math.round((summary.costKnownRequests / summary.totalRequests) * 100)
    : 0;

  return (
    <section className="flex flex-col gap-5" aria-label="Analitik penggunaan AI">
      <div className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="ai-usage-preset" className="text-sm font-medium">Rentang waktu</label>
          <Select id="ai-usage-preset" value={preset} onValueChange={(value) => applyPreset(value as Preset)} className="mt-1.5">
            <option value="7">7 hari terakhir</option>
            <option value="30">30 hari terakhir</option>
            <option value="90">90 hari terakhir</option>
            <option value="custom">Kustom</option>
          </Select>
        </div>
        <div>
          <label htmlFor="ai-usage-prodi" className="text-sm font-medium">Program studi</label>
          <Select id="ai-usage-prodi" value={prodiId} onValueChange={setProdiId} className="mt-1.5">
            <option value="">Semua prodi</option>
            {prodiOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="ai-usage-mode" className="text-sm font-medium">Mode</label>
          <Select id="ai-usage-mode" value={mode} onValueChange={(value) => setMode(value as AiUsageMode)} className="mt-1.5">
            <option value="ALL">Semua mode</option>
            <option value="CHAT">Chat artikel</option>
            <option value="WEB_SEARCH">Search mode</option>
            <option value="SUMMARY">Pembuatan ringkasan</option>
          </Select>
        </div>
        <div>
          <label htmlFor="ai-usage-status" className="text-sm font-medium">Status</label>
          <Select id="ai-usage-status" value={status} onValueChange={(value) => setStatus(value as AiUsageStatus)} className="mt-1.5">
            <option value="ALL">Semua status</option>
            <option value="COMPLETE">Berhasil</option>
            <option value="FAILED">Gagal</option>
            <option value="PENDING">Tertunda</option>
          </Select>
        </div>
        {preset === "custom" ? (
          <>
            <div>
              <label htmlFor="ai-usage-start" className="text-sm font-medium">Dari tanggal</label>
              <Input id="ai-usage-start" type="date" value={start} max={end}
                onChange={(event) => setStart(event.target.value)} className="mt-1.5" />
            </div>
            <div>
              <label htmlFor="ai-usage-end" className="text-sm font-medium">Sampai tanggal</label>
              <Input id="ai-usage-end" type="date" value={end} min={start} max={wibToday()}
                onChange={(event) => setEnd(event.target.value)} className="mt-1.5" />
            </div>
          </>
        ) : null}
      </div>

      {loading ? <Skeleton /> : null}

      {!loading && failed ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="font-semibold">Analitik tidak dapat dimuat</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Mungkin tabel analitik belum dibuat di database. Jalankan
                {" "}<code className="rounded bg-muted px-1 py-0.5 text-xs">prisma/ai-usage-analytics.sql</code>{" "}
                di Supabase SQL Editor, lalu coba lagi.
              </p>
              <Button type="button" variant="outline" className="mt-3" onClick={() => setReloadKey((key) => key + 1)}>
                Coba lagi
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !failed && data && summary ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {currency === "idr"
                ? `Biaya ditampilkan dalam rupiah · kurs $1 = Rp${usdIdrRate.toLocaleString("id-ID")}`
                : "Biaya ditampilkan dalam USD · ganti ke IDR untuk tampilan rupiah"}
            </p>
            <AiCurrencyToggle value={currency} onChange={setCurrency} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total request"
              value={formatNumber(summary.totalRequests)}
              description={`${formatNumber(summary.chatRequests)} chat · ${formatNumber(summary.searchRequests)} search · ${formatNumber(summary.summaryRequests)} ringkasan baru`}
              icon={Bot}
            />
            <MetricCard
              label="Pengguna aktif"
              value={formatNumber(summary.activeUsers)}
              description="Mahasiswa unik yang memakai AI pada rentang ini"
              icon={Users}
            />
            <MetricCard
              label="Total token"
              value={formatNumber(summary.totalTokens)}
              description={`${formatNumber(summary.promptTokens)} input · ${formatNumber(summary.completionTokens)} output`}
              icon={Coins}
            />
            <MetricCard
              label="Estimasi biaya"
              value={fmtCost(summary.costNanoUsd)}
              description={summary.totalRequests
                ? `Dari ${formatNumber(summary.costKnownRequests)} request yang harganya tercatat (${costCoverage}%)`
                : "Belum ada request pada rentang ini"}
              icon={CircleDollarSign}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Tingkat berhasil"
              value={`${aiSuccessRate(summary.completedRequests, summary.totalRequests).toLocaleString("id-ID")}%`}
              description={`${formatNumber(summary.failedRequests)} gagal · ${formatNumber(summary.pendingRequests)} tertunda`}
              icon={Activity}
            />
            <MetricCard
              label="Rata-rata latency"
              value={formatLatency(summary.averageLatencyMs)}
              description="Waktu dari request masuk sampai jawaban selesai"
              icon={Gauge}
            />
            <MetricCard
              label="Request per pengguna"
              value={summary.activeUsers
                ? (summary.totalRequests / summary.activeUsers).toLocaleString("id-ID", { maximumFractionDigits: 1 })
                : "0"}
              description="Rata-rata pemakaian per mahasiswa aktif"
              icon={Search}
            />
          </div>

          {summary.totalRequests > 0 && summary.costKnownRequests < summary.totalRequests ? (
            <p className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground">
              Estimasi biaya hanya mencakup request yang harga modelnya tercatat. Request lama sebelum
              pencatatan harga aktif, atau request saat harga belum dikonfigurasi lewat
              {" "}<code className="rounded bg-muted px-1 py-0.5 text-xs">AI_PRICE_INPUT_PER_MILLION_USD</code> dan
              {" "}<code className="rounded bg-muted px-1 py-0.5 text-xs">AI_PRICE_OUTPUT_PER_MILLION_USD</code>,
              tetap dihitung tokennya tetapi tidak masuk estimasi biaya.
            </p>
          ) : null}

          <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight">Request per hari</h2>
              <p className="text-xs text-muted-foreground">
                {formatDay(start)} — {formatDay(end)} (WIB)
              </p>
            </div>
            {summary.totalRequests === 0 ? (
              <p className="mt-6 pb-2 text-sm text-muted-foreground">
                Belum ada pemakaian AI pada rentang dan filter ini.
              </p>
            ) : (
              <div className="mt-5 flex h-40 gap-1" role="img"
                aria-label={`Grafik request AI per hari, tertinggi ${formatNumber(maxDaily)} request`}>
                {data.daily.map((day, index) => {
                  // Rentang panjang: label cukup angka tanggal (bulan terlihat
                  // di keterangan rentang), kecuali hari pertama dan tanggal 1
                  // yang tetap membawa nama bulan. Label dikunci satu baris dan
                  // kolom dikunci tingginya agar baseline batang tidak bergeser.
                  const showFullLabel = data.daily.length <= 14 || index === 0 || day.day.endsWith("-01");
                  return (
                    <div key={day.day} className="group flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={cn("w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary",
                            day.requests === 0 && "bg-muted")}
                          style={{ height: `${Math.max(day.requests ? 6 : 2, (day.requests / maxDaily) * 100)}%` }}
                          title={`${formatDay(day.day)}: ${formatNumber(day.requests)} request · ${formatNumber(day.promptTokens + day.completionTokens)} token · ${fmtCost(day.costNanoUsd)}`}
                        />
                      </div>
                      <div className="flex h-4 shrink-0 items-start justify-center">
                        <span className="hidden whitespace-nowrap text-[10px] leading-4 text-muted-foreground sm:block">
                          {showFullLabel ? formatDay(day.day) : day.day.slice(8)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Penggunaan per mahasiswa</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Diurutkan dari total token terbesar. Maksimal 100 pengguna ditampilkan.
                </p>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Cari nama, email, atau NIM"
                  className="w-64 pl-9"
                  aria-label="Cari pengguna pada tabel"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-y border-border/70 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-semibold sm:px-5">Mahasiswa</th>
                    <th className="px-4 py-3 font-semibold">Request</th>
                    <th className="px-4 py-3 font-semibold">Token</th>
                    <th className="px-4 py-3 font-semibold">Estimasi biaya</th>
                    <th className="px-4 py-3 font-semibold">Gagal</th>
                    <th className="px-4 py-3 font-semibold">Terakhir aktif</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => (
                    <tr key={user.userId} className="border-b border-border/50 last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3 sm:px-5">
                        <p className="font-medium">{user.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {user.email}{user.nim ? ` · NIM ${user.nim}` : ""} · tier {user.tier}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(user.requests)}
                        <span className="block text-xs text-muted-foreground">
                          {user.chatRequests} chat · {user.searchRequests} search · {user.summaryRequests} ringkasan
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(user.totalTokens)}
                        <span className="block text-xs text-muted-foreground">
                          {formatNumber(user.promptTokens)} in · {formatNumber(user.completionTokens)} out
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{fmtCost(user.costNanoUsd)}</td>
                      <td className="px-4 py-3">{formatNumber(user.failedRequests)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.lastActiveAt ? formatDateTimeWib(user.lastActiveAt) : "—"}
                      </td>
                    </tr>
                  ))}
                  {visibleUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground sm:px-5">
                        Tidak ada pengguna yang cocok.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-card">
              <div className="p-4 sm:p-5">
                <h2 className="text-base font-semibold tracking-tight">Artikel teratas</h2>
                <p className="mt-1 text-xs text-muted-foreground">Artikel yang paling banyak memakai AI.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-border/70 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-semibold sm:px-5">Artikel</th>
                      <th className="px-4 py-3 font-semibold">Request</th>
                      <th className="px-4 py-3 font-semibold">Token</th>
                      <th className="px-4 py-3 font-semibold">Biaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.articles.map((article) => (
                      <tr key={article.articleId} className="border-b border-border/50 last:border-0 hover:bg-accent/40">
                        <td className="px-4 py-3 sm:px-5">
                          <p className="font-medium">{article.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{article.prodiName}</p>
                        </td>
                        <td className="px-4 py-3">{formatNumber(article.requests)}</td>
                        <td className="px-4 py-3">{formatNumber(article.totalTokens)}</td>
                        <td className="px-4 py-3 font-medium">{fmtCost(article.costNanoUsd)}</td>
                      </tr>
                    ))}
                    {data.articles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground sm:px-5">Belum ada data artikel.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card">
              <div className="p-4 sm:p-5">
                <h2 className="text-base font-semibold tracking-tight">Model terpakai</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Nama model yang dilaporkan provider. Pada combo 9Router, ini bisa berupa nama combo.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-border/70 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-semibold sm:px-5">Model</th>
                      <th className="px-4 py-3 font-semibold">Request</th>
                      <th className="px-4 py-3 font-semibold">Token</th>
                      <th className="px-4 py-3 font-semibold">Biaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.models.map((model) => (
                      <tr key={model.model} className="border-b border-border/50 last:border-0 hover:bg-accent/40">
                        <td className="px-4 py-3 font-medium sm:px-5">{model.model}</td>
                        <td className="px-4 py-3">{formatNumber(model.requests)}</td>
                        <td className="px-4 py-3">{formatNumber(model.promptTokens + model.completionTokens)}</td>
                        <td className="px-4 py-3 font-medium">{fmtCost(model.costNanoUsd)}</td>
                      </tr>
                    ))}
                    {data.models.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground sm:px-5">Belum ada data model.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
