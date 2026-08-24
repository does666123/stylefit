import { useLocation, useNavigate } from 'react-router';
import { useState } from 'react';
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
import type { ClothingItem } from '@/types';
import { useT } from '@/i18n';
import { useFavorites } from '@/hooks/useRecommendation';

export function FavoritesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  const { favoriteItems, isFavorite, toggleFavorite } = useFavorites();
  const fromRecommendations = Boolean((location.state as { fromRecommendations?: boolean } | null)?.fromRecommendations);
  const returnToRecommendations = () => {
    if (fromRecommendations) {
      navigate(-1);
      return;
    }
    navigate('/recommendations');
  };

  return (
    <div className="phase-two-favorites min-h-screen page-enter">
      {/* Nav */}
      <nav className="favorites-nav sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 overflow-hidden rounded-lg border border-[#EEEBE3] bg-white">
              <img src="/stylefit-logo.jpg" alt="" width="32" height="32" className="h-full w-full object-cover" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
              StyleFit
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="outline"
              size="sm"
              onClick={returnToRecommendations}
              className="favorites-back-button"
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
            <Heart className="h-5 w-5 fill-[#E0782C] text-[#E0782C]" />
            <h1 className="text-2xl font-bold text-[#1A1A1A]">{t('favorites.title')}</h1>
          </div>
          <p className="text-sm text-[#6B6B66]">
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
          <div className="favorites-empty flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Heart className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[#1A1A1A]">
              {t('favorites.empty.title')}
            </h3>
            <p className="mb-6 text-sm text-[#6B6B66]">
              {t('favorites.empty.desc')}
            </p>
            <Button
              onClick={returnToRecommendations}
              className="sf-primary-button"
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
  toggleFavorite: (item: ClothingItem | string) => void;
  t: (key: any, params?: any) => string;
}) {
  const [imgError, setImgError] = useState(false);
  const fav = isFavorite(item.id);

  const catLabelMap: Record<string, string> = {
    top: t('rec.category.top'),
    bottom: t('rec.category.bottom'),
    shoes: t('rec.category.shoes'),
    accessory: t('rec.category.accessory'),
    outerwear: t('rec.category.outerwear'),
  };

  return (
    <Card className="favorite-card group overflow-hidden">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#1B1E26]">
        {!imgError ? (
          <img
            src={item.image}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#77756F]">
            <Shirt className="h-16 w-16" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="favorite-category-badge text-xs font-medium">
            {catLabelMap[item.category] || item.category}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          <Badge className="favorite-rating-badge text-xs">
            <Star className="mr-0.5 h-3 w-3 fill-current" />
            {item.rating}
          </Badge>
        </div>
        {/* Remove from favorites button */}
        <button
          onClick={() => toggleFavorite(item)}
          className="favorite-remove-icon absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110"
          title={t('favorites.removeFavorite')}
        >
          <Heart className={`h-5 w-5 ${fav ? 'fill-[#D7C39D] text-[#D7C39D]' : 'text-[#AAA49B]'}`} />
        </button>
      </div>

      <CardContent className="p-4">
        <div className="mb-1 text-xs text-[#8A8A84]">{item.brand}</div>
        <h3 className="mb-2 text-base font-semibold text-[#1A1A1A] line-clamp-1">{item.name}</h3>

        {/* Recommend reason */}
        {item.recommendReason && (
          <div className="favorite-reason mb-2 flex items-start gap-1.5 rounded-lg px-2.5 py-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-[#D7C39D] shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">{item.recommendReason}</p>
          </div>
        )}

        <p className="mb-3 text-sm text-[#6B6B66] line-clamp-2 leading-relaxed">{item.description}</p>

        {/* Suitable info */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {item.suitableBodyTypes.slice(0, 3).map(bt => (
            <span key={bt} className="favorite-tag inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs">
              <User className="h-2.5 w-2.5" />
              {bt}
            </span>
          ))}
          {item.occasions.slice(0, 2).map(occ => (
            <span key={occ} className="favorite-tag favorite-occasion-tag inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs">
              <MapPin className="h-2.5 w-2.5" />
              {occ}
            </span>
          ))}
        </div>

        {/* Styling tips */}
        {item.stylingTips && (
          <div className="favorite-tips mb-3 rounded-lg border border-dashed px-2.5 py-1.5">
            <p className="text-xs text-[#6B6B66]">
              <span className="font-medium text-[#4A4A45]">{t('favorites.stylingTips')}：</span>{item.stylingTips}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-[#C96A22]">
              {item.currency}{item.price}
            </span>
            {item.priceRange && (
              <span className="ml-1.5 text-xs text-[#8A8A84]">{item.priceRange}</span>
            )}
          </div>
          <Button size="sm" className="sf-primary-button" onClick={() => window.open(item.buyLink, '_blank')}>
            {t('favorites.buyNow')}<ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {/* Unfavorite button */}
        <Button
          variant="ghost"
          size="sm"
          className="favorite-remove-button mt-3 w-full"
          onClick={() => toggleFavorite(item)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t('favorites.removeFavorite')}
        </Button>
      </CardContent>
    </Card>
  );
}

export default FavoritesPage;
