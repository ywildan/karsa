"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Crown, Search } from "lucide-react";
import { toast } from "sonner";

import {
  searchAiSubscribers,
  setAiGlobalSettings,
  setUserAiLimitOverrides,
  setUserPremiumTier,
} from "@/actions/ai-premium";
import { Button } from "@/components/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AiPremiumSettingsView,
  AiSubscriberRow,
} from "@/lib/admin/ai-premium";
import type { AiTier } from "@/lib/karsa-lib/ai-settings";
import { cn, formatNumber } from "@/lib/utils";

const TIERS: { value: AiTier; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
  { value: "plus", label: "Plus" },
];

function parseLimitInput(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 0 || value > 1000) return undefined;
  return value;
}

function GlobalSettingRow({
  title,
  description,
  usedToday,
  value,
  source,
  onSave,
}: {
  title: string;
  description: string;
  usedToday: number;
  value: number;
  source: "dashboard" | "env";
  onSave: (next: number | null) => Promise<boolean>;
}) {
  const [raw, setRaw] = React.useState(String(value));
  const [pending, setPending] = React.useState(false);
  React.useEffect(() => setRaw(String(value)), [value]);

  async function save(next: number | null) {
    setPending(true);
    const ok = await onSave(next);
    setPending(false);
    if (!ok) setRaw(String(value));
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {title}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              source === "dashboard"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {source === "dashboard" ? "Dari dashboard" : "Dari env"}
          </span>
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description} Terpakai hari ini: {formatNumber(usedToday)} dari{" "}
          {formatNumber(value)}.
        </p>
      </div>
      <div className="flex items-end gap-2">
        <div className="grid gap-1">
          <Label htmlFor={title} className="sr-only">
            {title}
          </Label>
          <Input
            id={title}
            type="number"
            min={1}
            max={10000}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            className="w-28"
            disabled={pending}
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            const parsed = Number(raw);
            if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) {
              toast.error("Limit global harus bilangan bulat 1–10.000.");
              return;
            }
            void save(parsed);
          }}
        >
          Simpan
        </Button>
        {source === "dashboard" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void save(null)}
          >
            Ikut env
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SubscriberRow({ row }: { row: AiSubscriberRow }) {
  const router = useRouter();
  const [tier, setTier] = React.useState<AiTier>(row.tier);
  const [tierPending, setTierPending] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [chat, setChat] = React.useState(row.overrides.chat?.toString() ?? "");
  const [summary, setSummary] = React.useState(row.overrides.summary?.toString() ?? "");
  const [web, setWeb] = React.useState(row.overrides.webSearch?.toString() ?? "");
  const [limitPending, setLimitPending] = React.useState(false);

  React.useEffect(() => {
    setTier(row.tier);
    setChat(row.overrides.chat?.toString() ?? "");
    setSummary(row.overrides.summary?.toString() ?? "");
    setWeb(row.overrides.webSearch?.toString() ?? "");
  }, [row]);

  function changeTier(next: AiTier) {
    if (next === tier || tierPending) return;
    const previous = tier;
    setTier(next);
    setTierPending(true);
    void setUserPremiumTier({ userId: row.id, tier: next })
      .then((result) => {
        if (!result.ok) {
          setTier(previous);
          toast.error(result.error);
          return;
        }
        toast.success(result.message ?? "Tier tersimpan.");
        router.refresh();
      })
      .finally(() => setTierPending(false));
  }

  function saveLimits() {
    const parsedChat = parseLimitInput(chat);
    const parsedSummary = parseLimitInput(summary);
    const parsedWeb = parseLimitInput(web);
    if (parsedChat === undefined || parsedSummary === undefined || parsedWeb === undefined) {
      toast.error("Limit khusus harus bilangan bulat 0–1000, atau kosongkan untuk ikut bawaan.");
      return;
    }
    setLimitPending(true);
    void setUserAiLimitOverrides({
      userId: row.id,
      chat: parsedChat,
      summary: parsedSummary,
      webSearch: parsedWeb,
    })
      .then((result) => {
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success(result.message ?? "Limit khusus tersimpan.");
        setEditorOpen(false);
        router.refresh();
      })
      .finally(() => setLimitPending(false));
  }

  const hasOverrides =
    row.overrides.chat !== null || row.overrides.summary !== null || row.overrides.webSearch !== null;

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {row.name ?? row.email}
            {row.nim ? <span className="ml-2 font-normal text-muted-foreground">{row.nim}</span> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Hari ini: chat {row.usageToday.chat}/{row.effective.chatLimit} · ringkasan{" "}
            {row.usageToday.summary}/{row.effective.summaryLimit} · web search{" "}
            {row.usageToday.webSearch}/{row.effective.webSearchLimit} per{" "}
            {row.effective.webSearchPeriod === "month" ? "bulan" : "hari"}
            {hasOverrides ? " · ada limit khusus" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center rounded-full border border-border bg-card p-0.5"
            role="group"
            aria-label={`Tier langganan ${row.name ?? row.email}`}
          >
            {TIERS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={tierPending}
                aria-pressed={tier === option.value}
                onClick={() => changeTier(option.value)}
                className={cn(
                  "min-h-7 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                  tier === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditorOpen((open) => !open)}
            aria-expanded={editorOpen}
          >
            Limit khusus
          </Button>
        </div>
      </div>

      {editorOpen ? (
        <div className="mt-3 grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-4 sm:items-end">
          {(
            [
              { label: "Chat / hari", value: chat, set: setChat, fallback: row.effective.chatLimit },
              { label: "Ringkasan / hari", value: summary, set: setSummary, fallback: row.effective.summaryLimit },
              { label: "Web search", value: web, set: setWeb, fallback: row.effective.webSearchLimit },
            ] as const
          ).map((field) => (
            <div key={field.label} className="grid gap-1">
              <Label className="text-xs">{field.label}</Label>
              <Input
                type="number"
                min={0}
                max={1000}
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                placeholder={`Bawaan: ${field.fallback}`}
                disabled={limitPending}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={limitPending} onClick={saveLimits}>
              Simpan
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={limitPending}
              onClick={() => {
                setChat("");
                setSummary("");
                setWeb("");
              }}
            >
              Kosongkan
            </Button>
          </div>
          <p className="text-[11px] leading-4 text-muted-foreground sm:col-span-4">
            Kosong berarti ikut bawaan tier/env. Isi 0 untuk mematikan fitur itu
            bagi mahasiswa ini.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function AiPremiumManager({
  settings,
  initialSubscribers,
}: {
  settings: AiPremiumSettingsView;
  initialSubscribers: AiSubscriberRow[];
}) {
  const router = useRouter();
  const [subscribers, setSubscribers] = React.useState(initialSubscribers);
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  React.useEffect(() => setSubscribers(initialSubscribers), [initialSubscribers]);

  async function runSearch(event?: React.FormEvent) {
    event?.preventDefault();
    setSearching(true);
    try {
      setSubscribers(await searchAiSubscribers(query));
    } finally {
      setSearching(false);
    }
  }

  async function saveGlobal(
    patch: { globalDailyLimit?: number | null; webSearchGlobalLimit?: number | null },
    current: { globalDailyLimit: number | null; webSearchGlobalLimit: number | null },
  ): Promise<boolean> {
    const result = await setAiGlobalSettings({ ...current, ...patch });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(result.message ?? "Pengaturan global tersimpan.");
    router.refresh();
    return true;
  }

  // Nilai mentah saat ini (null = ikut env) diturunkan dari sumber tampil:
  // bila sumbernya env, menyimpan satu field tidak boleh mengunci field lain.
  const rawGlobal = settings.globalDailyLimit.source === "dashboard" ? settings.globalDailyLimit.value : null;
  const rawWebGlobal = settings.webSearchGlobalLimit.source === "dashboard" ? settings.webSearchGlobalLimit.value : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card px-4 py-1 sm:px-5">
        <div className="flex items-center gap-2 pt-4">
          <Crown className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-base font-semibold">Limit global</h2>
        </div>
        <GlobalSettingRow
          title="Limit global chat + ringkasan"
          description="Total request chat dan ringkasan baru untuk semua user per hari (WIB)."
          usedToday={settings.globalDailyLimit.usedToday}
          value={settings.globalDailyLimit.value}
          source={settings.globalDailyLimit.source}
          onSave={(next) =>
            saveGlobal({ globalDailyLimit: next }, { globalDailyLimit: rawGlobal, webSearchGlobalLimit: rawWebGlobal })
          }
        />
        <GlobalSettingRow
          title="Limit global web search"
          description="Total request web search (Tavily) untuk semua user per hari (WIB)."
          usedToday={settings.webSearchGlobalLimit.usedToday}
          value={settings.webSearchGlobalLimit.value}
          source={settings.webSearchGlobalLimit.source}
          onSave={(next) =>
            saveGlobal({ webSearchGlobalLimit: next }, { globalDailyLimit: rawGlobal, webSearchGlobalLimit: rawWebGlobal })
          }
        />
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold">Mahasiswa</h2>
          <form onSubmit={runSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, NIM, atau email"
              className="w-56"
              aria-label="Cari mahasiswa"
            />
            <Button type="submit" size="sm" variant="outline" disabled={searching}>
              <Search className="mr-1 h-4 w-4" aria-hidden />
              Cari
            </Button>
          </form>
        </div>

        <div className="mt-2">
          {subscribers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada mahasiswa yang cocok. Coba kata kunci lain.
            </p>
          ) : (
            subscribers.map((row) => <SubscriberRow key={row.id} row={row} />)
          )}
        </div>
        <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
          Menampilkan maksimal 100 mahasiswa. Perubahan tier berlaku pada
          request AI berikutnya; limit khusus menang atas bawaan tier dan env.
        </p>
      </div>
    </div>
  );
}
