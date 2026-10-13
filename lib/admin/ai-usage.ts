import "server-only";

/**
 * Karsa — lib/admin/ai-usage.ts
 * ----------------------------------------------------------------------------
 * Query & agregasi dashboard "Penggunaan AI" (`/admin/ai-usage`).
 *
 * Sumber data:
 *  · `LibAiTurn` — chat biasa + search mode (satu baris per request user).
 *  · `LibAiSummaryGeneration` — pembuatan ringkasan baru saja; pembacaan
 *    ringkasan cache tidak memakai provider dan tidak dihitung.
 *
 * Biaya adalah ESTIMASI dari snapshot harga saat request terjadi
 * (nano-USD, dikembalikan sebagai string agar aman melewati JSON).
 */
import type { Prisma } from "@prisma/client";

import { aiDay } from "@/lib/karsa-lib/ai-policy";
import { prisma } from "@/lib/prisma";

export type AiUsageMode = "ALL" | "CHAT" | "WEB_SEARCH" | "SUMMARY";
export type AiUsageStatus = "ALL" | "COMPLETE" | "FAILED" | "PENDING";

export type AiUsageQuery = {
  start: Date;
  end: Date;
  prodiId?: string | null;
  mode: AiUsageMode;
  status: AiUsageStatus;
};

export type AiUsageDay = {
  day: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  costNanoUsd: string;
};

export type AiUsageUserRow = {
  userId: string;
  name: string;
  email: string;
  nim: string | null;
  tier: string;
  requests: number;
  chatRequests: number;
  searchRequests: number;
  summaryRequests: number;
  failedRequests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costNanoUsd: string;
  costKnownRequests: number;
  averageLatencyMs: number | null;
  lastActiveAt: string | null;
};

export type AiUsageArticleRow = {
  articleId: string;
  title: string;
  prodiName: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costNanoUsd: string;
};

export type AiUsageModelRow = {
  model: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  costNanoUsd: string;
};

export type AiUsageAnalytics = {
  summary: {
    totalRequests: number;
    completedRequests: number;
    failedRequests: number;
    pendingRequests: number;
    activeUsers: number;
    chatRequests: number;
    searchRequests: number;
    summaryRequests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costNanoUsd: string;
    costKnownRequests: number;
    averageLatencyMs: number | null;
  };
  daily: AiUsageDay[];
  users: AiUsageUserRow[];
  articles: AiUsageArticleRow[];
  models: AiUsageModelRow[];
};

type NormalizedRecord = {
  kind: "CHAT" | "WEB_SEARCH" | "SUMMARY";
  status: string;
  userId: string;
  userName: string;
  userEmail: string;
  userNim: string | null;
  userTier: string;
  articleId: string;
  articleTitle: string;
  prodiId: string;
  prodiName: string;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number | null;
  costNanoUsd: bigint | null;
  model: string;
  createdAt: Date;
};

function emptyAnalytics(): AiUsageAnalytics {
  return {
    summary: {
      totalRequests: 0, completedRequests: 0, failedRequests: 0, pendingRequests: 0,
      activeUsers: 0, chatRequests: 0, searchRequests: 0, summaryRequests: 0,
      promptTokens: 0, completionTokens: 0, totalTokens: 0,
      costNanoUsd: "0", costKnownRequests: 0, averageLatencyMs: null,
    },
    daily: [], users: [], articles: [], models: [],
  };
}

