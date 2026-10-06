import 'server-only';

import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { MobileActor } from '@/lib/mobile/auth';
import { prisma } from '@/lib/prisma';
import type { LibResult } from './service';
import { aiConfig, aiDay, aiRevision, canAccessAiArticle, requestAi, type AiConfig } from './ai-policy';

const fail = (status: number, code: string, message: string) => ({ ok: false as const, status, code, message });
const inputSchema = z.object({ revision: z.string().regex(/^[a-f0-9]{64}$/) });
const questionSchema = inputSchema.extend({ question: z.string().trim().min(1).max(600), request_id: z.string().min(16).max(128).regex(/^[a-zA-Z0-9_-]+$/) });
class BudgetExceeded extends Error {}
class RequestAlreadyExists extends Error {}

async function articleFor(actor: MobileActor, articleId: string) {
  if (!actor.lib_profile || actor.is_admin || !actor.capabilities.view_karsa_lib || articleId.length > 128) return null;
  const article = await prisma.libArticle.findFirst({
    where: { id: articleId, status: 'PUBLISHED', prodi_id: actor.lib_profile.prodi_id },
    select: { id: true, title: true, body: true, status: true, prodi_id: true },
  });
  return article && canAccessAiArticle(actor, article) ? article : null;
}

const sources = (value: Prisma.JsonValue | null): number[] => Array.isArray(value)
  ? value.filter((item): item is number => typeof item === 'number' && Number.isInteger(item)) : [];

async function quota(actor: MobileActor, config: AiConfig) {
  const { day, reset_at } = aiDay();
  const [chat, summary] = await Promise.all(['USER_CHAT', 'USER_SUMMARY'].map(scope =>
    prisma.libAiUsageBucket.findUnique({ where: { scope_day: { scope: `${scope}:${actor.id}`, day } } })));
  return { limit: config.chatLimit, remaining: Math.max(0, config.chatLimit - (chat?.used ?? 0)),
    summary_limit: config.summaryLimit, summary_remaining: Math.max(0, config.summaryLimit - (summary?.used ?? 0)), reset_at };
}

async function transaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(run, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034' || attempt >= 2) throw error;
    }
  }
}

async function reserve(tx: Prisma.TransactionClient, actor: MobileActor, config: AiConfig, kind: 'CHAT' | 'SUMMARY') {
  const { day } = aiDay();
  const limits: [string, number][] = [['GLOBAL', config.globalLimit],
    [`USER_${kind}:${actor.id}`, kind === 'CHAT' ? config.chatLimit : config.summaryLimit]];
  for (const [scope, limit] of limits) {
    await tx.$executeRaw`INSERT INTO "LibAiUsageBucket" ("scope", "day", "used")
      VALUES (${scope}, ${day}, 0) ON CONFLICT ("scope", "day") DO NOTHING`;
    const result = await tx.libAiUsageBucket.updateMany({ where: { scope, day, used: { lt: limit } }, data: { used: { increment: 1 } } });
    if (result.count !== 1) throw new BudgetExceeded();
  }
}

export async function getArticleAiState(actor: MobileActor, id: string, expected?: string): Promise<LibResult<unknown>> {
  const article = await articleFor(actor, id);
  if (!article) return fail(404, 'ARTICLE_NOT_FOUND', 'Artikel tidak ditemukan.');
  const config = aiConfig(), revision = aiRevision(article, config);
  if (!config) return { ok: true, data: { enabled: false, revision, summary: null, messages: [], quota: null } };
  if (expected && expected !== revision) return fail(409, 'AI_ARTICLE_CHANGED', 'Artikel diperbarui. Muat ulang artikel sebelum menggunakan AI.');
  const [cache, turns, usage] = await Promise.all([
    prisma.libAiSummary.findUnique({ where: { article_id: id } }),
    prisma.libAiTurn.findMany({ where: { user_id: actor.id, article_id: id, revision, status: 'COMPLETE' }, orderBy: { created_at: 'desc' }, take: 20 }),
    quota(actor, config),
  ]);
  return { ok: true, data: { enabled: true, revision, quota: usage,
    summary: cache?.revision === revision && cache.content ? { body: cache.content, sources: sources(cache.sources) } : null,
    messages: turns.reverse().map(turn => ({ id: turn.id, question: turn.question, answer: turn.answer, sources: sources(turn.sources) })),
  } };
}

