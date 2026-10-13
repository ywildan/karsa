import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aiSuccessRate,
  estimateAiCostNanoUsd,
  formatNanoUsd,
  parseAiPriceToNano,
} from '../lib/karsa-lib/ai-usage';

test('parseAiPriceToNano converts USD prices exactly', () => {
  assert.equal(parseAiPriceToNano('0.15'), BigInt(150000000));
  assert.equal(parseAiPriceToNano('0.50'), BigInt(500000000));
  assert.equal(parseAiPriceToNano('0.000255'), BigInt(255000));
  assert.equal(parseAiPriceToNano('1'), BigInt(1000000000));
  assert.equal(parseAiPriceToNano(' 2.5 '), BigInt(2500000000));
});

test('parseAiPriceToNano rejects invalid prices', () => {
  for (const value of ['', 'abc', '-1', '1,5', '0.1234567891', '1.2.3']) {
    assert.equal(parseAiPriceToNano(value), null, value);
  }
  assert.equal(parseAiPriceToNano(null), null);
  assert.equal(parseAiPriceToNano(undefined), null);
});

test('estimateAiCostNanoUsd prices one chat request', () => {
  // 4.000 token input @ $0,15/1jt + 400 token output @ $0,50/1jt = $0,0008.
  const cost = estimateAiCostNanoUsd({
    promptTokens: 4000,
    completionTokens: 400,
    inputPriceNanoPerMillion: parseAiPriceToNano('0.15'),
    outputPriceNanoPerMillion: parseAiPriceToNano('0.50'),
  });
  assert.equal(cost, BigInt(800000));
  assert.equal(formatNanoUsd(cost), '$0.0008');
});

test('estimateAiCostNanoUsd is null without tokens or prices', () => {
  const price = parseAiPriceToNano('0.15');
  assert.equal(estimateAiCostNanoUsd({
    promptTokens: null, completionTokens: 10,
    inputPriceNanoPerMillion: price, outputPriceNanoPerMillion: price,
  }), null);
  assert.equal(estimateAiCostNanoUsd({
    promptTokens: 10, completionTokens: 10,
    inputPriceNanoPerMillion: null, outputPriceNanoPerMillion: price,
  }), null);
});

test('formatNanoUsd keeps tiny gateway costs visible', () => {
  assert.equal(formatNanoUsd(BigInt(0)), '$0');
  assert.equal(formatNanoUsd(BigInt(1500000000)), '$1.5');
  assert.equal(formatNanoUsd(BigInt(1234567890)), '$1.2345');
  assert.equal(formatNanoUsd(BigInt(500)), '<$0.000001');
  assert.equal(formatNanoUsd(null), '—');
});

test('aiSuccessRate handles empty ranges', () => {
  assert.equal(aiSuccessRate(9, 10), 90);
  assert.equal(aiSuccessRate(1, 3), 33.3);
  assert.equal(aiSuccessRate(0, 0), 0);
});
