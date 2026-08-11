import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CloudSun,
  Dumbbell,
  Heart,
  Heart as HeartIcon,
  Loader2,
  Map,
  Palette,
  PartyPopper,
  RefreshCw,
  Ruler,
  Shirt,
  ShoppingBag,
  Sparkles,
  Umbrella,
  UserCheck,
  Wind,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT } from '@/i18n';
import { fetchWeatherWithCache, interpretWeather, type WeatherData } from '@/lib/weather';
import { loadProfile } from '@/hooks/useRecommendation';
import type { UserBodyProfile } from '@/types';

const SilkBackground = lazy(() => import('@/components/SilkBackground'));

const occasionQuickEntries = [
  { key: 'work', icon: <Briefcase className="h-5 w-5" /> },
  { key: 'date', icon: <HeartIcon className="h-5 w-5" /> },
  { key: 'sport', icon: <Dumbbell className="h-5 w-5" /> },
  { key: 'party', icon: <PartyPopper className="h-5 w-5" /> },
  { key: 'travel', icon: <Map className="h-5 w-5" /> },
  { key: 'formal', icon: <Building2 className="h-5 w-5" /> },
];

const heroLooks = [
  {
    key: 'work',
    image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=640&h=900&fit=crop&q=86',
  },
  {
    key: 'date',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=720&h=980&fit=crop&q=88',
  },
  {
    key: 'travel',
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=640&h=900&fit=crop&q=86',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [existingProfile] = useState<UserBodyProfile | null>(loadProfile);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [weatherIsDefault, setWeatherIsDefault] = useState(false);
  const [weatherLocationName, setWeatherLocationName] = useState('');
  const [favCount, setFavCount] = useState(0);
  const [silkReady, setSilkReady] = useState(false);

  useEffect(() => {
    const updateFavCount = () => {
      try {
        const saved = localStorage.getItem('stylefit_favorites');
        if (saved) setFavCount((JSON.parse(saved) as string[]).length);
      } catch {
        // 收藏数据损坏时保持当前计数。
      }
    };
    updateFavCount();
    const interval = setInterval(updateFavCount, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setWeatherLoading(true);
      const result = await fetchWeatherWithCache();
      if (!cancelled && result) {
        setWeather(result.data);
        setWeatherIsDefault(result.isDefault);
        setWeatherLocationName(result.locationName);
      }
      if (!cancelled) setWeatherLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!desktop.matches || reducedMotion.matches) return;

    const timeoutId = window.setTimeout(() => setSilkReady(true), 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
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

  const handleViewRecommendations = () => {
    if (existingProfile) navigate('/recommendations', { state: { profile: existingProfile } });
  };

  const startSurvey = () => {
    navigate('/survey', existingProfile ? { state: { restartSurvey: true } } : undefined);
  };

  const prefetchSurvey = () => {
    void import('@/pages/Survey');
  };

  const scrollToOccasions = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('occasions')?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const occasionEntries = [
    { key: 'work', title: t('home.occasions.work.title'), desc: t('home.occasions.work.desc') },
    { key: 'date', title: t('home.occasions.date.title'), desc: t('home.occasions.date.desc') },
    { key: 'sport', title: t('home.occasions.sport.title'), desc: t('home.occasions.sport.desc') },
    { key: 'party', title: t('home.occasions.party.title'), desc: t('home.occasions.party.desc') },
    { key: 'travel', title: t('home.occasions.travel.title'), desc: t('home.occasions.travel.desc') },
    { key: 'formal', title: t('home.occasions.formal.title'), desc: t('home.occasions.formal.desc') },
  ];

  return (
    <div className="stylefit-home min-h-screen page-enter">
      <nav className="stylefit-nav sticky top-0 z-50 border-b border-white/[0.08]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="focus-ring flex items-center gap-2 rounded-xl text-[#F7F4EE]"
            aria-label="StyleFit"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C9A46A]/35 bg-[#1B1E26] shadow-[0_10px_30px_rgba(0,0,0,0.24)]">
              <Shirt className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold tracking-[-0.02em]">StyleFit</span>
          </button>

          <div className="hidden items-center gap-7 text-sm text-[#C6C1B8] md:flex">
            <button onClick={scrollToOccasions} className="nav-text-link focus-ring rounded-md">
              {t('home.occasions.title')}
            </button>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="nav-text-link focus-ring rounded-md"
            >
              {t('home.steps.title')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="border-white/10 bg-white/[0.04] text-[#AAA49B] shadow-none hover:border-[#C9A46A]/35 hover:bg-white/[0.07] hover:text-[#F7F4EE]" />
            {favCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/favorites')}
                className="focus-ring relative h-9 rounded-xl px-2 text-[#AAA49B] hover:bg-white/[0.06] hover:text-[#F7F4EE] sm:px-3"
              >
                <Heart className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">{t('common.favorites')}</span>
                <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#6B4B63] px-1 text-[10px] font-bold text-white">
                  {favCount}
                </span>
              </Button>
            )}
            {existingProfile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewRecommendations}
                className="focus-ring hidden rounded-xl text-[#AAA49B] hover:bg-white/[0.06] hover:text-[#F7F4EE] lg:inline-flex"
              >
                {t('home.nav.viewRecommendations')}
              </Button>
            )}
            <Button
              onClick={startSurvey}
              onTouchStart={prefetchSurvey}
              onMouseEnter={prefetchSurvey}
              className="sf-primary-button focus-ring h-9 px-3 text-xs sm:px-4 sm:text-sm"
            >
              {existingProfile ? t('home.nav.retakeTest') : t('home.nav.startTest')}
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="stylefit-hero relative isolate overflow-hidden border-b border-white/[0.08]">
          {silkReady && (
            <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
              <Suspense fallback={null}>
                <SilkBackground />
              </Suspense>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,12,0.96)_0%,rgba(8,9,12,0.84)_37%,rgba(8,9,12,0.26)_74%,rgba(8,9,12,0.48)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#08090C] to-transparent" />

          <div className="relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-7 px-4 py-16 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-12 md:py-20 lg:gap-16 lg:px-8">
            <div className="relative z-10 max-w-xl animate-fade-in-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C9A46A]/25 bg-[#12141A]/75 px-4 py-2 text-xs font-medium tracking-[0.12em] text-[#D7C39D] shadow-[0_12px_36px_rgba(0,0,0,0.24)] backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                {t('home.hero.badge')}
              </div>
              <h1 className="hero-title mb-6 text-[clamp(2.75rem,7vw,5.8rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[#F7F4EE]">
                <span className="blur-text-piece block">{t('home.hero.title1')}</span>
                <span className="blur-text-piece blur-text-piece-delayed block text-[#D8C5CF]">
                  {t('home.hero.title2')}
                </span>
              </h1>
              <p className="max-w-lg text-base leading-7 text-[#BDB8B0] sm:text-lg">
                {t('home.hero.desc')}
              </p>

              {existingProfile && (
                <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-[#C9A46A]/20 bg-[#12141A]/80 px-4 py-2.5 text-sm text-[#D7C39D] backdrop-blur">
                  <UserCheck className="h-4 w-4" />
                  {t('home.hero.welcomeBack')}
                </div>
              )}

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={existingProfile ? handleViewRecommendations : startSurvey}
                  onTouchStart={prefetchSurvey}
                  onMouseEnter={prefetchSurvey}
                  className="sf-primary-button focus-ring h-12 px-6 text-sm sm:text-base"
                >
                  {existingProfile ? t('home.hero.viewMyRecommendations') : t('home.hero.startTestNow')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={scrollToOccasions}
                  className="sf-secondary-button focus-ring h-12 px-6 text-sm sm:text-base"
                >
                  {t('home.occasions.title')}
                </Button>
              </div>
            </div>

            <div className="lookbook-gallery relative z-10 mx-auto w-full max-w-[640px] animate-fade-in-up md:mx-0 md:justify-self-end">
              {heroLooks.map((look, index) => {
                const entry = occasionEntries.find((item) => item.key === look.key);
                return (
                  <figure key={look.key} className={`lookbook-card lookbook-card-${index + 1}`}>
                    <img
                      src={look.image}
                      alt={entry?.title ?? 'StyleFit look'}
                      className="h-full w-full object-cover"
                      loading={index === 1 ? 'eager' : 'lazy'}
                      fetchPriority={index === 1 ? 'high' : 'auto'}
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 pt-12 text-sm font-medium text-[#F7F4EE]">
                      {entry?.title}
                    </figcaption>
                  </figure>
                );
              })}
              <div className="lookbook-note" aria-hidden="true">
                <span>STYLE NOTES</span>
                <span>01 — 03</span>
              </div>
            </div>
          </div>
        </section>

        {(weatherLoading || weather) && (
          <section className="bg-[#08090C] px-4 pt-10 sm:px-6">
            <div className="mx-auto max-w-3xl">
              {weatherLoading && !weather ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[#12141A] px-5 py-4 text-[#77756F]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t('home.weather.loading')}</span>
                </div>
              ) : weather ? (() => {
                const weatherInfo = interpretWeather(weather, weatherIsDefault, weatherLocationName, t as never);
                return (
                  <button
                    onClick={() => !weatherRefreshing && handleRefreshWeather()}
                    disabled={weatherRefreshing}
                    className="focus-ring group flex w-full items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#12141A] px-5 py-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition-all hover:border-[#C9A46A]/25 hover:bg-[#171A21] disabled:cursor-not-allowed"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1B1E26] text-[#C9A46A]">
                      {weatherInfo.rainNote ? <Umbrella className="h-5 w-5" /> : weatherInfo.windNote ? <Wind className="h-5 w-5" /> : <CloudSun className="h-5 w-5" />}
                    </div>
                    <div className={`min-w-0 flex-1 transition-opacity ${weatherRefreshing ? 'opacity-55' : ''}`}>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-lg font-semibold text-[#F7F4EE]">{Math.round(weather.temperature)}°C</span>
                        <span className="text-sm text-[#AAA49B]">· {t('home.weather.feelsLike', { temp: Math.round(weather.apparentTemperature) })}</span>
                        <span className="text-sm text-[#AAA49B]">{weatherInfo.weatherLabel}</span>
                        <span className="hidden text-xs text-[#77756F] sm:inline">· {weatherInfo.locationName}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#77756F]">
                        {weatherInfo.clothingAdvice}
                        {weatherInfo.rainNote && <span className="ml-1 text-[#AAA49B]">· {weatherInfo.rainNote}</span>}
                        {weatherInfo.windNote && <span className="ml-1 text-[#AAA49B]">· {weatherInfo.windNote}</span>}
                      </p>
                    </div>
                    <RefreshCw className={`h-4 w-4 shrink-0 text-[#77756F] transition-colors group-hover:text-[#C9A46A] ${weatherRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                );
              })() : null}
            </div>
          </section>
        )}

        <section id="occasions" className="scroll-mt-20 bg-[#08090C] px-4 py-20 sm:px-6 lg:pb-12 lg:pt-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading title={t('home.occasions.title')} subtitle={t('home.occasions.subtitle')} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {occasionEntries.map((entry, index) => {
                const original = occasionQuickEntries.find((item) => item.key === entry.key)!;
                return (
                  <button
                    key={entry.key}
                    onClick={() => navigate(`/recommendations?occasion=${entry.key}`)}
                    className="spotlight-card focus-ring stagger-item animate-fade-in-up group min-h-[150px] rounded-2xl p-5 text-left sm:min-h-44"
                    style={{ animationDelay: `${index * 55}ms` }}
                  >
                    <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1B1E26] text-[#AAA49B] transition-colors group-hover:border-[#C9A46A]/25 group-hover:text-[#D7C39D] sm:mb-8">
                      {original.icon}
                    </span>
                    <span className="block text-sm font-semibold text-[#F7F4EE]">{entry.title}</span>
                    <span className="occasion-card-desc mt-1.5 block text-xs leading-5 text-[#77756F] transition-colors group-hover:text-[#AAA49B]">
                      {entry.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-y border-white/[0.08] bg-[#0D0F14] px-4 py-20 sm:px-6 lg:pb-24 lg:pt-12">
          <div className="mx-auto max-w-7xl">
            <SectionHeading title={t('home.steps.title')} subtitle={t('home.steps.subtitle')} />
            <div className="grid gap-4 lg:grid-cols-12">
              <StepCard
                className="lg:col-span-5"
                icon={<UserCheck className="h-6 w-6" />}
                step="01"
                title={t('home.steps.step1.title')}
                desc={t('home.steps.step1.desc')}
              />
              <StepCard
                className="lg:col-span-7"
                icon={<Sparkles className="h-6 w-6" />}
                step="02"
                title={t('home.steps.step2.title')}
                desc={t('home.steps.step2.desc')}
                accent
              />
              <StepCard
                className="step-card-wide lg:col-span-12"
                icon={<ShoppingBag className="h-6 w-6" />}
                step="03"
                title={t('home.steps.step3.title')}
                desc={t('home.steps.step3.desc')}
                wide
              />
            </div>
          </div>
        </section>

        <section className="bg-[#08090C] px-4 py-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={<Ruler className="h-5 w-5" />} title={t('home.features.feature1.title')} desc={t('home.features.feature1.desc')} />
            <FeatureCard icon={<Palette className="h-5 w-5" />} title={t('home.features.feature2.title')} desc={t('home.features.feature2.desc')} />
            <FeatureCard icon={<Shirt className="h-5 w-5" />} title={t('home.features.feature3.title')} desc={t('home.features.feature3.desc')} />
            <FeatureCard icon={<ShoppingBag className="h-5 w-5" />} title={t('home.features.feature4.title')} desc={t('home.features.feature4.desc')} />
          </div>
        </section>

        <section className="border-y border-white/[0.08] bg-[#0D0F14] px-4 py-20 text-[#F7F4EE] sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-medium tracking-[0.18em] text-[#C9A46A]">PERSONAL STYLING</p>
            <h2 className="mb-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{t('home.cta.title')}</h2>
            <p className="mb-8 text-[#AAA49B]">{t('home.cta.desc')}</p>
            <Button size="lg" onClick={startSurvey} className="sf-primary-button focus-ring h-12 px-8 text-base">
              {t('home.cta.button')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] bg-[#08090C] px-4 py-8 text-center text-sm text-[#77756F]">
        <p>StyleFit · {t('home.footer.tagline')}</p>
      </footer>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-10 max-w-2xl animate-fade-in-up">
      <div className="mb-4 h-px w-10 bg-[#C9A46A]" />
      <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#F7F4EE] sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[#AAA49B] sm:text-base">{subtitle}</p>
    </div>
  );
}

function StepCard({
  icon,
  step,
  title,
  desc,
  className,
  accent = false,
  wide = false,
}: {
  icon: ReactNode;
  step: string;
  title: string;
  desc: string;
  className?: string;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <article className={`step-card animate-fade-in-up ${accent ? 'step-card-accent' : ''} ${className ?? ''}`}>
      <div className={wide ? 'grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end' : ''}>
        <div>
          <div className="mb-7 flex items-start justify-between sm:mb-12">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1B1E26] text-[#D7C39D]">
              {icon}
            </span>
            <span className="text-xs font-medium tracking-[0.2em] text-[#77756F]">{step}</span>
          </div>
          <h3 className="text-2xl font-semibold tracking-[-0.025em] text-[#F7F4EE]">{title}</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#AAA49B]">{desc}</p>
        </div>
        {wide && (
          <div className="hidden items-center gap-2 text-xs tracking-[0.18em] text-[#77756F] lg:flex" aria-hidden="true">
            <span>PROFILE</span><ArrowRight className="h-3.5 w-3.5" /><span>CONTEXT</span><ArrowRight className="h-3.5 w-3.5" /><span>LOOKS</span>
          </div>
        )}
      </div>
    </article>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#12141A] p-5">
      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B1E26] text-[#AAA49B]">{icon}</div>
      <h3 className="font-semibold text-[#F7F4EE]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#77756F]">{desc}</p>
    </article>
  );
}

export default HomePage;
