"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import {
  getAuditLog,
  type AuditActionCategory,
  type AuditActorOption,
  type AuditKelasOption,
  type AuditLogFilters,
  type AuditLogRow,
} from "@/actions/audit";
import { Button } from "@/components/button";
import { Select } from "@/components/ui/select";
import { cn, formatDateTimeShortWib } from "@/lib/utils";

const PAGE_SIZE = 100;
const MAX_RESULTS = 500;

type FilterState = Pick<
  AuditLogFilters,
  "kelas_id" | "action" | "action_category" | "actor_id" | "search"
>;

const EMPTY_FILTERS: FilterState = {
  kelas_id: "",
  action: "",
  action_category: undefined,
  actor_id: "",
  search: "",
};

const ACTION_LABELS: Record<string, string> = {
  POIN_INPUT: "Poin Input",
  POIN_DELETE: "Poin Dihapus",
  PJ_ASSIGN: "PJ Ditugaskan",
  PJ_REPLACE: "PJ Diganti",
  PJ_REMOVE: "PJ Dihapus",
  MAHASISWA_ADD: "Mahasiswa Ditambahkan",
  MAHASISWA_REMOVE: "Mahasiswa Dikeluarkan",
  KELAS_CREATE: "Kelas Dibuat",
  KELAS_UPDATE: "Kelas Diubah",
  KELAS_DELETE: "Kelas Dihapus",
  MATKUL_ASSIGN: "Matkul Ditugaskan",
  SEMESTER_SET_ACTIVE: "Semester Diaktifkan",
};

const CATEGORY_STYLES: Record<string, string> = {
  POIN: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  PJ: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  MAHASISWA: "bg-green-500/10 text-green-700 dark:text-green-300",
  KELAS: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  MATKUL: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  SEMESTER: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

function getActionCategory(action: string): string {
  return action.split("_")[0] || "LAINNYA";
}

function getActionLabel(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function isNonEmptyString(value: string | null): value is string {
  return Boolean(value);
}

function getSnapshotValue(
  value: AuditLogRow["before"],
  key: string,
): string | number | string[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const candidate = (value as Record<string, unknown>)[key];
  if (
    typeof candidate === "string" ||
    typeof candidate === "number" ||
    (Array.isArray(candidate) &&
      candidate.every((item) => typeof item === "string"))
  ) {
    return candidate;
  }

  return null;
}

function getSubjectName(event: AuditLogRow): string {
  switch (event.action) {
    case "PJ_ASSIGN":
    case "PJ_REPLACE":
      return (
        (getSnapshotValue(event.after, "pj_name") as string | null) ??
        event.entity_label ??
        event.entity_type
      );
    case "PJ_REMOVE":
      return (
        (getSnapshotValue(event.before, "pj_name") as string | null) ??
        event.entity_label ??
        event.entity_type
      );
    case "MATKUL_ASSIGN":
      return event.matkul_label ?? event.entity_label ?? event.entity_type;
    case "SEMESTER_SET_ACTIVE":
      return (
        (getSnapshotValue(event.after, "semester_name") as string | null) ??
        event.entity_label ??
        event.entity_type
      );
    default:
      return event.entity_label ?? event.entity_type;
  }
}

function getEventContext(event: AuditLogRow): string[] {
  const kelas = event.kelas_label;
  const matkul = event.matkul_label;
  const prodi =
    (getSnapshotValue(event.metadata, "prodi_name") as string | null) ??
    (getSnapshotValue(event.metadata, "prodi") as string | null);
  const semester =
    (getSnapshotValue(event.metadata, "semester_name") as string | null) ??
    (getSnapshotValue(event.metadata, "semester") as string | null);

  if (event.action.startsWith("POIN_")) {
    return [kelas, matkul].filter(isNonEmptyString);
  }
  if (event.action.startsWith("PJ_")) {
    return [matkul, kelas].filter(isNonEmptyString);
  }
  if (event.action.startsWith("MAHASISWA_")) {
    return [kelas].filter(isNonEmptyString);
  }
  if (event.action.startsWith("KELAS_")) {
    return [prodi, semester].filter(isNonEmptyString);
  }
  if (event.action.startsWith("MATKUL_")) {
    return [kelas].filter(isNonEmptyString);
  }
  if (event.action.startsWith("SEMESTER_")) return [];

  return [kelas, matkul].filter(isNonEmptyString);
}

function getSnapshotSummary(event: AuditLogRow): string | null {
  if (event.action.startsWith("POIN_")) {
    const source = event.action === "POIN_INPUT" ? event.after : event.before;
    const poin = getSnapshotValue(source, "poin");
    const kategori = getSnapshotValue(source, "kategori");

    return poin !== null && kategori !== null ? `Poin ${poin} · ${kategori}` : null;
  }

  if (event.action === "PJ_REPLACE") {
    const oldPjName = getSnapshotValue(event.before, "pj_name");
    return oldPjName ? `Sebelumnya: ${oldPjName}` : null;
  }

  if (event.action === "KELAS_UPDATE") {
    const changedFields = getSnapshotValue(event.metadata, "changed_fields");
    return Array.isArray(changedFields)
      ? `Field: ${changedFields.join(", ")}`
      : null;
  }

  return null;
}

function shouldHideSnapshot(event: AuditLogRow): boolean {
  return (
    event.action === "PJ_ASSIGN" ||
    event.action === "PJ_REMOVE" ||
    event.action.startsWith("MAHASISWA_")
  );
}

function formatSnapshotInline(value: AuditLogRow["before"]): string {
  if (value === null) return "—";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.join(", ");

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, entryValue]) =>
      entryValue !== null &&
      entryValue !== undefined &&
      entryValue !== "",
  );

  if (entries.length === 0) return "—";

  return entries
    .map(([key, entryValue]) => {
      const formattedValue = Array.isArray(entryValue)
        ? entryValue.join(", ")
        : String(entryValue);
      return `${key}: ${formattedValue}`;
    })
    .join(" · ");
}

