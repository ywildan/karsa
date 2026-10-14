import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AI_SETTING_GLOBAL_DAILY_LIMIT,
  AI_SETTING_WEBSEARCH_GLOBAL_LIMIT,
  isValidAiLimitOverride,
  normalizeAiTier,
  parseAiSettingLimit,
  resolveAiGlobalLimits,
  resolveAiUserLimits,
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

test('per-user overrides win over tier and env defaults', () => {
  const resolved = resolveAiUserLimits({
    tier: 'free',
    overrides: { chat: 50, summary: null, webSearch: 10 },
    config: CONFIG,
  });
  assert.deepEqual(resolved, {
    chatLimit: 50,
    summaryLimit: 3,
    webSearchLimit: 10,
    webSearchPeriod: 'month',
  });
});

test('tier decides web search limit and period without overrides', () => {
  const none = { chat: null, summary: null, webSearch: null };
  assert.deepEqual(resolveAiUserLimits({ tier: 'free', overrides: none, config: CONFIG }), {
    chatLimit: 5,
    summaryLimit: 3,
    webSearchLimit: 3,
    webSearchPeriod: 'month',
  });
  assert.deepEqual(resolveAiUserLimits({ tier: 'premium', overrides: none, config: CONFIG }), {
    chatLimit: 5,
    summaryLimit: 3,
    webSearchLimit: 3,
    webSearchPeriod: 'day',
  });
  assert.deepEqual(resolveAiUserLimits({ tier: 'plus', overrides: none, config: CONFIG }), {
    chatLimit: 5,
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
    overrides: { chat: 0, summary: 0, webSearch: 0 },
    config: CONFIG,
  });
  assert.deepEqual(resolved, {
    chatLimit: 0,
    summaryLimit: 0,
    webSearchLimit: 0,
    webSearchPeriod: 'day',
  });
});
