const ACTIONS = new Set(['like', 'dislike', 'favorite', 'unfavorite', 'purchase_click', 'regenerate', 'switch_mode', 'recommendation_view']);
const REASONS = new Set(['too_basic', 'too_mature', 'too_young', 'wrong_style', 'bad_item', 'bad_color', 'too_expensive', 'bad_body_fit']);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function text(value, length = 160) {
  return typeof value === 'string' ? value.trim().slice(0, length) : '';
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitize(input) {
  const feedbackId = text(input?.feedbackId, 128);
  const action = text(input?.action, 32);
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(feedbackId) || !ACTIONS.has(action)) return null;

  const profile = input?.profile || {};
  const scores = input?.outfitScores;
  return {
    feedbackId,
    userId: text(input?.userId, 128),
    sessionId: text(input?.sessionId, 128),
    recommendationId: text(input?.recommendationId, 160),
    outfitId: text(input?.outfitId, 160) || null,
    mode: text(input?.mode, 24) || null,
    scene: text(input?.scene, 48) || null,
    style: text(input?.style, 80) || null,
    budget: number(input?.budget),
    profile: {
      gender: text(profile.gender, 16) || null,
      age: number(profile.age),
      height: number(profile.height),
      weight: number(profile.weight),
      bodyType: text(profile.bodyType, 32) || null,
      skinTone: text(profile.skinTone, 32) || null,
    },
    products: Array.isArray(input?.products) ? input.products.slice(0, 6).map((product) => ({
      itemId: text(product?.itemId, 96),
      category: text(product?.category, 32),
      title: text(product?.title, 160),
      price: number(product?.price),
      shop: text(product?.shop, 96),
      styleScore: number(product?.styleScore),
    })).filter((product) => product.itemId && product.title) : [],
    outfitScores: scores && typeof scores === 'object' ? {
      outfitMatchScore: number(scores.outfitMatchScore),
      styleScore: number(scores.styleScore),
      colorScore: number(scores.colorScore),
      bodyFitScore: number(scores.bodyFitScore),
      sceneScore: number(scores.sceneScore),
      qualityScore: number(scores.qualityScore),
    } : null,
    action,
    reason: REASONS.has(text(input?.reason, 32)) ? text(input.reason, 32) : null,
    createdAt: text(input?.createdAt, 48) || new Date().toISOString(),
  };
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: '反馈数据格式无效' }, 400);
  }

  const feedback = sanitize(input);
  if (!feedback) return json({ error: '反馈数据格式无效' }, 400);

  const storage = env?.STYLEFIT_FEEDBACK_KV;
  if (!storage || typeof storage.get !== 'function' || typeof storage.put !== 'function') {
    return json({ error: '反馈服务暂未配置' }, 503);
  }

  const key = 'feedback:v1:' + feedback.feedbackId;
  try {
    const existing = await storage.get(key);
    if (!existing) await storage.put(key, JSON.stringify(feedback));
    return json({ accepted: true, duplicate: Boolean(existing) }, existing ? 200 : 201);
  } catch {
    return json({ error: '反馈服务暂时不可用' }, 503);
  }
}
