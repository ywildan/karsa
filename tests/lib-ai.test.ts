import assert from 'node:assert/strict';
import test from 'node:test';
import { aiConfig, aiDay, aiRevision, articleParagraphs, canAccessAiArticle, parseAiAnswer, requestAi, AiProviderError } from '../lib/karsa-lib/ai-policy';
import { readAiJson } from '../lib/karsa-lib/ai-http';

const env = { AI_ENABLED: 'true', AI_API_KEY: 'unit-test-not-a-real-key', AI_MODEL: 'test-model', AI_BASE_URL: 'https://ai.example.com/v1' };
const config = aiConfig(env)!;
const article = { title: 'Jurnal umum', body: 'Catatan transaksi.\n\nDebit dan kredit.' };

test('feature is off unless explicitly enabled and fully configured', () => {
  assert.equal(aiConfig({ ...env, AI_ENABLED: 'false' }), null);
  assert.equal(aiConfig({ ...env, AI_MODEL: '' }), null);
  assert.equal(aiConfig({ ...env, AI_API_KEY: '' }), null);
  for (const AI_BASE_URL of ['http://ai.example.com', 'https://user:password@ai.example.com', 'https://127.0.0.1/v1', 'https://localhost/v1', 'https://ai.example.com/?key=secret']) {
    assert.equal(aiConfig({ ...env, AI_BASE_URL }), null);
  }
  assert.equal(aiConfig({ ...env, AI_GLOBAL_DAILY_LIMIT: '0' }), null);
});

test('cache revisions change with body, title, model or provider', () => {
  const revision = aiRevision(article, config);
  for (const changed of [{ ...article, body: 'Isi baru' }, { ...article, title: 'Judul baru' }]) {
    assert.notEqual(aiRevision(changed, config), revision);
  }
  assert.notEqual(aiRevision(article, { ...config, model: 'other' }), revision);
  assert.notEqual(aiRevision(article, { ...config, baseUrl: 'https://other.example.com/v1' }), revision);
  assert.deepEqual(articleParagraphs(' A \n\n\n B '), ['A', 'B']);
});

test('admin, unconfigured profile, other prodi and archived articles cannot use AI', () => {
  const actor = { is_admin: false, capabilities: { view_karsa_lib: true }, lib_profile: { prodi_id: 'a' } };
  const resource = { prodi_id: 'a', status: 'PUBLISHED' };
  assert.equal(canAccessAiArticle(actor, resource), true);
  assert.equal(canAccessAiArticle({ ...actor, is_admin: true }, resource), false);
  assert.equal(canAccessAiArticle({ ...actor, lib_profile: null }, resource), false);
  assert.equal(canAccessAiArticle(actor, { ...resource, prodi_id: 'b' }), false);
  assert.equal(canAccessAiArticle(actor, { ...resource, status: 'ARCHIVED' }), false);
});

test('daily quota boundary follows Jakarta midnight', () => {
  assert.deepEqual(aiDay(new Date('2026-10-06T16:59:59Z')), { day: '2026-10-06', reset_at: '2026-10-06T17:00:00.000Z' });
  assert.equal(aiDay(new Date('2026-10-06T17:00:00Z')).day, '2026-10-07');
});

test('unreadable answers and invented paragraph sources are rejected', () => {
  assert.deepEqual(parseAiAnswer('```json\n{"answer":"Jawaban","sources":[1,1,2]}\n```', 2), { answer: 'Jawaban', sources: [1, 2] });
  for (const content of ['not JSON', '{"answer":"","sources":[]}', '{"answer":"x","sources":[999]}']) {
    assert.throws(() => parseAiAnswer(content, 2), AiProviderError);
  }
});

test('compatible endpoint receives server key, bounded request and article context only', async () => {
  let calls = 0;
  const mockFetch: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://ai.example.com/v1/chat/completions');
    assert.equal(options?.redirect, 'error');
    assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer unit-test-not-a-real-key');
    const payload = JSON.parse(String(options?.body));
    assert.equal(payload.max_completion_tokens, 900);
    assert.equal(payload.stream, false);
    assert.ok(!('tools' in payload));
    assert.equal(payload.messages.length, 3);
    assert.equal(JSON.parse(payload.messages[1].content).paragraphs[1].number, 2);
    assert.ok(!String(options?.body).includes(env.AI_API_KEY));
    return Response.json({ choices: [{ message: { content: '{"answer":"Jawaban","sources":[2]}' } }] });
  };
  assert.deepEqual(await requestAi(config, article, 'Apa itu debit?', [], mockFetch), { answer: 'Jawaban', sources: [2] });
  assert.equal(calls, 1);
});

test('provider failures are sanitized and never automatically retried', async () => {
  let calls = 0;
  await assert.rejects(() => requestAi(config, article, null, [], async () => {
    calls++; return new Response('secret diagnostic', { status: 401 });
  }), { message: 'AI_PROVIDER_UNAVAILABLE' });
  assert.equal(calls, 1);
});

test('AI JSON is bounded before parsing', async () => {
  const request = (body: string) => new Request('https://karsa.example.com/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  });
  assert.deepEqual(await readAiJson(request('{"question":"Materi?"}')), { question: 'Materi?' });
  assert.equal(await readAiJson(request('not-json')), null);
  assert.equal(await readAiJson(request(JSON.stringify({ question: 'x'.repeat(9000) }))), null);
});
