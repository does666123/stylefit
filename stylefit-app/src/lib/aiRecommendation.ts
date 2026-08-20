import type { ClothingItem, UserBodyProfile } from '../types';

export type AIRecommendation = {
  source: 'taobao';
  candidateFingerprint: string;
  summary: string;
  outfits: {
    name: string;
    stylingTip: string;
    items: { id: string; reason: string }[];
  }[];
};

export type AIRecommendationResult = {
  recommendation: AIRecommendation;
  candidates: ClothingItem[];
};

const AI_CACHE_KEY = 'stylefit_ai_recommendation';
const AI_CACHE_TTL = 24 * 60 * 60 * 1000;

type CachedAIRecommendation = {
  source: 'taobao';
  candidateFingerprint: string;
  result: AIRecommendationResult;
  profileKey: string;
  generatedAt: number;
};

export function safeSessionGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSessionSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeSessionRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

function safeLocalGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeLocalRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function getAIRecommendationProfileKey(profile: UserBodyProfile) {
  return JSON.stringify([
    profile.gender,
    profile.height,
    profile.weight,
    profile.bodyType,
    profile.skinTone,
    profile.stylePreference,
    profile.occasion,
    profile.season,
    profile.budget ?? null,
  ]);
}

function getTaobaoScene(profile: UserBodyProfile) {
  if (profile.gender === 'female') return profile.occasion === 'work' ? 'womens_work' : 'womens_minimal_top';
  return profile.occasion === 'work' ? 'mens_work' : 'mens_casual_outerwear';
}

function getCandidateFingerprint(candidates: ClothingItem[]) {
  return candidates.map((item) => item.id).join('|');
}

function getTaobaoCategory(text: string): ClothingItem['category'] {
  if (/鞋|靴|凉鞋|拖鞋/.test(text)) return 'shoes';
  if (/裤|牛仔|半身裙/.test(text)) return 'bottom';
  if (/外套|夹克|大衣|风衣|羽绒|西装/.test(text)) return 'outerwear';
  if (/包|帽|围巾|腰带|皮带|眼镜|首饰|领带|袜|丝巾/.test(text)) return 'accessory';
  if (/连衣裙/.test(text)) return 'dress';
  return 'top';
}

function getTaobaoGender(text: string, fallback: UserBodyProfile['gender']): ClothingItem['gender'] {
  if (/\u5973|\u5973\u58eb|\u5973\u6b3e/.test(text)) return 'female';
  if (/\u7537|\u7537\u58eb|\u7537\u6b3e/.test(text)) return 'male';
  return fallback;
}

type TaobaoProduct = {
  itemId?: unknown;
  title?: unknown;
  image?: unknown;
  price?: unknown;
  couponPrice?: unknown;
  shopTitle?: unknown;
  volume?: unknown;
  category?: unknown;
  promotionUrl?: unknown;
};

type AIBlueprint = {
  name?: string;
  style?: string;
  occasion?: string;
  colors?: string[];
  fit?: string;
  formality?: string;
  keywords?: {
    top?: string;
    bottom?: string;
    shoes?: string;
    accessory?: string;
  };
};

const NON_SHOE_PATTERN = /袜|鞋垫|鞋带|鞋套|鞋刷|鞋油|鞋饰|鞋盒|鞋撑/;

