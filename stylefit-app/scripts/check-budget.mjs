import assert from 'node:assert/strict';
import { onRequest } from '../edge-functions/api/recommend.js';

const candidates = [
  ['top-a', 80], ['bottom-a', 90],
  ['top-b', 70], ['bottom-b', 80], ['shoes-b', 90],
  ['top-c', 60], ['bottom-c', 70], ['shoes-c', 80],
  ['top-over', 160], ['bottom-over', 150],
].map(([id, price]) => ({ id, name: id, category: 'test', price }));
const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
const validOutfits = [
  { name: 'valid-a', stylingTip: 'tip', items: [{ id: 'top-a', reason: 'x' }, { id: 'bottom-a', reason: 'x' }] },
  { name: 'valid-b', stylingTip: 'tip', items: [{ id: 'top-b', reason: 'x' }, { id: 'bottom-b', reason: 'x' }, { id: 'shoes-b', reason: 'x' }] },
  { name: 'valid-c', stylingTip: 'tip', items: [{ id: 'top-c', reason: 'x' }, { id: 'bottom-c', reason: 'x' }, { id: 'shoes-c', reason: 'x' }] },
];
const mixedOutfits = [validOutfits[0], {
  name: 'over-budget',
  stylingTip: 'tip',
  items: [{ id: 'top-over', reason: 'x' }, { id: 'bottom-over', reason: 'x' }],
}, validOutfits[2]];

function assertIds(outfits) {
  const ids = outfits.flatMap((outfit) => outfit.items.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => candidatesById.has(id)));
}

function totalPrice(outfit) {
  return outfit.items.reduce((total, item) => total + candidatesById.get(item.id).price, 0);
}

function providerResponse(outfits) {
  return new Response(JSON.stringify({
    choices: [{
      finish_reason: 'stop',
      message: { content: JSON.stringify({ summary: 'budget check', outfits }) },
    }],
  }), { status: 200 });
}

async function requestRecommendation(occasion) {
  const response = await onRequest({
    request: new Request('http://localhost/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: { budget: 300, occasion }, candidates }),
    }),
    env: { QIANFAN_API_KEY: 'test' },
  });
  return response.json();
}

const originalFetch = globalThis.fetch;

try {
  assertIds(validOutfits);
  globalThis.fetch = async () => providerResponse(validOutfits);
  const success = await requestRecommendation('commute');
  assert.equal(success.status, 'ok');
  assert.equal(success.recommendation.outfits.length, 3);
  assertIds(success.recommendation.outfits);
  success.recommendation.outfits.forEach((outfit) => assert.ok(totalPrice(outfit) <= 300));
  console.log('case A passed: three outfits stay within budget');

  assertIds(mixedOutfits);
  globalThis.fetch = async () => providerResponse(mixedOutfits);
  const rejected = await requestRecommendation('party');
  assert.equal(rejected.status, 'fallback');
  assert.equal(rejected.reason, 'AI response could not be validated');
  console.log('case B passed: one over-budget outfit rejects the full recommendation');
} finally {
  globalThis.fetch = originalFetch;
}
