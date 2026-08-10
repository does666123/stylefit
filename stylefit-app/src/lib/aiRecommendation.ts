import type { ClothingItem, UserBodyProfile } from '../types';

export type AIRecommendation = {
  summary: string;
  outfits: {
    name: string;
    stylingTip: string;
    items: { id: string; reason: string }[];
  }[];
};

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
