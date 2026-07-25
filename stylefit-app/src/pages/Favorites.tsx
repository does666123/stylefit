import { useNavigate } from 'react-router';
import { useFavorites } from '../hooks/useRecommendation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shirt,
  ArrowLeft,
  ExternalLink,
  Star,
  Heart,
  User,
  MapPin,
  Lightbulb,
  Trash2,
  ShoppingBag,
} from 'lucide-react';
import type { ClothingItem } from '../types';
import { useState } from 'react';

const catLabelMap: Record<string, string> = {
  all: '全部', top: '上装', bottom: '下装', dress: '裙装',
  outerwear: '外套', shoes: '鞋履', accessory: '配饰',
};

export default function Favorites() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, favoriteItems } = useFavorites();

  if (favoriteItems.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 page-enter">
        <Card className="mx-4 max-w-md border-0 shadow-md text-center animate-scale-in">
          <CardContent className="p-8">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Heart className="h-8 w-8 text-slate-300" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900">还没有收藏</h2>
            <p className="mb-6 text-slate-500">
              去推荐页面浏览穿搭方案，点击爱心收藏你喜欢的单品
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => navigate('/recommendations')}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                去看推荐
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 page-enter">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <Shirt className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">StyleFit</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/recommendations')}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回推荐
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <h1 className="text-2xl font-bold text-slate-900">我的收藏</h1>
          </div>
          <p className="text-sm text-slate-500">
            共 {favoriteItems.length} 件收藏单品
          </p>
        </div>

        {/* Favorites Grid */}
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
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FavoriteCard({
  item,
  isFavorite,
  toggleFavorite,
}: {
  item: ClothingItem;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const fav = isFavorite(item.id);

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
          title="取消收藏"
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
              {mapBodyType(bt)}
            </span>
          ))}
          {item.occasions.slice(0, 2).map(occ => (
            <span key={occ} className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
              <MapPin className="h-2.5 w-2.5" />
              {mapOccasion(occ)}
            </span>
          ))}
        </div>

        {/* Styling tips */}
        {item.stylingTips && (
          <div className="mb-3 rounded-lg border border-dashed border-slate-200 px-2.5 py-1.5">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">搭配建议：</span>{item.stylingTips}
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
            去购买<ExternalLink className="ml-1 h-3 w-3" />
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
          取消收藏
        </Button>
      </CardContent>
    </Card>
  );
}

function mapBodyType(type: string): string {
  const map: Record<string, string> = { slim: '偏瘦', standard: '标准', athletic: '运动型', curvy: '曲线型', plus: '丰腴型' };
  return map[type] || type;
}
function mapOccasion(occ: string): string {
  const map: Record<string, string> = { daily: '日常', work: '职场', date: '约会', party: '派对', travel: '旅行', formal: '正式' };
  return map[occ] || occ;
}
