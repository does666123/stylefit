import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CloudSun,
  Dumbbell,
  HeartIcon,
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
import { useT, type TranslationKey } from '@/i18n';
import { fetchWeatherWithCache, interpretWeather, type WeatherData } from '@/lib/weather';
import { loadProfile } from '@/hooks/useRecommendation';
import { STYLEFIT_DATA_CLEARED_EVENT } from '@/lib/localData';
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

const newArrivals = [
  { key: 'aliceBag', tag: 'new', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=520&h=650&fit=crop&q=80' },
  { key: 'reameTop', tag: 'sale', image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=520&h=650&fit=crop&q=80' },
  { key: 'trenchCoat', tag: 'new', image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=520&h=650&fit=crop&q=80' },
  { key: 'denimPant', tag: 'hot', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=520&h=650&fit=crop&q=80' },
  { key: 'knitCardigan', tag: 'new', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=520&h=650&fit=crop&q=80' },
  { key: 'leatherLoafer', tag: 'sale', image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=520&h=650&fit=crop&q=80' },
  { key: 'silkDress', tag: 'new', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=520&h=650&fit=crop&q=80' },
  { key: 'cottonShirt', tag: 'hot', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=520&h=650&fit=crop&q=80' },
];

export function HomePage() {
  const homeRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useT();
  const [existingProfile, setExistingProfile] = useState<UserBodyProfile | null>(loadProfile);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [weatherIsDefault, setWeatherIsDefault] = useState(false);
  const [weatherLocationName, setWeatherLocationName] = useState('');
  const [silkReady, setSilkReady] = useState(false);

  useEffect(() => {
    const clearProfileState = () => {
      setExistingProfile(null);
    };
    window.addEventListener(STYLEFIT_DATA_CLEARED_EVENT, clearProfileState);
    return () => window.removeEventListener(STYLEFIT_DATA_CLEARED_EVENT, clearProfileState);
  }, []);

  useLayoutEffect(() => {
    if (!homeRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(min-width: 768px)').matches) return;

    let cancelled = false;
    let context: { revert: () => void } | undefined;

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled || !homeRef.current) return;

      gsap.registerPlugin(ScrollTrigger);
      context = gsap.context(() => {
      const hero = homeRef.current?.querySelector<HTMLElement>('[data-hero]');
      const heroLooks = gsap.utils.toArray<HTMLElement>('[data-hero-look]');
      const heroImages = gsap.utils.toArray<HTMLElement>('[data-hero-look-image]');

      gsap.set('[data-hero-nav]', { autoAlpha: 0, y: -18 });
      gsap.set('[data-hero-title-line]', { autoAlpha: 0, yPercent: 115, scaleY: 0.72, transformOrigin: 'bottom' });
      gsap.set('[data-hero-meta], [data-hero-copy], [data-hero-actions], [data-hero-gallery], [data-hero-note]', { autoAlpha: 0, y: 30 });
      gsap.set(heroLooks, { clipPath: 'inset(0 0 100% 0 round 1.25rem)' });
      gsap.set(heroImages, { scale: 1.1, transformOrigin: 'center' });

      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .to('[data-hero-nav]', { autoAlpha: 1, y: 0, duration: 0.72 })
        .to('[data-hero-title-line]', { autoAlpha: 1, yPercent: 0, scaleY: 1, duration: 1.15, stagger: 0.14 }, '<0.12')
        .to('[data-hero-meta], [data-hero-copy]', { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, '<0.28')
        .to('[data-hero-gallery]', { autoAlpha: 1, y: 0, duration: 0.95 }, '<0.18')
        .to(heroLooks, { clipPath: 'inset(0 0 0% 0 round 1.25rem)', duration: 1.05, stagger: 0.14 }, '<0.06')
        .to('[data-hero-actions], [data-hero-note]', { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.12 }, '<0.12');

      if (hero) {
        gsap.to('[data-hero-gallery]', {
          yPercent: -7,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8 },
        });
        gsap.to(heroImages, {
          yPercent: -6,
          scale: 1.03,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8 },
        });
      }

      gsap.utils.toArray<HTMLElement>('[data-motion-section]').forEach((section) => {
        const displayTitle = section.querySelector<HTMLElement>('[data-motion-display]');
        const heading = section.querySelector<HTMLElement>('[data-motion-heading-main]');
        const cards = gsap.utils.toArray<HTMLElement>(section.querySelectorAll('[data-motion-card]'));
        const trigger = { trigger: section, start: 'top 76%', once: true };

        if (displayTitle) {
          gsap.fromTo(displayTitle, { autoAlpha: 0, xPercent: -14 }, { autoAlpha: 1, xPercent: 0, duration: 1.15, ease: 'power4.out', scrollTrigger: trigger });
        }
        if (heading) {
          gsap.fromTo(heading, { autoAlpha: 0, y: 88, scaleY: 0.78, transformOrigin: 'bottom' }, { autoAlpha: 1, y: 0, scaleY: 1, duration: 1.05, ease: 'power4.out', scrollTrigger: trigger });
        }
        if (cards.length) {
          gsap.fromTo(cards, { autoAlpha: 0, y: 68, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.12, ease: 'power4.out', scrollTrigger: trigger });
        }
      });
      }, homeRef);
    }).catch(() => {});

    return () => {
      cancelled = true;
      context?.revert();
    };
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
    <div ref={homeRef} className="stylefit-home min-h-screen">
      <main>
        <section data-hero className="stylefit-hero relative isolate overflow-hidden border-b border-[#1A1A1A]/[0.08]">
          {silkReady && (
            <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
              <Suspense fallback={null}>
                <SilkBackground />
              </Suspense>
            </div>
          )}
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&h=1200&fit=crop&q=80"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.9)_38%,rgba(234,242,248,0.6)_72%,rgba(234,242,248,0.18)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#F7F7F5] to-transparent" />

          <div className="relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-7 px-4 py-16 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-12 md:py-20 lg:gap-16 lg:px-8">
            <div className="relative z-10 max-w-xl">
              <div data-hero-meta className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E0782C]/25 bg-white/90 px-4 py-2 text-xs font-medium tracking-[0.12em] text-[#C96A22] shadow-[0_10px_30px_rgba(224,120,44,0.12)] backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                {t('home.hero.badge')}
              </div>
              <h1 className="hero-title mb-6 text-[clamp(2.75rem,7vw,5.8rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[#1A1A1A]">
                <span className="hero-title-mask block"><span data-hero-title-line className="hero-title-line block">{t('home.hero.title1')}</span></span>
                <span className="hero-title-mask block"><span data-hero-title-line className="hero-title-line block text-[#E0782C]">{t('home.hero.title2')}</span></span>
              </h1>
              <p data-hero-copy className="max-w-lg text-base leading-7 text-[#555550] sm:text-lg">
                {t('home.hero.shopPromo')}
              </p>

              {existingProfile && (
                <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-[#E0782C]/20 bg-white/90 px-4 py-2.5 text-sm text-[#C96A22] shadow-[0_8px_24px_rgba(26,26,26,0.05)] backdrop-blur">
                  <UserCheck className="h-4 w-4" />
                  {t('home.hero.welcomeBack')}
                </div>
              )}

              <div data-hero-actions className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={existingProfile ? handleViewRecommendations : startSurvey}
                  onTouchStart={prefetchSurvey}
                  onMouseEnter={prefetchSurvey}
                  className="sf-primary-button focus-ring h-12 px-6 text-sm sm:text-base"
                >
                  {t('home.hero.viewMyRecommendations')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {existingProfile && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={startSurvey}
                    onTouchStart={prefetchSurvey}
                    onMouseEnter={prefetchSurvey}
                    className="sf-secondary-button focus-ring h-12 px-6 text-sm sm:text-base"
                  >
                    {t('home.nav.retakeTest')}
                  </Button>
                )}
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

            <div data-hero-gallery className="lookbook-gallery relative z-10 mx-auto w-full max-w-[640px] md:mx-0 md:justify-self-end">
              {heroLooks.map((look, index) => {
                const entry = occasionEntries.find((item) => item.key === look.key);
                return (
                  <figure data-hero-look key={look.key} className={`lookbook-card lookbook-card-${index + 1}`}>
                    <img
                      src={look.image}
                      alt={entry?.title ?? 'StyleFit look'}
                      data-hero-look-image
                      className="h-full w-full object-cover"
                      loading={index === 1 ? 'eager' : 'lazy'}
                      fetchPriority={index === 1 ? 'high' : 'auto'}
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1A1A1A]/75 via-[#1A1A1A]/25 to-transparent p-4 pt-12 text-sm font-medium text-[#F7F4EE]">
                      {entry?.title}
                    </figcaption>
                  </figure>
                );
              })}
              <div data-hero-note className="lookbook-note" aria-hidden="true">
                <span>{t('home.stylingNotes')}</span>
                <span>01 — 03</span>
              </div>
            </div>
          </div>
        </section>

        {(weatherLoading || weather) && (
          <section className="bg-[#F7F7F5] px-4 pt-10 sm:px-6">
            <div className="mx-auto max-w-3xl">
              {weatherLoading && !weather ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#1A1A1A]/[0.08] bg-white px-5 py-4 text-[#77756F]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{t('home.weather.loading')}</span>
                </div>
              ) : weather ? (() => {
                const weatherInfo = interpretWeather(weather, weatherIsDefault, weatherLocationName, t as never);
                return (
                  <button
                    onClick={() => !weatherRefreshing && handleRefreshWeather()}
                    disabled={weatherRefreshing}
                    className="focus-ring group flex w-full items-center gap-4 rounded-2xl border border-[#1A1A1A]/[0.08] bg-white px-5 py-4 text-left shadow-[0_14px_40px_rgba(26,26,26,0.06)] transition-all hover:border-[#E0782C]/30 hover:bg-[#FFFDFB] disabled:cursor-not-allowed"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1A1A1A]/[0.08] bg-[#EAF2F8] text-[#C96A22]">
                      {weatherInfo.rainNote ? <Umbrella className="h-5 w-5" /> : weatherInfo.windNote ? <Wind className="h-5 w-5" /> : <CloudSun className="h-5 w-5" />}
                    </div>
                    <div className={`min-w-0 flex-1 transition-opacity ${weatherRefreshing ? 'opacity-55' : ''}`}>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-lg font-semibold text-[#1A1A1A]">{Math.round(weather.temperature)}°C</span>
                        <span className="text-sm text-[#666660]">· {t('home.weather.feelsLike', { temp: Math.round(weather.apparentTemperature) })}</span>
                        <span className="text-sm text-[#666660]">{weatherInfo.weatherLabel}</span>
                        <span className="hidden text-xs text-[#8A8A85] sm:inline">· {weatherInfo.locationName}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#8A8A85]">
                        {weatherInfo.clothingAdvice}
                        {weatherInfo.rainNote && <span className="ml-1 text-[#666660]">· {weatherInfo.rainNote}</span>}
                        {weatherInfo.windNote && <span className="ml-1 text-[#666660]">· {weatherInfo.windNote}</span>}
                      </p>
                    </div>
                    <RefreshCw className={`h-4 w-4 shrink-0 text-[#8A8A85] transition-colors group-hover:text-[#C96A22] ${weatherRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                );
              })() : null}
            </div>
          </section>
        )}

        <section data-motion-section className="bg-[#F7F7F5] px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div className="relative overflow-hidden py-4">
                <span data-motion-display aria-hidden="true" className="motion-display-title">{t('home.newArrivals.title')}</span>
                <div data-motion-heading-main className="relative">
                  <div className="mb-4 h-px w-10 bg-[#E0782C]" />
                  <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#1A1A1A] sm:text-4xl">{t('home.newArrivals.title')}</h2>
                  <p className="mt-3 text-sm leading-6 text-[#666660] sm:text-base">{t('home.hero.desc')}</p>
                </div>
              </div>
              <button onClick={startSurvey} className="nav-text-link focus-ring hidden shrink-0 items-center gap-1.5 text-sm font-medium sm:inline-flex">
                {t('home.cta.button')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {newArrivals.map((item) => {
                const itemKey = `home.product.${item.key}` as TranslationKey;
                const tagKey = `home.tag.${item.tag}` as TranslationKey;
                return (
                  <button
                    key={item.key}
                    onClick={startSurvey}
                    data-motion-card
                    className="focus-ring group overflow-hidden rounded-2xl border border-[#1A1A1A]/[0.08] bg-white text-left shadow-[0_10px_30px_rgba(26,26,26,0.05)] transition-all hover:-translate-y-1 hover:border-[#E0782C]/35 hover:shadow-[0_18px_44px_rgba(26,26,26,0.1)]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={item.image}
                        alt={t(itemKey)}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-[#E0782C] px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-white">
                        {t(tagKey)}
                      </span>
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="truncate text-xs font-medium text-[#555550] sm:text-sm">{t(itemKey)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section data-motion-section id="occasions" className="scroll-mt-20 bg-[#F7F7F5] px-4 py-20 sm:px-6 lg:pb-12 lg:pt-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading display={t('home.occasions.display')} title={t('home.occasions.title')} subtitle={t('home.occasions.subtitle')} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {occasionEntries.map((entry) => {
                const original = occasionQuickEntries.find((item) => item.key === entry.key)!;
                return (
                  <button
                    key={entry.key}
                    onClick={() => navigate(`/recommendations?occasion=${entry.key}`)}
                    data-motion-card
                    className="spotlight-card focus-ring group min-h-[150px] rounded-2xl p-5 text-left sm:min-h-44"
                  >
                    <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#1A1A1A]/[0.08] bg-[#EAF2F8] text-[#555550] transition-colors group-hover:border-[#E0782C]/30 group-hover:text-[#C96A22] sm:mb-8">
                      {original.icon}
                    </span>
                    <span className="block text-sm font-semibold text-[#1A1A1A]">{entry.title}</span>
                    <span className="occasion-card-desc mt-1.5 block text-xs leading-5 text-[#77756F] transition-colors group-hover:text-[#666660]">
                      {entry.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section data-motion-section id="how-it-works" className="scroll-mt-20 border-y border-[#1A1A1A]/[0.08] bg-white px-4 py-20 sm:px-6 lg:pb-24 lg:pt-12">
          <div className="mx-auto max-w-7xl">
            <SectionHeading display={t('home.process.display')} title={t('home.steps.title')} subtitle={t('home.steps.subtitle')} />
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

        <section data-motion-section className="bg-[#F7F7F5] px-4 py-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={<Ruler className="h-5 w-5" />} title={t('home.features.feature1.title')} desc={t('home.features.feature1.desc')} />
            <FeatureCard icon={<Palette className="h-5 w-5" />} title={t('home.features.feature2.title')} desc={t('home.features.feature2.desc')} />
            <FeatureCard icon={<Shirt className="h-5 w-5" />} title={t('home.features.feature3.title')} desc={t('home.features.feature3.desc')} />
            <FeatureCard icon={<ShoppingBag className="h-5 w-5" />} title={t('home.features.feature4.title')} desc={t('home.features.feature4.desc')} />
          </div>
        </section>

        <section data-motion-section className="border-y border-[#1A1A1A]/[0.08] bg-white px-4 py-20 text-[#1A1A1A] sm:px-6">
          <div data-motion-card className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-medium tracking-[0.18em] text-[#C96A22]">{t('home.personalStyling')}</p>
            <h2 className="mb-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{t('home.cta.title')}</h2>
            <p className="mb-8 text-[#666660]">{t('home.cta.desc')}</p>
            <Button size="lg" onClick={startSurvey} className="sf-primary-button focus-ring h-12 px-8 text-base">
              {t('home.cta.button')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        <section data-motion-section className="bg-[#EAF2F8] px-4 py-24 text-center sm:px-6 lg:py-28">
          <div data-motion-card className="mx-auto max-w-4xl">
            <p className="mb-5 text-xs font-semibold tracking-[0.3em] text-[#C96A22]">{t('home.studioTitle')}</p>
            <p className="text-[clamp(2.4rem,7vw,5.2rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-[#1A1A1A]">
              {t('home.brandMotto1')} <span className="text-[#E0782C]">*</span> {t('home.brandMotto2')}
            </p>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#555550]">{t('home.cta.desc')}</p>
          </div>
        </section>
      </main>

    </div>
  );
}

function SectionHeading({ display, title, subtitle }: { display: string; title: string; subtitle: string }) {
  return (
    <div className="relative mb-10 max-w-2xl overflow-hidden py-4">
      <span data-motion-display aria-hidden="true" className="motion-display-title">{display}</span>
      <div data-motion-heading-main className="relative">
        <div className="mb-4 h-px w-10 bg-[#E0782C]" />
        <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#1A1A1A] sm:text-4xl">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#666660] sm:text-base">{subtitle}</p>
      </div>
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
  const { t } = useT();
  return (
    <article data-motion-card className={`step-card ${accent ? 'step-card-accent' : ''} ${className ?? ''}`}>
      <div className={wide ? 'grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end' : ''}>
        <div>
          <div className="mb-7 flex items-start justify-between sm:mb-12">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1A1A1A]/[0.08] bg-[#EAF2F8] text-[#C96A22]">
              {icon}
            </span>
            <span className="text-xs font-medium tracking-[0.2em] text-[#8A8A85]">{step}</span>
          </div>
          <h3 className="text-2xl font-semibold tracking-[-0.025em] text-[#1A1A1A]">{title}</h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#666660]">{desc}</p>
        </div>
        {wide && (
          <div className="hidden items-center gap-2 text-xs tracking-[0.18em] text-[#77756F] lg:flex" aria-hidden="true">
            <span>{t('home.flow.profile')}</span><ArrowRight className="h-3.5 w-3.5" /><span>{t('home.flow.context')}</span><ArrowRight className="h-3.5 w-3.5" /><span>{t('home.flow.looks')}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <article data-motion-card className="rounded-2xl border border-[#1A1A1A]/[0.08] bg-white p-5 shadow-[0_10px_30px_rgba(26,26,26,0.05)]">
      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2F8] text-[#555550]">{icon}</div>
      <h3 className="font-semibold text-[#1A1A1A]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#666660]">{desc}</p>
    </article>
  );
}

export default HomePage;
