import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { useRecommendations, getBMICategory, generateOutfitSets, useFavorites, loadProfile, getNeutralProfile } from '../hooks/useRecommendation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Shirt,
  ArrowLeft,
  ExternalLink,
  Star,
  User,
  Ruler,
  Weight,
  Palette,
  Sparkles,
  ShoppingBag,
  Heart,
  Crown,
  Footprints,
  Lightbulb,
  MapPin,
  Check,
  ChevronDown,
  Briefcase,
  HeartHandshake,
  Dumbbell,
  PartyPopper,
  Plane,
  CloudSun,
  Umbrella,
  Wind,
  Search,
} from 'lucide-react';
import type { UserBodyProfile, ClothingItem, OutfitSet, Occasion } from '../types';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { fetchWeatherWithCache, interpretWeather, getWeatherRemark, thicknessTierToSeason, type WeatherInterpretation, type WeatherData } from '../lib/weather';
import { useT } from '../i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  cacheAIRecommendation,
  clearCachedAIRecommendation,
  getAIRecommendationProfileKey,
  readCachedAIRecommendation,
  requestAIRecommendation,
  type AIRecommendation,
} from '../lib/aiRecommendation';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';

type ProductSourceStatus = 'loading' | 'demo' | 'live' | 'empty';

type TaobaoProduct = {
  itemId?: string;
  title?: string;
  image?: string;
  price?: number;
  couponAmount?: number;
  couponPrice?: number;
  commissionRate?: number;
  shopTitle?: string;
  volume?: number;
  category?: string;
  promotionUrl?: string;
};

type TaobaoProductMeta = {
  price: number;
  couponAmount: number;
  commissionRate: number;
};

type TaobaoSourceResult = { products: TaobaoProduct[]; page: number; hasMore: boolean; message?: string };

const taobaoSourceCache = new Map<string, TaobaoSourceResult>();
const taobaoSourceRequests = new Map<string, Promise<TaobaoSourceResult>>();

const wearableTaobaoTerms = /上衣|T恤|t恤|衬衫|针织|毛衣|卫衣|Polo|polo|外套|夹克|大衣|风衣|羽绒|西装|裤|牛仔|半身裙|连衣裙|鞋|靴|凉鞋|拖鞋|包|腰带|领带|袜/;
const excludedTaobaoTerms = /手机|电脑|数码|耳机|充电|数据线|壳|家居|家具|床|枕|餐具|食品|零食|美妆|口红|护肤|洗发|香水/;

// 场合快捷切换数据
const occasionSwitcherItems: { key: Occasion; labelKey: string; icon: React.ReactNode }[] = [
  { key: 'work', labelKey: 'rec.occasion.work', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'date', labelKey: 'rec.occasion.date', icon: <HeartHandshake className="h-4 w-4" /> },
  { key: 'daily', labelKey: 'rec.occasion.daily', icon: <Dumbbell className="h-4 w-4" /> },
  { key: 'party', labelKey: 'rec.occasion.party', icon: <PartyPopper className="h-4 w-4" /> },
  { key: 'travel', labelKey: 'rec.occasion.travel', icon: <Plane className="h-4 w-4" /> },
  { key: 'formal', labelKey: 'rec.occasion.formal', icon: <Crown className="h-4 w-4" /> },
];

const styleTagLabels: Record<string, string> = {
  business: '商务',
  work: '通勤',
  casual: '休闲',
  daily: '日常',
  minimal: '简约',
};

const catList: { key: string; labelKey: string; icon: React.ReactNode }[] = [
  { key: 'all', labelKey: 'rec.category.all', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'top', labelKey: 'rec.category.top', icon: <Shirt className="h-4 w-4" /> },
  { key: 'bottom', labelKey: 'rec.category.bottom', icon: <Shirt className="h-4 w-4" /> },
  { key: 'dress', labelKey: 'rec.category.dress', icon: <Heart className="h-4 w-4" /> },
  { key: 'outerwear', labelKey: 'rec.category.outerwear', icon: <Crown className="h-4 w-4" /> },
  { key: 'shoes', labelKey: 'rec.category.shoes', icon: <Footprints className="h-4 w-4" /> },
  { key: 'accessory', labelKey: 'rec.category.accessory', icon: <Sparkles className="h-4 w-4" /> },
];

function getTaobaoScene(profile: UserBodyProfile): string | null {
  if (profile.gender === 'female') return profile.occasion === 'work' ? 'womens_work' : 'womens_minimal_top';
  return profile.occasion === 'work' ? 'mens_work' : 'mens_casual_outerwear';
}

function isWearableTaobaoProduct(product: TaobaoProduct) {
  const text = `${product.category || ''} ${product.title || ''}`;
  return wearableTaobaoTerms.test(text) && !excludedTaobaoTerms.test(text);
}

function getTaobaoCategory(text: string): ClothingItem['category'] {
  if (/鞋|靴|凉鞋|拖鞋/.test(text)) return 'shoes';
  if (/裙|连衣/.test(text)) return 'dress';
  if (/裤|牛仔|半身/.test(text)) return 'bottom';
  if (/外套|夹克|大衣|风衣|羽绒/.test(text)) return 'outerwear';
  if (/包|帽|围巾|腰带|眼镜|首饰|领带|袜/.test(text)) return 'accessory';
  return 'top';
}

