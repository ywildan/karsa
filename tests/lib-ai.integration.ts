import assert from 'node:assert/strict';
import test, { before, beforeEach, after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { mobileUserPayload, type MobileActor } from '../lib/mobile/auth';
import { aiConfig, aiRevision } from '../lib/karsa-lib/ai-policy';
import { getArticleAiState, summarizeArticle, askArticleAi } from '../lib/karsa-lib/ai-service';

// Dilarang menjalankan pengujian ini terhadap database produksi.
const database = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (process.env.AI_TEST_DB !== 'true' || !['localhost', '127.0.0.1'].includes(database.hostname) ||
    (database.pathname !== '/karsa_ai_test' && !(process.env.CI === 'true' && database.pathname === '/karsa'))) {
  throw new Error('AI integration tests require an explicitly isolated local test database.');
}
const prefix = `ai_${randomUUID()}`;
let actor: MobileActor, peer: MobileActor, other: MobileActor;
let articleId = '', programId = '', otherProgramId = '', revision = '', calls = 0;
const originalFetch = globalThis.fetch;
const oldEnv = { ...process.env };
const question = (request_id = randomUUID()) => ({ revision, question: 'Apa inti artikel?', request_id });
const data = (result: Awaited<ReturnType<typeof getArticleAiState>>) => {
  if (!result.ok) throw new Error(result.code);
  return result.data as { enabled: boolean; messages: unknown[]; quota: { token_limit: number; token_used: number; token_remaining: number }; answer?: string };
};

before(async () => {
  process.env.AI_ENABLED = 'true'; process.env.AI_API_KEY = 'test-only'; process.env.AI_MODEL = 'test-only';
  process.env.AI_BASE_URL = 'https://ai.example.com/v1';
  process.env.AI_GLOBAL_DAILY_LIMIT = '100';
  programId = (await prisma.prodi.create({ data: { name: `${prefix}_prodi` } })).id;
  otherProgramId = (await prisma.prodi.create({ data: { name: `${prefix}_other` } })).id;
  const create = async (name: string, prodi_id: string): Promise<MobileActor> => {
    const user = await prisma.user.create({ data: { name, email: `${prefix}_${name}@students.untidar.ac.id`,
      libProfile: { create: { display_name: name, faculty: 'Test', prodi_id } } } });
    const payload = await mobileUserPayload(user.id);
    assert.ok(payload); return { ...payload, session_id: 'test-session' };
  };
  actor = await create('one', programId); peer = await create('two', programId); other = await create('three', otherProgramId);
  const article = await prisma.libArticle.create({ data: { author_id: actor.id, prodi_id: programId,
    title: 'Jurnal umum', body: 'Catatan transaksi.\n\nDebit dan kredit.', status: 'PUBLISHED' } });
  articleId = article.id; revision = aiRevision(article, aiConfig());
});

beforeEach(async () => {
  process.env.AI_ENABLED = 'true'; process.env.AI_GLOBAL_DAILY_LIMIT = '100'; calls = 0;
  await prisma.libAiTurn.deleteMany({ where: { article_id: articleId } });
  await prisma.libAiSummary.deleteMany({ where: { article_id: articleId } });
  await prisma.libAiUsageBucket.deleteMany(); // Database test khusus, guard di atas wajib.
  await prisma.libArticle.update({ where: { id: articleId }, data: { status: 'PUBLISHED', body: 'Catatan transaksi.\n\nDebit dan kredit.' } });
  globalThis.fetch = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 30));
    return Response.json({ choices: [{ message: { content: '{"answer":"Jawaban dari artikel","sources":[1]}' } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 } }); };
});

after(async () => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) if (key.startsWith('AI_')) delete process.env[key];
  Object.assign(process.env, oldEnv);
  if (articleId) await prisma.libArticle.delete({ where: { id: articleId } });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.prodi.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.$disconnect();
});

test('disabled mode and cross-prodi requests never call the provider', async () => {
  process.env.AI_ENABLED = 'false';
  assert.equal(data(await getArticleAiState(actor, articleId)).enabled, false);
  assert.equal((await askArticleAi(actor, articleId, question())).ok, false);
  process.env.AI_ENABLED = 'true';
  const denied = await askArticleAi(other, articleId, question());
  assert.ok(!denied.ok && denied.status === 404);
  assert.equal(calls, 0);
});

test('summary generation has one lease and cache is shared without charging readers', async () => {
  const responses = await Promise.all([summarizeArticle(actor, articleId, { revision }), summarizeArticle(peer, articleId, { revision })]);
  assert.ok(responses.some(result => result.ok));
  assert.equal(calls, 1);
  assert.equal((await summarizeArticle(peer, articleId, { revision })).ok, true);
  assert.equal(calls, 1);
  const chat = data(await getArticleAiState(peer, articleId));
  // Ringkasan tidak memotong jatah token siapa pun (cache bersama).
  assert.equal(chat.quota.token_used, 0);
  assert.equal(chat.quota.token_remaining, 400_000);
});

