import { useMemo, useCallback } from 'react';
import { useState, useEffect } from 'react';
import type { UserBodyProfile, ClothingItem, OutfitSet, FavoriteItem, MatchResult } from '../types';
import { clothingData } from '../data/clothing';

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
 */
function calculateMatchResult(
  item: ClothingItem,
  profile: UserBodyProfile,
  bmi: number
): MatchResult {
  const reasons: string[] = [];
  let rawScore = 0;
  const maxPossibleScore = 100; // 理论最大基础分

  // 性别过滤 - 不匹配直接返回0分排除
  const itemGender = item.id.startsWith('m-') ? 'male' : item.id.startsWith('f-') ? 'female' : null;
  if (itemGender && itemGender !== profile.gender) {
    return { score: 0, reasons: ['性别不匹配'] };
  }

  // === 1. 体型匹配 (35分) ===
  if (item.suitableBodyTypes.includes(profile.bodyType)) {
    rawScore += 35;
    const bodyTypeLabel: Record<string, string> = {
      slim: '偏瘦', standard: '标准', athletic: '运动型', curvy: '曲线型', plus: '丰腴型'
    };
    reasons.push(`✓ 适合${bodyTypeLabel[profile.bodyType] || profile.bodyType}体型`);
  } else if (item.suitableBodyTypes.includes('standard')) {
    rawScore += 15;
    reasons.push('~ 标准体型也可穿着');
  } else {
    reasons.push('✗ 体型匹配度一般');
  }

  // === 2. 风格匹配 (20分) ===
  if (item.styles.includes(profile.stylePreference)) {
    rawScore += 20;
    const styleLabel: Record<string, string> = {
      casual: '休闲风', business: '商务风', streetwear: '街头风',
      minimal: '简约风', elegant: '优雅风', sporty: '运动风'
    };
    reasons.push(`✓ 符合${styleLabel[profile.stylePreference] || profile.stylePreference}偏好`);
  } else {
    reasons.push('~ 风格略有差异');
  }

  // === 3. 场合匹配 (15分) ===
  if (item.occasions.includes(profile.occasion)) {
    rawScore += 15;
    const occasionLabel: Record<string, string> = {
      daily: '日常', work: '职场', date: '约会', party: '派对', travel: '旅行', formal: '正式场合'
    };
    reasons.push(`✓ 适合${occasionLabel[profile.occasion] || profile.occasion}场合`);
  }

  // === 4. 肤色匹配 (10分) ===
  if (item.suitableSkinTones.includes(profile.skinTone)) {
    rawScore += 10;
    reasons.push('✓ 肤色搭配协调');
  }

  // === 5. 季节匹配 (8分) ===
  if (item.seasons.includes('all') || item.seasons.includes(profile.season)) {
    rawScore += 8;
    if (!item.seasons.includes('all')) {
      const seasonLabel: Record<string, string> = { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' };
      reasons.push(`✓ 适合${seasonLabel[profile.season] || profile.season}穿着`);
    }
  }

  // === 6. 年龄适配 (5分) ===
  const age = profile.age || 25; // 默认25岁
  if (age < 25 && (item.styles.includes('streetwear') || item.styles.includes('casual'))) {
    rawScore += 5;
    reasons.push('✓ 年轻活力风格');
  } else if (age >= 25 && age < 40 && (item.styles.includes('business') || item.styles.includes('minimal'))) {
    rawScore += 5;
    reasons.push('✓ 成熟质感风格');
  } else if (age >= 40 && (item.styles.includes('business') || item.styles.includes('elegant'))) {
    rawScore += 5;
    reasons.push('✓ 稳重优雅风格');
  } else {
    rawScore += 2;
  }

  // === 7. 预算匹配 (7分) ===
  const budget = profile.budget;
  if (budget && budget > 0) {
    if (item.price <= budget) {
      rawScore += 7;
      reasons.push(`✓ 价格 ¥${item.price} 在预算内`);
    } else if (item.price <= budget * 1.2) {
      rawScore += 4;
      reasons.push(`~ 价格 ¥${item.price} 略超预算`);
    } else {
      reasons.push(`✗ 价格 ¥${item.price} 超出预算较多`);
    }
  } else {
    rawScore += 4; // 无预算限制时给基础分
  }

  // === 额外加分 ===
  // BMI 与版型适配
  if (bmi < 18.5 && item.fit === 'slim') {
    rawScore += 5;
    reasons.push('✓ 修身版型适合偏瘦身材');
  }
  if (bmi >= 24 && (item.fit === 'relaxed' || item.fit === 'oversized' || item.fit === 'wide')) {
    rawScore += 8;
    reasons.push('✓ 宽松版型修饰身材');
  }
  if (bmi >= 24 && item.tags.some(t => t.includes('显瘦') || t.includes('遮肉'))) {
    rawScore += 5;
    reasons.push('✓ 显瘦设计');
  }

  // 身体测量数据精确匹配
  const m = profile.measurements || {};
  if (item.bestFor) {
    if (m.legLength && m.legLength < 75) {
      if (item.bestFor.shortLegs) {
        rawScore += 8;
        reasons.push('✓ 适合短腿型，优化比例');
      }
      if (item.tags.some(t => t.includes('高腰') || t.includes('九分') || t.includes('显腿长'))) {
        rawScore += 5;
        reasons.push('✓ 高腰/九分设计显腿长');
      }
    }
    if (m.legLength && m.legLength >= 85) {
      if (item.bestFor.tall) {
        rawScore += 5;
        reasons.push('✓ 适合长腿型');
      }
    }
    if (m.shoulderWidth) {
      if (m.shoulderWidth >= 45 && item.bestFor.broadShoulder) {
        rawScore += 5;
        reasons.push('✓ 适合宽肩体型');
      }
      if (m.shoulderWidth < 40 && item.bestFor.narrowShoulder) {
        rawScore += 5;
        reasons.push('✓ 适合窄肩体型');
      }
    }
    if (m.waist) {
      if (m.waist >= 85 && (item.bestFor.thickWaist || item.fit === 'relaxed' || item.fit === 'oversized')) {
        rawScore += 5;
        reasons.push('✓ 宽松腰围舒适');
      }
    }
  }

  // 商品评分加成（最多10分）
  rawScore += Math.min(item.rating * 2, 10);

  // 归一化到 0-100 百分比
  // 理论最高分约 150+，我们映射到 100 分制
  const normalizedScore = Math.min(Math.round((rawScore / maxPossibleScore) * 100), 100);

  return { score: normalizedScore, reasons };
}

/** 获取商品匹配度（向后兼容） */
function getScore(item: ClothingItem, profile: UserBodyProfile, bmi: number): number {
  return calculateMatchResult(item, profile, bmi).score;
}

/** 带匹配度的推荐结果 */
export interface ScoredItem {
  item: ClothingItem;
  matchResult: MatchResult;
}

export function useRecommendations(profile: UserBodyProfile | null): ClothingItem[] {
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

/** 获取带匹配度详情的推荐结果 */
export function useRecommendationsWithMatch(profile: UserBodyProfile | null): ScoredItem[] {
  return useMemo(() => {
    if (!profile) return [];
    const bmi = calculateBMI(profile.height, profile.weight);

    return clothingData
      .map((item) => ({
        item,
        matchResult: calculateMatchResult(item, profile, bmi),
      }))
      .filter(({ matchResult }) => matchResult.score > 0)
      .sort((a, b) => b.matchResult.score - a.matchResult.score);
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

export function generateOutfitSets(recommendations: ClothingItem[], profile?: UserBodyProfile | null): OutfitSet[] {
  const tops = recommendations.filter(i => i.category === 'top');
  const bottoms = recommendations.filter(i => i.category === 'bottom' || i.category === 'dress');
  const outerwears = recommendations.filter(i => i.category === 'outerwear');
  const shoes = recommendations.filter(i => i.category === 'shoes');
  const accessories = recommendations.filter(i => i.category === 'accessory');

  const outfits: OutfitSet[] = [];

  const themeNames = [
    '都市精英穿搭', '质感日常搭配', '周末休闲风格',
    '商务轻正装', '潮流街头搭配', '简约高级感',
  ];
  const seasonLabel = profile ? { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季', all: '四季' }[profile.season] || '' : '';

  // 预计算匹配度（如果有 profile）
  const bmi = profile ? calculateBMI(profile.height, profile.weight) : 0;

  for (let i = 0; i < 3 && i < tops.length; i++) {
    const top = tops[i];
    // 安全访问：防止空数组导致 undefined
    const bottom = bottoms.length > 0 ? bottoms[i % bottoms.length] : undefined;
    const outer = outerwears.length > 0 ? outerwears[i % outerwears.length] : undefined;
    const shoe = shoes.length > 0 ? shoes[i % shoes.length] : undefined;
    const acc = accessories.length > 0 ? accessories[i % accessories.length] : undefined;

    const items = [top, bottom, outer, shoe, acc].filter((item): item is ClothingItem => !!item);
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

    // 生成每件单品的个性化推荐理由
    const itemReasons: { itemId: string; reason: string }[] = items.map(item => ({
      itemId: item.id,
      reason: item.recommendReason || generateDynamicReason(item, profile),
    }));

    // 计算每件单品的匹配度
    const itemMatchScores: { itemId: string; score: number; reasons: string[] }[] = profile
      ? items.map(item => {
          const match = calculateMatchResult(item, profile, bmi);
          return { itemId: item.id, score: match.score, reasons: match.reasons };
        })
      : [];

    // 计算套装整体匹配度（取各单品匹配度的加权平均）
    const matchScore = itemMatchScores.length > 0
      ? Math.round(itemMatchScores.reduce((sum, m) => sum + m.score, 0) / itemMatchScores.length)
      : undefined;

    // 套装匹配原因（汇总高分单品的原因）
    const matchReasons = itemMatchScores.length > 0
      ? itemMatchScores
          .filter(m => m.score >= 70)
          .slice(0, 3)
          .flatMap(m => m.reasons.filter(r => r.startsWith('✓')).slice(0, 2))
      : undefined;

    // 生成适合身材描述
    const bodyTypeLabel = profile ? mapBodyTypeForDesc(profile.bodyType) : '';
    const heightDesc = profile ? `${profile.height}cm左右` : '';
    const suitableBodyDesc = profile
      ? `适合${heightDesc}${bodyTypeLabel}身材`
      : '适合大多数身材';

    // 生成整体搭配建议
    const stylingAdvice = generateStylingAdvice(items, profile);

    const themeName = `${seasonLabel || ''}${themeNames[i % themeNames.length]}`;

    outfits.push({
      id: `outfit-${i}`,
      name: `${top.subCategory || '上装'} + ${bottom ? (bottom.subCategory || '下装') : '...'} 搭配`,
      items,
      totalPrice,
      description: `根据你的体型和风格，推荐 ${top.name}${bottom ? ' 搭配 ' + bottom.name : ''}${outer ? '，' + outer.name + ' 作为外套' : ''}。`,
      tags: [top.styles[0], top.occasions[0], '搭配推荐'].filter(Boolean),
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

function mapBodyTypeForDesc(bodyType: string): string {
  const map: Record<string, string> = {
    slim: '偏瘦', standard: '标准', athletic: '运动型', curvy: '曲线型', plus: '微胖',
  };
  return map[bodyType] || '';
}

function generateDynamicReason(item: ClothingItem, profile?: UserBodyProfile | null): string {
  if (!profile) return item.description;

  const parts: string[] = [];
  const height = profile.height;
  const bodyType = profile.bodyType;

  // 根据体型生成理由
  if (bodyType === 'slim') {
    if (item.fit === 'relaxed' || item.fit === 'oversized') parts.push('略宽松版型增加视觉存在感');
    else if (item.tags.some(t => t.includes('叠穿') || t.includes('层次') || t.includes('重磅'))) parts.push('增加上半身层次感和厚度');
    else parts.push('修身版型展现精干身材');
  } else if (bodyType === 'plus' || bodyType === 'curvy') {
    if (item.fit === 'relaxed' || item.fit === 'wide') parts.push('宽松版型舒适不紧绷');
    if (item.tags.some(t => t.includes('显瘦') || t.includes('藏肉') || t.includes('垂感'))) parts.push('视觉显瘦效果好');
    else parts.push('合身剪裁修饰身形');
  } else if (bodyType === 'athletic') {
    if (item.fit === 'slim') parts.push('修身版型凸显运动型身材优势');
    else parts.push('挺括版型与运动身材相得益彰');
  } else {
    parts.push('百搭款式适合标准身材');
  }

  // 根据身高生成理由
  if (height < 165 && item.tags.some(t => t.includes('显腿长') || t.includes('高腰') || t.includes('短款') || t.includes('厚底'))) {
    parts.push('有助于拉长身材比例');
  } else if (height >= 180 && item.tags.some(t => t.includes('中长款') || t.includes('阔腿') || t.includes('气场'))) {
    parts.push('高个子穿着更有气场');
  }

  // 根据季节
  if (item.seasons.includes('all') || item.seasons.includes(profile.season)) {
    parts.push('当季穿着正合适');
  }

  return parts.length > 0 ? parts.join('，') : item.description;
}

function generateStylingAdvice(items: ClothingItem[], profile?: UserBodyProfile | null): string {
  const tips: string[] = [];
  const hasOuter = items.some(i => i.category === 'outerwear');
  const hasAcc = items.some(i => i.category === 'accessory');

  if (profile && profile.bodyType === 'slim') {
    tips.push('可通过叠穿增加层次感');
  } else if (profile && (profile.bodyType === 'plus' || profile.bodyType === 'curvy')) {
    tips.push('建议上深下浅或全身同色系搭配更显瘦');
  }

  if (hasOuter) {
    tips.push('外套敞开穿更显随性');
  }
  if (hasAcc) {
    tips.push('配饰点缀提升整体精致度');
  }

  if (tips.length === 0) {
    tips.push('简约搭配即可穿出好效果');
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
