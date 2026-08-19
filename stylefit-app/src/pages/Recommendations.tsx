import { useLocation, useNavigate } from 'react-router';
import { useFavorites, getBMICategory, loadProfile, getNeutralProfile } from '../hooks/useRecommendation';
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
  House,
  Heart,
  Crown,
  Footprints,
  Lightbulb,
  MapPin,
  Check,
  Search,
} from 'lucide-react';
import type { UserBodyProfile, ClothingItem, OutfitSet } from '../types';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useT } from '../i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  cacheAIRecommendation,
  clearCachedAIRecommendation,
  getAIRecommendationProfileKey,
  readCachedAIRecommendation,
  requestAIRecommendation,
  type AIRecommendation,
  type AIRecommendationResult,
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
type TaobaoCategory = 'all' | 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory' | 'dress';
type TaobaoFeed = {
  products: ClothingItem[];
  meta: Record<string, TaobaoProductMeta>;
  page: number;
  hasMore: boolean;
  status: ProductSourceStatus;
  message: string;
  isLoadingMore: boolean;
  loadMoreError: boolean;
};
type RecommendationView = 'outfits' | 'discover';
type DiscoverSnapshot = {
  profileKey: string;
  activeCategory: TaobaoCategory;
  productSearch: string;
  categoryFeeds: Partial<Record<TaobaoCategory, TaobaoFeed>>;
  requestedPages: string[];
};

const formatAmount = (amount: number) => Number.isFinite(amount) ? amount.toFixed(2) : '0.00';

const taobaoSourceCache = new Map<string, TaobaoSourceResult>();
const taobaoSourceRequests = new Map<string, Promise<TaobaoSourceResult>>();
let discoverSnapshot: DiscoverSnapshot | null = null;

const wearableTaobaoTerms = /上衣|T恤|t恤|衬衫|针织|毛衣|卫衣|Polo|polo|外套|夹克|大衣|风衣|羽绒|西装|裤|牛仔|半身裙|连衣裙|鞋|靴|凉鞋|拖鞋|包|腰带|领带|袜/;
const excludedTaobaoTerms = /手机|电脑|数码|耳机|充电|数据线|壳|家居|家具|床|枕|餐具|食品|零食|美妆|口红|护肤|洗发|香水/;

const styleTagLabels: Record<string, string> = {
  business: '商务',
  work: '通勤',
  casual: '休闲',
  daily: '日常',
  minimal: '简约',
};

const catList: { key: TaobaoCategory; labelKey: string; icon: React.ReactNode }[] = [
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
  if (/裤|牛仔|半身裙/.test(text)) return 'bottom';
  if (/外套|夹克|大衣|风衣|羽绒|西装/.test(text)) return 'outerwear';
  if (/包|帽|围巾|腰带|眼镜|首饰|领带|袜/.test(text)) return 'accessory';
  if (/连衣裙/.test(text)) return 'dress';
  return 'top';
}