function toClothingItem(product: TaobaoProduct, profile: UserBodyProfile): ClothingItem | null {
  const itemId = typeof product.itemId === 'string' ? product.itemId.trim() : '';
  const name = typeof product.title === 'string' ? product.title.trim() : '';
  const image = typeof product.image === 'string' ? product.image.trim() : '';
  const buyLink = typeof product.promotionUrl === 'string' ? product.promotionUrl.trim() : '';
  const price = Number(product.couponPrice || product.price);
  if (!itemId || !name || !image || !buyLink || !Number.isFinite(price) || price <= 0) return null;

  const category = getTaobaoCategory(`${typeof product.category === 'string' ? product.category : ''} ${name}`);
  return {
    id: `taobao-${itemId}`,
    name,
    gender: getTaobaoGender(name, profile.gender),
    category,
    subCategory: typeof product.category === 'string' ? product.category : '淘宝联盟商品',
    price,
    currency: '¥',
    image,
    buyLink,
    brand: typeof product.shopTitle === 'string' ? product.shopTitle : '淘宝联盟',
    colors: [],
    sizes: [],
    fit: 'regular',
    suitableBodyTypes: [profile.bodyType],
    suitableSkinTones: [profile.skinTone],
    styles: [profile.stylePreference],
    occasions: [profile.occasion],
    seasons: ['all'],
    description: typeof product.volume === 'number' && product.volume > 0 ? `已售 ${product.volume}` : '淘宝联盟精选商品',
    rating: 0,
    tags: ['淘宝联盟', category],
  } satisfies ClothingItem;
}

async function fetchCategoryProducts(
  profile: UserBodyProfile,
  category: ClothingItem['category'],
  keyword: string,
  signal: AbortSignal,
): Promise<ClothingItem[]> {
  const scene = getTaobaoScene(profile);
  const params = new URLSearchParams({ scene, category, page: '1' });
  if (keyword) params.set('keyword', keyword);
  const response = await fetch(`/api/taobao/products?${params.toString()}`, { signal });
  if (!response.ok) return [];
  const payload = await response.json() as { products?: TaobaoProduct[] };
  if (!Array.isArray(payload.products)) return [];

  return payload.products.slice(0, 20).flatMap((product) => {
    const item = toClothingItem(product, profile);
    if (!item) return [];
    item.category = category;
    return [item];
  });
}

function isGenderMismatch(item: ClothingItem, profile: UserBodyProfile) {
  return (
    (item.gender === 'male' && profile.gender !== 'male') ||
    (item.gender === 'female' && profile.gender !== 'female')
  );
}

function splitKeywords(keyword: string) {
  return keyword
    .split(/[\s,，、]+/)
    .filter((token) => token && !/^(男|女|男士|女士|男款|女款)$/.test(token));
}

function scoreProduct(item: ClothingItem, blueprint: AIBlueprint, keyword: string) {
  let score = 0;
  const title = item.name || '';
  const tokens = splitKeywords(keyword);
  let matched = 0;
  for (const token of tokens) {
    if (token && title.includes(token)) matched += 1;
  }
  if (matched > 0) score += Math.min(matched, 3) * 10;
  const colors = blueprint.colors || [];
  if (colors.some((color) => color && title.includes(color))) score += 8;
  const volumeMatch = /已售\s*([\d.]+)\s*(万)?/.exec(item.description || '');
  if (volumeMatch) {
    const volume = parseFloat(volumeMatch[1]) * (volumeMatch[2] ? 10000 : 1);
    if (volume >= 10000) score += 20;
    else if (volume >= 1000) score += 12;
    else if (volume >= 100) score += 6;
  }
  score += Math.min(item.rating || 0, 5);
  return score;
}

