import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AI_SETTING_BASE_URL,
  AI_SETTING_GLOBAL_DAILY_LIMIT,
  AI_SETTING_TOKEN_FREE_MONTHLY,
  AI_SETTING_TOKEN_PLUS_MONTHLY,
  AI_SETTING_TOKEN_PREMIUM_MONTHLY,
  AI_SETTING_WEBSEARCH_GLOBAL_LIMIT,
  AI_TOKEN_ALLOTMENT_DEFAULTS,
  isValidAiLimitOverride,
  isValidAiTokenOverride,
  normalizeAiTier,
  parseAiSettingLimit,
  parseAiSettingTokenAllotment,
  resolveAiBaseUrl,
  resolveAiGlobalLimits,
  resolveAiTokenLimit,
  resolveAiUserLimits,
  tokenAllotmentFor,
} from '../lib/karsa-lib/ai-settings';

const CONFIG = {
  chatLimit: 5,
  summaryLimit: 3,
  globalLimit: 100,
  webSearchFreeLimit: 3,
  webSearchPremiumLimit: 3,
  webSearchPlusLimit: 5,
  webSearchGlobalLimit: 100,
};

test('normalizeAiTier falls back to free for unknown values', () => {
  assert.equal(normalizeAiTier('premium'), 'premium');
  assert.equal(normalizeAiTier('plus'), 'plus');
  assert.equal(normalizeAiTier('gold'), 'free');
  assert.equal(normalizeAiTier(undefined), 'free');
  assert.equal(normalizeAiTier(null), 'free');
});

test('parseAiSettingLimit accepts only integers in range', () => {
  assert.equal(parseAiSettingLimit('250'), 250);
  assert.equal(parseAiSettingLimit(' 1200 '), 1200);
  assert.equal(parseAiSettingLimit('0'), null);
  assert.equal(parseAiSettingLimit('-3'), null);
  assert.equal(parseAiSettingLimit('10001'), null);
  assert.equal(parseAiSettingLimit('abc'), null);
  assert.equal(parseAiSettingLimit(''), null);
  assert.equal(parseAiSettingLimit(null), null);
  assert.equal(parseAiSettingLimit(undefined), null);
});

test('dashboard settings win over env global limits', () => {
  const resolved = resolveAiGlobalLimits(
    {
      [AI_SETTING_GLOBAL_DAILY_LIMIT]: '1200',
      [AI_SETTING_WEBSEARCH_GLOBAL_LIMIT]: '300',
    },
    CONFIG,
  );
  assert.deepEqual(resolved, { globalLimit: 1200, webSearchGlobalLimit: 300 });

  const envOnly = resolveAiGlobalLimits({}, CONFIG);
  assert.deepEqual(envOnly, { globalLimit: 100, webSearchGlobalLimit: 100 });

  const broken = resolveAiGlobalLimits(
    { [AI_SETTING_GLOBAL_DAILY_LIMIT]: 'rusak' },
    CONFIG,
  );
  assert.equal(broken.globalLimit, 100);
});

test('dashboard base URL wins over env only when valid', () => {
  const envConfig = { baseUrl: 'https://api.openai.com/v1' };
  assert.deepEqual(
    resolveAiBaseUrl({ [AI_SETTING_BASE_URL]: 'https://tunnel.trycloudflare.com/' }, envConfig),
    { baseUrl: 'https://tunnel.trycloudflare.com', source: 'dashboard' },
  );
  assert.deepEqual(resolveAiBaseUrl({}, envConfig), {
    baseUrl: 'https://api.openai.com/v1',
    source: 'env',
  });
  // Nilai dashboard yang rusak diabaikan — env tetap jalan, AI tidak mati.
  for (const bad of ['http://tunnel.trycloudflare.com', 'https://127.0.0.1/v1', 'https://localhost', 'asal-ketik']) {
    assert.deepEqual(
      resolveAiBaseUrl({ [AI_SETTING_BASE_URL]: bad }, envConfig),
      { baseUrl: 'https://api.openai.com/v1', source: 'env' },
      bad,
    );
  }
});

test('per-user overrides win over tier and env defaults', () => {
  const resolved = resolveAiUserLimits({
    tier: 'free',
    overrides: { token: null, summary: null, webSearch: 10 },
    config: CONFIG,
  });
  assert.deepEqual(resolved, {
    summaryLimit: 3,
    webSearchLimit: 10,
    webSearchPeriod: 'month',
  });
});

