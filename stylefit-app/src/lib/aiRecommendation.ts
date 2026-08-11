import type { ClothingItem, UserBodyProfile } from '../types';

export type AIRecommendation = {
  summary: string;
  outfits: {
    name: string;
    stylingTip: string;
    items: { id: string; reason: string }[];
  }[];
};

const AI_CACHE_KEY = 'stylefit_ai_recommendation';
const AI_CACHE_TTL = 30 * 60 * 1000;

type CachedAIRecommendation = {
  recommendation: AIRecommendation;
  profileKey: string;
  generatedAt: number;
};

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

export function readCachedAIRecommendation(profile: UserBodyProfile) {
  try {
    const raw = sessionStorage.getItem(AI_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedAIRecommendation;
    if (
      !cached.recommendation ||
      cached.profileKey !== getAIRecommendationProfileKey(profile) ||
      Date.now() - cached.generatedAt > AI_CACHE_TTL
    ) {
      sessionStorage.removeItem(AI_CACHE_KEY);
      return null;
    }

    return cached.recommendation;
  } catch {
    sessionStorage.removeItem(AI_CACHE_KEY);
    return null;
  }
}

export function cacheAIRecommendation(profile: UserBodyProfile, recommendation: AIRecommendation) {
  sessionStorage.setItem(AI_CACHE_KEY, JSON.stringify({
    recommendation,
    profileKey: getAIRecommendationProfileKey(profile),
    generatedAt: Date.now(),
  } satisfies CachedAIRecommendation));
}

export function clearCachedAIRecommendation() {
  sessionStorage.removeItem(AI_CACHE_KEY);
}

export async function requestAIRecommendation(profile: UserBodyProfile, candidates: ClothingItem[]) {
  const response = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profile,
      candidates: candidates.slice(0, 30).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        colors: item.colors,
        tags: item.tags,
        styles: item.styles,
        occasions: item.occasions,
      })),
    }),
  });

  if (!response.ok) return null;

  const result = await response.json() as { status?: string; recommendation?: AIRecommendation };
  return result.status === 'ok' && Array.isArray(result.recommendation?.outfits)
    ? result.recommendation
    : null;
}