function composeOutfit(
  blueprint: AIBlueprint,
  pools: Partial<Record<ClothingItem['category'], ClothingItem[]>>,
  budget: number,
  usedIds: Set<string>,
  profile: UserBodyProfile,
): { items: { id: string; reason: string }[]; spent: number } | null {
  const budgetLimit = Number.isFinite(budget) && budget > 0 ? budget : Infinity;
  const keywords = blueprint.keywords || {};
  const keywordOf = (cat: keyof NonNullable<AIBlueprint['keywords']>) => (keywords[cat] || '').trim();

  // 各品类：预算内 + 未用 + 性别匹配，按匹配/质量分排序取前 4 作为候选
  const rankCategory = (pool: ClothingItem[], cat: keyof NonNullable<AIBlueprint['keywords']>) => {
    const keyword = keywordOf(cat);
    return (pool || [])
      .filter((item) => {
        if (usedIds.has(item.id)) return false;
        if (isGenderMismatch(item, profile)) return false;
        if (!Number.isFinite(item.price) || item.price <= 0) return false;
        if (Number.isFinite(budgetLimit) && item.price > budgetLimit) return false;
        return true;
      })
      .map((item) => ({ item, score: scoreProduct(item, blueprint, keyword) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  };

  const topList = rankCategory(pools.top || [], 'top');
  const bottomList = rankCategory(pools.bottom || [], 'bottom');
  const shoesList = rankCategory(pools.shoes || [], 'shoes');
  const accessoryList = rankCategory(pools.accessory || [], 'accessory');
  if (topList.length === 0 || bottomList.length === 0) return null;

  // 枚举 top × bottom 组合，预算内优先保证「上衣+下装+鞋履」，再考虑配饰。
  // 组合评分 = 各件匹配/质量分之和 + 完整度加成（鞋履 +30、配饰 +10），
  // 选「预算内质量分最高的组合」而非最便宜组合，鞋履强烈优先。
  let best: {
    comboScore: number;
    top: { item: ClothingItem; score: number };
    bottom: { item: ClothingItem; score: number };
    shoes: { item: ClothingItem; score: number } | null;
    accessory: { item: ClothingItem; score: number } | null;
    total: number;
  } | null = null;

  for (const topPick of topList) {
    for (const bottomPick of bottomList) {
      const baseTotal = topPick.item.price + bottomPick.item.price;
      if (Number.isFinite(budgetLimit) && baseTotal > budgetLimit) continue;

      const shoesInBudget = shoesList.filter((s) => !Number.isFinite(budgetLimit) || s.item.price <= budgetLimit - baseTotal);
      const shoesPick = shoesInBudget.length > 0 ? shoesInBudget[0] : null;

      const accRemain = Number.isFinite(budgetLimit)
        ? budgetLimit - baseTotal - (shoesPick ? shoesPick.item.price : 0)
        : Infinity;
      const accessoryInBudget = accessoryList.filter((a) => a.item.price <= accRemain);
      const accessoryPick = accessoryInBudget.length > 0 ? accessoryInBudget[0] : null;

      const total = baseTotal
        + (shoesPick ? shoesPick.item.price : 0)
        + (accessoryPick ? accessoryPick.item.price : 0);
      if (Number.isFinite(budgetLimit) && total > budgetLimit) continue;

      const comboScore = topPick.score + bottomPick.score
        + (shoesPick ? shoesPick.score + 30 : 0)
        + (accessoryPick ? accessoryPick.score + 10 : 0);

      // 分层优先：预算允许时「含鞋履」的组合严格优先于「无鞋履」，避免退化成只有上衣+下装；
      // 同级组合内再选质量分最高的，而非最便宜。
      if (
        !best ||
        (shoesPick && !best.shoes) ||
        ((shoesPick ? 1 : 0) === (best.shoes ? 1 : 0) && comboScore > best.comboScore)
      ) {
        best = { comboScore, top: topPick, bottom: bottomPick, shoes: shoesPick, accessory: accessoryPick, total };

      }
    }
  }

  if (!best) return null;

  const items: { id: string; reason: string }[] = [
    { id: best.top.item.id, reason: `上装：${best.top.item.name}` },
    { id: best.bottom.item.id, reason: `下装：${best.bottom.item.name}` },
  ];
  const spent = best.top.item.price + best.bottom.item.price;
  if (best.shoes) {
    items.push({ id: best.shoes.item.id, reason: `鞋履：${best.shoes.item.name}` });
  }
  if (best.accessory) {
    items.push({ id: best.accessory.item.id, reason: `配饰：${best.accessory.item.name}` });
  }
  for (const item of items) usedIds.add(item.id);

  return { items, spent };
}

export function readCachedAIRecommendation(profile: UserBodyProfile) {
  try {
    const raw = safeLocalGet(AI_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedAIRecommendation;
    if (
      cached.source !== 'taobao' ||
      !cached.result?.recommendation ||
      !Array.isArray(cached.result.candidates) ||
      !cached.candidateFingerprint ||
      cached.candidateFingerprint !== getCandidateFingerprint(cached.result.candidates) ||
      cached.result.recommendation.source !== 'taobao' ||
      cached.result.recommendation.candidateFingerprint !== cached.candidateFingerprint ||
      cached.profileKey !== getAIRecommendationProfileKey(profile) ||
      Date.now() - cached.generatedAt > AI_CACHE_TTL
    ) {
      safeLocalRemove(AI_CACHE_KEY);
      return null;
    }

    return cached.result;
  } catch {
    safeLocalRemove(AI_CACHE_KEY);
    return null;
  }
}

export function cacheAIRecommendation(profile: UserBodyProfile, result: AIRecommendationResult) {
  try {
    const candidateFingerprint = getCandidateFingerprint(result.candidates);
    if (!candidateFingerprint || result.recommendation.source !== 'taobao' || result.recommendation.candidateFingerprint !== candidateFingerprint) return false;
    return safeLocalSet(AI_CACHE_KEY, JSON.stringify({
      source: 'taobao',
      candidateFingerprint,
      result,
      profileKey: getAIRecommendationProfileKey(profile),
      generatedAt: Date.now(),
    } satisfies CachedAIRecommendation));
  } catch {
    return false;
  }
}

export function clearCachedAIRecommendation() {
  safeLocalRemove(AI_CACHE_KEY);
}

export async function requestAIRecommendation(profile: UserBodyProfile): Promise<AIRecommendationResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ profile }),
    });
    if (!response.ok) return null;

    const result = await response.json() as { status?: string; recommendation?: { summary?: unknown; blueprints?: unknown } };
    const recommendation = result.recommendation;
    if (
      result.status !== 'ok' ||
      !recommendation ||
      typeof recommendation.summary !== 'string' ||
      !Array.isArray(recommendation.blueprints) ||
      recommendation.blueprints.length === 0
    ) return null;

    const blueprints = recommendation.blueprints.slice(0, 3) as AIBlueprint[];
    const allCandidates: ClothingItem[] = [];
    const seenIds = new Set<string>();
    const addCandidates = (items: ClothingItem[]) => {
      for (const item of items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allCandidates.push(item);
        }
      }
    };

    const outfits: AIRecommendation['outfits'] = [];
    const usedIds = new Set<string>();
    const budget = Number(profile.budget);
    const categoryOrder: { category: ClothingItem['category']; key: keyof NonNullable<AIBlueprint['keywords']> }[] = [
      { category: 'top', key: 'top' },
      { category: 'bottom', key: 'bottom' },
      { category: 'shoes', key: 'shoes' },
      { category: 'accessory', key: 'accessory' },
    ];

    for (const blueprint of blueprints) {
      const keywords = blueprint.keywords || {};
      const pools: Partial<Record<ClothingItem['category'], ClothingItem[]>> = {};

      const loadCategory = async (category: ClothingItem['category'], keyword: string) => {
        let products = keyword ? await fetchCategoryProducts(profile, category, keyword, controller.signal) : [];
        if (products.length === 0) {
          products = await fetchCategoryProducts(profile, category, '', controller.signal);
        }
        if (category === 'shoes') {
          products = products.filter((item) => !NON_SHOE_PATTERN.test(item.name || ''));
        }
        addCandidates(products);
        pools[category] = products;
      };

      await Promise.all(
        categoryOrder.map(({ category, key }) => loadCategory(category, (keywords[key] || '').trim())),
      );

      const composed = composeOutfit(blueprint, pools, budget, usedIds, profile);
      if (composed) {
        outfits.push({
          name: blueprint.name || `方案 ${outfits.length + 1}`,
          stylingTip: [blueprint.style, blueprint.formality].filter(Boolean).join(' · ') || '按你的身形与场合搭配',
          items: composed.items,
        });
      }
    }

    if (outfits.length === 0) return null;
    const candidateFingerprint = getCandidateFingerprint(allCandidates);
    if (!candidateFingerprint) return null;

    return {
      recommendation: { source: 'taobao', candidateFingerprint, summary: recommendation.summary, outfits },
      candidates: allCandidates,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
