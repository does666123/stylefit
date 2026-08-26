import { onRequest } from '../edge-functions/api/feedback.js';

const records = new Map();
const env = { STYLEFIT_FEEDBACK_KV: {
  get: async (key) => records.get(key) || null,
  put: async (key, value) => records.set(key, value),
} };
const payload = {
  feedbackId: 'feedback-test-0001', userId: 'user-test-0001', sessionId: 'session-test-0001',
  recommendationId: 'recommendation-test', outfitId: 'outfit-test', mode: 'advanced', scene: '约会',
  style: 'Clean Fit', budget: 300, action: 'like', reason: null, createdAt: new Date().toISOString(),
  profile: { gender: 'male', age: 25, height: 173, weight: 55, bodyType: '偏瘦', skinTone: '自然' },
  products: [{ itemId: '123', category: '上装', title: '测试衬衫', price: 99, shop: '测试店铺', styleScore: 84 }],
  outfitScores: { outfitMatchScore: 88, styleScore: 86, colorScore: 82, bodyFitScore: 85, sceneScore: 90, qualityScore: 80 },
};
const request = (body) => new Request('https://stylefit.test/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const first = await onRequest({ request: request(payload), env });
const duplicate = await onRequest({ request: request(payload), env });
const invalid = await onRequest({ request: request({ action: 'like' }), env });
if (first.status !== 201 || duplicate.status !== 200 || invalid.status !== 400 || records.size !== 1) {
  throw new Error('Feedback endpoint checks failed.');
}
console.log('Feedback endpoint checks passed.');
