export type Gender = 'male' | 'female';

export type BodyType = 'slim' | 'standard' | 'athletic' | 'curvy' | 'plus';

export type SkinTone = 'fair' | 'light' | 'medium' | 'tan' | 'dark';

export type StylePreference =
  | 'casual'
  | 'business'
  | 'streetwear'
  | 'minimal'
  | 'elegant'
  | 'sporty';

export type Occasion =
  | 'daily'
  | 'work'
  | 'date'
  | 'party'
  | 'travel'
  | 'formal';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';

export interface BodyMeasurements {
  shoulderWidth?: number; // cm
  waist?: number; // cm
  hip?: number; // cm
  legLength?: number; // cm
  chest?: number; // cm
}

export interface UserBodyProfile {
  gender: Gender;
  height: number; // cm
  weight: number; // kg
  age?: number; // 年龄（可选，默认 25）
  budget?: number; // 预算上限（元，可选）
  bodyType: BodyType;
  skinTone: SkinTone;
  stylePreference: StylePreference;
  occasion: Occasion;
  season: Season;
  measurements: BodyMeasurements;
}

export type ClothingCategory =
  | 'top'
  | 'bottom'
  | 'dress'
  | 'outerwear'
  | 'shoes'
  | 'accessory';

export type FitType = 'slim' | 'regular' | 'relaxed' | 'oversized' | 'wide';

/**
 * 统一商品数据结构
 * 为后续接入淘宝联盟 API 预留扩展方向：
 * - commissionRate: 佣金比例（淘宝联盟返回）
 * - couponPrice: 券后价（淘宝联盟返回）
 * - couponLink: 领券链接（淘宝联盟返回）
 * - salesVolume: 月销量（淘宝联盟返回）
 * - shopName: 店铺名称（淘宝联盟返回）
 */
export interface ProductItem {
  /** 商品唯一标识 */
  id: string;
  /** 商品名称 */
  name: string;
  /** 商品图片 URL */
  image: string;
  /** 价格（展示用，如 "¥199" 或 "199"） */
  price: string;
  /** 商品分类（如 "上装"、"下装"） */
  category: string;
  /** 风格标签（如 "休闲"、"商务"） */
  style: string;
  /** 商品标签数组（如 ["显瘦", "百搭"]） */
  tags: string[];
  /** 购买链接（当前为占位链接，后续替换为淘宝联盟推广链接） */
  url: string;
  /** 品牌名称 */
  brand?: string;
  /** 推荐理由 */
  recommendReason?: string;
  /** 搭配建议 */
  stylingTips?: string;
  /** 面料说明 */
  material?: string;
  /** 价格区间描述 */
  priceRange?: string;
  /** 适合体型 */
  suitableBodyTypes?: BodyType[];
  /** 适合肤色 */
  suitableSkinTones?: SkinTone[];
  /** 适合场合 */
  occasions?: Occasion[];
  /** 适合季节 */
  seasons?: Season[];
}

/**
 * AI 匹配结果
 * 包含匹配度百分比和匹配原因说明
 */
export interface MatchResult {
  /** 匹配度百分比（0-100） */
  score: number;
  /** 匹配原因列表（说明哪些维度命中/扣分） */
  reasons: string[];
}

export interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  subCategory?: string;
  price: number;
  currency: string;
  image: string;
  buyLink: string;
  brand: string;
  colors: string[];
  sizes: string[];
  fit: FitType;
  suitableBodyTypes: BodyType[];
  suitableSkinTones: SkinTone[];
  styles: StylePreference[];
  occasions: Occasion[];
  seasons: Season[];
  description: string;
  rating: number;
  tags: string[];
  // 体型特征匹配
  bestFor?: {
    tall?: boolean;
    short?: boolean;
    broadShoulder?: boolean;
    narrowShoulder?: boolean;
    longLegs?: boolean;
    shortLegs?: boolean;
    thickWaist?: boolean;
    thinWaist?: boolean;
  };
  // 商业化展示字段
  recommendReason?: string; // 推荐理由（针对特定体型）
  stylingTips?: string; // 搭配建议
  material?: string; // 面料说明
  priceRange?: string; // 价格区间描述
}

export interface OutfitSet {
  id: string;
  name: string;
  items: ClothingItem[];
  totalPrice: number;
  description: string;
  tags: string[];
  occasion: Occasion;
  style: StylePreference;
  // 商业化展示字段
  themeName?: string; // 主题名称（如"春季老钱风穿搭"）
  suitableBodyDesc?: string; // 适合身材描述
  stylingAdvice?: string; // 整体搭配建议
  itemReasons?: { itemId: string; reason: string }[]; // 每件单品的推荐理由
  // AI 匹配度字段
  matchScore?: number; // 套装整体匹配度（0-100）
  matchReasons?: string[]; // 匹配原因说明
  itemMatchScores?: { itemId: string; score: number; reasons: string[] }[]; // 每件单品的匹配度
}

export interface FavoriteItem {
  id: string;
  addedAt: string;
}
