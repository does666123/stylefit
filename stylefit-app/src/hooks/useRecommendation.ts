import { useMemo, useCallback } from 'react';
import { useState, useEffect } from 'react';
import type { UserBodyProfile, ClothingItem, OutfitSet, FavoriteItem } from '../types';
import { clothingData } from '../data/clothing';

// localStorage keys
const PROFILE_KEY = 'stylefit_profile';
const FAV_KEY = 'stylefit_favorites';

function calculateBMI(height: number, weight: number): number {
  const heightM = height / 100;
  return weight / (heightM * heightM);
}

function getScore(item: ClothingItem, profile: UserBodyProfile, bmi: number): number {
  let score = 0;

  // 性别过滤 - 不匹配直接返回0分排除
  const itemGender = item.id.startsWith('m-') ? 'male' : item.id.startsWith('f-') ? 'female' : null;
  if (itemGender && itemGender !== profile.gender) return 0;

  // 体型匹配 (权重最高)
  if (item.suitableBodyTypes.includes(profile.bodyType)) {
    score += 35;
  } else if (item.suitableBodyTypes.includes('standard')) {
    score += 15;
  }

  // 肤色匹配
  if (item.suitableSkinTones.includes(profile.skinTone)) {
    score += 10;
  }

  // 风格匹配
  if (item.styles.includes(profile.stylePreference)) {
    score += 25;
  }

  // 场合匹配
  if (item.occasions.includes(profile.occasion)) {
    score += 15;
  }

  // 季节匹配
  if (item.seasons.includes('all') || item.seasons.includes(profile.season)) {
    score += 10;
  } else {
    score += 3;
  }

  // BMI 微调
  if (bmi < 18.5 && item.fit === 'slim') score += 5;
  if (bmi >= 24 && (item.fit === 'relaxed' || item.fit === 'oversized' || item.fit === 'wide')) score += 8;
  if (bmi >= 24 && item.tags.some(t => t.includes('显瘦') || t.includes('遮肉'))) score += 10;

  // 身体测量数据微调 - 安全访问，防止 undefined 崩溃
  const m = profile.measurements || {};
  if (item.bestFor) {
    if (m.legLength && m.legLength < 75) {
      if (item.bestFor.shortLegs) score += 15;
      if (item.tags.some(t => t.includes('高腰') || t.includes('短款') || t.includes('九分') || t.includes('显腿长'))) score += 10;
    }
    if (m.legLength && m.legLength >= 85) {
      if (item.bestFor.tall) score += 10;
      if (item.tags.some(t => t.includes('长款') || t.includes('气场') || t.includes('阔腿'))) score += 8;
    }
    if (m.shoulderWidth) {
      if (m.shoulderWidth >= 45 && item.bestFor.broadShoulder) score += 8;
      if (m.shoulderWidth < 40 && item.bestFor.narrowShoulder) score += 8;
    }
    if (m.waist) {
      if (m.waist >= 85 && (item.bestFor.thickWaist || item.fit === 'relaxed' || item.fit === 'oversized')) score += 10;
      if (m.waist < 70 && item.bestFor.thinWaist) score += 5;
    }
  }

  score += item.rating * 2;
  return score;
}

export function useRecommendations(profile: UserBodyProfile | null) {
  return useMemo(() => {
    if (!profile) return [];
    const bmi = calculateBMI(profile.height, profile.weight);

    const scored = clothingData
      .map((item) => ({ item, score: getScore(item, profile, bmi) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(({ item }) => item);
  }, [profile]);
}

export function getBMICategory(height: number, weight: number) {
  const bmi = calculateBMI(height, weight);
  let category: string;
  let advice: string;

  if (bmi < 18.5) {
    category = '偏瘦';
    advice = '建议选择修身或略宽松的版型，避免过于紧身的款式。可以利用叠穿增加层次感，横条纹和口袋设计能增加视觉宽度。';
  } else if (bmi < 24) {
    category = '标准';
    advice = '体型匀称，大多数版型都能驾驭。可以根据个人风格自由选择，修身款和宽松款都能穿出好效果。';
  } else if (bmi < 28) {
    category = '微胖';
    advice = '建议选择垂感好、略宽松的款式，V领、竖条纹、深色等元素有助于视觉显瘦。避免过于紧身或过于oversized的极端款式。';
  } else {
    category = '偏胖';
    advice = '建议选择深色、版型挺括的服装，V领和竖条纹是显瘦利器。避免过于紧身或过于宽松的款式，适度宽松最得体。';
  }

  return { bmi: Math.round(bmi * 10) / 10, category, advice };
}

export function generateOutfitSets(recommendations: ClothingItem[]): OutfitSet[] {
  const tops = recommendations.filter(i => i.category === 'top');
  const bottoms = recommendations.filter(i => i.category === 'bottom' || i.category === 'dress');
  const outerwears = recommendations.filter(i => i.category === 'outerwear');
  const shoes = recommendations.filter(i => i.category === 'shoes');
  const accessories = recommendations.filter(i => i.category === 'accessory');

  const outfits: OutfitSet[] = [];

  for (let i = 0; i < 3 && i < tops.length; i++) {
    const top = tops[i];
    // 安全访问：防止空数组导致 undefined
    const bottom = bottoms.length > 0 ? bottoms[i % bottoms.length] : undefined;
    const outer = outerwears.length > 0 ? outerwears[i % outerwears.length] : undefined;
    const shoe = shoes.length > 0 ? shoes[i % shoes.length] : undefined;
    const acc = accessories.length > 0 ? accessories[i % accessories.length] : undefined;

    const items = [top, bottom, outer, shoe, acc].filter((item): item is ClothingItem => !!item);
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

    outfits.push({
      id: `outfit-${i}`,
      name: `${top.subCategory || '上装'} + ${bottom ? (bottom.subCategory || '下装') : '...'} 搭配`,
      items,
      totalPrice,
      description: `根据你的体型和风格，推荐 ${top.name}${bottom ? ' 搭配 ' + bottom.name : ''}${outer ? '，' + outer.name + ' 作为外套' : ''}。`,
      tags: [top.styles[0], top.occasions[0], '搭配推荐'],
      occasion: top.occasions[0] || 'daily',
      style: top.styles[0] || 'casual',
    });
  }

  return outfits;
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
        setFavorites(JSON.parse(raw));
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
      .map(f => clothingData.find(c => c.id === f.id))
      .filter((c): c is ClothingItem => !!c);
  }, [favorites]);

  return { favorites, isFavorite, toggleFavorite, favoriteItems };
}
