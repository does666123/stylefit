import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Shirt,
  Ruler,
  Palette,
  Sparkles,
  ShoppingBag,
  UserCheck,
  ArrowRight,
  Heart,
  RefreshCw,
  CloudSun,
  Umbrella,
  Wind,
  Loader2,
  Briefcase,
  Heart as HeartIcon,
  Dumbbell,
  PartyPopper,
  Map,
  Building2,
} from 'lucide-react';
import { fetchWeatherWithCache, interpretWeather, type WeatherData } from '@/lib/weather';
import { useT } from '@/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface UserProfile {
  height: number;
  weight: number;
  bodyType: string;
  skinTone: string;
  age?: number;
  budget?: number;
  style: string;
  gender: string;
  occasion: string;
  season: string;
}

const occasionQuickEntries = [
  { key: 'work', icon: <Briefcase className="h-6 w-6" /> },
  { key: 'date', icon: <HeartIcon className="h-6 w-6" /> },
  { key: 'sport', icon: <Dumbbell className="h-6 w-6" /> },
  { key: 'party', icon: <PartyPopper className="h-6 w-6" /> },
  { key: 'travel', icon: <Map className="h-6 w-6" /> },
  { key: 'formal', icon: <Building2 className="h-6 w-6" /> },
];

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [existingProfile, setExistingProfile] = useState<UserProfile | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [weatherIsDefault, setWeatherIsDefault] = useState(false);
  const [weatherLocationName, setWeatherLocationName] = useState('');
  const [favCount, setFavCount] = useState(0);

  // 检测已有画像（回访用户）
  useEffect(() => {
    try {
      const saved = localStorage.getItem('stylefit_profile');
      if (saved) {
        const profile = JSON.parse(saved) as UserProfile;
        if (profile.height && profile.weight && profile.bodyType && profile.style) {
          setExistingProfile(profile);
        }
      }
    } catch {
      // 数据损坏，忽略
    }
  }, []);

  // 获取收藏数量
  useEffect(() => {
    const updateFavCount = () => {
      try {
        const saved = localStorage.getItem('stylefit_favorites');
        if (saved) {
          const ids = JSON.parse(saved) as string[];
          setFavCount(ids.length);
        }
      } catch {
        // ignore
      }
    };
    updateFavCount();
    const interval = setInterval(updateFavCount, 1000);
    return () => clearInterval(interval);
  }, []);

  // 获取天气
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setWeatherLoading(true);
      const result = await fetchWeatherWithCache();
      if (!cancelled && result) {
        setWeather(result.data);
        setWeatherIsDefault(result.isDefault);
        setWeatherLocationName(result.locationName);
        setWeatherLoading(false);
      } else if (!cancelled) {
        setWeatherLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRefreshWeather = useCallback(async () => {
    setWeatherRefreshing(true);
    const result = await fetchWeatherWithCache();
    if (result) {
      setWeather(result.data);
      setWeatherIsDefault(result.isDefault);
      setWeatherLocationName(result.locationName);
    }
    setTimeout(() => setWeatherRefreshing(false), 300);
  }, []);

  // 回访用户：直接查看推荐（使用已保存画像）
  const handleViewRecommendations = () => {
    if (existingProfile) {
      navigate('/recommendations', { state: { profile: existingProfile } });
    }
  };

  // 意图预取：触碰/悬停按钮时提前加载 Survey chunk
  const prefetchSurvey = () => {
    import('@/pages/Survey');
  };

  // 场合快捷入口文案（使用翻译）
  const occasionEntries = [
    { key: 'work', title: t('home.occasions.work.title'), desc: t('home.occasions.work.desc') },
    { key: 'date', title: t('home.occasions.date.title'), desc: t('home.occasions.date.desc') },
    { key: 'sport', title: t('home.occasions.sport.title'), desc: t('home.occasions.sport.desc') },
    { key: 'party', title: t('home.occasions.party.title'), desc: t('home.occasions.party.desc') },
    { key: 'travel', title: t('home.occasions.travel.title'), desc: t('home.occasions.travel.desc') },
    { key: 'formal', title: t('home.occasions.formal.title'), desc: t('home.occasions.formal.desc') },
  ];

  return (
    <div className="min-h-screen bg-white page-enter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              StyleFit
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {favCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/favorites')}
                className="relative"
              >
                <Heart className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">{t('common.favorites')}</span>
                <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {favCount}
                </span>
              </Button>
            )}
            {existingProfile ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewRecommendations}
                  className="hidden sm:inline-flex"
                >
                  {t('home.nav.viewRecommendations')}
                </Button>
                <Button
                  onClick={() => navigate('/survey')}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  {t('home.nav.retakeTest')}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/survey')}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {t('home.nav.startTest')}
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 pt-16 pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm text-slate-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {t('home.hero.badge')}
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            {t('home.hero.title1')}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900">
              {t('home.hero.title2')}
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-500 leading-relaxed">
            {t('home.hero.desc')}
          </p>

          {/* 回访用户：显示快捷入口 */}
          {existingProfile && (
            <div className="mb-8 inline-flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <UserCheck className="h-4 w-4" />
                {t('home.hero.welcomeBack')}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  onClick={handleViewRecommendations}
                  className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white"
                >
                  {t('home.hero.viewMyRecommendations')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/survey')}
                  onTouchStart={prefetchSurvey}
                  onMouseEnter={prefetchSurvey}
                  className="h-11 px-6"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('home.hero.retakeTest')}
                </Button>
              </div>
            </div>
          )}

          {/* 新用户：显示测试入口 */}
          {!existingProfile && (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/survey')}
                onTouchStart={prefetchSurvey}
                onMouseEnter={prefetchSurvey}
                className="h-12 px-8 text-base bg-slate-900 hover:bg-slate-800"
              >
                {t('home.hero.startTestNow')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 h-32 w-32 rounded-full bg-slate-100 opacity-50 blur-2xl" />
        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-slate-200 opacity-40 blur-3xl" />
      </section>

      {/* 天气卡 */}
      {(weatherLoading || weather) && (
        <section className="px-4 pt-8 pb-0">
          <div className="mx-auto max-w-2xl">
            {weatherLoading && !weather ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white px-5 py-4 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-400">{t('home.weather.loading')}</span>
              </div>
            ) : weather ? (() => {
              const wi = interpretWeather(weather, weatherIsDefault, weatherLocationName, t as any);
              return (
              <button
                onClick={() => !weatherRefreshing && handleRefreshWeather()}
                disabled={weatherRefreshing}
                className="group flex w-full items-center gap-4 rounded-2xl border bg-white px-5 py-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition-opacity duration-200 ${weatherRefreshing ? 'opacity-60' : ''}`}>
                  {wi.rainNote ? (
                    <Umbrella className="h-5 w-5" />
                  ) : wi.windNote ? (
                    <Wind className="h-5 w-5" />
                  ) : (
                    <CloudSun className="h-5 w-5" />
                  )}
                </div>
                <div className={`min-w-0 flex-1 transition-opacity duration-200 ${weatherRefreshing ? 'opacity-60' : ''}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-slate-900 transition-all duration-200">
                      {Math.round(weather.temperature)}°C
                    </span>
                    <span className="text-sm text-slate-500 transition-all duration-200">· {t('home.weather.feelsLike')} {Math.round(weather.apparentTemperature)}°C</span>
                    <span className="text-sm text-slate-500">{wi.weatherLabel}</span>
                    <span className="hidden text-xs text-slate-400 sm:inline">·</span>
                    <span className="hidden text-xs text-slate-400 sm:inline">{wi.locationName}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500 transition-all duration-200">
                    {wi.clothingAdvice}
                    {wi.rainNote && <span className="ml-1 text-sky-600">· {wi.rainNote}</span>}
                    {wi.windNote && <span className="ml-1 text-amber-600">· {wi.windNote}</span>}
                  </p>
                </div>
                <RefreshCw className={`h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:text-slate-500 ${weatherRefreshing ? 'animate-spin text-sky-500' : ''}`} />
              </button>
              );
            })() : null}
          </div>
        </section>
      )}

      {/* 今天去哪 - 场合快捷入口 */}
      <section className="px-4 py-16 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              {t('home.occasions.title')}
            </h2>
            <p className="text-sm text-slate-500">
              {t('home.occasions.subtitle')}
            </p>
          </div>

          {/* 移动端横向滑动，桌面端网格 */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible lg:grid-cols-6 sm:pb-0">
            {occasionEntries.map((entry) => {
              const origEntry = occasionQuickEntries.find(e => e.key === entry.key)!;
              return (
                <button
                  key={entry.key}
                  onClick={() => navigate(`/recommendations?occasion=${entry.key}`)}
                  className="group flex min-w-[140px] flex-shrink-0 flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200 hover:shadow-md active:scale-[0.98] sm:min-w-0"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                    {origEntry.icon}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-900">
                      {entry.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                      {entry.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-slate-50/50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              {t('home.steps.title')}
            </h2>
            <p className="text-slate-500">
              {t('home.steps.subtitle')}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <StepCard
              icon={<UserCheck className="h-6 w-6" />}
              step="01"
              title={t('home.steps.step1.title')}
              desc={t('home.steps.step1.desc')}
            />
            <StepCard
              icon={<Sparkles className="h-6 w-6" />}
              step="02"
              title={t('home.steps.step2.title')}
              desc={t('home.steps.step2.desc')}
            />
            <StepCard
              icon={<ShoppingBag className="h-6 w-6" />}
              step="03"
              title={t('home.steps.step3.title')}
              desc={t('home.steps.step3.desc')}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 sm:grid-cols-2">
            <FeatureCard
              icon={<Ruler className="h-5 w-5" />}
              title={t('home.features.feature1.title')}
              desc={t('home.features.feature1.desc')}
            />
            <FeatureCard
              icon={<Palette className="h-5 w-5" />}
              title={t('home.features.feature2.title')}
              desc={t('home.features.feature2.desc')}
            />
            <FeatureCard
              icon={<Shirt className="h-5 w-5" />}
              title={t('home.features.feature3.title')}
              desc={t('home.features.feature3.desc')}
            />
            <FeatureCard
              icon={<ShoppingBag className="h-5 w-5" />}
              title={t('home.features.feature4.title')}
              desc={t('home.features.feature4.desc')}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 px-4 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold">
            {t('home.cta.title')}
          </h2>
          <p className="mb-8 text-slate-300">
            {t('home.cta.desc')}
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/survey')}
            className="h-12 px-8 text-base bg-white text-slate-900 hover:bg-slate-100"
          >
            {t('home.cta.button')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8 text-center text-sm text-slate-400">
        <p>StyleFit — {t('home.footer.tagline')}</p>
      </footer>
    </div>
  );
}

function StepCard({
  icon,
  step,
  title,
  desc,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div className="mb-2 text-xs font-semibold text-slate-400">{step}</div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div>
        <h3 className="mb-1 font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default HomePage;
