import { searchTaobaoCandidatePool } from '../lib/taobao.js';

const endpoint = 'https://qianfan.baidubce.com/v2/chat/completions';
const model = 'ernie-4.5-turbo-32k';
const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };
const encoder = new TextEncoder();
const cacheTtlMs = 30 * 60 * 1000;
const cacheLimit = 200;
const recommendationCache = new Map();
const inFlightRequests = new Map();
const categories = ['top', 'bottom', 'shoes', 'accessory'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function asRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
}

function asText(value, maxLength) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : '';
}

function textList(value, maxItems, maxLength) {
  return Array.isArray(value)
    ? value.map((item) => asText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function extractJson(content) {
  const source = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return asRecord(JSON.parse(source.slice(start, end + 1)));
  } catch {
    return null;
  }
}

function getScene(profile) {
  if (profile.gender === 'female') return profile.occasion === 'work' ? 'womens_work' : 'womens_minimal_top';
  return profile.occasion === 'work' ? 'mens_work' : 'mens_casual_outerwear';
}

function pickProfile(value) {
  const source = asRecord(value);
  if (!source) return null;
  const profile = {
    gender: asText(source.gender, 12),
    height: Number(source.height),
    weight: Number(source.weight),
    age: Number(source.age),
    bodyType: asText(source.bodyType, 24),
    skinTone: asText(source.skinTone, 24),
    stylePreference: asText(source.stylePreference, 24),
    occasion: asText(source.occasion, 24),
    season: asText(source.season, 24),
  };
  const budget = Number(source.budget);
  if (!['male', 'female'].includes(profile.gender) || !profile.bodyType || !profile.skinTone || !profile.stylePreference || !profile.occasion || !profile.season) return null;
  return { ...profile, ...(Number.isFinite(budget) && budget > 0 ? { budget } : {}) };
}

function cacheKey(profile) {
  return JSON.stringify([
    profile.gender, profile.height, profile.weight, profile.bodyType, profile.skinTone,
    profile.stylePreference, profile.occasion, profile.season, profile.budget || null,
  ]);
}

function readCachedRecommendation(key) {
  const entry = recommendationCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt >= cacheTtlMs) {
    recommendationCache.delete(key);
    return null;
  }
  return entry.result;
}

function cacheRecommendation(key, result) {
  while (recommendationCache.size >= cacheLimit) recommendationCache.delete(recommendationCache.keys().next().value);
  recommendationCache.set(key, { createdAt: Date.now(), result });
}

function providerError(payload) {
  const error = asRecord(asRecord(payload)?.error);
  return {
    providerCode: typeof error?.code === 'string' || typeof error?.code === 'number' ? String(error.code) : undefined,
    providerMessage: asText(error?.message, 300) || undefined,
  };
}

function parsePlan(content) {
  const record = extractJson(content);
  const summary = asText(record?.summary, 600);
  const style = asText(record?.style, 80);
  const sourceOutfits = Array.isArray(record?.outfits) ? record.outfits : [];
  const outfits = sourceOutfits.slice(0, 3).flatMap((value) => {
    const outfit = asRecord(value);
    const name = asText(outfit?.name, 80);
    const stylingTip = asText(outfit?.stylingTip, 280);
    const keywords = Object.fromEntries(categories.map((category) => [
      category,
      textList(outfit?.[`${category}Keywords`], 2, 32).filter((keyword) => /^[\u4e00-\u9fffA-Za-z0-9\s-]+$/.test(keyword)),
    ]));
    return name && stylingTip && keywords.top.length && keywords.bottom.length
      ? [{ name, stylingTip, keywords }]
      : [];
  });
  return summary && outfits.length ? { summary, style, outfits } : null;
}

function mergeKeywords(outfits) {
  return Object.fromEntries(categories.map((category) => [
    category,
    [...new Set([
      ...outfits.map((outfit) => outfit.keywords[category][0]).filter(Boolean),
      ...outfits.flatMap((outfit) => outfit.keywords[category]),
    ])].slice(0, 3),
  ]));
}

function isShoeProduct(text) {
  return /皮鞋|乐福鞋|德比鞋|运动鞋|板鞋|帆布鞋|小白鞋|靴子|跑鞋|休闲鞋|凉鞋|拖鞋|高跟鞋|单鞋|球鞋|马丁靴|短靴|长靴/.test(text)
    && !/袜子?|鞋垫|鞋带|鞋套|鞋刷|鞋油|鞋盒|鞋撑|鞋饰/.test(text);
}