export async function summarizeArticle(actor: MobileActor, id: string, input: unknown): Promise<LibResult<unknown>> {
  const article = await articleFor(actor, id);
  if (!article) return fail(404, 'ARTICLE_NOT_FOUND', 'Artikel tidak ditemukan.');
  const config = aiConfig();
  if (!config) return fail(503, 'AI_DISABLED', 'Teman baca masih dalam pengembangan.');
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return fail(400, 'AI_INVALID_INPUT', 'Permintaan ringkasan tidak valid.');
  const revision = aiRevision(article, config);
  if (parsed.data.revision !== revision) return fail(409, 'AI_ARTICLE_CHANGED', 'Artikel diperbarui. Muat ulang artikel.');
  await prisma.libAiSummary.createMany({ data: [{ article_id: id, revision }], skipDuplicates: true });
  const cached = await prisma.libAiSummary.findUnique({ where: { article_id: id } });
  if (cached?.revision === revision && cached.content) return { ok: true, data: { body: cached.content, sources: sources(cached.sources), cached: true, quota: await quota(actor, config) } };
  const token = randomUUID();
  const acquired = await prisma.libAiSummary.updateMany({ where: { article_id: id,
    AND: [{ OR: [{ content: null }, { revision: { not: revision } }] }],
    OR: [{ lease_expires_at: null }, { lease_expires_at: { lte: new Date() } }] },
    data: { revision, content: null, sources: Prisma.DbNull, lease_token: token, lease_expires_at: new Date(Date.now() + 60000) } });
  if (!acquired.count) {
    const ready = await prisma.libAiSummary.findUnique({ where: { article_id: id } });
    if (ready?.revision === revision && ready.content) return { ok: true, data: { body: ready.content, sources: sources(ready.sources), cached: true, quota: await quota(actor, config) } };
    return fail(409, 'AI_SUMMARY_PENDING', 'Ringkasan sedang disiapkan. Coba lagi sebentar.');
  }
  try {
    await transaction(tx => reserve(tx, actor, config, 'SUMMARY'));
    const answer = await requestAi(config, article, null);
    const current = await articleFor(actor, id);
    if (!current || aiRevision(current, config) !== revision) return fail(409, 'AI_ARTICLE_CHANGED', 'Artikel diperbarui. Muat ulang artikel.');
    const saved = await prisma.libAiSummary.updateMany({ where: { article_id: id, lease_token: token, revision },
      data: { content: answer.answer, sources: answer.sources, lease_token: null, lease_expires_at: null } });
    if (!saved.count) return fail(409, 'AI_SUMMARY_PENDING', 'Ringkasan berubah. Coba lagi sebentar.');
    return { ok: true, data: { body: answer.answer, sources: answer.sources, cached: false, quota: await quota(actor, config) } };
  } catch (error) {
    if (error instanceof BudgetExceeded) return fail(429, 'AI_QUOTA_EXCEEDED', 'Batas pemakaian AI hari ini tercapai. Coba kembali besok.');
    return fail(502, 'AI_PROVIDER_UNAVAILABLE', 'Layanan AI belum dapat menjawab. Coba lagi nanti.');
  } finally {
    await prisma.libAiSummary.updateMany({ where: { article_id: id, lease_token: token }, data: { lease_token: null, lease_expires_at: null } });
  }
}