test('same question retry does not call AI or consume quota again; histories stay private', async () => {
  const input = question();
  const results = await Promise.all([askArticleAi(actor, articleId, input), askArticleAi(actor, articleId, input)]);
  assert.ok(results.some(result => result.ok));
  assert.equal((await askArticleAi(actor, articleId, input)).ok, true);
  assert.equal(calls, 1);
  // Satu chat selesai memakai tepat 150 token dari mock provider (100+50).
  assert.equal(data(await getArticleAiState(actor, articleId)).quota.token_used, 150);
  assert.equal(data(await getArticleAiState(actor, articleId)).quota.token_remaining, 399_850);
  assert.equal(data(await getArticleAiState(peer, articleId)).messages.length, 0);
  const reused = await askArticleAi(actor, articleId, { ...input, question: 'Pertanyaan berbeda' });
  assert.ok(!reused.ok && reused.code === 'AI_REQUEST_REUSED');
});

test('global daily limit is enforced atomically for simultaneous callers', async () => {
  process.env.AI_GLOBAL_DAILY_LIMIT = '2';
  const results = await Promise.all([askArticleAi(actor, articleId, question()), askArticleAi(peer, articleId, question()), askArticleAi(actor, articleId, question())]);
  assert.equal(calls, 2);
  assert.ok(results.some(result => !result.ok && result.status === 429));
});

test('token quota rejection does not consume the global counter', async () => {
  await prisma.user.update({ where: { id: actor.id }, data: { ai_token_limit_override: 100 } });
  const payload = await mobileUserPayload(actor.id);
  assert.ok(payload);
  const limitedActor: MobileActor = { ...payload, session_id: 'test-session' };
  try {
    // Chat pertama lolos (jatah 100 belum terpakai) dan memakai 150 token.
    assert.equal((await askArticleAi(limitedActor, articleId, question())).ok, true);
    const rejected = await askArticleAi(limitedActor, articleId, question());
    assert.ok(!rejected.ok && rejected.status === 429 && rejected.code === 'AI_TOKEN_QUOTA_EXCEEDED');
    assert.equal(calls, 1);
    assert.equal(data(await getArticleAiState(limitedActor, articleId)).quota.token_remaining, 0);
    // Penolakan token terjadi sebelum reservasi: counter global tidak ikut naik.
    assert.equal((await prisma.libAiUsageBucket.findFirstOrThrow({ where: { scope: 'GLOBAL' } })).used, 1);
  } finally {
    await prisma.user.update({ where: { id: actor.id }, data: { ai_token_limit_override: null } });
  }
});

test('uncached summary quota is bounded across article edits', async () => {
  for (let index = 0; index < 4; index++) {
    const changed = await prisma.libArticle.update({ where: { id: articleId }, data: { body: `Materi versi ${index}.` } });
    const result = await summarizeArticle(actor, articleId, { revision: aiRevision(changed, aiConfig()) });
    if (index < 3) assert.equal(result.ok, true);
    else assert.ok(!result.ok && result.status === 429);
  }
  assert.equal(calls, 3);
  assert.equal((await prisma.libAiUsageBucket.findFirstOrThrow({ where: { scope: 'GLOBAL' } })).used, 3);
});

test('editing and archiving invalidate AI access and previous revision context', async () => {
  await askArticleAi(actor, articleId, question());
  await prisma.libArticle.update({ where: { id: articleId }, data: { body: 'Materi yang diperbarui.' } });
  const stale = await askArticleAi(actor, articleId, question());
  assert.ok(!stale.ok && stale.code === 'AI_ARTICLE_CHANGED');
  assert.equal(data(await getArticleAiState(actor, articleId)).messages.length, 0);
  await prisma.libArticle.update({ where: { id: articleId }, data: { status: 'ARCHIVED' } });
  const archived = await getArticleAiState(actor, articleId);
  assert.ok(!archived.ok && archived.status === 404);
  assert.equal(calls, 1);
});

test('provider failure is retry-safe and does not leave a blocked summary lease', async () => {
  globalThis.fetch = async () => { calls++; return new Response('provider private error', { status: 500 }); };
  const failed = await summarizeArticle(actor, articleId, { revision });
  assert.ok(!failed.ok && failed.code === 'AI_PROVIDER_UNAVAILABLE');
  assert.equal((await prisma.libAiSummary.findUniqueOrThrow({ where: { article_id: articleId } })).lease_token, null);
  const input = question(); await askArticleAi(actor, articleId, input); await askArticleAi(actor, articleId, input);
  assert.equal(calls, 2);
});