function toTaobaoClothingItem(product: TaobaoProduct, profile: UserBodyProfile): ClothingItem | null {
  const itemId = typeof product.itemId === 'string' ? product.itemId.trim() : '';
  const name = typeof product.title === 'string' ? product.title.trim() : '';
  const image = typeof product.image === 'string' ? product.image.trim() : '';
  const buyLink = typeof product.promotionUrl === 'string' ? product.promotionUrl.trim() : '';
  const price = Number(product.couponPrice || product.price);
  if (!itemId || !name || !buyLink || !Number.isFinite(price) || price <= 0) return null;

  return {
    id: `taobao-${itemId}`,
    name,
    gender: profile.gender,
    category: getTaobaoCategory(`${product.category || ''} ${name}`),
    subCategory: typeof product.category === 'string' ? product.category : '淘宝联盟商品',
    price,
    currency: '¥',
    image,
    buyLink,
    brand: typeof product.shopTitle === 'string' ? product.shopTitle : '淘宝联盟',
    colors: [],
    sizes: [],
    fit: 'regular',
    suitableBodyTypes: [profile.bodyType],
    suitableSkinTones: [profile.skinTone],
    styles: [profile.stylePreference],
    occasions: [profile.occasion],
    seasons: ['all'],
    description: typeof product.volume === 'number' && product.volume > 0 ? `已售 ${product.volume}` : '淘宝联盟精选商品',
    rating: 0,
    tags: ['淘宝联盟'],
  };
}

function toTaobaoProductMeta(product: TaobaoProduct): TaobaoProductMeta {
  return {
    price: Number(product.price) || 0,
    couponAmount: Number(product.couponAmount) || 0,
    commissionRate: Number(product.commissionRate) || 0,
  };
}

