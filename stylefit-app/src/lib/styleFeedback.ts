import type { ClothingItem, OutfitSet, RecommendationMode, UserBodyProfile } from '@/types';

export const FEEDBACK_QUEUE_KEY = 'stylefit_feedback_queue_v1';
export const FEEDBACK_USER_ID_KEY = 'stylefit_user_id';
export const FEEDBACK_SESSION_ID_KEY = 'stylefit_feedback_session_id_v1';
const MAX_FEEDBACK_EVENTS = 500;
const UPLOAD_TIMEOUT_MS = 8_000;

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
  | 'mode_switch'
  | 'regenerate'
  | 'switch_mode'
  | 'recommendation_view';

export type DislikeReason =
  | 'too_basic'
  | 'too_mature'
  | 'too_young'
  | 'wrong_style'
  | 'bad_item'
  | 'bad_color'
  | 'too_expensive'
  | 'bad_body_fit';

const DISLIKE_REASON_CODES: Record<(typeof DISLIKE_REASONS)[number], DislikeReason> = {
  太普通: 'too_basic',
  太成熟: 'too_mature',
  太年轻: 'too_young',
  风格不对: 'wrong_style',
  单品不好看: 'bad_item',
  配色不好: 'bad_color',
  太贵: 'too_expensive',
  不适合我的身材: 'bad_body_fit',
};

export type FeedbackProduct = {
  itemId: string;
  category: string;
  title: string;
  price: number | null;
  shop: string;
  styleScore: number | null;
};

export type OutfitScores = {
  outfitMatchScore: number | null;
  styleScore: number | null;
  colorScore: number | null;
  bodyFitScore: number | null;
  sceneScore: number | null;
  qualityScore: number | null;
};

export type StyleFeedbackEvent = {
  feedbackId: string;
  userId: string;
  sessionId: string;
  recommendationId: string;
  outfitId: string | null;
  mode: RecommendationMode;
  gender: UserBodyProfile['gender'] | null;
  profile: {
    gender: UserBodyProfile['gender'] | null;
    age: number | null;
    height: number | null;
    weight: number | null;
    bodyType: string | null;
    skinTone: string | null;
  };
  scene: string | null;
  style: string | null;
  budget: number | null;
  products: FeedbackProduct[];
  outfitScores: OutfitScores | null;
  action: StyleFeedbackAction;
  reason: DislikeReason | null;
  createdAt: string;
};

let uploadInFlight: Promise<void> | null = null;
let syncStarted = false;

function safeLocalGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function asFiniteNumber(value: unknown): number | null {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  return prefix + '-' + random;
}

function getOrCreateId(key: string, prefix: string, session = false): string {
  const current = session ? safeSessionGet(key) : safeLocalGet(key);
  if (current) return current;
  const value = createId(prefix);
  if (session) safeSessionSet(key, value);
  else safeLocalSet(key, value);
  return value;
}

export function getAnonymousUserId(): string {
  return getOrCreateId(FEEDBACK_USER_ID_KEY, 'user');
}

export function getFeedbackSessionId(): string {
  return getOrCreateId(FEEDBACK_SESSION_ID_KEY, 'session', true);
}

