import type { ClothingItem, OutfitSet, RecommendationMode, UserBodyProfile } from '@/types';

const FEEDBACK_KEY = 'stylefit_feedback_v1';
const MAX_FEEDBACK_EVENTS = 500;

export const DISLIKE_REASONS = [
  '太普通',
  '太成熟',
  '太年轻',
  '风格不对',
  '单品不好看',
  '配色不好',
  '太贵',
  '不适合我的身材',
] as const;

export type StyleFeedbackAction =
  | 'like'
  | 'dislike'
  | 'favorite'
  | 'unfavorite'
  | 'purchase_click'
  | 'regenerate_ai'
  | 'mode_switch';

type FeedbackProduct = Pick<ClothingItem, 'id' | 'name' | 'category' | 'price' | 'brand'>;

export type StyleFeedbackEvent = {
  recommendationId: string;
  outfitId: string | null;
  mode: RecommendationMode;
  gender: UserBodyProfile['gender'] | null;
  profile: Partial<UserBodyProfile> | null;
  scene: string | null;
  style: string | null;
  budget: number | null;
  products: FeedbackProduct[];
  action: StyleFeedbackAction;
  reason: string | null;
  timestamp: string;
};

function readEvents(): StyleFeedbackEvent[] {
  try {
    const value = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function productSnapshot(item: ClothingItem): FeedbackProduct {
  return { id: item.id, name: item.name, category: item.category, price: item.price, brand: item.brand };
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(31, result) + value.charCodeAt(index) | 0;
  return Math.abs(result).toString(36);
}

export function createRecommendationId(profile?: Partial<UserBodyProfile> | null) {
  if (!profile) return `local-${Date.now().toString(36)}`;
  return `rec-${hash(JSON.stringify([
    profile.gender, profile.height, profile.weight, profile.bodyType, profile.skinTone,
    profile.stylePreference, profile.occasion, profile.season, profile.mode, profile.budget,
  ]))}`;
}

export function recordStyleFeedback({
  profile,
  recommendationId,
  outfit,
  product,
  action,
  reason,
}: {
  profile?: Partial<UserBodyProfile> | null;
  recommendationId?: string;
  outfit?: OutfitSet;
  product?: ClothingItem;
  action: StyleFeedbackAction;
  reason?: string;
}) {
  const products = outfit?.items.map(productSnapshot) ?? (product ? [productSnapshot(product)] : []);
  const event: StyleFeedbackEvent = {
    recommendationId: recommendationId || createRecommendationId(profile),
    outfitId: outfit?.id || null,
    mode: profile?.mode === 'advanced' ? 'advanced' : 'daily',
    gender: profile?.gender || null,
    profile: profile ? { ...profile, measurements: { ...(profile.measurements || {}) } } : null,
    scene: profile?.occasion || null,
    style: profile?.stylePreference || null,
    budget: Number.isFinite(profile?.budget) ? Number(profile?.budget) : null,
    products,
    action,
    reason: reason || null,
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify([...readEvents(), event].slice(-MAX_FEEDBACK_EVENTS)));
    return true;
  } catch {
    return false;
  }
}

export function readStyleFeedback() {
  return readEvents();
}
