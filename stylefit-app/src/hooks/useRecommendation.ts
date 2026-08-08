import { useMemo, useCallback } from 'react';
import { useState, useEffect } from 'react';
import type { UserBodyProfile, ClothingItem, OutfitSet, FavoriteItem, MatchResult, Season } from '../types';
import { getProductById, getProducts } from '@/services/productCatalog';

// localStorage keys
const PROFILE_KEY = 'stylefit_profile';
const FAV_KEY = 'stylefit_favorites';

function calculateBMI(height: number, weight: number): number {
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

/**
 * AI 匹配度计算引擎
 * 
 * 评分维度与权重（总分 100）：
 * - 体型匹配：35 分（suitableBodyTypes 包含用户体型）
 * - 风格匹配：20 分（styles 包含用户风格偏好）
 * - 场合匹配：15 分（occasions 包含用户场合）
 * - 肤色匹配：10 分（suitableSkinTones 包含用户肤色）
 * - 季节匹配：8 分（seasons 包含当前季节或 all）
 * - 年龄适配：5 分（根据年龄段调整风格倾向）
 * - 预算匹配：7 分（商品价格是否在预算范围内）
 * 
 * 额外加分（最多 10 分）：
 * - BMI 与版型适配：+5~8 分
 * - 身体测量数据精确匹配：+5~15 分
 * - 商品评分加成：+rating*2 分
 * 
 * 最终分数归一化到 0-100 的百分比
 * 
 * 天气校准：当提供 weatherSeason 时，用它替代 profile.season 进行季节维度打分
 */
type TFunc = (key: string, params?: Record<string, string | number>) => string;

function calculateMatchResult(
  item: ClothingItem,
  profile: UserBodyProfile,
  bmi: number,
  t: TFunc,
  weatherSeason?: Season
): MatchResult {
  const reasons: string[] = [];
  let rawScore = 0;
  const maxPossibleScore = 100;

  // Gender filter
  const itemGender = item.id.startsWith('m-') ? 'male' : item.id.startsWith('f-') ? 'female' : null;
  if (itemGender && itemGender !== profile.gender) {
    return { score: 0, reasons: [t('rec.match.reason.genderMismatch')] };
  }

  // === 1. Body type match (35) ===
  if (item.suitableBodyTypes.includes(profile.bodyType)) {
    rawScore += 35;
    const typeLabel = t(`rec.match.bodyType.${profile.bodyType}`);
    reasons.push(t('rec.match.reason.bodyTypeMatch', { type: typeLabel }));
  } else if (item.suitableBodyTypes.includes('standard')) {
    rawScore += 15;
    reasons.push(t('rec.match.reason.bodyTypeStandard'));
  } else {
    reasons.push(t('rec.match.reason.bodyTypePoor'));
  }

  // === 2. Style match (20) ===
  if (item.styles.includes(profile.stylePreference)) {
    rawScore += 20;
    const styleLabel = t(`rec.match.style.${profile.stylePreference}`);
    reasons.push(t('rec.match.reason.styleMatch', { style: styleLabel }));
  } else {
    reasons.push(t('rec.match.reason.styleDiff'));
  }

  // === 3. Occasion match (15) ===
  if (item.occasions.includes(profile.occasion)) {
    rawScore += 15;
    const occasionLabel = t(`rec.match.occasion.${profile.occasion}`);
    reasons.push(t('rec.match.reason.occasionMatch', { occasion: occasionLabel }));
  }

  // === 4. Skin tone match (10) ===
  if (item.suitableSkinTones.includes(profile.skinTone)) {
    rawScore += 10;
    reasons.push(t('rec.match.reason.skinToneMatch'));
  }

  // === 5. Season match (8) ===
  const effectiveSeason = weatherSeason || profile.season;
  if (item.seasons.includes('all') || item.seasons.includes(effectiveSeason)) {
    rawScore += 8;
    if (!item.seasons.includes('all')) {
      const seasonLabel = t(`rec.match.season.${effectiveSeason}`);
      reasons.push(t('rec.match.reason.seasonMatch', { season: seasonLabel }));
    }
  } else if (weatherSeason && weatherSeason !== profile.season) {
    rawScore += 2;
  }

  // === 6. Age match (5) ===
  const age = profile.age || 25;
  if (age < 25 && (item.styles.includes('streetwear') || item.styles.includes('casual'))) {
    rawScore += 5;
    reasons.push(t('rec.match.reason.ageYoung'));
  } else if (age >= 25 && age < 40 && (item.styles.includes('business') || item.styles.includes('minimal'))) {
    rawScore += 5;
    reasons.push(t('rec.match.reason.ageMature'));
  } else if (age >= 40 && (item.styles.includes('business') || item.styles.includes('elegant'))) {
    rawScore += 5;
    reasons.push(t('rec.match.reason.ageElegant'));
  } else {
    rawScore += 2;
  }

  // === 7. Budget match (7) ===
  const budget = profile.budget;
  if (budget && budget > 0) {
    if (item.price <= budget) {
      rawScore += 7;
      reasons.push(t('rec.match.reason.priceInBudget', { price: item.price }));
    } else if (item.price <= budget * 1.2) {
      rawScore += 4;
      reasons.push(t('rec.match.reason.priceOverBudget', { price: item.price }));
    } else {
      reasons.push(t('rec.match.reason.priceOverBudgetMuch', { price: item.price }));
    }
  } else {
    rawScore += 4;
  }

  // === Bonus ===
  if (bmi < 18.5 && item.fit === 'slim') {
    rawScore += 5;
    reasons.push(t('rec.match.reason.fitSlim'));
  }
  if (bmi >= 24 && (item.fit === 'relaxed' || item.fit === 'oversized' || item.fit === 'wide')) {
    rawScore += 8;
    reasons.push(t('rec.match.reason.fitWide'));
  }
  if (bmi >= 24 && item.tags.some(tag => tag.includes('显瘦') || tag.includes('遮肉'))) {
    rawScore += 5;
    reasons.push(t('rec.match.reason.slimDesign'));
  }

  const m = profile.measurements || {};
  if (item.bestFor) {
    if (m.legLength && m.legLength < 75) {
      if (item.bestFor.shortLegs) {
        rawScore += 8;
        reasons.push(t('rec.match.reason.shortLegs'));
      }
      if (item.tags.some(tag => tag.includes('高腰') || tag.includes('九分') || tag.includes('显腿长'))) {
        rawScore += 5;
        reasons.push(t('rec.match.reason.highWaist'));
      }
    }
    if (m.legLength && m.legLength >= 85) {
      if (item.bestFor.tall) {
        rawScore += 5;
        reasons.push(t('rec.match.reason.longLegs'));
      }
    }
    if (m.shoulderWidth) {
      if (m.shoulderWidth >= 45 && item.bestFor.broadShoulder) {
        rawScore += 5;
        reasons.push(t('rec.match.reason.wideShoulders'));
      }
      if (m.shoulderWidth < 40 && item.bestFor.narrowShoulder) {
        rawScore += 5;
        reasons.push(t('rec.match.reason.narrowShoulders'));
      }
    }
    if (m.waist) {
      if (m.waist >= 85 && (item.bestFor.thickWaist || item.fit === 'relaxed' || item.fit === 'oversized')) {
        rawScore += 5;
        reasons.push(t('rec.match.reason.wideWaist'));
      }
    }
  }

  rawScore += Math.min(item.rating * 2, 10);

  const normalizedScore = Math.min(Math.round((rawScore / maxPossibleScore) * 100), 100);
  return { score: normalizedScore, reasons };
}

/** 获取商品匹配度（向后兼容） */
function getScore(item: ClothingItem, profile: UserBodyProfile, bmi: number, t: TFunc): number {
  return calculateMatchResult(item, profile, bmi, t).score;
}

/** 带匹配度的推荐结果 */
export interface ScoredItem {
  item: ClothingItem;
  matchResult: MatchResult;
}

export function useRecommendations(profile: UserBodyProfile | null, t?: TFunc): ClothingItem[] {
  return useMemo(() => {
    if (!profile) return [];
    const bmi = calculateBMI(profile.height, profile.weight);
    const tFunc = t || ((key: string) => key);

    const scored = getProducts()
      .map((item) => ({ item, score: getScore(item, profile, bmi, tFunc) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(({ item }) => item);
  }, [profile, t]);
}

/** 获取带匹配度详情的推荐结果 */
export function useRecommendationsWithMatch(profile: UserBodyProfile | null, t: TFunc, weather?: { thicknessTier: string; season: Season; remarks: string[] } | null): ScoredItem[] {
  return useMemo(() => {
    if (!profile) return [];
    const bmi = calculateBMI(profile.height, profile.weight);
    const weatherSeason = weather?.season;

    return getProducts()
      .map((item) => ({
        item,
        matchResult: calculateMatchResult(item, profile, bmi, t, weatherSeason),
      }))
      .filter(({ matchResult }) => matchResult.score > 0)
      .sort((a, b) => b.matchResult.score - a.matchResult.score);
  }, [profile, weather, t]);
}

export function getBMICategory(height: number, weight: number, t: TFunc) {
  const bmi = calculateBMI(height, weight);
  let category: string;
  let advice: string;

  if (bmi < 18.5) {
    category = t('rec.bmi.slim');
    advice = t('rec.bmi.slim.advice');
  } else if (bmi < 24) {
    category = t('rec.bmi.standard');
    advice = t('rec.bmi.standard.advice');
  } else if (bmi < 28) {
    category = t('rec.bmi.overweight');
    advice = t('rec.bmi.overweight.advice');
  } else {
    category = t('rec.bmi.obese');
    advice = t('rec.bmi.obese.advice');
  }

  return { bmi: Math.round(bmi * 10) / 10, category, advice };
}

export function generateOutfitSets(recommendations: ClothingItem[], t: TFunc, profile?: UserBodyProfile | null, weather?: { thicknessTier: string; season: Season; remarks: string[] } | null): OutfitSet[] {
  const tops = recommendations.filter(i => i.category === 'top');
  const bottoms = recommendations.filter(i => i.category === 'bottom' || i.category === 'dress');
  const outerwears = recommendations.filter(i => i.category === 'outerwear');
  const shoes = recommendations.filter(i => i.category === 'shoes');
  const accessories = recommendations.filter(i => i.category === 'accessory');

  const outfits: OutfitSet[] = [];

  const styleNamesStr = t('rec.outfit.styleNames');
  const themeNames = styleNamesStr.split(',');
  const seasonLabel = profile ? t(`rec.match.season.${profile.season}`) : '';

  const bmi = profile ? calculateBMI(profile.height, profile.weight) : 0;

  for (let i = 0; i < 3 && i < tops.length; i++) {
    const top = tops[i];
    const bottom = bottoms.length > 0 ? bottoms[i % bottoms.length] : undefined;
    const outer = outerwears.length > 0 ? outerwears[i % outerwears.length] : undefined;
    const shoe = shoes.length > 0 ? shoes[i % shoes.length] : undefined;
    const acc = accessories.length > 0 ? accessories[i % accessories.length] : undefined;

    const items = [top, bottom, outer, shoe, acc].filter((item): item is ClothingItem => !!item);
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

    const itemReasons: { itemId: string; reason: string }[] = items.map(item => ({
      itemId: item.id,
      reason: item.recommendReason || generateDynamicReason(item, profile, t),
    }));

    const weatherSeason = weather?.season;
    const itemMatchScores: { itemId: string; score: number; reasons: string[] }[] = profile
      ? items.map(item => {
          const match = calculateMatchResult(item, profile, bmi, t, weatherSeason);
          return { itemId: item.id, score: match.score, reasons: match.reasons };
        })
      : [];

    const matchScore = itemMatchScores.length > 0
      ? Math.round(itemMatchScores.reduce((sum, m) => sum + m.score, 0) / itemMatchScores.length)
      : undefined;

    const matchReasons = itemMatchScores.length > 0
      ? itemMatchScores
          .filter(m => m.score >= 70)
          .slice(0, 3)
          .flatMap(m => m.reasons.filter(r => r.startsWith('✓')).slice(0, 2))
      : undefined;

    const bodyTypeLabel = profile ? t(`rec.match.bodyType.${profile.bodyType}`) : '';
    const suitableBodyDesc = profile
      ? t('rec.outfit.bodyFit', { bodyType: bodyTypeLabel })
      : t('rec.outfit.mostBodyTypes');

    const stylingAdvice = generateStylingAdvice(items, profile, t);

    const themeName = `${seasonLabel || ''}${themeNames[i % themeNames.length]}`;

    const topSubCat = top.subCategory || t('rec.category.top');
    const bottomSubCat = bottom ? (bottom.subCategory || t('rec.category.bottom')) : '...';
    const outfitName = t('rec.outfit.name', { top: topSubCat, bottom: bottomSubCat });
    const outerDesc = outer ? t('rec.outfit.outerwear', { outer: outer.name }) : '';
    const bottomDesc = bottom ? ` ${bottom.name}` : '';
    const outfitDescription = t('rec.outfit.description', { top: top.name, bottom: bottomDesc }) + outerDesc;

    outfits.push({
      id: `outfit-${i}`,
      name: outfitName,
      items,
      totalPrice,
      description: outfitDescription,
      tags: [top.styles[0], top.occasions[0], t('rec.outfit.tag')].filter(Boolean),
      occasion: top.occasions[0] || 'daily',
      style: top.styles[0] || 'casual',
      themeName,
      suitableBodyDesc,
      stylingAdvice,
      itemReasons,
      matchScore,
      matchReasons,
      itemMatchScores,
    });
  }

  return outfits;
}

function generateDynamicReason(item: ClothingItem, profile: UserBodyProfile | null | undefined, t: TFunc): string {
  if (!profile) return item.description;

  const parts: string[] = [];
  const height = profile.height;
  const bodyType = profile.bodyType;

  if (bodyType === 'slim') {
    if (item.fit === 'relaxed' || item.fit === 'oversized') parts.push(t('rec.reason.slim.relaxed'));
    else if (item.tags.some(tag => tag.includes('叠穿') || tag.includes('层次') || tag.includes('重磅'))) parts.push(t('rec.reason.slim.layered'));
    else parts.push(t('rec.reason.slim.fit'));
  } else if (bodyType === 'plus' || bodyType === 'curvy') {
    if (item.fit === 'relaxed' || item.fit === 'wide') parts.push(t('rec.reason.standard.relaxed'));
    if (item.tags.some(tag => tag.includes('显瘦') || tag.includes('藏肉') || tag.includes('垂感'))) parts.push(t('rec.match.reason.slimDesign'));
    else parts.push(t('rec.reason.standard.fit'));
  } else if (bodyType === 'athletic') {
    if (item.fit === 'slim') parts.push(t('rec.reason.athletic.slim'));
    else parts.push(t('rec.reason.athletic.fit'));
  } else {
    parts.push(t('rec.reason.plus.fit'));
  }

  if (height < 165 && item.tags.some(tag => tag.includes('显腿长') || tag.includes('高腰') || tag.includes('短款') || tag.includes('厚底'))) {
    parts.push(t('rec.reason.height.short'));
  } else if (height >= 180 && item.tags.some(tag => tag.includes('中长款') || tag.includes('阔腿') || tag.includes('气场'))) {
    parts.push(t('rec.reason.height.tall'));
  }

  if (item.seasons.includes('all') || item.seasons.includes(profile.season)) {
    parts.push(t('rec.reason.season'));
  }

  return parts.length > 0 ? parts.join('，') : item.description;
}

function generateStylingAdvice(items: ClothingItem[], profile: UserBodyProfile | null | undefined, t: TFunc): string {
  const tips: string[] = [];
  const hasOuter = items.some(i => i.category === 'outerwear');
  const hasAcc = items.some(i => i.category === 'accessory');

  if (profile && profile.bodyType === 'slim') {
    tips.push(t('rec.tips.slim'));
  } else if (profile && (profile.bodyType === 'plus' || profile.bodyType === 'curvy')) {
    tips.push(t('rec.tips.plus.dark'));
  }

  if (hasOuter) {
    tips.push(t('rec.tips.outerwear'));
  }
  if (hasAcc) {
    tips.push(t('rec.tips.accessory'));
  }

  if (tips.length === 0) {
    tips.push(t('rec.tips.standard'));
  }

  return tips.join('；');
}

// Profile localStorage helpers
export function saveProfile(profile: UserBodyProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

/**
 * 从 localStorage 读取用户数据，并进行完整性验证。
 * 如果数据不完整或损坏，返回 null 以触发重新填写。
 */
export function loadProfile(): UserBodyProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 数据完整性验证：确保所有必填字段存在
      const requiredFields = ['gender', 'height', 'weight', 'bodyType', 'skinTone', 'stylePreference', 'occasion', 'season'];
      const isValid = requiredFields.every(field => parsed[field] !== undefined && parsed[field] !== null);
      if (!isValid) {
        console.warn('[StyleFit] 本地存储的用户数据不完整，将引导重新填写');
        return null;
      }
      // 确保 measurements 存在（防止旧数据缺少此字段导致白屏）
      if (!parsed.measurements || typeof parsed.measurements !== 'object') {
        parsed.measurements = {};
      }
      return parsed as UserBodyProfile;
    }
  } catch (e) {
    console.error('[StyleFit] 读取本地数据失败:', e);
  }
  return null;
}

/**
 * 获取当前季节
 */
function getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/**
 * 生成中性默认画像（用于「今天去哪」快捷入口，用户未填问卷时使用）
 * 使用合理的中间值，确保推荐结果确定性且覆盖面广。
 */
export function getNeutralProfile(occasion?: string): UserBodyProfile {
  return {
    gender: 'male',
    height: 175,
    weight: 70,
    age: 28,
    bodyType: 'standard',
    skinTone: 'light',
    stylePreference: 'casual',
    occasion: (occasion as UserBodyProfile['occasion']) || 'daily',
    season: getCurrentSeason(),
    measurements: {},
  };
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore
  }
}

// Favorites localStorage hook
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as unknown;
        if (Array.isArray(saved)) {
          setFavorites(saved.flatMap((favorite) => {
            if (typeof favorite === 'string') {
              return [{ id: favorite, addedAt: '' }];
            }
            if (
              favorite &&
              typeof favorite === 'object' &&
              'id' in favorite &&
              typeof favorite.id === 'string'
            ) {
              return [{
                id: favorite.id,
                addedAt: 'addedAt' in favorite && typeof favorite.addedAt === 'string'
                  ? favorite.addedAt
                  : '',
              }];
            }
            return [];
          }));
        }
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
      } catch {
        // ignore - 隐私模式或存储超限时可能抛出异常
      }
    }
  }, [favorites, loaded]);

  const isFavorite = useCallback((id: string) => {
    return favorites.some(f => f.id === id);
  }, [favorites]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.id === id);
      if (exists) {
        return prev.filter(f => f.id !== id);
      }
      return [...prev, { id, addedAt: new Date().toISOString() }];
    });
  }, []);

  const favoriteItems = useMemo(() => {
    return favorites
      .map(f => getProductById(f.id))
      .filter((c): c is ClothingItem => !!c);
  }, [favorites]);

  return { favorites, isFavorite, toggleFavorite, favoriteItems };
}
