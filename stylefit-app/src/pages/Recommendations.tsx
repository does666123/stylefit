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
} from 'lucide-react';
import type { UserBodyProfile, ClothingItem, OutfitSet, Occasion } from '../types';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import LoadingScreen from '@/components/LoadingScreen';
import { fetchWeatherWithCache, interpretWeather, getWeatherRemark, thicknessTierToSeason, type WeatherInterpretation, type WeatherData } from '../lib/weather';

// 场合快捷切换数据
const occasionSwitcherItems: { key: Occasion; label: string; icon: React.ReactNode }[] = [
  { key: 'work', label: '上班通勤', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'date', label: '约会', icon: <HeartHandshake className="h-4 w-4" /> },
  { key: 'daily', label: '运动健身', icon: <Dumbbell className="h-4 w-4" /> },
  { key: 'party', label: '聚会派对', icon: <PartyPopper className="h-4 w-4" /> },
  { key: 'travel', label: '周末出游', icon: <Plane className="h-4 w-4" /> },
  { key: 'formal', label: '商务正式', icon: <Crown className="h-4 w-4" /> },
];

const occasionLabelMap: Record<string, string> = {
  work: '上班通勤', date: '约会', daily: '运动健身',
  party: '聚会派对', travel: '周末出游', formal: '商务正式',
};

const catList: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: '全部', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'top', label: '上装', icon: <Shirt className="h-4 w-4" /> },
  { key: 'bottom', label: '下装', icon: <Shirt className="h-4 w-4" /> },
  { key: 'dress', label: '裙装', icon: <Heart className="h-4 w-4" /> },
  { key: 'outerwear', label: '外套', icon: <Crown className="h-4 w-4" /> },
  { key: 'shoes', label: '鞋履', icon: <Footprints className="h-4 w-4" /> },
  { key: 'accessory', label: '配饰', icon: <Sparkles className="h-4 w-4" /> },
];

const catLabelMap: Record<string, string> = {
  all: '全部', top: '上装', bottom: '下装', dress: '裙装',
  outerwear: '外套', shoes: '鞋履', accessory: '配饰',
};

const allSteps = ['基础信息', '身材分析', '风格偏好', '推荐结果'];