function toTaobaoClothingItem(product: TaobaoProduct, profile: UserBodyProfile, requestedCategory: TaobaoCategory): ClothingItem | null {
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
    category: requestedCategory === 'all' ? getTaobaoCategory(`${product.category || ''} ${name}`) : requestedCategory,
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

function matchesTaobaoCategory(product: TaobaoProduct, category: TaobaoCategory) {
  return category === 'all' || getTaobaoCategory(`${product.category || ''} ${product.title || ''}`) === category;
}

function toTaobaoProductMeta(product: TaobaoProduct): TaobaoProductMeta {
  return {
    price: Number(product.price) || 0,
    couponAmount: Number(product.couponAmount) || 0,
    commissionRate: Number(product.commissionRate) || 0,
  };
}

function requestTaobaoProducts(scene: string, category: TaobaoCategory, page: number, retry = false): Promise<TaobaoSourceResult> {
  const key = `${scene}:${category}:${page}`;
  if (!retry) {
    const cached = taobaoSourceCache.get(key);
    if (cached) return Promise.resolve(cached);
    const inFlight = taobaoSourceRequests.get(key);
    if (inFlight) return inFlight;
  }

  const request = fetch(`/api/taobao/products?scene=${scene}&category=${category}&page=${page}`)
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

export default function Recommendations({ view = 'outfits' }: { view?: RecommendationView }) {
  const { t } = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const isDiscover = view === 'discover';

  // 从 URL 读取场合参数
  const urlOccasion = new URLSearchParams(location.search).get('occasion') || '';
  const isValidOccasion = ['work', 'date', 'daily', 'party', 'travel', 'formal'].includes(urlOccasion);
  const locationState = location.state as { profile?: UserBodyProfile; aiRecommendation?: AIRecommendation; aiCandidates?: ClothingItem[] } | null;

  // 优先从 location.state 读取，如果没有则从 localStorage 读取（解决刷新后数据丢失问题）
  const [profile] = useState<UserBodyProfile | null>(() => {
    if (locationState?.profile) return locationState.profile;
    return loadProfile() || (isValidOccasion ? getNeutralProfile(urlOccasion) : null);
  });
  const savedDiscover = isDiscover && profile && discoverSnapshot?.profileKey === getAIRecommendationProfileKey(profile)
    ? discoverSnapshot
    : null;
  const [activeCategory, setActiveCategory] = useState<TaobaoCategory>(() => savedDiscover?.activeCategory || 'all');
  const [productSearch, setProductSearch] = useState(() => savedDiscover?.productSearch || '');
  const [categoryFeeds, setCategoryFeeds] = useState<Partial<Record<TaobaoCategory, TaobaoFeed>>>(() => savedDiscover?.categoryFeeds || {});
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const productSentinelRef = useRef<HTMLDivElement>(null);
  const hasUserScrolledRef = useRef(false);
  const loadMoreUnlockedRef = useRef(false);
  const requestedTaobaoPagesRef = useRef(new Set<string>(savedDiscover?.requestedPages || []));
  const categoryFeedsRef = useRef<Partial<Record<TaobaoCategory, TaobaoFeed>>>(savedDiscover?.categoryFeeds || {});
  const aiRequestInFlight = useRef(false);
  const [aiResult, setAIResult] = useState<AIRecommendationResult | null>(() => {
    if (!profile) return null;
    const stateRecommendation = locationState?.profile &&
      locationState.aiRecommendation &&
      Array.isArray(locationState.aiCandidates) &&
      getAIRecommendationProfileKey(locationState.profile) === getAIRecommendationProfileKey(profile)
      ? { recommendation: locationState.aiRecommendation, candidates: locationState.aiCandidates }
      : null;
    if (stateRecommendation) cacheAIRecommendation(profile, stateRecommendation);
    return stateRecommendation || readCachedAIRecommendation(profile);
  });
  const aiRecommendation = aiResult?.recommendation || null;
  const [aiLoading, setAILoading] = useState(false);

  const setCategoryFeed = useCallback((category: TaobaoCategory, feed: TaobaoFeed) => {
    const next = { ...categoryFeedsRef.current, [category]: feed };
    categoryFeedsRef.current = next;
    setCategoryFeeds(next);
  }, []);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return () => { window.history.scrollRestoration = previousScrollRestoration; };
  }, []);

  useEffect(() => {
    if (!isDiscover) return;
    const markUserScroll = () => {
      if (!hasUserScrolledRef.current) {
        hasUserScrolledRef.current = true;
        loadMoreUnlockedRef.current = true;
        setHasUserScrolled(true);
      }
    };
    window.addEventListener('scroll', markUserScroll, { passive: true });
    return () => window.removeEventListener('scroll', markUserScroll);
  }, [isDiscover]);

  const regenerateAIRecommendation = useCallback(async () => {
    if (!profile || aiRequestInFlight.current) return;

    aiRequestInFlight.current = true;
    setAILoading(true);
    try {
      const result = await requestAIRecommendation(profile);
      if (result) cacheAIRecommendation(profile, result);
      setAIResult(result);
    } catch {
      setAIResult(null);
    } finally {
      aiRequestInFlight.current = false;
      setAILoading(false);
    }
  }, [profile]);

  const outfits = useMemo(() => {
    if (!aiRecommendation || !aiResult) return [];

    const products = new Map(aiResult.candidates.map((item) => [item.id, item]));
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

    return generated;
  }, [aiRecommendation, aiResult, profile]);
  const hasRenderableAIOutfits = outfits.length === 3;
  const bmiInfo = useMemo(() => {
    if (!profile) return null;
    return getBMICategory(profile.height, profile.weight, t as any);
  }, [profile]);

  const { isFavorite, toggleFavorite, favoriteItems } = useFavorites();

  const loadTaobaoProducts = useCallback(async (category: TaobaoCategory, page = 1, retry = false) => {
    if (!profile) return;
    const scene = getTaobaoScene(profile);
    if (!scene) {
      return;
    }
    const requestKey = `${scene}:${category}:${page}`;
    if (requestedTaobaoPagesRef.current.has(requestKey) && !retry) return;
    requestedTaobaoPagesRef.current.add(requestKey);
    const currentFeed = categoryFeedsRef.current[category];
    if (page === 1) {
      setCategoryFeed(category, {
        products: currentFeed?.products || [],
        meta: currentFeed?.meta || {},
        page: 0,
        hasMore: false,
        status: 'loading',
        message: '',
        isLoadingMore: false,
        loadMoreError: false,
      });
    } else {
      setCategoryFeed(category, {
        products: currentFeed?.products || [],
        meta: currentFeed?.meta || {},
        page: currentFeed?.page || 1,
        hasMore: currentFeed?.hasMore || false,
        status: currentFeed?.status || 'loading',
        message: currentFeed?.message || '',
        isLoadingMore: true,
        loadMoreError: false,
      });
    }

    try {
      const payload = await requestTaobaoProducts(scene, category, page, retry);
      const products = payload.products.filter((product) => isWearableTaobaoProduct(product) && matchesTaobaoCategory(product, category));
      const items = products.map((product) => toTaobaoClothingItem(product, profile, category)).filter((item): item is ClothingItem => item !== null);
      const meta = Object.fromEntries(products.map((product) => [`taobao-${product.itemId}`, toTaobaoProductMeta(product)]));
      const previousItems = page === 1 ? [] : categoryFeedsRef.current[category]?.products || [];
      const previousIds = new Set(previousItems.map((item) => item.id));
      const newItems = items.filter((item) => !previousIds.has(item.id));
      const nextItems = page === 1 ? newItems : [...previousItems, ...newItems];
      setCategoryFeed(category, {
        products: nextItems,
        meta: page === 1 ? meta : { ...(categoryFeedsRef.current[category]?.meta || {}), ...meta },
        page,
        hasMore: payload.hasMore && newItems.length > 0,
        status: nextItems.length ? 'live' : 'empty',
        message: nextItems.length ? '' : payload.message || '本场景暂未找到合适服装。',
        isLoadingMore: false,
        loadMoreError: false,
      });
    } catch {
      requestedTaobaoPagesRef.current.delete(requestKey);
      if (page === 1) {
        setCategoryFeed(category, {
          products: [],
          meta: {},
          page: 0,
          hasMore: false,
          status: 'empty',
          message: '商品服务暂时不可用，请稍后重试。',
          isLoadingMore: false,
          loadMoreError: false,
        });
      } else {
        const failedFeed = categoryFeedsRef.current[category];
        if (failedFeed) setCategoryFeed(category, { ...failedFeed, isLoadingMore: false, loadMoreError: true });
      }
    }
  }, [profile, setCategoryFeed]);

  useEffect(() => {
    if (!isDiscover || !profile) return;
    discoverSnapshot = {
      profileKey: getAIRecommendationProfileKey(profile),
      activeCategory,
      productSearch,
      categoryFeeds,
      requestedPages: [...requestedTaobaoPagesRef.current],
    };
  }, [activeCategory, categoryFeeds, isDiscover, productSearch, profile]);

  useEffect(() => {
    if (!isDiscover) return;
    if (savedDiscover) return;
    requestedTaobaoPagesRef.current.clear();
    categoryFeedsRef.current = {};
    setCategoryFeeds({});
    hasUserScrolledRef.current = false;
    setHasUserScrolled(false);
    loadMoreUnlockedRef.current = false;
    loadTaobaoProducts('all', 1);
  }, [isDiscover, loadTaobaoProducts, savedDiscover]);

  const activeFeed = categoryFeeds[activeCategory];
  const taobaoProductMeta = useMemo(() => Object.values(categoryFeeds).reduce<Record<string, TaobaoProductMeta>>(
    (combined, feed) => ({ ...combined, ...(feed?.meta || {}) }),
    {},
  ), [categoryFeeds]);
  const catalogItems = useMemo(() => {
    if (activeCategory !== 'all') return activeFeed?.products || [];
    const ids = new Set<string>();
    return Object.values(categoryFeeds).flatMap((feed) => (feed?.products || []).filter((item) => {
      if (ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    }));
  }, [activeCategory, activeFeed?.products, categoryFeeds]);
  const productSourceStatus = activeCategory === 'all' && catalogItems.length
    ? 'live'
    : activeFeed?.status || 'loading';
  const productSourceMessage = activeFeed?.message || '';
  const hasMoreTaobaoProducts = activeFeed?.hasMore || false;
  const isLoadingMoreProducts = activeFeed?.isLoadingMore || false;
  const loadMoreError = activeFeed?.loadMoreError || false;

  useEffect(() => {
    if (!isDiscover) return;
    const sentinel = productSentinelRef.current;
    if (!sentinel || showFavorites || productSourceStatus !== 'live' || !hasMoreTaobaoProducts) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        loadMoreUnlockedRef.current = true;
        if (loadMoreError && activeFeed) setCategoryFeed(activeCategory, { ...activeFeed, loadMoreError: false });
        return;
      }
      if (!hasUserScrolled || !loadMoreUnlockedRef.current || isLoadingMoreProducts || loadMoreError) return;
      loadMoreUnlockedRef.current = false;
      loadTaobaoProducts(activeCategory, (activeFeed?.page || 0) + 1);
    }, { rootMargin: '300px 0px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeCategory, activeFeed, hasMoreTaobaoProducts, hasUserScrolled, isDiscover, isLoadingMoreProducts, loadMoreError, loadTaobaoProducts, productSourceStatus, setCategoryFeed, showFavorites]);

  const showProductSourceEmptyState = !showFavorites
    && productSourceStatus === 'empty'
    && catalogItems.length === 0;
  const filteredByCategory = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase();
    if (!query) return catalogItems;
    return catalogItems.filter((item) => [item.name, item.brand, item.category, ...item.tags]
      .join(' ')
      .toLocaleLowerCase()
      .includes(query));
  }, [catalogItems, productSearch]);

  const displayItems = showFavorites ? favoriteItems : filteredByCategory;
  const visibleCatList = profile?.gender === 'male' ? catList.filter((category) => category.key !== 'dress') : catList;
  const selectProductCategory = (category: TaobaoCategory) => {
    setActiveCategory(category);
    setShowFavorites(false);
    loadMoreUnlockedRef.current = false;
    if (!categoryFeedsRef.current[category]) loadTaobaoProducts(category, 1);
  };

  // 没有 profile 数据且无场合参数时显示引导页
  if (!profile) {
    return (
      <div className="phase-two-results flex min-h-screen items-center justify-center">
        <Card className="result-empty-card mx-4 max-w-md text-center animate-scale-in">
          <CardContent className="p-8">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF2F8]">
                <Shirt className="h-8 w-8 text-[#8A8A84]" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-[#1A1A1A]">{t('rec.noProfile.title')}</h2>
            <p className="mb-6 text-[#6B6B66]">
              {t('rec.noProfile.desc')}
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate('/survey')}
                className="sf-primary-button"
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
            <div className="flex h-9 w-9 overflow-hidden rounded-xl border-[#E0782C]/30 bg-white shadow">
              <img src="/stylefit-logo.jpg" alt="" width="36" height="36" className="h-full w-full object-cover" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">StyleFit</span>
          </div>
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/recommendations')}
                className={isDiscover ? 'text-[#4A4A45] hover:bg-[#FFF4EC] hover:text-[#C96A22]' : 'bg-[#FFF4EC] text-[#C96A22]'}
                aria-current={isDiscover ? undefined : 'page'}
              >
                <Sparkles className="h-4 w-4 sm:mr-1" />
                <span className="text-xs sm:text-sm">AI<span className="hidden sm:inline">穿搭</span></span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/discover')}
                className={isDiscover ? 'bg-[#FFF4EC] text-[#C96A22]' : 'text-[#4A4A45] hover:bg-[#FFF4EC] hover:text-[#C96A22]'}
                aria-current={isDiscover ? 'page' : undefined}
              >
                <ShoppingBag className="h-4 w-4 sm:mr-1" />
                <span className="text-xs sm:text-sm"><span className="hidden sm:inline">为你推荐</span><span className="sm:hidden">商品</span></span>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/favorites', { state: { fromRecommendations: true } })}
              className="relative text-[#4A4A45] hover:bg-[#FFF4EC] hover:text-[#C96A22]"
            >
              <Heart className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">{t('common.favorites')}</span>
              {favoriteItems.length > 0 && (
                <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {favoriteItems.length}
                </span>
              )}
            </Button>
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              aria-label="返回首页"
              className="hidden text-[#4A4A45] hover:bg-[#FFF4EC] hover:text-[#C96A22] sm:inline-flex"
            >
              <House className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">返回首页</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearCachedAIRecommendation();
                navigate('/survey', { state: { restartSurvey: true } });
              }}
              className="text-[#4A4A45] hover:bg-[#FFF4EC] hover:text-[#C96A22]"
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
            <p className="mb-1 text-xs font-medium tracking-[0.16em] text-[#C96A22]">{isDiscover ? t('rec.eyebrow.discover') : t('rec.eyebrow.styling')}</p>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[#1A1A1A] sm:text-3xl">{isDiscover ? t('rec.forYou') : t('rec.title')}</h1>
          </div>
          {!isDiscover && <span className="result-ai-state">
            {aiLoading ? <><Spinner />AI {t('common.loading')}</> : hasRenderableAIOutfits ? <>✦ AI</> : t('rec.outfitRecommendations')}
          </span>}
        </div>
        {!isDiscover && !aiLoading && !hasRenderableAIOutfits && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E0782C]/25 bg-[#FFF7EF] px-4 py-3 text-sm text-[#6B6B66]">
            <span>AI 推荐结果已过期，可重新生成</span>
            <Button className="sf-primary-button" onClick={regenerateAIRecommendation}>
              重新生成 AI 推荐
            </Button>
          </div>
        )}
        {/* Profile Summary */}
        {!isDiscover && <Card className="result-summary mb-6 overflow-hidden animate-fade-in-up">
          <CardContent className="p-0">
            <div className="result-summary-main px-5 py-4 text-[#1A1A1A]">
              <div className="mb-2 flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[#E0782C]" />
                <h2 className="text-lg font-bold">{t('rec.bodyReport.title')}</h2>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[#8A8A84]" />
                  {profile.gender === 'male' ? t('rec.bodyReport.gender.male') : t('rec.bodyReport.gender.female')}
                </span>
                <span className="flex items-center gap-1.5">
                  <Ruler className="h-4 w-4 text-[#8A8A84]" />
                  {profile.height}cm
                </span>
                <span className="flex items-center gap-1.5">
                  <Weight className="h-4 w-4 text-[#8A8A84]" />
                  {profile.weight}kg
                </span>
                {bmiInfo && (
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-full bg-[#EAF2F8] px-2 py-0.5 text-xs font-medium text-[#2F5E88]">
                      BMI {bmiInfo.bmi}
                    </span>
                    <span className="text-[#6B6B66]">{bmiInfo.category}</span>
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
                <div className="text-xs text-[#8A8A84] mb-2">{t('survey.body.measurements')}</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {profile.measurements.shoulderWidth && (
                    <span className="rounded-md bg-[#F0EDE6] px-2 py-1 text-[#4A4A45]">{t('shoulderWidth')} {profile.measurements.shoulderWidth}cm</span>
                  )}
                  {profile.measurements.waist && (
                    <span className="rounded-md bg-[#F0EDE6] px-2 py-1 text-[#4A4A45]">{t('waist')} {profile.measurements.waist}cm</span>
                  )}
                  {profile.measurements.hip && (
                    <span className="rounded-md bg-[#F0EDE6] px-2 py-1 text-[#4A4A45]">{t('hip')} {profile.measurements.hip}cm</span>
                  )}
                  {profile.measurements.legLength && (
                    <span className="rounded-md bg-[#F0EDE6] px-2 py-1 text-[#4A4A45]">{t('legLength')} {profile.measurements.legLength}cm</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Outfit Recommendations */}
        {!isDiscover && !showFavorites && hasRenderableAIOutfits && (
          <div className="mb-10">
            <div className="result-outfit-title mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#E0782C]" />
              <h2 className="text-xl font-bold text-[#1A1A1A]">{t('rec.outfitRecommendations')}</h2>
              {aiLoading && <span className="inline-flex items-center gap-1 text-xs text-[#8A8A84]"><Spinner />AI {t('common.loading')}</span>}
              {hasRenderableAIOutfits && aiRecommendation && <Badge className="result-ai-badge">AI</Badge>}
              {hasRenderableAIOutfits && outfits.length < 3 && <span className="text-xs text-[#8A8A84]">已生成 {outfits.length} 套搭配，可稍后重新生成更多方案</span>}
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
        {isDiscover && !showFavorites && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {visibleCatList.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => selectProductCategory(cat.key)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                    activeCategory === cat.key && !showFavorites
                      ? 'border-[#E0782C] bg-[#E0782C] text-white shadow'
                      : 'border-[#E5E2DA] bg-white text-[#4A4A45] hover:border-[#E0782C]/50 hover:bg-[#FFF7EF]'
                  }`}
                >
                  {cat.icon}
                  {(t as any)(cat.labelKey)}
                </button>
              ))}
            </div>
            <label className="relative block w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A8A84]" aria-hidden="true" />
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="搜索衣服、品牌或标签"
                className="focus-ring h-11 w-full rounded-xl border border-[#E5E2DA] bg-white py-2 pl-9 pr-3 text-sm text-[#1A1A1A] placeholder:text-[#9A9A94]"
              />
            </label>
          </div>
        )}

        {/* Section Title */}
        {isDiscover && <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-[#1A1A1A]">
              {showFavorites ? t('rec.favoriteItems') : t('rec.forYou')}
            </h2>
            {!showFavorites && productSourceStatus === 'live' && (
              <Badge className="border border-[#E0782C]/30 bg-[#FFF4EC] text-[#C96A22]">淘宝联盟精选</Badge>
            )}
            {!showFavorites && productSourceStatus === 'demo' && (
              <Badge className="border border-[#E5E2DA] bg-white text-[#8A8A84]">演示搭配</Badge>
            )}
          </div>
          <p className="text-sm text-[#6B6B66]">
            {showFavorites
              ? t('rec.itemCount', { count: favoriteItems.length })
              : productSourceStatus === 'live'
                ? `共 ${catalogItems.length} 件淘宝联盟商品`
                : productSourceStatus === 'demo'
                  ? '演示搭配，真实商品正在接入'
                  : '正在查找适合本场景的服装'}
          </p>
        </div>}

        {/* Items Grid */}
        {isDiscover && (!showFavorites && productSourceStatus === 'loading' ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 lg:gap-5" aria-label="商品加载中">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-xl border border-[#EEEBE3] bg-white p-2.5 sm:p-4">
                <Skeleton className="aspect-square w-full bg-[#F0EDE6] sm:aspect-[4/5]" />
                <Skeleton className="mt-3 h-3 w-1/3 bg-[#F0EDE6]" />
                <Skeleton className="mt-2 h-4 w-4/5 bg-[#F0EDE6]" />
                <Skeleton className="mt-4 h-5 w-1/4 bg-[#F0EDE6]" />
              </div>
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="rounded-2xl border border-[#EEEBE3] bg-white px-6 py-16 text-center">
            <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-[#E0782C]" />
            <p className="text-base font-medium text-[#1A1A1A]">
              {showFavorites ? t('rec.noFavorites') : showProductSourceEmptyState ? '暂时没有可展示的商品' : t('rec.noCategoryResults')}
            </p>
            {!showFavorites && showProductSourceEmptyState && <p className="mx-auto mt-2 max-w-sm text-sm text-[#8A8A84]">{productSourceMessage || '淘宝联盟商品暂时未返回结果，请稍后再试。'}</p>}
            {!showFavorites && showProductSourceEmptyState && (
              <Button className="sf-secondary-button mt-5" variant="outline" onClick={() => loadTaobaoProducts(activeCategory, 1, true)}>重试</Button>
            )}
          </div>
        ) : (
          <>
            {!showFavorites && productSourceStatus === 'demo' && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E0782C]/25 bg-[#FFF7EF] px-4 py-3 text-sm text-[#8A8A84]">
                <span>{productSourceMessage}</span>
                <Button className="sf-secondary-button h-8" variant="outline" onClick={() => loadTaobaoProducts(activeCategory, 1, true)}>稍后重试</Button>
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
        ))}
        {isDiscover && !showFavorites && displayItems.length > 0 && (
          <div ref={productSentinelRef} className="mt-6 flex min-h-10 justify-center" aria-live="polite">
            {isLoadingMoreProducts ? (
              <span className="inline-flex items-center gap-2 text-sm text-[#8A8A84]"><Spinner />正在加载更多商品…</span>
            ) : loadMoreError ? (
              <span className="text-sm text-[#8A8A84]">加载失败，向下滑动可重试</span>
            ) : !hasMoreTaobaoProducts ? (
              <span className="text-sm text-[#8A8A84]">已展示全部商品</span>
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
            <h3 className="font-semibold text-[#1A1A1A]">{outfit.themeName || outfit.name}</h3>
            <div className="flex items-center gap-2">
              {outfit.matchScore !== undefined && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  outfit.matchScore >= 80 ? 'bg-[#E8F5E9] text-[#2E7D40]' :
                  outfit.matchScore >= 60 ? 'bg-[#FFF7ED] text-[#B45309]' :
                  'bg-[#F0EDE6] text-[#6B6B66]'
                }`}>
                  {t('rec.match')} {outfit.matchScore}%
                </span>
              )}
              <span className="text-sm font-bold text-[#C96A22]">¥{formatAmount(outfit.totalPrice)}</span>
            </div>
          </div>
          {budget && budget > 0 && (
            <span className={`outfit-budget-status ${outfit.totalPrice <= budget ? 'outfit-budget-in' : 'outfit-budget-over'}`}>
              {outfit.totalPrice <= budget ? '预算内' : '预算参考'} · ¥{formatAmount(outfit.totalPrice)} / ¥{formatAmount(budget)} · {outfit.totalPrice <= budget ? `剩余 ¥${formatAmount(budget - outfit.totalPrice)}` : `超出 ¥${formatAmount(outfit.totalPrice - budget)}`}
            </span>
          )}
          {outfit.suitableBodyDesc && (
            <div className="flex items-center gap-1 text-xs text-[#8A8A84] mb-1">
              <User className="h-3 w-3" />
              {outfit.suitableBodyDesc}
            </div>
          )}
          {visibleMatchReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {visibleMatchReasons.map((reason) => (
                <span key={reason} className="text-xs text-[#2E7D40] bg-[#E8F5E9] px-1.5 py-0.5 rounded">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Item thumbnails */}
        <div className="result-outfit-images grid grid-cols-3 gap-1 p-2 sm:grid-cols-5">
          {outfit.items.slice(0, 5).map((item: ClothingItem) => (
            <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-[#F4F1EA]">
              <ProductImage item={item} className="h-full w-full object-cover" />
              <button
                onClick={() => toggleFavorite(item.id)}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm"
              >
                <Heart
                  className={`h-3 w-3 ${
                    isFavorite(item.id) ? 'fill-red-500 text-red-500' : 'text-[#9A9A94]'
                  }`}
                />
              </button>
              {itemMatchMap[item.id] && (
                <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold bg-[#1A1A1A]/70 text-white px-1 rounded">
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
                <div key={item.id} className="flex gap-2.5 rounded-lg bg-[#FAF9F5] p-2">
                  <ProductImage item={item} className="h-12 w-12 rounded-md object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="result-item-brand text-xs">{item.brand}</span>
                        <span className="result-item-name truncate text-xs font-medium">
                          {categoryLabel[item.category] || item.category} · {item.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-[#1A1A1A] shrink-0">¥{item.price}</span>
                    </div>
                    {itemReasonMap[item.id] && (
                      <p className="result-item-description mt-0.5 text-xs line-clamp-2">
                        {itemReasonMap[item.id]}
                      </p>
                    )}
                    {item.stylingTips && (
                      <p className="mt-0.5 text-xs text-[#C96A22] line-clamp-1">
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
            <p className="text-xs text-[#8A8A84]">
              <span className="font-medium text-[#6B6B66]">{t('rec.stylingTips')}</span>
              {outfit.stylingAdvice}
            </p>
          </div>
        )}

        {/* Tags */}
        <div className="result-outfit-tags flex flex-wrap gap-1 px-3 pb-3">
          {outfit.tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-md bg-[#F0EDE6] px-2 py-0.5 text-xs text-[#6B6B66]"
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
      <div className="relative aspect-square overflow-hidden bg-[#F4F1EA] sm:aspect-[4/5]">
        <ProductImage item={item} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
          <Badge variant="secondary" className="border border-[#EEEBE3] bg-white/90 text-[#4A4A45] text-[10px] font-medium sm:text-xs">
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
          <Heart className={`h-5 w-5 ${fav ? 'fill-red-500 text-red-500' : 'text-[#9A9A94]'}`} />
        </button>
      </div>

      <CardContent className="p-2.5 sm:p-4">
        <div className="mb-1 truncate text-[10px] text-[#8A8A84] sm:text-xs">{item.brand}</div>
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-[#1A1A1A] sm:text-base sm:line-clamp-1">{item.name}</h3>

        {/* Recommend reason */}
        {item.recommendReason && (
          <div className="mb-2 hidden items-start gap-1.5 rounded-lg bg-[#FFF7ED] px-2.5 py-1.5 sm:flex">
            <Lightbulb className="h-3.5 w-3.5 text-[#D97706] shrink-0 mt-0.5" />
            <p className="text-xs text-[#B45309] leading-relaxed">{item.recommendReason}</p>
          </div>
        )}

        <p className="mb-3 hidden text-sm text-[#6B6B66] line-clamp-2 leading-relaxed sm:block">{item.description}</p>

        {/* Suitable info */}
        <div className="mb-2 hidden flex-wrap gap-1.5 sm:flex">
          {item.suitableBodyTypes.slice(0, 3).map(bt => (
            <span key={bt} className="inline-flex items-center gap-0.5 rounded-md bg-[#F0EDE6] px-1.5 py-0.5 text-xs text-[#6B6B66]">
              <User className="h-2.5 w-2.5" />
              {mapBodyType(bt, t as any)}
            </span>
          ))}
          {item.occasions.slice(0, 2).map(occ => (
            <span key={occ} className="inline-flex items-center gap-0.5 rounded-md bg-[#EAF2F8] px-1.5 py-0.5 text-xs text-[#3E6E9E]">
              <MapPin className="h-2.5 w-2.5" />
              {mapOccasion(occ, t as any)}
            </span>
          ))}
        </div>

        <div className="mb-3 hidden flex-wrap gap-1 sm:flex">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md bg-[#F0EDE6] px-2 py-0.5 text-xs text-[#6B6B66]">{tag}</span>
          ))}
        </div>

        {/* Material */}
        {item.material && (
          <div className="mb-3 hidden text-xs text-[#8A8A84] sm:block">
            <span className="font-medium">{t('rec.material')}</span>{item.material}
          </div>
        )}

        <div className="mb-3 hidden text-xs text-[#8A8A84] sm:block">{t('rec.availableColors')}: {item.colors.join(' / ')}</div>

        {/* Styling tips */}
        {item.stylingTips && (
          <div className="mb-3 hidden rounded-lg border border-dashed border-[#E5E2DA] px-2.5 py-1.5 sm:block">
            <p className="text-xs text-[#8A8A84]">
              <span className="font-medium text-[#6B6B66]">{t('rec.stylingTips')}</span>{item.stylingTips}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-[#C96A22] sm:text-xl">
              {item.currency}{item.price}
            </span>
            {item.priceRange && (
              <span className="ml-1.5 text-xs text-[#8A8A84]">{item.priceRange}</span>
            )}
          </div>
          <Button size="sm" className="h-8 w-8 bg-[#E0782C] p-0 text-white hover:bg-[#C96A22] sm:h-9 sm:w-auto sm:px-3" onClick={() => window.open(item.buyLink, '_blank')} aria-label={t('rec.goToBuy')}>
            <span className="hidden sm:inline">{t('rec.goToBuy')}</span><ExternalLink className="h-3 w-3 sm:ml-1" />
          </Button>
        </div>
        {taobaoMeta && (
          <p className="mt-2 text-[10px] text-[#8A8A84] sm:text-xs">
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0EDE6] text-[#8A8A84]">{icon}</div>
      <div>
        <div className="text-xs text-[#8A8A84]">{label}</div>
        <div className="text-sm font-medium text-[#1A1A1A]">{value}</div>
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
