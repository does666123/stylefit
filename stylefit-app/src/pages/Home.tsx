import { useNavigate } from 'react-router';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Shirt,
  Sparkles,
  ShoppingBag,
  UserCheck,
  ArrowRight,
  Ruler,
  Palette,
  Heart,
  RefreshCw,
  Briefcase,
  HeartHandshake,
  Dumbbell,
  PartyPopper,
  Plane,
  Crown,
  CloudSun,
  Umbrella,
  Wind,
  Loader2,
} from 'lucide-react';
import { useFavorites, loadProfile } from '../hooks/useRecommendation';
import { fetchWeatherWithCache, interpretWeather, type WeatherInterpretation } from '../lib/weather';
import type { UserBodyProfile, Occasion } from '../types';

// 场合快捷入口数据
const occasionQuickEntries: {
  key: Occasion;
  icon: React.ReactNode;
  title: string;
  desc: string;
}[] = [
  { key: 'work', icon: <Briefcase className="h-5 w-5" />, title: '上班通勤', desc: '干练得体，职场自信' },
  { key: 'date', icon: <HeartHandshake className="h-5 w-5" />, title: '约会', desc: '温柔有品，留下好印象' },
  { key: 'daily', icon: <Dumbbell className="h-5 w-5" />, title: '运动健身', desc: '舒适活力，自在运动' },
  { key: 'party', icon: <PartyPopper className="h-5 w-5" />, title: '聚会派对', desc: '时髦亮眼，成为焦点' },
  { key: 'travel', icon: <Plane className="h-5 w-5" />, title: '周末出游', desc: '轻松百搭，说走就走' },
  { key: 'formal', icon: <Crown className="h-5 w-5" />, title: '商务正式', desc: '稳重优雅，气场全开' },
];