test('tier decides web search limit and period without overrides', () => {
  const none = { token: null, summary: null, webSearch: null };
  assert.deepEqual(resolveAiUserLimits({ tier: 'free', overrides: none, config: CONFIG }), {
    summaryLimit: 3,
    webSearchLimit: 3,
    webSearchPeriod: 'month',
  });
  assert.deepEqual(resolveAiUserLimits({ tier: 'premium', overrides: none, config: CONFIG }), {
    summaryLimit: 3,
    webSearchLimit: 3,
    webSearchPeriod: 'day',
  });
  assert.deepEqual(resolveAiUserLimits({ tier: 'plus', overrides: none, config: CONFIG }), {
    summaryLimit: 3,
    webSearchLimit: 5,
    webSearchPeriod: 'day',
  });
});

test('override of 0 is valid and blocks the feature for that user', () => {
  assert.equal(isValidAiLimitOverride(0), true);
  assert.equal(isValidAiLimitOverride(null), true);
  assert.equal(isValidAiLimitOverride(1000), true);
  assert.equal(isValidAiLimitOverride(1001), false);
  assert.equal(isValidAiLimitOverride(-1), false);
  assert.equal(isValidAiLimitOverride(2.5), false);
  assert.equal(isValidAiLimitOverride('50'), false);
  const resolved = resolveAiUserLimits({
    tier: 'plus',
    overrides: { token: null, summary: 0, webSearch: 0 },
    config: CONFIG,
  });
  assert.deepEqual(resolved, {
    summaryLimit: 0,
    webSearchLimit: 0,
    webSearchPeriod: 'day',
  });
});

test('token allotments default to owner-approved tier values', () => {
  assert.deepEqual(AI_TOKEN_ALLOTMENT_DEFAULTS, {
    free: 400_000,
    premium: 3_000_000,
    plus: 10_000_000,
  });
  assert.deepEqual(tokenAllotmentFor('free', {}), { value: 400_000, source: 'default' });
  assert.deepEqual(tokenAllotmentFor('premium', {}), { value: 3_000_000, source: 'default' });
  assert.deepEqual(tokenAllotmentFor('plus', {}), { value: 10_000_000, source: 'default' });
  assert.deepEqual(tokenAllotmentFor('gold', {}), { value: 400_000, source: 'default' });
});

test('dashboard token allotments win over defaults; broken values ignored', () => {
  const settings = {
    [AI_SETTING_TOKEN_FREE_MONTHLY]: '500000',
    [AI_SETTING_TOKEN_PREMIUM_MONTHLY]: 'rusak',
    [AI_SETTING_TOKEN_PLUS_MONTHLY]: '0',
  };
  assert.deepEqual(tokenAllotmentFor('free', settings), { value: 500_000, source: 'dashboard' });
  assert.deepEqual(tokenAllotmentFor('premium', settings), { value: 3_000_000, source: 'default' });
  // 0 sah dari dashboard: tier itu memang tidak diberi jatah.
  assert.deepEqual(tokenAllotmentFor('plus', settings), { value: 0, source: 'dashboard' });
  assert.equal(parseAiSettingTokenAllotment('100000001'), null);
  assert.equal(parseAiSettingTokenAllotment('-1'), null);
  assert.equal(parseAiSettingTokenAllotment('1.5'), null);
});

test('per-user token override wins over tier allotment', () => {
  assert.equal(resolveAiTokenLimit({ tier: 'free', tokenOverride: null, settings: {} }), 400_000);
  assert.equal(resolveAiTokenLimit({ tier: 'free', tokenOverride: 750_000, settings: {} }), 750_000);
  assert.equal(resolveAiTokenLimit({ tier: 'plus', tokenOverride: 0, settings: {} }), 0);
  assert.equal(
    resolveAiTokenLimit({
      tier: 'premium',
      tokenOverride: null,
      settings: { [AI_SETTING_TOKEN_PREMIUM_MONTHLY]: '4000000' },
    }),
    4_000_000,
  );
  assert.equal(isValidAiTokenOverride(100_000_000), true);
  assert.equal(isValidAiTokenOverride(100_000_001), false);
  assert.equal(isValidAiTokenOverride(-1), false);
});
