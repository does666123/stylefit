import assert from 'node:assert/strict';
import { onRequest } from '../edge-functions/api/recommend.js';

const candidates = [
  ['top-over', 199], ['bottom-over', 199], ['top-basic', 79], ['bottom-basic', 79], ['shoes-basic', 79],
].map(([id, price]) => ({ id, name: id, category: 'test', price }));
const responseBody = {
  choices: [{ message: { content: JSON.stringify({
    summary: 'budget check',
    outfits: [
      { name: 'over', stylingTip: 'over', items: [{ id: 'top-over', reason: 'x' }, { id: 'bottom-over', reason: 'x' }] },
      { name: 'within', stylingTip: 'within', items: [{ id: 'top-basic', reason: 'x' }, { id: 'bottom-basic', reason: 'x' }, { id: 'shoes-basic', reason: 'x' }] },
    ],
  }) } }],
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify(responseBody), { status: 200 });

try {
  const response = await onRequest({
    request: new Request('http://localhost/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: { budget: 300 }, candidates }),
    }),
    env: { ZHIPU_API_KEY: 'test' },
  });
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.recommendation.outfits.length, 1);
  assert.deepEqual(body.recommendation.outfits[0].items.map((item) => item.id), ['top-basic', 'bottom-basic', 'shoes-basic']);
  console.log('budget guard passed');
} finally {
  globalThis.fetch = originalFetch;
}