export default function Home() {
  const navigate = useNavigate();
  const { favoriteItems } = useFavorites();
  const [existingProfile, setExistingProfile] = useState<UserBodyProfile | null>(null);
  const [weather, setWeather] = useState<WeatherInterpretation | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);

  // 检测是否已有保存的画像
  useEffect(() => {
    const profile = loadProfile();
    if (profile) {
      setExistingProfile(profile);
    }
  }, []);

  // 获取天气（不阻塞渲染）
  const loadWeather = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setWeatherRefreshing(true);
    } else {
      setWeatherLoading(true);
    }
    const result = await fetchWeatherWithCache();
    if (result?.data) {
      setWeather(interpretWeather(result.data, result.isDefault, result.locationName));
    } else {
      setWeather(null);
    }
    setWeatherLoading(false);
    setWeatherRefreshing(false);
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  // 意图预取：用户触碰/hover 按钮时提前加载 Survey chunk
  const prefetchSurvey = () => {
    import('./Survey');
  };

  const handleViewRecommendations = () => {
    if (existingProfile) {
      navigate('/recommendations', { state: { profile: existingProfile } });
    }
  };

  return (
    <div className="min-h-screen bg-white page-enter">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <Shirt className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              StyleFit
            </span>
          </div>
          <div className="flex items-center gap-2">
            {favoriteItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/favorites')}
                className="relative"
              >
                <Heart className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">收藏</span>
                <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {favoriteItems.length}
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
                  查看推荐
                </Button>
                <Button
                  onClick={() => navigate('/survey')}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  重新测试
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/survey')}
                className="bg-slate-900 hover:bg-slate-800"
              >
                开始穿搭测试
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
            AI 智能穿搭推荐引擎
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            找到最适合你的
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900">
              穿搭风格
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-500 leading-relaxed">
            输入你的身高、体重、体型等信息，AI 会为你精准推荐最适合的服装搭配。
            不再为"这件衣服适不适合我"而困扰，让穿搭变得简单又有趣。
          </p>

          {/* 回访用户：显示快捷入口 */}
          {existingProfile && (
            <div className="mb-8 inline-flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                <UserCheck className="h-4 w-4" />
                欢迎回来！检测到你的体型数据
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  size="lg"
                  onClick={handleViewRecommendations}
                  className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white"
                >
                  查看我的推荐
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
                  重新测试
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
                立即测试我的穿搭
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
                <span className="text-sm text-slate-400">获取天气中...</span>
              </div>
            ) : weather ? (
              <button
                onClick={() => !weatherRefreshing && loadWeather(true)}
                disabled={weatherRefreshing}
                className="group flex w-full items-center gap-4 rounded-2xl border bg-white px-5 py-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition-opacity duration-200 ${weatherRefreshing ? 'opacity-60' : ''}`}>
                  {weather.rainNote ? (
                    <Umbrella className="h-5 w-5" />
                  ) : weather.windNote ? (
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
                    <span className="text-sm text-slate-500 transition-all duration-200">· 体感 {Math.round(weather.apparentTemperature)}°C</span>
                    <span className="text-sm text-slate-500">{weather.weatherLabel}</span>
                    <span className="hidden text-xs text-slate-400 sm:inline">·</span>
                    <span className="hidden text-xs text-slate-400 sm:inline">{weather.locationName}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500 transition-all duration-200">
                    {weather.clothingAdvice}
                    {weather.rainNote && <span className="ml-1 text-sky-600">· {weather.rainNote}</span>}
                    {weather.windNote && <span className="ml-1 text-amber-600">· {weather.windNote}</span>}
                  </p>
                </div>
                <RefreshCw className={`h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:text-slate-500 ${weatherRefreshing ? 'animate-spin text-sky-500' : ''}`} />
              </button>
            ) : null}
          </div>
        </section>
      )}

      {/* 今天去哪 - 场合快捷入口 */}
      <section className="px-4 py-16 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              今天去哪？
            </h2>
            <p className="text-sm text-slate-500">
              选一个场合，一键获取穿搭推荐
            </p>
          </div>

          {/* 移动端横向滑动，桌面端网格 */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible lg:grid-cols-6 sm:pb-0">
            {occasionQuickEntries.map((entry) => (
              <button
                key={entry.key}
                onClick={() => navigate(`/recommendations?occasion=${entry.key}`)}
                className="group flex min-w-[140px] flex-shrink-0 flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200 hover:shadow-md active:scale-[0.98] sm:min-w-0"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                  {entry.icon}
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
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-slate-50/50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              三步找到你的风格
            </h2>
            <p className="text-slate-500">
              简单快捷，为你量身推荐
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <StepCard
              icon={<UserCheck className="h-6 w-6" />}
              step="01"
              title="输入体型信息"
              desc="告诉我们你的身高、体重、体型、肤色等基本信息，仅需1分钟。"
            />
            <StepCard
              icon={<Sparkles className="h-6 w-6" />}
              step="02"
              title="AI 智能分析"
              desc="我们的推荐引擎会结合你的体型数据，分析最适合你的服装类型。"
            />
            <StepCard
              icon={<ShoppingBag className="h-6 w-6" />}
              step="03"
              title="获取推荐清单"
              desc="查看为你量身定制的服装推荐，一键跳转到购买页面。"
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
              title="精准体型匹配"
              desc="基于身高体重计算 BMI，结合体型分类，为你推荐最显身材的版型。"
            />
            <FeatureCard
              icon={<Palette className="h-5 w-5" />}
              title="肤色色彩分析"
              desc="根据你的肤色推荐最适合的服装颜色，让你气色更好、更显精神。"
            />
            <FeatureCard
              icon={<Shirt className="h-5 w-5" />}
              title="多风格覆盖"
              desc="商务、休闲、街头、简约、优雅……无论你喜欢哪种风格都能找到。"
            />
            <FeatureCard
              icon={<ShoppingBag className="h-5 w-5" />}
              title="一键购买直达"
              desc="每件推荐都附带购买链接，看中即可直接跳转购买，省心省力。"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 px-4 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold">
            准备好发现你的专属风格了吗？
          </h2>
          <p className="mb-8 text-slate-300">
            无需注册，只需1分钟，即可获取你的个性化穿搭推荐
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/survey')}
            className="h-12 px-8 text-base bg-white text-slate-900 hover:bg-slate-100"
          >
            开始穿搭测试
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8 text-center text-sm text-slate-400">
        <p> StyleFit — 智能穿搭推荐</p>
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