function getCategory(text) {
  if (isShoeProduct(text)) return 'shoes';
  if (/裤|牛仔|半身裙/.test(text)) return 'bottom';
  if (/包|帽|围巾|腰带|皮带|眼镜|首饰|领带|袜|丝巾/.test(text)) return 'accessory';
  return 'top';
}

function toCandidate(product, profile) {
  const itemId = asText(product?.itemId, 80);
  const title = asText(product?.title, 200);
  const image = asText(product?.image, 2000);
  const promotionUrl = asText(product?.promotionUrl, 2000);
  const price = Number(product?.couponPrice || product?.price);
  const category = categories.includes(product?.category) ? product.category : getCategory(`${product?.category || ''} ${title}`);
  if (!itemId || !title || !image || !promotionUrl || !Number.isFinite(price) || price <= 0 || !categories.includes(category)) return null;
  return {
    itemId,
    id: `taobao-${itemId}`,
    title,
    image,
    price: Number(product?.price) || price,
    couponAmount: Number(product?.couponAmount) || 0,
    couponPrice: price,
    shopTitle: asText(product?.shopTitle, 120) || '淘宝联盟',
    volume: Number(product?.volume) || 0,
    category,
    promotionUrl,
    tags: ['淘宝联盟', category, profile.stylePreference, profile.occasion, profile.season],
  };
}

function styleTerms(profile) {
  const styles = {
    business: ['商务', '通勤', '西装', '衬衫', '西裤', '皮鞋', '轻熟'],
    commute: ['通勤', '商务', '简约', '衬衫'],
    casual: ['休闲', '基础', '牛仔', 't恤', '运动'],
    sporty: ['运动', '速干', '跑步', '卫衣', '球鞋'],
    streetwear: ['街头', '宽松', '工装', '潮', '嘻哈'],
    retro: ['复古', '格纹', '灯芯绒', '直筒'],
    oldmoney: ['老钱', '绅士', '针织', '乐福', 'Polo'],
    preppy: ['学院', '衬衫', '针织', '百褶'],
    japanese: ['日系', '宽松', '工装', '简约'],
    korean: ['韩系', '简约', '修身', '衬衫'],
    mature: ['轻熟', '通勤', '西装', '针织'],
    minimal: ['简约', '基础', '纯色', '极简'],
    y2k: ['Y2K', '复古', '低腰', '辣妹'],
    jk: ['JK', '学院', '衬衫', '百褶'],
    elegant: ['优雅', '连衣裙', '针织', '衬衫'],
  };
  const scenes = {
    daily: ['日常', '休闲'],
    work: ['职场', '通勤', '商务'],
    date: ['约会', '轻熟'],
    party: ['聚会', '派对', '潮'],
    campus: ['校园', '学院'],
    travel: ['旅行', '舒适'],
    interview: ['面试', '正式'],
    formal: ['正式', '礼服'],
  };
  return [...(styles[profile.stylePreference] || []), ...(scenes[profile.occasion] || [])];
}

function isCandidateEligible(candidate, profile) {
  const text = `${candidate.title} ${candidate.category}`;
  if (profile.gender === 'male' && /女(?:士|款|装)?|女式|女装|裙/.test(text)) return false;
  if (profile.gender === 'female' && /男(?:士|款|装)?|男式|男装/.test(text)) return false;
  if (candidate.category === 'shoes') return isShoeProduct(text);
  return {
    top: /上衣|T恤|t恤|衬衫|衬衣|针织|毛衣|卫衣|Polo|polo|外套|夹克|大衣|风衣|羽绒|西装/,
    bottom: /裤|牛仔|半身裙/,
    accessory: /包|帽|围巾|腰带|皮带|眼镜|首饰|领带|袜|丝巾/,
  }[candidate.category]?.test(text) || false;
}

function scoreCandidate(candidate, profile, keywords) {
  const text = `${candidate.title} ${candidate.category}`.toLowerCase();
  const keywordScore = keywords.reduce((score, keyword) => {
    const exact = text.includes(keyword.toLowerCase()) ? 28 : 0;
    const partial = keyword.match(/[\u4e00-\u9fff]{2,}|[A-Za-z0-9]+/g) || [];
    return score + exact + partial.reduce((sum, term) => sum + (text.includes(term.toLowerCase()) ? 5 : 0), 0);
  }, 0);
  const profileScore = styleTerms(profile).reduce((score, term) => score + (text.includes(term.toLowerCase()) ? 6 : 0), 0);
  const budget = Number(profile.budget);
  const target = Number.isFinite(budget) && budget > 0
    ? budget * ({ top: 0.36, bottom: 0.3, shoes: 0.24, accessory: 0.1 }[candidate.category] || 0)
    : 0;
  const priceScore = target && candidate.couponPrice <= budget
    ? Math.max(0, 16 - Math.round(Math.abs(candidate.couponPrice - target) / target * 16))
    : 0;
  return keywordScore + profileScore + priceScore;
}