function Snapshot({
  label,
  value,
}: {
  label: string;
  value: AuditLogRow["before"];
}) {
  if (value === null) return null;

  return (
    <p className="text-xs text-muted-foreground">
      <strong>{label}:</strong> {formatSnapshotInline(value)}
    </p>
  );
}

function AuditLogSkeleton() {
  return (
    <div className="grid gap-3" aria-label="Memuat riwayat audit">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-lg border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-4 w-36 rounded bg-muted" />
          </div>
          <div className="mt-3 h-5 w-48 rounded bg-muted" />
          <div className="mt-3 h-4 w-64 max-w-full rounded bg-muted" />
          <div className="mt-2 h-4 w-40 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function AuditEventCard({ event }: { event: AuditLogRow }) {
  const [open, setOpen] = React.useState(false);
  const category = getActionCategory(event.action);
  const context = getEventContext(event);
  const subjectName = getSubjectName(event);
  const snapshotSummary = getSnapshotSummary(event);
  const showGenericSnapshots =
    !shouldHideSnapshot(event) &&
    snapshotSummary === null &&
    (event.before !== null || event.after !== null);
  const hasSnapshotColumn = Boolean(snapshotSummary || showGenericSnapshots);

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-semibold",
              CATEGORY_STYLES[category] ?? "bg-muted text-muted-foreground",
            )}
          >
            {getActionLabel(event.action)}
          </span>
          <h2 className="truncate font-medium">{subjectName}</h2>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <time
            dateTime={event.created_at}
            className="text-xs text-muted-foreground"
          >
            {formatDateTimeShortWib(event.created_at)}
          </time>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border p-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div
                className={cn(
                  "space-y-1",
                  hasSnapshotColumn ? "lg:col-span-2" : "lg:col-span-3",
                )}
              >
                <p className="text-sm text-muted-foreground">
                  Oleh {event.actor_name} · {event.actor_role}
                </p>
                {context.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Untuk: {context.join(" · ")}
                  </p>
                ) : null}
              </div>

              {hasSnapshotColumn ? (
                <div className="border-t border-border pt-3 lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0">
                  {snapshotSummary ? (
                    <p className="text-sm text-muted-foreground">
                      {snapshotSummary}
                    </p>
                  ) : null}
                  {showGenericSnapshots ? (
                    <div className="grid gap-2">
                      <Snapshot label="Sebelum" value={event.before} />
                      <Snapshot label="Sesudah" value={event.after} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export function AuditLogView({
  kelasOptions,
  actorOptions,
}: {
  kelasOptions: AuditKelasOption[];
  actorOptions: AuditActorOption[];
}) {
  const [filters, setFilters] = React.useState<FilterState>(EMPTY_FILTERS);
  const [events, setEvents] = React.useState<AuditLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const hasActiveFilters = Boolean(
    filters.kelas_id ||
      filters.action ||
      filters.action_category ||
      filters.actor_id ||
      filters.search,
  );

  const queryFilters = React.useMemo(
    () => ({
      kelas_id: filters.kelas_id,
      action: filters.action,
      action_category: filters.action_category,
      actor_id: filters.actor_id,
      search: filters.search,
    }),
    [
      filters.action,
      filters.action_category,
      filters.actor_id,
      filters.kelas_id,
      filters.search,
    ],
  );

  React.useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setEvents([]);
    setHasMore(false);

    void getAuditLog({
      ...queryFilters,
      limit: PAGE_SIZE,
      offset: 0,
    })
      .then((rows) => {
        if (cancelled) return;

        setEvents(rows);
        setHasMore(rows.length === PAGE_SIZE && rows.length < MAX_RESULTS);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Riwayat audit tidak dapat dimuat. Coba lagi.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryFilters, reloadKey]);

  async function loadMore() {
    if (loadingMore || !hasMore || events.length >= MAX_RESULTS) return;

    setLoadingMore(true);
    setError(null);

    try {
      const rows = await getAuditLog({
        ...filters,
        limit: Math.min(PAGE_SIZE, MAX_RESULTS - events.length),
        offset: events.length,
      });

      setEvents((current) => [...current, ...rows]);
      setHasMore(
        rows.length === PAGE_SIZE && events.length + rows.length < MAX_RESULTS,
      );
    } catch {
      setError("Riwayat audit berikutnya tidak dapat dimuat. Coba lagi.");
    } finally {
      setLoadingMore(false);
    }
  }

  function updateFilter<Key extends keyof FilterState>(
    key: Key,
    value: FilterState[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleActionFilter(value: string) {
    if (!value) {
      setFilters((current) => ({
        ...current,
        action: "",
        action_category: undefined,
      }));
      return;
    }

    if (value.startsWith("category:")) {
      setFilters((current) => ({
        ...current,
        action: "",
        action_category: value.slice("category:".length) as AuditActionCategory,
      }));
      return;
    }

    setFilters((current) => ({
      ...current,
      action: value,
      action_category: undefined,
    }));
  }

  const actionValue = filters.action
    ? filters.action
    : filters.action_category
      ? `category:${filters.action_category}`
      : "";

  const eventCounter =
    events.length >= MAX_RESULTS
      ? `${MAX_RESULTS}+ events`
      : `${events.length} events`;

  return (
    <section className="flex flex-col gap-5" aria-label="Daftar audit log">
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label htmlFor="audit-kelas" className="text-sm font-medium">
            Kelas
          </label>
          <Select
            id="audit-kelas"
            value={filters.kelas_id}
            onValueChange={(value) => updateFilter("kelas_id", value)}
            className="mt-1.5"
          >
            <option value="">Semua Kelas</option>
            {kelasOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="audit-action" className="text-sm font-medium">
            Tipe Aksi
          </label>
          <Select
            id="audit-action"
            value={actionValue}
            onValueChange={handleActionFilter}
            className="mt-1.5"
          >
            <option value="">Semua Aktivitas</option>
            <optgroup label="Poin">
              <option value="category:POIN">Semua aktivitas poin</option>
              <option value="POIN_INPUT">Input poin</option>
              <option value="POIN_DELETE">Hapus poin</option>
            </optgroup>
            <optgroup label="PJ">
              <option value="category:PJ">Semua aktivitas PJ</option>
              <option value="PJ_ASSIGN">Assign PJ</option>
              <option value="PJ_REPLACE">Ganti PJ</option>
              <option value="PJ_REMOVE">Hapus PJ</option>
            </optgroup>
            <optgroup label="Mahasiswa">
              <option value="category:MAHASISWA">Semua aktivitas mahasiswa</option>
              <option value="MAHASISWA_ADD">Tambah mahasiswa</option>
              <option value="MAHASISWA_REMOVE">Keluarkan mahasiswa</option>
            </optgroup>
            <optgroup label="Kelas">
              <option value="category:KELAS">Semua aktivitas kelas</option>
              <option value="KELAS_CREATE">Buat kelas</option>
              <option value="KELAS_UPDATE">Edit kelas</option>
              <option value="KELAS_DELETE">Hapus kelas</option>
            </optgroup>
            <optgroup label="Matkul">
              <option value="category:MATKUL">Semua aktivitas matkul</option>
              <option value="MATKUL_ASSIGN">Assign matkul</option>
            </optgroup>
            <optgroup label="Semester">
              <option value="category:SEMESTER">Semua aktivitas semester</option>
              <option value="SEMESTER_SET_ACTIVE">Aktifkan semester</option>
            </optgroup>
          </Select>
        </div>

        <div>
          <label htmlFor="audit-actor" className="text-sm font-medium">
            Aktor
          </label>
          <Select
            id="audit-actor"
            value={filters.actor_id}
            onValueChange={(value) => updateFilter("actor_id", value)}
            className="mt-1.5"
          >
            <option value="">Semua Aktor</option>
            {actorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="audit-search" className="text-sm font-medium">
            Cari
          </label>
          <input
            id="audit-search"
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Nama aktor atau subjek"
            maxLength={100}
            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {hasActiveFilters ? (
          <div className="md:col-span-2 xl:col-span-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Reset filter
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading ? "Memuat events..." : eventCounter}
        </p>
      </div>

      {loading ? (
        <AuditLogSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Coba lagi
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
          <h2 className="font-medium">
            {hasActiveFilters
              ? "Tidak ada event dengan filter ini."
              : "Belum ada aktivitas tercatat."}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Coba reset atau ubah filter yang digunakan."
              : "Aktivitas administratif akan muncul di sini."}
          </p>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Reset filter
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <ol className="grid gap-3">
            {events.map((event) => (
              <AuditEventCard key={event.id} event={event} />
            ))}
          </ol>

          {hasMore ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? "Memuat..." : "Muat lebih banyak"}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