export default function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 从 URL 读取场合参数
  const urlOccasion = searchParams.get('occasion') || '';
  const isValidOccasion = ['work', 'date', 'daily', 'party', 'travel', 'formal'].includes(urlOccasion);

  // 优先从 location.state 读取，如果没有则从 localStorage 读取（解决刷新后数据丢失问题）
  const [profile, setProfile] = useState<UserBodyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [showOccasionSwitcher, setShowOccasionSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherInterp, setWeatherInterp] = useState<WeatherInterpretation | null>(null);

  // 获取天气（不阻塞渲染）
  const loadWeather = useCallback(async () => {
    const result = await fetchWeatherWithCache();
    if (result?.data) {
      setWeatherData(result.data);
      setWeatherInterp(interpretWeather(result.data, result.isDefault, result.locationName));
    }
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

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

  // 初始化：尝试从 state 或 localStorage 获取 profile
  useEffect(() => {
    const stateProfile: UserBodyProfile | undefined = location.state?.profile;
    if (stateProfile) {
      setProfile(stateProfile);
      setIsLoading(false);
      return;
    }

    // fallback: 从 localStorage 读取
    const stored = loadProfile();
    if (stored) {
      setProfile(stored);
    } else if (isValidOccasion) {
      // 无画像但有场合参数 → 使用中性默认画像
      setProfile(getNeutralProfile(urlOccasion));
    }
    setIsLoading(false);
  }, [location.state, isValidOccasion, urlOccasion]);

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
    setSearchParams({ occasion });
  };

  const recommendations = useRecommendations(profile);
  const weatherForEngine = useMemo(() => {
    if (!weatherData) return null;
    const interpretation = interpretWeather(weatherData, false, '');
    return {
      thicknessTier: interpretation.thicknessTier,
      season: thicknessTierToSeason(interpretation.thicknessTier),
      remarks: [getWeatherRemark(weatherData) || ''],
    };
  }, [weatherData]);
  const outfits = useMemo(() => generateOutfitSets(recommendations, profile, weatherForEngine), [recommendations, profile, weatherForEngine]);
  const bmiInfo = useMemo(() => {
    if (!profile) return null;
    return getBMICategory(profile.height, profile.weight);
  }, [profile]);

  const { isFavorite, toggleFavorite, favoriteItems } = useFavorites();

  const filteredByCategory = useMemo(() => {
    if (activeCategory === 'all') return recommendations;
    return recommendations.filter((item) => item.category === activeCategory);
  }, [recommendations, activeCategory]);

  const displayItems = showFavorites ? favoriteItems : filteredByCategory;

  // 加载中显示 LoadingScreen
  if (isLoading) {
    return <LoadingScreen message="正在加载你的推荐..." />;
  }

  // 没有 profile 数据且无场合参数时显示引导页
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Card className="mx-4 max-w-md text-center animate-scale-in">
          <CardContent className="p-8">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Shirt className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold">还没有你的体型数据</h2>
            <p className="mb-6 text-slate-500">
              请先完成体型信息测试，我们才会为你推荐服装
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate('/survey')}
                className="bg-slate-900 hover:bg-slate-800"
              >
                去测试
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
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/favorites')}
              className="relative"
            >
              <Heart className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">收藏</span>
              {favoriteItems.length > 0 && (
                <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {favoriteItems.length}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/survey')}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">重新测试</span>
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* 场合标签 + 未填问卷提示 */}
        {isValidOccasion && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">今天去 ·</span>
              <div className="relative" ref={switcherRef}>
                <button
                  onClick={() => setShowOccasionSwitcher(!showOccasionSwitcher)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  {occasionLabelMap[urlOccasion] || urlOccasion}
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
                        {item.label}
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
                <span>填写问卷可获得更准推荐</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate('/survey')}
                  className="h-auto px-1 py-0 text-xs font-medium text-amber-700 underline"
                >
                  去填写
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 天气条 */}
        {weatherInterp && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 shadow-sm">
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
                今天 {Math.round(weatherInterp.apparentTemperature)}°C {weatherInterp.weatherLabel}
              </span>
              <span className="mx-1.5 text-slate-300">·</span>
              <span className="text-sm text-slate-500">{weatherInterp.thicknessLabel}</span>
            </div>
            {weatherInterp.isDefault && (
              <span className="hidden text-[10px] text-slate-400 sm:inline">按上海天气推荐</span>
            )}
          </div>
        )}

        {/* Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between gap-1">
            {allSteps.map((label, idx) => (
              <div key={label} className="flex min-w-0 flex-col items-center gap-1 sm:gap-1.5">
                <div
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    idx < 3
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-900 text-white ring-4 ring-slate-200'
                  }`}
                >
                  {idx < 3 ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : idx + 1}
                </div>
                <span className={`truncate text-[10px] sm:text-xs font-medium ${idx <= 3 ? 'text-slate-700' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Summary */}
        <Card className="mb-8 border-0 shadow-md overflow-hidden animate-fade-in-up">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-bold">你的体型分析报告</h2>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4 text-slate-400" />
                  {profile.gender === 'male' ? '男士' : '女士'}
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
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {bmiInfo.advice}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 px-6 py-4 sm:grid-cols-4">
              <ProfileTag
                icon={<Palette className="h-4 w-4" />}
                label="肤色"
                value={mapSkinTone(profile.skinTone)}
              />
              <ProfileTag
                icon={<User className="h-4 w-4" />}
                label="体型"
                value={mapBodyType(profile.bodyType)}
              />
              <ProfileTag
                icon={<Sparkles className="h-4 w-4" />}
                label="风格"
                value={mapStyle(profile.stylePreference)}
              />
              <ProfileTag
                icon={<ShoppingBag className="h-4 w-4" />}
                label="场合"
                value={mapOccasion(profile.occasion)}
              />
            </div>

            {profile.measurements && Object.values(profile.measurements).some((v) => v) && (
              <div className="border-t px-6 py-3">
                <div className="text-xs text-slate-400 mb-2">身体尺寸</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  {profile.measurements.shoulderWidth && (
                    <span className="rounded-md bg-slate-100 px-2 py-1">肩宽 {profile.measurements.shoulderWidth}cm</span>
                  )}
                  {profile.measurements.waist && (
                    <span className="rounded-md bg-slate-100 px-2 py-1">腰围 {profile.measurements.waist}cm</span>
                  )}
                  {profile.measurements.hip && (
                    <span className="rounded-md bg-slate-100 px-2 py-1">臀围 {profile.measurements.hip}cm</span>
                  )}
                  {profile.measurements.legLength && (
                    <span className="rounded-md bg-slate-100 px-2 py-1">腿长 {profile.measurements.legLength}cm</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outfit Recommendations */}
        {!showFavorites && outfits.length > 0 && (
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900">穿搭搭配推荐</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {outfits.map((outfit, idx) => (
                <div key={outfit.id} className="stagger-item animate-fade-in-up">
                  <OutfitCard
                    outfit={outfit}
                    isFavorite={isFavorite}
                    toggleFavorite={toggleFavorite}
                    index={idx}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filter */}
        {!showFavorites && (
          <div className="mb-6 flex flex-wrap gap-2">
            {catList.map((cat) => (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveCategory(cat.key);
                  setShowFavorites(false);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  activeCategory === cat.key && !showFavorites
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Section Title */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-900">
            {showFavorites ? '我的收藏' : '为你推荐'}
          </h2>
          <p className="text-sm text-slate-500">
            {showFavorites
              ? `共 ${favoriteItems.length} 件收藏`
              : `共 ${recommendations.length} 件精选服装`}
          </p>
        </div>

        {/* Items Grid */}
        {displayItems.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Shirt className="mx-auto mb-3 h-12 w-12" />
            <p>{showFavorites ? '还没有收藏任何单品' : '暂无此类别的推荐'}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayItems.map((item) => (
              <div key={item.id} className="stagger-item animate-fade-in-up">
                <ClothingCard
                  item={item}
                  isFavorite={isFavorite}
                  toggleFavorite={toggleFavorite}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OutfitCard({
  outfit,
  isFavorite,
  toggleFavorite,
  index,
}: {
  outfit: OutfitSet;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

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
    top: '上衣', bottom: '下装', dress: '裙装', outerwear: '外套', shoes: '鞋履', accessory: '配饰',
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden transition-shadow hover:shadow-md stagger-item" style={{ animationDelay: `${index * 100}ms` }}>
      <CardContent className="p-0">
        {/* Header with theme name and match score */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-800">{outfit.themeName || outfit.name}</h3>
            <div className="flex items-center gap-2">
              {outfit.matchScore !== undefined && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  outfit.matchScore >= 80 ? 'bg-green-100 text-green-700' :
                  outfit.matchScore >= 60 ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  匹配 {outfit.matchScore}%
                </span>
              )}
              <span className="text-sm font-bold text-amber-600">¥{outfit.totalPrice}</span>
            </div>
          </div>
          {outfit.suitableBodyDesc && (
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
              <User className="h-3 w-3" />
              {outfit.suitableBodyDesc}
            </div>
          )}
          {outfit.matchReasons && outfit.matchReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {outfit.matchReasons.slice(0, 3).map((reason, idx) => (
                <span key={idx} className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Item thumbnails */}
        <div className="grid grid-cols-3 gap-1 p-2 sm:grid-cols-5">
          {outfit.items.slice(0, 5).map((item: ClothingItem) => (
            <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
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
        <div className="px-3 pb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className="flex items-center gap-1">
              <Lightbulb className="h-3 w-3 text-amber-500" />
              查看搭配详情
            </span>
            <span className="text-slate-400">{expanded ? '收起' : '展开'}</span>
          </button>

          {expanded && (
            <div className="space-y-2 pb-2 animate-fade-in">
              {outfit.items.map((item: ClothingItem) => (
                <div key={item.id} className="flex gap-2.5 rounded-lg bg-slate-50 p-2">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-12 w-12 rounded-md object-cover shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs text-slate-400">{item.brand}</span>
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {categoryLabel[item.category] || item.category} · {item.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 shrink-0">¥{item.price}</span>
                    </div>
                    {itemReasonMap[item.id] && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
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
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      立即购买
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Styling advice */}
        {outfit.stylingAdvice && (
          <div className="border-t px-3 py-2">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">搭配建议：</span>
              {outfit.stylingAdvice}
            </p>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 px-3 pb-3">
          {outfit.tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {tag}
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
        <button
          onClick={() => toggleFavorite(item.id)}
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md transition-transform hover:scale-110"
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

        <div className="mb-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{tag}</span>
          ))}
        </div>

        {/* Material */}
        {item.material && (
          <div className="mb-3 text-xs text-slate-400">
            <span className="font-medium">面料：</span>{item.material}
          </div>
        )}

        <div className="mb-3 text-xs text-slate-400">可选颜色: {item.colors.join(' / ')}</div>

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

function mapSkinTone(tone: string): string {
  const map: Record<string, string> = { fair: '白皙', light: '偏白', medium: '自然', tan: '偏黄', dark: '深色' };
  return map[tone] || tone;
}
function mapBodyType(type: string): string {
  const map: Record<string, string> = { slim: '偏瘦', standard: '标准', athletic: '运动型', curvy: '曲线型', plus: '丰腴型' };
  return map[type] || type;
}
function mapStyle(style: string): string {
  const map: Record<string, string> = { casual: '休闲', business: '商务', streetwear: '街头', minimal: '简约', elegant: '优雅', sporty: '运动' };
  return map[style] || style;
}
function mapOccasion(occ: string): string {
  const map: Record<string, string> = { daily: '日常', work: '职场', date: '约会', party: '派对', travel: '旅行', formal: '正式' };
  return map[occ] || occ;
}
