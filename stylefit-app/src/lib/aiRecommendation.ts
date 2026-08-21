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

function hasCompleteOutfits(result: AIRecommendationResult) {
  if (!result.recommendation.outfits.length || result.recommendation.outfits.length > 3) return false;
  const candidatesById = new Map(result.candidates.map((item) => [item.id, item]));
  return result.recommendation.outfits.every((outfit) => outfit.items.length > 0 && outfit.items.every((item) => candidatesById.has(item.id)));
}

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

function toClothingItem(product: TaobaoProduct, profile: UserBodyProfile): ClothingItem | null {
  const itemId = typeof product.itemId === 'string' ? product.itemId.trim() : '';
  const name = typeof product.title === 'string' ? product.title.trim() : '';
  const image = typeof product.image === 'string' ? product.image.trim() : '';
  const buyLink = typeof product.promotionUrl === 'string' ? product.promotionUrl.trim() : '';
  const price = Number(product.couponPrice || product.price);
  if (!itemId || !name || !image || !buyLink || !Number.isFinite(price) || price <= 0) return null;

  const suppliedCategory = typeof product.category === 'string' ? product.category : '';
  const category = ['top', 'bottom', 'outerwear', 'shoes', 'accessory', 'dress'].includes(suppliedCategory)
    ? suppliedCategory as ClothingItem['category']
    : getTaobaoCategory(`${suppliedCategory} ${name}`);
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
      !hasCompleteOutfits(cached.result) ||
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
    if (!candidateFingerprint || !hasCompleteOutfits(result) || result.recommendation.source !== 'taobao' || result.recommendation.candidateFingerprint !== candidateFingerprint) return false;
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

    const result = await response.json() as {
      status?: string;
      recommendation?: { summary?: unknown; outfits?: unknown };
      candidates?: TaobaoProduct[];
    };
    const recommendation = result.recommendation;
    if (
      result.status !== 'ok' ||
      !recommendation ||
      typeof recommendation.summary !== 'string' ||
      !Array.isArray(recommendation.outfits) ||
      !recommendation.outfits.length ||
      recommendation.outfits.length > 3 ||
      !Array.isArray(result.candidates)
    ) return null;

    const candidates = result.candidates.flatMap((product) => {
      const item = toClothingItem(product, profile);
      return item ? [item] : [];
    });
    const candidatesById = new Map(candidates.map((item) => [item.id, item]));
    const budget = Number(profile.budget);
    const outfits = recommendation.outfits.flatMap((value, index) => {
      if (typeof value !== 'object' || value === null) return [];
      const source = value as { name?: unknown; stylingTip?: unknown; items?: unknown };
      if (typeof source.name !== 'string' || typeof source.stylingTip !== 'string' || !Array.isArray(source.items)) return [];
      const items = source.items.flatMap((item) => {
        if (typeof item !== 'object' || item === null) return [];
        const sourceItem = item as { id?: unknown; reason?: unknown };
        return typeof sourceItem.id === 'string' && candidatesById.has(sourceItem.id)
          ? [{ id: sourceItem.id, reason: typeof sourceItem.reason === 'string' ? sourceItem.reason : '' }]
          : [];
      });
      const selected = items.map((item) => candidatesById.get(item.id)!);
      const total = selected.reduce((sum, item) => sum + item.price, 0);
      if (!items.length) return [];
      if (Number.isFinite(budget) && budget > 0 && total > budget) return [];
      return [{ name: source.name || `方案 ${index + 1}`, stylingTip: source.stylingTip, items }];
    });
    if (!outfits.length) return null;
    const candidateFingerprint = getCandidateFingerprint(candidates);
    if (!candidateFingerprint) return null;

    return {
      recommendation: { source: 'taobao', candidateFingerprint, summary: recommendation.summary, outfits },
      candidates,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