function rankedCandidates(candidates, profile, outfit) {
  return Object.fromEntries(categories.map((category) => [
    category,
    candidates.filter((candidate) => candidate.category === category && isCandidateEligible(candidate, profile))
      .map((candidate) => ({ candidate, score: scoreCandidate(candidate, profile, outfit.keywords[category]) }))
      .sort((left, right) => right.score - left.score || left.candidate.couponPrice - right.candidate.couponPrice)
      .slice(0, category === 'shoes' ? 10 : 20),
  ]));
}

function reasonFor(category, outfit) {
  const labels = { top: '上装', bottom: '下装', shoes: '鞋履', accessory: '配饰' };
  return `${outfit.keywords[category][0] || labels[category]}，贴合本套${labels[category]}方向`;
}

function candidateSignature(candidate) {
  const markers = candidate.title.match(/黑|白|灰|蓝|棕|卡其|米|绿|红|粉|紫|宽松|修身|直筒|阔腿|廓形|短款|长款|高腰|低腰/g);
  return markers?.join('|') || '';
}

function diversityPenalty(candidate, used) {
  return (used.shops.has(candidate.shopTitle) ? 3 : 0) + (candidateSignature(candidate) && used.signatures.has(candidateSignature(candidate)) ? 2 : 0);
}

function composeOutfit(outfit, candidates, profile, used) {
  const ranked = rankedCandidates(candidates, profile, outfit);
  const budget = Number(profile.budget);
  const hasBudget = Number.isFinite(budget) && budget > 0;
  let best = null;
  for (const top of ranked.top) {
    for (const bottom of ranked.bottom) {
      const total = top.candidate.couponPrice + bottom.candidate.couponPrice;
      if (hasBudget && total > budget) continue;
      const keepsShoeBudget = !hasBudget || ranked.shoes.some(({ candidate }) => total + candidate.couponPrice <= budget);
      const budgetScore = hasBudget ? Math.round(total / budget * 4) : 0;
      const reusePenalty = (used.ids.has(top.candidate.id) ? 1_000 : 0) + (used.ids.has(bottom.candidate.id) ? 1_000 : 0);
      const score = top.score + bottom.score + budgetScore + (keepsShoeBudget ? 18 : 0) - reusePenalty - diversityPenalty(top.candidate, used) - diversityPenalty(bottom.candidate, used);
      if (!best || score > best.score) best = { top, bottom, total, score };
    }
  }
  if (!best) return null;

  const selected = [best.top, best.bottom];
  let total = best.total;
  for (const category of ['shoes', 'accessory']) {
    const affordable = ranked[category].filter(({ candidate }) => !hasBudget || total + candidate.couponPrice <= budget);
    const available = affordable.filter(({ candidate }) => !used.ids.has(candidate.id));
    const next = (available.length ? available : affordable).slice().sort((left, right) => {
      const difference = diversityPenalty(left.candidate, used) - diversityPenalty(right.candidate, used);
      return difference || right.score - left.score;
    })[0];
    if (next) {
      selected.push(next);
      total += next.candidate.couponPrice;
    }
  }
  return {
    name: outfit.name,
    stylingTip: outfit.stylingTip,
    items: selected.map(({ candidate }) => ({ id: candidate.id, reason: reasonFor(candidate.category, outfit) })),
    selected: selected.map(({ candidate }) => candidate),
  };
}

function diagnostic(candidates, outfits, reason = '') {
  return {
    categoryCounts: Object.fromEntries(categories.map((category) => [category, candidates.filter((item) => item.category === category).length])),
    outfitCount: outfits.length,
    ...(reason ? { reason } : {}),
  };
}