function readEvents(): StyleFeedbackEvent[] {
  try {
    const value = JSON.parse(safeLocalGet(FEEDBACK_QUEUE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function productSnapshot(item: ClothingItem, styleScore: number | null = null): FeedbackProduct {
  return {
    itemId: String(item.id ?? '').replace(/^taobao-/, ''),
    title: item.name || '未命名商品',
    category: item.category || '未知',
    price: asFiniteNumber(item.price),
    shop: item.brand || '',
    styleScore,
  };
}

function readOutfitScores(outfit?: OutfitSet): OutfitScores | null {
  if (!outfit) return null;
  const scores = outfit as OutfitSet & Record<string, unknown>;
  return {
    outfitMatchScore: asFiniteNumber(outfit.matchScore),
    styleScore: asFiniteNumber(scores.styleScore),
    colorScore: asFiniteNumber(scores.colorScore),
    bodyFitScore: asFiniteNumber(scores.bodyFitScore),
    sceneScore: asFiniteNumber(scores.sceneScore),
    qualityScore: asFiniteNumber(scores.qualityScore),
  };
}

function normalizeAction(action: StyleFeedbackAction): StyleFeedbackAction {
  if (action === 'regenerate_ai') return 'regenerate';
  if (action === 'mode_switch') return 'switch_mode';
  return action;
}

function normalizeReason(reason?: string): DislikeReason | null {
  if (!reason) return null;
  if (reason in DISLIKE_REASON_CODES) {
    return DISLIKE_REASON_CODES[reason as (typeof DISLIKE_REASONS)[number]];
  }
  return Object.values(DISLIKE_REASON_CODES).includes(reason as DislikeReason)
    ? reason as DislikeReason
    : null;
}

function viewFeedbackId(userId: string, recommendationId: string, outfitId: string | null): string {
  const source = userId + ':' + recommendationId + ':' + (outfitId || 'all');
  return 'view-' + hash(source);
}

function saveEvents(events: StyleFeedbackEvent[]): void {
  safeLocalSet(FEEDBACK_QUEUE_KEY, JSON.stringify(events.slice(-MAX_FEEDBACK_EVENTS)));
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
  const userId = getAnonymousUserId();
  const normalizedAction = normalizeAction(action);
  const products = outfit?.items.map((item) => {
    const score = outfit.itemMatchScores?.find((itemScore) => itemScore.itemId === item.id)?.score;
    return productSnapshot(item, asFiniteNumber(score));
  }) ?? (product ? [productSnapshot(product)] : []);
  const event: StyleFeedbackEvent = {
    feedbackId: normalizedAction === 'recommendation_view'
      ? viewFeedbackId(userId, recommendationId || createRecommendationId(profile), outfit?.id || null)
      : createId('feedback'),
    userId,
    sessionId: getFeedbackSessionId(),
    recommendationId: recommendationId || createRecommendationId(profile),
    outfitId: outfit?.id || null,
    mode: profile?.mode === 'advanced' ? 'advanced' : 'daily',
    gender: profile?.gender || null,
    profile: {
      gender: profile?.gender || null,
      age: asFiniteNumber(profile?.age),
      height: asFiniteNumber(profile?.height),
      weight: asFiniteNumber(profile?.weight),
      bodyType: profile?.bodyType || null,
      skinTone: profile?.skinTone || null,
    },
    scene: profile?.occasion || null,
    style: profile?.stylePreference || null,
    budget: asFiniteNumber(profile?.budget),
    products,
    outfitScores: readOutfitScores(outfit),
    action: normalizedAction,
    reason: normalizeReason(reason),
    createdAt: new Date().toISOString(),
  };

  const events = readEvents();
  if (!events.some((queued) => queued.feedbackId === event.feedbackId)) {
    saveEvents([...events, event]);
  }
  void flushFeedbackQueue();
  return true;
}

export function readStyleFeedback() {
  return readEvents();
}

async function uploadFeedback(event: StyleFeedbackEvent): Promise<boolean> {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timeout = controller ? window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS) : null;
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller?.signal,
      keepalive: true,
    });
    if (!response.ok) return false;
    return (await response.json().catch(() => null))?.accepted === true;
  } catch {
    return false;
  } finally {
    if (timeout !== null) window.clearTimeout(timeout);
  }
}

export function flushFeedbackQueue(): Promise<void> {
  if (uploadInFlight) return uploadInFlight;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return Promise.resolve();
  uploadInFlight = (async () => {
    for (const event of readEvents()) {
      if (!await uploadFeedback(event)) break;
      saveEvents(readEvents().filter((queued) => queued.feedbackId !== event.feedbackId));
    }
  })().finally(() => {
    uploadInFlight = null;
  });
  return uploadInFlight;
}

export function startFeedbackQueueSync(): void {
  if (syncStarted || typeof window === 'undefined') return;
  syncStarted = true;
  window.addEventListener('online', () => void flushFeedbackQueue());
  void flushFeedbackQueue();
}

export function getFeedbackStats(events: StyleFeedbackEvent[] = readEvents()) {
  const actions = events.reduce<Record<string, number>>((result, event) => {
    result[event.action] = (result[event.action] || 0) + 1;
    return result;
  }, {});
  const groupBy = (key: 'gender' | 'mode' | 'style' | 'scene') => events.reduce<Record<string, number>>((result, event) => {
    const value = key === 'gender' ? event.profile.gender : event[key];
    const group = value || 'unknown';
    result[group] = (result[group] || 0) + 1;
    return result;
  }, {});
  const views = actions.recommendation_view || events.length;
  return {
    total: events.length,
    actions,
    likeRate: views ? (actions.like || 0) / views : 0,
    favoriteRate: views ? (actions.favorite || 0) / views : 0,
    purchaseClickRate: views ? (actions.purchase_click || 0) / views : 0,
    groups: { gender: groupBy('gender'), mode: groupBy('mode'), style: groupBy('style'), scene: groupBy('scene') },
  };
}
