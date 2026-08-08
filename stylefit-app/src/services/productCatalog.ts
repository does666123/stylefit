import { clothingData } from '@/data/clothing';
import type { ClothingItem } from '@/types';

export function getProducts(): ClothingItem[] {
  return clothingData;
}

export function getProductById(id: string): ClothingItem | undefined {
  return clothingData.find((product) => product.id === id);
}
