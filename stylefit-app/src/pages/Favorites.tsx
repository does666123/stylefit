import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  ArrowLeft,
  Heart,
  Trash2,
  Shirt,
  Star,
  ExternalLink,
  User,
  MapPin,
  Lightbulb,
} from 'lucide-react';
import { clothingData } from '@/data/clothing';
import type { ClothingItem } from '@/types';
import { useT } from '@/i18n';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // 从 localStorage 读取收藏
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stylefit_favorites');
      if (saved) {
        const ids = JSON.parse(saved) as string[];
        setFavoriteIds(ids);
      }
    } catch {
      // ignore
    }
  }, []);

  const isFavorite = (id: string) => favoriteIds.includes(id);

  const toggleFavorite = (id: string) => {
    setFavoriteIds(prev => {
      const next = prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id];
      try {
        localStorage.setItem('stylefit_favorites', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const favoriteItems = clothingData.filter(item => isFavorite(item.id));

  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              StyleFit
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/recommendations')}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('favorites.backToRecommendations')}
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <h1 className="text-2xl font-bold text-slate-900">{t('favorites.title')}</h1>
          </div>
          <p className="text-sm text-slate-500">
            {t('favorites.count', { count: favoriteItems.length })}
          </p>
        </div>

        {/* Favorites Grid */}
        {favoriteItems.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteItems.map((item, idx) => (
              <div
                key={item.id}
                className="stagger-item animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.06}s` }}
              >
                <FavoriteCard
                  item={item}
                  isFavorite={isFavorite}
                  toggleFavorite={toggleFavorite}
                  t={t}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Heart className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              {t('favorites.empty.title')}
            </h3>
            <p className="mb-6 text-sm text-slate-500">
              {t('favorites.empty.desc')}
            </p>
            <Button
              onClick={() => navigate('/recommendations')}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {t('favorites.empty.button')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function FavoriteCard({
  item,
  isFavorite,
  toggleFavorite,
  t,
}: {
  item: ClothingItem;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  t: (key: any, params?: any) => string;
}) {
  const [imgError, setImgError] = useState(false);
  const fav = isFavorite(item.id);

  const catLabelMap: Record<string, string> = {
    top: t('rec.category.top'),
    bottom: t('rec.category.bottom'),
    shoes: t('rec.category.shoes'),
    accessory: t('rec.category.accessory'),
    outer: t('rec.category.outerwear'),
  };

  return (
    <Card className="group overflow-hidden border-0 shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
        {!imgError ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Shirt className="h-16 w-16" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/90 text-xs font-medium">
            {catLabelMap[item.category] || item.category}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge className="bg-amber-500 text-white text-xs">
            <Star className="mr-0.5 h-3 w-3 fill-current" />
            {item.rating}
          </Badge>
        </div>
        {/* Remove from favorites button */}
        <button
          onClick={() => toggleFavorite(item.id)}
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md transition-transform hover:scale-110"
          title={t('favorites.removeFavorite')}
        >
          <Heart className={`h-5 w-5 ${fav ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
        </button>
      </div>

      <CardContent className="p-4">
        <div className="mb-1 text-xs text-slate-400">{item.brand}</div>
        <h3 className="mb-2 text-base font-semibold text-slate-900 line-clamp-1">{item.name}</h3>

        {/* Recommend reason */}
        {item.recommendReason && (
          <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{item.recommendReason}</p>
          </div>
        )}

        <p className="mb-3 text-sm text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>

        {/* Suitable info */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {item.suitableBodyTypes.slice(0, 3).map(bt => (
            <span key={bt} className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              <User className="h-2.5 w-2.5" />
              {bt}
            </span>
          ))}
          {item.occasions.slice(0, 2).map(occ => (
            <span key={occ} className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
              <MapPin className="h-2.5 w-2.5" />
              {occ}
            </span>
          ))}
        </div>

        {/* Styling tips */}
        {item.stylingTips && (
          <div className="mb-3 rounded-lg border border-dashed border-slate-200 px-2.5 py-1.5">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">{t('favorites.stylingTips')}：</span>{item.stylingTips}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-slate-900">
              {item.currency}{item.price}
            </span>
            {item.priceRange && (
              <span className="ml-1.5 text-xs text-slate-400">{item.priceRange}</span>
            )}
          </div>
          <Button size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={() => window.open(item.buyLink, '_blank')}>
            {t('favorites.buyNow')}<ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {/* Unfavorite button */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => toggleFavorite(item.id)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t('favorites.removeFavorite')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default FavoritesPage;