export async function getAiUsageAnalytics(query: AiUsageQuery): Promise<AiUsageAnalytics> {
  const { start, end, prodiId, mode, status } = query;
  if (!(start < end)) return emptyAnalytics();

  const includeTurns = mode !== "SUMMARY";
  const includeSummaries = mode === "ALL" || mode === "SUMMARY";

  const turnWhere: Prisma.LibAiTurnWhereInput = {
    created_at: { gte: start, lt: end },
    ...(prodiId ? { article: { prodi_id: prodiId } } : {}),
    ...(status !== "ALL" ? { status } : {}),
    ...(mode === "CHAT" ? { web_search: false } : {}),
    ...(mode === "WEB_SEARCH" ? { web_search: true } : {}),
  };
  const summaryWhere: Prisma.LibAiSummaryGenerationWhereInput = {
    created_at: { gte: start, lt: end },
    ...(prodiId ? { article: { prodi_id: prodiId } } : {}),
    ...(status !== "ALL" ? { status } : {}),
  };

  const [turns, generations] = await Promise.all([
    includeTurns
      ? prisma.libAiTurn.findMany({
          where: turnWhere,
          orderBy: { created_at: "asc" },
          select: {
            user_id: true, article_id: true, status: true, web_search: true,
            latency_ms: true, prompt_tokens: true, completion_tokens: true,
            model_requested: true, model_reported: true, estimated_cost_nano_usd: true,
            created_at: true,
            user: { select: { name: true, email: true, nim: true, premium_tier: true } },
            article: { select: { title: true, prodi_id: true, prodi: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    includeSummaries
      ? prisma.libAiSummaryGeneration.findMany({
          where: summaryWhere,
          orderBy: { created_at: "asc" },
          select: {
            triggered_by_id: true, article_id: true, status: true,
            latency_ms: true, prompt_tokens: true, completion_tokens: true,
            model_requested: true, model_reported: true, estimated_cost_nano_usd: true,
            created_at: true,
            triggeredBy: { select: { name: true, email: true, nim: true, premium_tier: true } },
            article: { select: { title: true, prodi_id: true, prodi: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  const records: NormalizedRecord[] = [
    ...turns.map((turn) => ({
      kind: turn.web_search ? ("WEB_SEARCH" as const) : ("CHAT" as const),
      status: turn.status,
      userId: turn.user_id,
      userName: turn.user.name?.trim() || turn.user.email,
      userEmail: turn.user.email,
      userNim: turn.user.nim,
      userTier: turn.user.premium_tier,
      articleId: turn.article_id,
      articleTitle: turn.article.title,
      prodiId: turn.article.prodi_id,
      prodiName: turn.article.prodi.name,
      promptTokens: turn.prompt_tokens,
      completionTokens: turn.completion_tokens,
      latencyMs: turn.latency_ms,
      costNanoUsd: turn.estimated_cost_nano_usd,
      model: turn.model_reported ?? turn.model_requested ?? "Tidak tercatat",
      createdAt: turn.created_at,
    })),
    ...generations.map((generation) => ({
      kind: "SUMMARY" as const,
      status: generation.status,
      userId: generation.triggered_by_id,
      userName: generation.triggeredBy.name?.trim() || generation.triggeredBy.email,
      userEmail: generation.triggeredBy.email,
      userNim: generation.triggeredBy.nim,
      userTier: generation.triggeredBy.premium_tier,
      articleId: generation.article_id,
      articleTitle: generation.article.title,
      prodiId: generation.article.prodi_id,
      prodiName: generation.article.prodi.name,
      promptTokens: generation.prompt_tokens,
      completionTokens: generation.completion_tokens,
      latencyMs: generation.latency_ms,
      costNanoUsd: generation.estimated_cost_nano_usd,
      model: generation.model_reported ?? generation.model_requested ?? "Tidak tercatat",
      createdAt: generation.created_at,
    })),
  ];

  // Keranjang harian mengikuti kalender WIB, diisi nol untuk hari kosong.
  const dayKeys: string[] = [];
  for (let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + 86_400_000)) {
    dayKeys.push(aiDay(cursor).day);
  }
  const dailyMap = new Map<string, AiUsageDay & { cost: bigint }>(
    dayKeys.map((day) => [day, { day, requests: 0, promptTokens: 0, completionTokens: 0, costNanoUsd: "0", cost: BigInt(0) }]),
  );

  const userMap = new Map<string, AiUsageUserRow & { cost: bigint; latencyTotal: number; latencyCount: number }>();
  const articleMap = new Map<string, AiUsageArticleRow & { cost: bigint }>();
  const modelMap = new Map<string, AiUsageModelRow & { cost: bigint }>();

  let completed = 0, failed = 0, pending = 0;
  let chat = 0, search = 0, summary = 0;
  let promptTotal = 0, completionTotal = 0;
  let costTotal = BigInt(0), costKnown = 0;
  let latencyTotal = 0, latencyCount = 0;
  const activeUsers = new Set<string>();

  for (const record of records) {
    activeUsers.add(record.userId);
    if (record.status === "COMPLETE") completed++;
    else if (record.status === "FAILED") failed++;
    else pending++;
    if (record.kind === "CHAT") chat++;
    else if (record.kind === "WEB_SEARCH") search++;
    else summary++;

    const prompt = record.promptTokens ?? 0;
    const completion = record.completionTokens ?? 0;
    promptTotal += prompt;
    completionTotal += completion;
    if (record.costNanoUsd != null) {
      costTotal += record.costNanoUsd;
      costKnown++;
    }
    if (record.latencyMs != null) {
      latencyTotal += record.latencyMs;
      latencyCount++;
    }

    const day = dailyMap.get(aiDay(record.createdAt).day);
    if (day) {
      day.requests++;
      day.promptTokens += prompt;
      day.completionTokens += completion;
      if (record.costNanoUsd != null) day.cost += record.costNanoUsd;
    }

    const user = userMap.get(record.userId) ?? {
      userId: record.userId,
      name: record.userName,
      email: record.userEmail,
      nim: record.userNim,
      tier: record.userTier,
      requests: 0, chatRequests: 0, searchRequests: 0, summaryRequests: 0, failedRequests: 0,
      promptTokens: 0, completionTokens: 0, totalTokens: 0,
      costNanoUsd: "0", costKnownRequests: 0, averageLatencyMs: null, lastActiveAt: null,
      cost: BigInt(0), latencyTotal: 0, latencyCount: 0,
    };
    user.requests++;
    if (record.kind === "CHAT") user.chatRequests++;
    else if (record.kind === "WEB_SEARCH") user.searchRequests++;
    else user.summaryRequests++;
    if (record.status === "FAILED") user.failedRequests++;
    user.promptTokens += prompt;
    user.completionTokens += completion;
    user.totalTokens += prompt + completion;
    if (record.costNanoUsd != null) {
      user.cost += record.costNanoUsd;
      user.costKnownRequests++;
    }
    if (record.latencyMs != null) {
      user.latencyTotal += record.latencyMs;
      user.latencyCount++;
    }
    const iso = record.createdAt.toISOString();
    if (!user.lastActiveAt || iso > user.lastActiveAt) user.lastActiveAt = iso;
    userMap.set(record.userId, user);

    const article = articleMap.get(record.articleId) ?? {
      articleId: record.articleId, title: record.articleTitle, prodiName: record.prodiName,
      requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, costNanoUsd: "0", cost: BigInt(0),
    };
    article.requests++;
    article.promptTokens += prompt;
    article.completionTokens += completion;
    article.totalTokens += prompt + completion;
    if (record.costNanoUsd != null) article.cost += record.costNanoUsd;
    articleMap.set(record.articleId, article);

    const model = modelMap.get(record.model) ?? {
      model: record.model, requests: 0, promptTokens: 0, completionTokens: 0, costNanoUsd: "0", cost: BigInt(0),
    };
    model.requests++;
    model.promptTokens += prompt;
    model.completionTokens += completion;
    if (record.costNanoUsd != null) model.cost += record.costNanoUsd;
    modelMap.set(record.model, model);
  }

  const users = [...userMap.values()]
    .sort((a, b) => b.totalTokens - a.totalTokens || b.requests - a.requests)
    .slice(0, 100)
    .map(({ cost, latencyTotal: lt, latencyCount: lc, ...row }) => ({
      ...row,
      costNanoUsd: cost.toString(),
      averageLatencyMs: lc ? Math.round(lt / lc) : null,
    }));
  const articles = [...articleMap.values()]
    .sort((a, b) => b.totalTokens - a.totalTokens || b.requests - a.requests)
    .slice(0, 50)
    .map(({ cost, ...row }) => ({ ...row, costNanoUsd: cost.toString() }));
  const models = [...modelMap.values()]
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 20)
    .map(({ cost, ...row }) => ({ ...row, costNanoUsd: cost.toString() }));
  const daily = dayKeys.map((day) => {
    const row = dailyMap.get(day)!;
    return {
      day: row.day, requests: row.requests,
      promptTokens: row.promptTokens, completionTokens: row.completionTokens,
      costNanoUsd: row.cost.toString(),
    };
  });

  return {
    summary: {
      totalRequests: records.length,
      completedRequests: completed,
      failedRequests: failed,
      pendingRequests: pending,
      activeUsers: activeUsers.size,
      chatRequests: chat,
      searchRequests: search,
      summaryRequests: summary,
      promptTokens: promptTotal,
      completionTokens: completionTotal,
      totalTokens: promptTotal + completionTotal,
      costNanoUsd: costTotal.toString(),
      costKnownRequests: costKnown,
      averageLatencyMs: latencyCount ? Math.round(latencyTotal / latencyCount) : null,
    },
    daily, users, articles, models,
  };
}

/** Ringkasan bulan berjalan (kalender WIB) untuk kartu di beranda admin. */
export async function getAiUsageCurrentMonthSummary() {
  const now = new Date();
  const { day } = aiDay(now);
  const [year, month] = day.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1) - 7 * 3_600_000);
  const analytics = await getAiUsageAnalytics({
    start, end: new Date(now.getTime() + 1), mode: "ALL", status: "ALL",
  });
  return analytics.summary;
}
