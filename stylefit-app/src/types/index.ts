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
  age?: number;
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
}

export interface FavoriteItem {
  id: string;
  addedAt: string;
}