function requestTaobaoProducts(scene: string, page: number, retry = false): Promise<TaobaoSourceResult> {
  const key = `${scene}:${page}`;
  if (!retry) {
    const cached = taobaoSourceCache.get(key);
    if (cached) return Promise.resolve(cached);
    const inFlight = taobaoSourceRequests.get(key);
    if (inFlight) return inFlight;
  }

  const request = fetch(`/api/taobao/products?scene=${scene}&page=${page}`)
    .then(async (response) => {
      if (!response.ok) throw new Error('unavailable');
      const payload: unknown = await response.json();
      const products = typeof payload === 'object' && payload !== null && Array.isArray((payload as { products?: unknown }).products)
        ? (payload as { products: TaobaoProduct[] }).products
        : [];
      const message = typeof payload === 'object' && payload !== null && typeof (payload as { message?: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : undefined;
      const responsePage = typeof payload === 'object' && payload !== null && Number.isInteger((payload as { page?: unknown }).page)
        ? (payload as { page: number }).page
        : page;
      const hasMore = typeof payload === 'object' && payload !== null && typeof (payload as { hasMore?: unknown }).hasMore === 'boolean'
        ? (payload as { hasMore: boolean }).hasMore
        : false;
      const result = { products, page: responsePage, hasMore, message };
      taobaoSourceCache.set(key, result);
      return result;
    })
    .finally(() => taobaoSourceRequests.delete(key));

  taobaoSourceRequests.set(key, request);
  return request;
}

export default function Recommendations() {
  const { t } = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 从 URL 读取场合参数
  const urlOccasion = searchParams.get('occasion') || '';
  const isValidOccasion = ['work', 'date', 'daily', 'party', 'travel', 'formal'].includes(urlOccasion);
  const locationState = location.state as { profile?: UserBodyProfile; aiRecommendation?: AIRecommendation } | null;

  // 优先从 location.state 读取，如果没有则从 localStorage 读取（解决刷新后数据丢失问题）
  const [profile, setProfile] = useState<UserBodyProfile | null>(() => {
    if (locationState?.profile) return locationState.profile;
    return loadProfile() || (isValidOccasion ? getNeutralProfile(urlOccasion) : null);
  });
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  const [productSourceStatus, setProductSourceStatus] = useState<ProductSourceStatus>('loading');
  const [liveProducts, setLiveProducts] = useState<ClothingItem[]>([]);
  const [taobaoProductMeta, setTaobaoProductMeta] = useState<Record<string, TaobaoProductMeta>>({});
  const [productSourceMessage, setProductSourceMessage] = useState('');
  const [productSourceAttempt, setProductSourceAttempt] = useState(0);
  const [taobaoPage, setTaobaoPage] = useState(1);
  const [hasMoreTaobaoProducts, setHasMoreTaobaoProducts] = useState(false);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showOccasionSwitcher, setShowOccasionSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const productSentinelRef = useRef<HTMLDivElement>(null);
  const hasUserScrolledRef = useRef(false);
  const loadMoreUnlockedRef = useRef(false);
  const requestedTaobaoPagesRef = useRef(new Set<number>());
  const liveProductIdsRef = useRef(new Set<string>());
  const aiRequestInFlight = useRef(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>();
  const [weatherInterp, setWeatherInterp] = useState<WeatherInterpretation | null>(null);
  const [aiRecommendation, setAIRecommendation] = useState<AIRecommendation | null>(() => {
    if (!profile) return null;
    const stateRecommendation = locationState?.profile &&
      locationState.aiRecommendation &&
      getAIRecommendationProfileKey(locationState.profile) === getAIRecommendationProfileKey(profile)
      ? locationState.aiRecommendation
      : null;
    if (stateRecommendation) cacheAIRecommendation(profile, stateRecommendation);
    return stateRecommendation || readCachedAIRecommendation(profile);
  });
  const [aiLoading, setAILoading] = useState(false);

  // 获取天气（不阻塞渲染）
  const loadWeather = useCallback(async () => {
    const result = await fetchWeatherWithCache();
    if (result?.data) {
      setWeatherData(result.data);
      setWeatherInterp(interpretWeather(result.data, result.isDefault, result.locationName, t as any));
    } else {
      setWeatherData(null);
    }
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return () => { window.history.scrollRestoration = previousScrollRestoration; };
  }, []);

  useEffect(() => {
    const markUserScroll = () => {
      hasUserScrolledRef.current = true;
      setHasUserScrolled(true);
    };
    window.addEventListener('scroll', markUserScroll, { passive: true });
    return () => window.removeEventListener('scroll', markUserScroll);
  }, []);

  // 点击外部关闭场合切换器
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setShowOccasionSwitcher(false);
      }
    }
    if (showOccasionSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showOccasionSwitcher]);

  // 切换场合
  const handleSwitchOccasion = (occasion: Occasion) => {
    setShowOccasionSwitcher(false);
    const stored = loadProfile();
    if (stored) {
      // 有画像：只更新场合
      setProfile({ ...stored, occasion });
    } else {
      // 无画像：使用中性默认
      setProfile(getNeutralProfile(occasion));
    }
    setAIRecommendation(null);
    clearCachedAIRecommendation();
    setSearchParams({ occasion });
    setTaobaoPage(1);
    setHasMoreTaobaoProducts(false);
    requestedTaobaoPagesRef.current.clear();
    liveProductIdsRef.current.clear();
    hasUserScrolledRef.current = false;
    setHasUserScrolled(false);
    loadMoreUnlockedRef.current = false;
  };

  const recommendations = useRecommendations(profile, t as any);
  const weatherForEngine = useMemo(() => {
    if (!weatherData) return null;
    const interpretation = interpretWeather(weatherData, false, '', t as (key: string) => string);
    return {
      thicknessTier: interpretation.thicknessTier,
      season: thicknessTierToSeason(interpretation.thicknessTier),
      remarks: [getWeatherRemark(weatherData, t as (key: string) => string) || ''],
    };
  }, [weatherData, t]);
  const localOutfits = useMemo(() => generateOutfitSets(recommendations, t as any, profile, weatherForEngine), [recommendations, profile, weatherForEngine, t]);

  const regenerateAIRecommendation = useCallback(async () => {
    if (!profile || !recommendations.length || aiRequestInFlight.current) return;

    aiRequestInFlight.current = true;
    setAILoading(true);
    try {
      const recommendation = await requestAIRecommendation(profile, recommendations);
      if (recommendation) cacheAIRecommendation(profile, recommendation);
      setAIRecommendation(recommendation);
    } catch {
      setAIRecommendation(null);
    } finally {
      aiRequestInFlight.current = false;
      setAILoading(false);
    }
  }, [profile, recommendations]);

  const outfits = useMemo(() => {
    if (!aiRecommendation) return localOutfits;

    const products = new Map(recommendations.map((item) => [item.id, item]));
    const generated = aiRecommendation.outfits.flatMap((outfit, index): OutfitSet[] => {
      const selected = outfit.items.flatMap(({ id }) => {
        const item = products.get(id);
        return item ? [item] : [];
      });
      const totalPrice = selected.reduce((total, item) => total + item.price, 0);
      if (selected.length < 2 || (profile?.budget && totalPrice > profile.budget)) return [];

      return [{
        id: `ai-outfit-${index}`,
        name: outfit.name,
        themeName: outfit.name,
        items: selected,
        totalPrice,
        description: aiRecommendation.summary,
        tags: [selected[0].styles[0], selected[0].occasions[0]].filter(Boolean),
        occasion: profile?.occasion || selected[0].occasions[0] || 'daily',
        style: profile?.stylePreference || selected[0].styles[0] || 'casual',
        stylingAdvice: outfit.stylingTip,
        itemReasons: outfit.items.map(({ id, reason }) => ({ itemId: id, reason })),
      }];
    });

    return generated.length ? generated : localOutfits;
  }, [aiRecommendation, localOutfits, profile, recommendations]);
  const bmiInfo = useMemo(() => {
    if (!profile) return null;
    return getBMICategory(profile.height, profile.weight, t as any);
  }, [profile]);

  const { isFavorite, toggleFavorite, favoriteItems } = useFavorites();

  const loadTaobaoProducts = useCallback(async (page = 1, retry = false) => {
    if (!profile) return;
    const scene = getTaobaoScene(profile);
    if (!scene) {
      setProductSourceStatus('demo');
      setProductSourceMessage('演示搭配，真实商品正在接入。');
      return;
    }
    if (requestedTaobaoPagesRef.current.has(page) && !retry) return;
    requestedTaobaoPagesRef.current.add(page);
    if (page === 1) {
      setProductSourceStatus('loading');
      setProductSourceMessage('');
      setLoadMoreError(false);
    } else {
      setIsLoadingMoreProducts(true);
      setLoadMoreError(false);
    }

    try {
      const payload = await requestTaobaoProducts(scene, page, retry);
      const products = payload.products.filter(isWearableTaobaoProduct);
      const items = products.map((product) => toTaobaoClothingItem(product, profile)).filter((item): item is ClothingItem => item !== null);
      const meta = Object.fromEntries(products.map((product) => [`taobao-${product.itemId}`, toTaobaoProductMeta(product)]));
      const newItems = page === 1 ? items : items.filter((item) => !liveProductIdsRef.current.has(item.id));
      if (page === 1) liveProductIdsRef.current = new Set(newItems.map((item) => item.id));
      else newItems.forEach((item) => liveProductIdsRef.current.add(item.id));
      setLiveProducts((current) => page === 1 ? newItems : [...current, ...newItems]);
      setTaobaoProductMeta((current) => page === 1 ? meta : { ...current, ...meta });
      setTaobaoPage(page);
      setHasMoreTaobaoProducts(payload.hasMore && newItems.length > 0);
      if (page === 1) {
        setProductSourceStatus(items.length >= 3 ? 'live' : 'empty');
        setProductSourceMessage(items.length >= 3 ? '' : payload.message || '本场景暂未找到合适服装。');
      }
    } catch {
      if (page === 1) {
        setLiveProducts([]);
        setTaobaoProductMeta({});
        setProductSourceStatus('empty');
        setProductSourceMessage('商品服务暂时不可用，请稍后重试。');
      } else {
        requestedTaobaoPagesRef.current.delete(page);
        setLoadMoreError(true);
      }
    } finally {
      if (page > 1) setIsLoadingMoreProducts(false);
    }
  }, [profile]);

  useEffect(() => {
    requestedTaobaoPagesRef.current.clear();
    liveProductIdsRef.current.clear();
    hasUserScrolledRef.current = false;
    setHasUserScrolled(false);
    loadMoreUnlockedRef.current = false;
    setTaobaoPage(1);
    setHasMoreTaobaoProducts(false);
    loadTaobaoProducts(1, productSourceAttempt > 0);
  }, [loadTaobaoProducts, productSourceAttempt]);

  useEffect(() => {
    const sentinel = productSentinelRef.current;
    if (!sentinel || showFavorites || productSourceStatus !== 'live' || !hasMoreTaobaoProducts) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        loadMoreUnlockedRef.current = true;
        if (loadMoreError) setLoadMoreError(false);
        return;
      }
      if (!hasUserScrolled || !loadMoreUnlockedRef.current || isLoadingMoreProducts || loadMoreError) return;
      loadMoreUnlockedRef.current = false;
      loadTaobaoProducts(taobaoPage + 1);
    }, { rootMargin: '300px 0px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreTaobaoProducts, hasUserScrolled, isLoadingMoreProducts, loadMoreError, loadTaobaoProducts, productSourceStatus, showFavorites, taobaoPage]);

  const catalogItems = productSourceStatus === 'live'
    ? liveProducts
    : productSourceStatus === 'demo'
      ? recommendations
      : [];
  const showProductSourceEmptyState = !showFavorites
    && productSourceStatus === 'empty';
  const filteredByCategory = useMemo(() => {
    const categoryItems = activeCategory === 'all'
      ? catalogItems
      : catalogItems.filter((item) => item.category === activeCategory);
    const query = productSearch.trim().toLocaleLowerCase();
    if (!query) return categoryItems;
    return categoryItems.filter((item) => [item.name, item.brand, item.category, ...item.tags]
      .join(' ')
      .toLocaleLowerCase()
      .includes(query));
  }, [catalogItems, activeCategory, productSearch]);

  const displayItems = showFavorites ? favoriteItems : filteredByCategory;

  // 没有 profile 数据且无场合参数时显示引导页
  if (!profile) {
    return (
      <div className="phase-two-results flex min-h-screen items-center justify-center">
        <Card className="result-empty-card mx-4 max-w-md text-center animate-scale-in">
          <CardContent className="p-8">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Shirt className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold">{t('rec.noProfile.title')}</h2>
            <p className="mb-6 text-slate-500">
              {t('rec.noProfile.desc')}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate('/survey')}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {t('rec.noProfile.goTest')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                {t('rec.noProfile.backHome')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="phase-two-results min-h-screen page-enter">
      {/* Navbar */}
      <nav className="result-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <Shirt className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">StyleFit</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/favorites', { state: { fromRecommendations: true } })}
              className="relative"
            >
              <Heart className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">{t('common.favorites')}</span>
              {favoriteItems.length > 0 && (
                <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {favoriteItems.length}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearCachedAIRecommendation();
                navigate('/survey', { state: { restartSurvey: true } });
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">{t('common.retakeTest')}</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-7 sm:py-8">
        <div className="result-page-heading mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-medium tracking-[0.16em] text-[#D7C39D]">PERSONAL STYLING</p>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[#F7F4EE] sm:text-3xl">{t('rec.title')}</h1>
          </div>
          <span className="result-ai-state">
            {aiLoading ? <><Spinner />AI {t('common.loading')}</> : aiRecommendation ? <>✦ AI</> : t('rec.outfitRecommendations')}
          </span>
        </div>
        {!aiRecommendation && !aiLoading && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#12141A] px-4 py-3 text-sm text-[#AAA49B]">
            <span>AI 推荐结果已过期，可重新生成</span>
            <Button className="sf-primary-button" onClick={regenerateAIRecommendation}>
              重新生成 AI 推荐
            </Button>
          </div>
        )}
        {/* 场合标签 + 未填问卷提示 */}
        {isValidOccasion && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{t('rec.todayGoing')}</span>
              <div className="relative" ref={switcherRef}>
                <button
                  onClick={() => setShowOccasionSwitcher(!showOccasionSwitcher)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  {(t as any)(`rec.occasion.${urlOccasion}`) || urlOccasion}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOccasionSwitcher ? 'rotate-180' : ''}`} />
                </button>
                {/* 场合切换下拉 */}
                {showOccasionSwitcher && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-44 rounded-xl border bg-white p-1.5 shadow-lg animate-scale-in">
                    {occasionSwitcherItems.map((item) => (
                      <button
                        key={item.key}
                        onClick={() => handleSwitchOccasion(item.key)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          item.key === urlOccasion
                            ? 'bg-slate-100 font-medium text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item.icon}
                        {(t as any)(item.labelKey)}
                        {item.key === urlOccasion && <Check className="ml-auto h-3.5 w-3.5 text-slate-900" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* 未填问卷提示 */}
            {!loadProfile() && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <Lightbulb className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t('rec.fillSurvey')}</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate('/survey')}
                  className="h-auto px-1 py-0 text-xs font-medium text-amber-700 underline"
                >
                  {t('rec.goFill')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 天气条 */}
        {weatherInterp && (
          <div className="result-weather mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              {weatherInterp.rainNote ? (
                <Umbrella className="h-4 w-4" />
              ) : weatherInterp.windNote ? (
                <Wind className="h-4 w-4" />
              ) : (
                <CloudSun className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-slate-900">
                {t('rec.weather.today')} {Math.round(weatherInterp.temperature)}°C · {t('rec.weather.feelsLike')} {Math.round(weatherInterp.apparentTemperature)}°C {weatherInterp.weatherLabel}
              </span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="text-sm text-slate-500">{weatherInterp.thicknessLabel}</span>
            </div>
            {weatherInterp.isDefault && (
              <span className="hidden text-[10px] text-slate-400 sm:inline">{t('rec.weather.defaultLocation')}</span>
            )}
          </div>
        )}

        {/* Profile Summary */}
        <Card className="result-summary mb-6 overflow-hidden animate-fade-in-up">
          <CardContent className="p-0">
            <div className="result-summary-main px-5 py-4 text-white">
              <div className="mb-2 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[#D7C39D]" />
                <h2 className="text-lg font-bold">{t('rec.bodyReport.title')}</h2>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-slate-400" />
                  {profile.gender === 'male' ? t('rec.bodyReport.gender.male') : t('rec.bodyReport.gender.female')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Ruler className="h-4 w-4 text-slate-400" />
                  {profile.height}cm
                </span>
                <span className="flex items-center gap-1.5">
                  <Weight className="h-4 w-4 text-slate-400" />
                  {profile.weight}kg
                </span>
                {bmiInfo && (
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                      BMI {bmiInfo.bmi}
                    </span>
                    <span className="text-slate-300">{bmiInfo.category}</span>
                  </span>
                )}
              </div>
              {bmiInfo && (
                <p className="result-summary-advice mt-2 text-sm leading-relaxed">
                  {bmiInfo.advice}
                </p>
              )}
            </div>

            <div className="result-summary-tags grid grid-cols-2 gap-3 px-5 py-3 sm:grid-cols-5">
              <ProfileTag
                icon={<Palette className="h-4 w-4" />}
                label={t('rec.bodyReport.skinTone')}
                value={mapSkinTone(profile.skinTone, t as any)}
              />
              <ProfileTag
                icon={<User className="h-4 w-4" />}
                label={t('rec.bodyReport.bodyType')}
                value={mapBodyType(profile.bodyType, t as any)}
              />
              <ProfileTag
                icon={<Sparkles className="h-4 w-4" />}
                label={t('rec.bodyReport.style')}
                value={mapStyle(profile.stylePreference, t as any)}
              />
              <ProfileTag
                icon={<ShoppingBag className="h-4 w-4" />}
                label={t('occasion')}
                value={mapOccasion(profile.occasion, t as any)}
              />
              {profile.budget && profile.budget > 0 && (
                <ProfileTag
                  icon={<Check className="h-4 w-4" />}
                  label={t('survey.budget.label')}
                  value={`¥${profile.budget}`}
                />
              )}
            </div>

            {profile.measurements && Object.values(profile.measurements).some((v) => v) && (
              <div className="border-t px-6 py-3">
                <div className="text-xs text-slate-400 mb-2">{t('survey.body.measurements')}</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {profile.measurements.shoulderWidth && (
                    <span className="rounded-md bg-slate-100 px-2 py-1">{t('shoulderWidth')} {profile.measurements.shoulderWidth}cm</span>
                  )}
                  {profile.measurements.waist && (
                    <span className="rounded-md bg-slate-100 px-2 py-1">{t('waist')} {profile.measurements.waist}cm</span>
                  )}
                  {profile.measurements.hip && (
                    <span className="rounded-md bg-slate-100 px-2 py-1">{t('hip')} {profile.measurements.hip}cm</span>
                  )}
                  {profile.measurements.legLength && (
                    <span className="rounded-md bg-slate-100 px-2 py-1">{t('legLength')} {profile.measurements.legLength}cm</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outfit Recommendations */}
        {!showFavorites && outfits.length > 0 && (
          <div className="mb-10">
            <div className="result-outfit-title mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#D7C39D]" />
              <h2 className="text-xl font-bold text-[#F7F4EE]">{t('rec.outfitRecommendations')}</h2>
              {aiLoading && <span className="inline-flex items-center gap-1 text-xs text-[#AAA49B]"><Spinner />AI {t('common.loading')}</span>}
              {aiRecommendation && <Badge className="result-ai-badge">AI</Badge>}
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {outfits.map((outfit, idx) => (
                <div key={outfit.id} className="stagger-item animate-fade-in-up">
                  <OutfitCard
                    outfit={outfit}
                    isFavorite={isFavorite}
                    toggleFavorite={toggleFavorite}
                    index={idx}
                    budget={profile?.budget}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        {!showFavorites && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {catList.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setShowFavorites(false);
                    setProductSourceAttempt((count) => count + 1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    activeCategory === cat.key && !showFavorites
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cat.icon}
                  {(t as any)(cat.labelKey)}
                </button>
              ))}
            </div>
            <label className="relative block w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#AAA49B]" aria-hidden="true" />
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="搜索衣服、品牌或标签"
                className="focus-ring h-10 w-full rounded-xl border border-white/[0.1] bg-[#12141A] py-2 pl-9 pr-3 text-sm text-[#F7F4EE] placeholder:text-[#77756F]"
              />
            </label>
          </div>
        )}

        {/* Section Title */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">
              {showFavorites ? t('rec.favoriteItems') : t('rec.forYou')}
            </h2>
            {!showFavorites && productSourceStatus === 'live' && (
              <Badge className="border border-[#C9A46A]/30 bg-[#C9A46A]/10 text-[#D7C39D]">淘宝联盟精选</Badge>
            )}
            {!showFavorites && productSourceStatus === 'demo' && (
              <Badge className="border border-white/[0.1] bg-white/[0.05] text-[#AAA49B]">演示搭配</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {showFavorites
              ? t('rec.itemCount', { count: favoriteItems.length })
              : productSourceStatus === 'live'
                ? `共 ${catalogItems.length} 件淘宝联盟商品`
                : productSourceStatus === 'demo'
                  ? '演示搭配，真实商品正在接入'
                  : '正在查找适合本场景的服装'}
          </p>
        </div>

        {/* Items Grid */}
        {!showFavorites && productSourceStatus === 'loading' ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5" aria-label="商品加载中">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#12141A] p-2.5 sm:p-4">
                <Skeleton className="aspect-square w-full bg-white/[0.08] sm:aspect-[4/5]" />
                <Skeleton className="mt-3 h-3 w-1/3 bg-white/[0.08]" />
                <Skeleton className="mt-2 h-4 w-4/5 bg-white/[0.08]" />
                <Skeleton className="mt-4 h-5 w-1/4 bg-white/[0.08]" />
              </div>
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#12141A] px-6 py-16 text-center">
            <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-[#D7C39D]" />
            <p className="text-base font-medium text-[#F7F4EE]">
              {showFavorites ? t('rec.noFavorites') : showProductSourceEmptyState ? '暂时没有可展示的商品' : t('rec.noCategoryResults')}
            </p>
            {!showFavorites && showProductSourceEmptyState && <p className="mx-auto mt-2 max-w-sm text-sm text-[#AAA49B]">{productSourceMessage || '淘宝联盟商品暂时未返回结果，请稍后再试。'}</p>}
            {!showFavorites && showProductSourceEmptyState && (
              <Button className="sf-secondary-button mt-5" variant="outline" onClick={() => setProductSourceAttempt((count) => count + 1)}>重试</Button>
            )}
          </div>
        ) : (
          <>
            {!showFavorites && productSourceStatus === 'demo' && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C9A46A]/20 bg-[#C9A46A]/[0.06] px-4 py-3 text-sm text-[#AAA49B]">
                <span>{productSourceMessage}</span>
                <Button className="sf-secondary-button h-8" variant="outline" onClick={() => setProductSourceAttempt((count) => count + 1)}>稍后重试</Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5">
              {displayItems.map((item) => (
                <div key={item.id} className="stagger-item animate-fade-in-up">
                  <ClothingCard
                    item={item}
                    isFavorite={isFavorite}
                    toggleFavorite={toggleFavorite}
                    taobaoMeta={taobaoProductMeta[item.id]}
                  />
                </div>
              ))}
            </div>
          </>
        )}
        {!showFavorites && displayItems.length > 0 && (
          <div ref={productSentinelRef} className="mt-6 flex min-h-10 justify-center" aria-live="polite">
            {isLoadingMoreProducts ? (
              <span className="inline-flex items-center gap-2 text-sm text-[#AAA49B]"><Spinner />正在加载更多商品…</span>
            ) : loadMoreError ? (
              <span className="text-sm text-[#AAA49B]">加载失败，向下滑动可重试</span>
            ) : !hasMoreTaobaoProducts ? (
              <span className="text-sm text-[#AAA49B]">已展示全部商品</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductImage({ item, className }: { item: ClothingItem; className: string }) {
  const [hasError, setHasError] = useState(!item.image);

  if (hasError) {
    return (
      <div role="img" aria-label={`${item.name} 图片暂不可用`} className={`product-image-fallback ${className}`}>
        <Shirt className="h-1/3 w-1/3" aria-hidden="true" />
      </div>
    );
  }

  return <img src={item.image} alt={item.name} className={className} onError={() => setHasError(true)} loading="lazy" decoding="async" />;
}

function OutfitCard({
  outfit,
  isFavorite,
  toggleFavorite,
  index,
  budget,
}: {
  outfit: OutfitSet;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  index: number;
  budget?: number;
}) {
  const { t } = useT();
  const itemReasonMap = useMemo(() => {
    const map: Record<string, string> = {};
    outfit.itemReasons?.forEach(r => { map[r.itemId] = r.reason; });
    return map;
  }, [outfit.itemReasons]);

  const itemMatchMap = useMemo(() => {
    const map: Record<string, { score: number; reasons: string[] }> = {};
    outfit.itemMatchScores?.forEach(m => { map[m.itemId] = { score: m.score, reasons: m.reasons }; });
    return map;
  }, [outfit.itemMatchScores]);

  const categoryLabel: Record<string, string> = {
    top: t('rec.category.top'), bottom: t('rec.category.bottom'), dress: t('rec.category.dress'), outerwear: t('rec.category.outerwear'), shoes: t('rec.category.shoes'), accessory: t('rec.category.accessory'),
  };
  const visibleMatchReasons = Array.from(new Set(
    (outfit.matchReasons ?? [])
      .map((reason) => reason.trim())
      .filter((reason) => reason && reason !== outfit.suitableBodyDesc?.trim()),
  )).slice(0, 3);

  return (
    <Card className="result-outfit-card overflow-hidden stagger-item" style={{ animationDelay: `${index * 100}ms` }}>
      <CardContent className="p-0">
        {/* Header with theme name and match score */}
        <div className="result-outfit-card-header px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-800">{outfit.themeName || outfit.name}</h3>
            <div className="flex items-center gap-2">
              {outfit.matchScore !== undefined && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  outfit.matchScore >= 80 ? 'bg-green-100 text-green-700' :
                  outfit.matchScore >= 60 ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {t('rec.match')} {outfit.matchScore}%
                </span>
              )}
              <span className="text-sm font-bold text-amber-600">¥{outfit.totalPrice}</span>
            </div>
          </div>
          {budget && budget > 0 && (
            <span className={`outfit-budget-status ${outfit.totalPrice <= budget ? 'outfit-budget-in' : 'outfit-budget-over'}`}>
              {outfit.totalPrice <= budget ? '预算内' : '预算参考'} · ¥{outfit.totalPrice} / ¥{budget}
            </span>
          )}
          {outfit.suitableBodyDesc && (
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
              <User className="h-3 w-3" />
              {outfit.suitableBodyDesc}
            </div>
          )}
          {visibleMatchReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {visibleMatchReasons.map((reason) => (
                <span key={reason} className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Item thumbnails */}
        <div className="result-outfit-images grid grid-cols-3 gap-1 p-2 sm:grid-cols-5">
          {outfit.items.slice(0, 5).map((item: ClothingItem) => (
            <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              <ProductImage item={item} className="h-full w-full object-cover" />
              <button
                onClick={() => toggleFavorite(item.id)}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm"
              >
                <Heart
                  className={`h-3 w-3 ${
                    isFavorite(item.id) ? 'fill-red-500 text-red-500' : 'text-slate-400'
                  }`}
                />
              </button>
              {itemMatchMap[item.id] && (
                <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold bg-black/60 text-white px-1 rounded">
                  {itemMatchMap[item.id].score}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Item details with reasons and buy buttons */}
        <div className="result-outfit-details px-3 pb-2">
          <div className="space-y-2 pb-2">
              {outfit.items.map((item: ClothingItem) => (
                <div key={item.id} className="flex gap-2.5 rounded-lg bg-slate-50 p-2">
                  <ProductImage item={item} className="h-12 w-12 rounded-md object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="result-item-brand text-xs">{item.brand}</span>
                        <span className="result-item-name truncate text-xs font-medium">
                          {categoryLabel[item.category] || item.category} · {item.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 shrink-0">¥{item.price}</span>
                    </div>
                    {itemReasonMap[item.id] && (
                      <p className="result-item-description mt-0.5 text-xs line-clamp-2">
                        {itemReasonMap[item.id]}
                      </p>
                    )}
                    {item.stylingTips && (
                      <p className="mt-0.5 text-xs text-amber-600 line-clamp-1">
                        💡 {item.stylingTips}
                      </p>
                    )}
                    <a
                      href={item.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-item-buy mt-1 inline-flex items-center gap-1 text-xs font-medium"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      {t('rec.buyNow')}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Styling advice */}
        {outfit.stylingAdvice && (
          <div className="result-outfit-advice border-t px-3 py-2">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">{t('rec.stylingTips')}</span>
              {outfit.stylingAdvice}
            </p>
          </div>
        )}

        {/* Tags */}
        <div className="result-outfit-tags flex flex-wrap gap-1 px-3 pb-3">
          {outfit.tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {styleTagLabels[tag] ?? tag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ClothingCard({
  item,
  isFavorite,
  toggleFavorite,
  taobaoMeta,
}: {
  item: ClothingItem;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  taobaoMeta?: TaobaoProductMeta;
}) {
  const { t } = useT();
  const fav = isFavorite(item.id);

  return (
    <Card className="result-product-card group overflow-hidden rounded-xl">
      <div className="relative aspect-square overflow-hidden bg-slate-100 sm:aspect-[4/5]">
        <ProductImage item={item} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
          <Badge variant="secondary" className="bg-white/90 text-[10px] font-medium sm:text-xs">
            {(t as any)(`rec.category.${item.category}`) || item.category}
          </Badge>
        </div>
        <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
          <Badge className="bg-amber-500 text-[10px] text-white sm:text-xs">
            <Star className="mr-0.5 h-3 w-3 fill-current" />
            {item.rating}
          </Badge>
        </div>
        <button
          onClick={() => toggleFavorite(item.id)}
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md transition-transform hover:scale-110 sm:bottom-3 sm:right-3 sm:h-9 sm:w-9"
        >
          <Heart className={`h-5 w-5 ${fav ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
        </button>
      </div>

      <CardContent className="p-2.5 sm:p-4">
        <div className="mb-1 truncate text-[10px] text-[#AAA49B] sm:text-xs">{item.brand}</div>
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-[#F7F4EE] sm:text-base sm:line-clamp-1">{item.name}</h3>

        {/* Recommend reason */}
        {item.recommendReason && (
          <div className="mb-2 hidden items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 sm:flex">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{item.recommendReason}</p>
          </div>
        )}

        <p className="mb-3 hidden text-sm text-slate-500 line-clamp-2 leading-relaxed sm:block">{item.description}</p>

        {/* Suitable info */}
        <div className="mb-2 hidden flex-wrap gap-1.5 sm:flex">
          {item.suitableBodyTypes.slice(0, 3).map(bt => (
            <span key={bt} className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              <User className="h-2.5 w-2.5" />
              {mapBodyType(bt, t as any)}
            </span>
          ))}
          {item.occasions.slice(0, 2).map(occ => (
            <span key={occ} className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">
              <MapPin className="h-2.5 w-2.5" />
              {mapOccasion(occ, t as any)}
            </span>
          ))}
        </div>

        <div className="mb-3 hidden flex-wrap gap-1 sm:flex">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{tag}</span>
          ))}
        </div>

        {/* Material */}
        {item.material && (
          <div className="mb-3 hidden text-xs text-slate-400 sm:block">
            <span className="font-medium">{t('rec.material')}</span>{item.material}
          </div>
        )}

        <div className="mb-3 hidden text-xs text-slate-400 sm:block">{t('rec.availableColors')}: {item.colors.join(' / ')}</div>

        {/* Styling tips */}
        {item.stylingTips && (
          <div className="mb-3 hidden rounded-lg border border-dashed border-slate-200 px-2.5 py-1.5 sm:block">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">{t('rec.stylingTips')}</span>{item.stylingTips}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-[#D7C39D] sm:text-xl">
              {item.currency}{item.price}
            </span>
            {item.priceRange && (
              <span className="ml-1.5 text-xs text-slate-400">{item.priceRange}</span>
            )}
          </div>
          <Button size="sm" className="h-8 w-8 bg-slate-900 p-0 hover:bg-slate-800 sm:h-9 sm:w-auto sm:px-3" onClick={() => window.open(item.buyLink, '_blank')} aria-label={t('rec.goToBuy')}>
            <span className="hidden sm:inline">{t('rec.goToBuy')}</span><ExternalLink className="h-3 w-3 sm:ml-1" />
          </Button>
        </div>
        {taobaoMeta && (
          <p className="mt-2 text-[10px] text-[#AAA49B] sm:text-xs">
            {taobaoMeta.couponAmount > 0 ? `优惠 ¥${taobaoMeta.couponAmount}` : `售价 ¥${taobaoMeta.price}`}
            {taobaoMeta.commissionRate > 0 ? ` · 佣金 ${taobaoMeta.commissionRate}%` : ''}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileTag({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-sm font-medium text-slate-700">{value}</div>
      </div>
    </div>
  );
}

function mapSkinTone(tone: string, t: (key: string) => string): string {
  const map: Record<string, string> = { fair: 'match.skinTone.fair', light: 'match.skinTone.light', medium: 'match.skinTone.medium', tan: 'match.skinTone.tan', dark: 'match.skinTone.dark' };
  return map[tone] ? t(map[tone]) : tone;
}
function mapBodyType(type: string, t: (key: string) => string): string {
  const map: Record<string, string> = { slim: 'match.bodyType.slim', standard: 'match.bodyType.standard', athletic: 'match.bodyType.athletic', curvy: 'match.bodyType.curvy', plus: 'match.bodyType.plus' };
  return map[type] ? t(map[type]) : type;
}
function mapStyle(style: string, t: (key: string) => string): string {
  const map: Record<string, string> = { casual: 'match.style.casual', business: 'match.style.business', streetwear: 'match.style.streetwear', minimal: 'match.style.minimal', elegant: 'match.style.elegant', sporty: 'match.style.sporty' };
  return map[style] ? t(map[style]) : style;
}
function mapOccasion(occ: string, t: (key: string) => string): string {
  const map: Record<string, string> = { daily: 'match.occasion.daily', work: 'match.occasion.work', date: 'match.occasion.date', party: 'match.occasion.party', travel: 'match.occasion.travel', formal: 'match.occasion.formal' };
  return map[occ] ? t(map[occ]) : occ;
}