export async function askArticleAi(actor: MobileActor, id: string, input: unknown): Promise<LibResult<unknown>> {
  const article = await articleFor(actor, id);
  if (!article) return fail(404, 'ARTICLE_NOT_FOUND', 'Artikel tidak ditemukan.');
  const config = aiConfig();
  if (!config) return fail(503, 'AI_DISABLED', 'Teman baca masih dalam pengembangan.');
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return fail(400, 'AI_INVALID_INPUT', 'Pertanyaan maksimal 600 karakter.');
  const revision = aiRevision(article, config);
  if (parsed.data.revision !== revision) return fail(409, 'AI_ARTICLE_CHANGED', 'Artikel diperbarui. Muat ulang artikel.');
  const where = { user_id_article_id_request_id: { user_id: actor.id, article_id: id, request_id: parsed.data.request_id } };
  const replay = async () => {
    const existing = await prisma.libAiTurn.findUnique({ where });
    if (!existing) return null;
    if (existing.revision !== revision || existing.question !== parsed.data.question) return fail(409, 'AI_REQUEST_REUSED', 'ID pertanyaan sudah dipakai untuk materi lain.');
    if (existing.status === 'COMPLETE') return { ok: true as const, data: { id: existing.id, question: existing.question, answer: existing.answer, sources: sources(existing.sources), quota: await quota(actor, config) } };
    if (existing.status === 'FAILED' || Date.now() - existing.created_at.getTime() > 60000) return fail(502, 'AI_REQUEST_FAILED', 'Pertanyaan sebelumnya gagal. Kirim kembali untuk mencoba lagi.');
    return fail(409, 'AI_REQUEST_PENDING', 'Pertanyaan ini masih diproses. Coba lagi sebentar.');
  };
  const previous = await replay();
  if (previous) return previous;
  let turn;
  try {
    turn = await transaction(async tx => {
      const idOfTurn = randomUUID();
      const created = await tx.libAiTurn.createMany({ data: [{ id: idOfTurn, user_id: actor.id, article_id: id, revision,
        request_id: parsed.data.request_id, question: parsed.data.question }], skipDuplicates: true });
      if (!created.count) throw new RequestAlreadyExists();
      await reserve(tx, actor, config, 'CHAT');
      return { id: idOfTurn, question: parsed.data.question };
    });
  } catch (error) {
    const duplicate = await replay();
    if (duplicate) return duplicate;
    if (error instanceof BudgetExceeded) return fail(429, 'AI_QUOTA_EXCEEDED', 'Batas pemakaian AI hari ini tercapai. Coba kembali besok.');
    throw error;
  }
  try {
    const history = await prisma.libAiTurn.findMany({ where: { user_id: actor.id, article_id: id, revision, status: 'COMPLETE' }, orderBy: { created_at: 'desc' }, take: 4 });
    const answer = await requestAi(config, article, parsed.data.question, history.reverse());
    const current = await articleFor(actor, id);
    if (!current || aiRevision(current, config) !== revision) {
      await prisma.libAiTurn.update({ where: { id: turn.id }, data: { status: 'FAILED' } });
      return fail(409, 'AI_ARTICLE_CHANGED', 'Artikel diperbarui. Muat ulang artikel.');
    }
    await prisma.libAiTurn.update({ where: { id: turn.id }, data: { answer: answer.answer, sources: answer.sources, status: 'COMPLETE' } });
    return { ok: true, status: 201, data: { id: turn.id, question: turn.question, answer: answer.answer, sources: answer.sources, quota: await quota(actor, config) } };
  } catch {
    const stored = await prisma.libAiTurn.findUnique({ where: { id: turn.id }, select: { status: true } });
    if (stored?.status === 'COMPLETE') return fail(503, 'AI_RESULT_UNAVAILABLE', 'Jawaban sudah disimpan. Coba lagi untuk memuatnya.');
    await prisma.libAiTurn.updateMany({ where: { id: turn.id, status: 'PENDING' }, data: { status: 'FAILED' } });
    return fail(502, 'AI_REQUEST_FAILED', 'Layanan AI belum dapat menjawab. Coba lagi nanti.');
  }
}
