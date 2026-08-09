import productsData from '@/data/products.json';
import type {
  BodyType,
  ClothingCategory,
  ClothingItem,
  FitType,
  Occasion,
  Season,
  SkinTone,
  StylePreference,
} from '@/types';

type ProductRecord = {
  id: string;
  name: string;
  category: '上装' | '下装' | '鞋' | '包' | '配饰';
  subCategory: string;
  tags: {
    scene: string[];
    style: string[];
    season: string[];
    gender: 'female' | 'male' | 'unisex';
  };
  priceBand: string;
  color: string;
  imageUrl: string;
  buyUrl: string;
  commissionUrl: string;
  active: boolean;
};

const sceneMap: Record<string, Occasion> = {
  日常通勤: 'daily',
  职场商务: 'work',
  约会聚会: 'date',
  派对活动: 'party',
  旅行出游: 'travel',
  正式场合: 'formal',
};

const styleMap: Record<string, StylePreference> = {
  休闲: 'casual',
  商务: 'business',
  街头: 'streetwear',
  简约: 'minimal',
  优雅: 'elegant',
  运动: 'sporty',
};

const seasonMap: Record<string, Season> = {
  春: 'spring',
  夏: 'summer',
  秋: 'autumn',
  冬: 'winter',
};

const priceMap: Record<string, number> = {
  '100以下': 79,
  '100-300': 199,
  '300-500': 399,
  '500-1000': 699,
  '1000以上': 1299,
};

const allBodyTypes: BodyType[] = ['slim', 'standard', 'athletic', 'curvy', 'plus'];
const allSkinTones: SkinTone[] = ['fair', 'light', 'medium', 'tan', 'dark'];

function mapValues<T>(values: string[], map: Record<string, T>): T[] {
  return [...new Set(values.flatMap((value) => map[value] ? [map[value]] : []))];
}

function getCategory(product: ProductRecord): ClothingCategory {
  if (product.category === '上装') {
    return /夹克|风衣|大衣|羽绒|马甲/.test(product.subCategory) ? 'outerwear' : 'top';
  }
  if (product.category === '下装') {
    return product.subCategory === '连衣裙' ? 'dress' : 'bottom';
  }
  if (product.category === '鞋') return 'shoes';
  return 'accessory';
}

function getFit(product: ProductRecord): FitType {
  if (/阔腿|宽松/.test(product.name)) return 'wide';
  if (/修身|紧身/.test(product.name)) return 'slim';
  return 'regular';
}

const products: ClothingItem[] = (productsData as ProductRecord[])
  .filter((product) => product.active)
  .map((product) => {
    const styles = mapValues(product.tags.style, styleMap);
    const occasions = mapValues(product.tags.scene, sceneMap);
    const seasons = mapValues(product.tags.season, seasonMap);

    return {
      id: product.id,
      name: product.name,
      gender: product.tags.gender,
      category: getCategory(product),
      subCategory: product.subCategory,
      price: priceMap[product.priceBand] ?? 199,
      currency: '¥',
      image: product.imageUrl,
      buyLink: product.commissionUrl || product.buyUrl || '#',
      brand: '通用款',
      colors: [product.color],
      sizes: ['S', 'M', 'L', 'XL'],
      fit: getFit(product),
      suitableBodyTypes: allBodyTypes,
      suitableSkinTones: allSkinTones,
      styles: styles.length ? styles : ['casual'],
      occasions: occasions.length ? occasions : ['daily'],
      seasons: seasons.length ? seasons : ['all'],
      description: `${product.color}${product.subCategory}，适合${product.tags.scene.join('、')}`,
      rating: 4.5,
      tags: [...product.tags.style, ...product.tags.scene, ...product.tags.season],
      priceRange: product.priceBand,
    };
  });

export function getProducts(): ClothingItem[] {
  return products;
}

export function getProductById(id: string): ClothingItem | undefined {
  return products.find((product) => product.id === id);
}