async function generateRecommendation(profile, env, diagnosticEnabled) {
  const apiKey = env.QIANFAN_API_KEY;
  if (!apiKey) return { reason: 'AI service is not configured' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { ...jsonHeaders, Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 900,
        messages: [{
          role: 'system',
          content: '你是中文穿搭顾问。仅根据用户画像设计穿搭策略，不选择具体商品。必须输出恰好 3 套；每套必须给出上装和下装搜索词，鞋履优先，配饰可选。三套必须主动区分风格方向、颜色组合、版型轮廓、单品类型和正式程度，并同时贴合用户场景；不能只换一件上衣。每个类目的首个搜索词及搭配建议都必须体现该套差异，例如商务休闲、简约正式、轻熟商务或宽松街头、复古潮流、简约运动。不得给出品牌、链接、价格或商品 ID。只返回 JSON：{"summary":"身材与风格分析","style":"风格结论","outfits":[{"name":"搭配名","stylingTip":"搭配建议","topKeywords":["..."],"bottomKeywords":["..."],"shoesKeywords":["..."],"accessoryKeywords":["..."]}]}。',
        }, { role: 'user', content: JSON.stringify(profile) }],
      }),
      signal: controller.signal,
      eo: { timeoutSetting: { connectTimeout: 10_000, readTimeout: 45_000, writeTimeout: 10_000 } },
    });
    if (!response.ok) return { reason: `AI service request failed (${response.status})`, details: providerError(await response.json().catch(() => null)) };
    const payload = asRecord(await response.json());
    const firstChoice = Array.isArray(payload?.choices) ? asRecord(payload.choices[0]) : null;
    const message = asRecord(firstChoice?.message);
    const plan = parsePlan(typeof message?.content === 'string' ? message.content : '');
    if (!plan) return { reason: 'AI strategy could not be validated' };

    const pool = await searchTaobaoCandidatePool(env, getScene(profile), mergeKeywords(plan.outfits));
    if (pool.error) return { reason: '淘宝联盟商品暂时不可用' };
    const candidates = (pool.products || []).map((product) => toCandidate(product, profile)).filter(Boolean);
    const used = { ids: new Set(), shops: new Set(), signatures: new Set() };
    const composed = plan.outfits.map((outfit) => {
      const composedOutfit = composeOutfit(outfit, candidates, profile, used);
      composedOutfit?.selected.forEach((item) => {
        used.ids.add(item.id);
        used.shops.add(item.shopTitle);
        const signature = candidateSignature(item);
        if (signature) used.signatures.add(signature);
      });
      return composedOutfit;
    }).filter(Boolean);
    if (!composed.length) {
      return { reason: '本场景暂未找到满足预算的上装和下装', ...(diagnosticEnabled ? { details: { diagnostic: diagnostic(candidates, [], 'missing_top_bottom_or_budget') } } : {}) };
    }
    const selected = [];
    const selectedIds = new Set();
    for (const outfit of composed) {
      for (const item of outfit.selected) {
        if (!selectedIds.has(item.id)) {
          selectedIds.add(item.id);
          selected.push(item);
        }
      }
    }
    const result = {
      recommendation: {
        summary: plan.summary,
        outfits: composed.map(({ selected, ...outfit }) => outfit),
      },
      candidates: selected,
    };
    return diagnosticEnabled ? { ...result, diagnostic: diagnostic(candidates, composed) } : result;
  } catch {
    return { reason: 'AI service is temporarily unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let body;
  try {
    body = asRecord(await request.json());
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const profile = pickProfile(body?.profile);
  if (!profile) return json({ error: 'Valid profile is required' }, 400);
  const diagnosticEnabled = new URL(request.url).searchParams.get('diagnostic') === '1';
  const key = cacheKey(profile);
  const cached = readCachedRecommendation(key);
  if (cached) return json({ status: 'ok', ...cached, cached: true });

  let controller;
  const stream = new ReadableStream({
    start(value) {
      controller = value;
      controller.enqueue(encoder.encode(' '));
    },
  });
  const response = new Response(stream, { headers: jsonHeaders });
  Promise.resolve().then(async () => {
    let heartbeat;
    const complete = (data) => {
      if (heartbeat) clearInterval(heartbeat);
      controller.enqueue(encoder.encode(JSON.stringify(data)));
      controller.close();
    };
    try {
      heartbeat = setInterval(() => controller.enqueue(encoder.encode(' ')), 5_000);
      let pending = inFlightRequests.get(key);
      if (!pending) {
        pending = generateRecommendation(profile, env, diagnosticEnabled)
          .then((outcome) => {
            if (outcome.recommendation && outcome.candidates) cacheRecommendation(key, { recommendation: outcome.recommendation, candidates: outcome.candidates });
            return outcome;
          })
          .finally(() => inFlightRequests.delete(key));
        inFlightRequests.set(key, pending);
      }
      const outcome = await pending;
      complete(outcome.recommendation
        ? { status: 'ok', recommendation: outcome.recommendation, candidates: outcome.candidates, cached: false, ...(diagnosticEnabled && outcome.diagnostic ? { diagnostic: outcome.diagnostic } : {}) }
        : { status: 'fallback', reason: outcome.reason || 'AI service is temporarily unavailable', cached: false, ...outcome.details });
    } catch {
      complete({ status: 'fallback', reason: 'AI service is temporarily unavailable', cached: false });
    }
  });
  return response;
}
