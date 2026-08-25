import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { useT } from '@/i18n';
import { fetchWeatherWithCache, interpretWeather, type WeatherData } from '@/lib/weather';
import { getNeutralProfile, loadProfile } from '@/hooks/useRecommendation';
import { cacheAIRecommendation, readCachedAIRecommendation, requestAIRecommendation, type AIRecommendationResult } from '@/lib/aiRecommendation';
import { STYLEFIT_DATA_CLEARED_EVENT } from '@/lib/localData';
import { saveQuickSceneContext, type QuickScene } from '@/lib/quickScene';
import { recordStyleFeedback } from '@/lib/styleFeedback';
import type { Gender, Occasion, RecommendationMode, UserBodyProfile } from '@/types';

const SilkBackground = lazy(() => import('@/components/SilkBackground'));

const occasionQuickEntries = [
  { key: 'work', icon: <Briefcase className="h-5 w-5" /> },
  { key: 'date', icon: <HeartIcon className="h-5 w-5" /> },
  { key: 'sport', icon: <Dumbbell className="h-5 w-5" /> },
  { key: 'party', icon: <PartyPopper className="h-5 w-5" /> },
  { key: 'travel', icon: <Map className="h-5 w-5" /> },
  { key: 'formal', icon: <Building2 className="h-5 w-5" /> },
];

const quickSceneOccasions: Record<QuickScene, Occasion> = {
  work: 'work', date: 'date', sport: 'daily', party: 'party', travel: 'travel', formal: 'formal',
};

const quickSceneModes: Record<QuickScene, RecommendationMode> = {
  work: 'daily', sport: 'daily', travel: 'daily', date: 'advanced', party: 'advanced', formal: 'advanced',
};

const quickStyleOptions = [
  { id: 'daily', label: '日常简约', value: 'casual' },
  { id: 'clean-fit', label: 'Clean Fit', value: 'minimal' },
  { id: 'cityboy', label: 'Cityboy', value: 'streetwear' },
  { id: 'old-money', label: 'Old Money', value: 'elegant' },
  { id: 'korean', label: '韩系', value: 'casual' },
  { id: 'japanese', label: '日系', value: 'minimal' },
  { id: 'american-vintage', label: '美式复古', value: 'streetwear' },
  { id: 'light-mature', label: '轻熟', value: 'elegant' },
  { id: 'french', label: '法式', value: 'elegant' },
  { id: 'y2k', label: 'Y2K', value: 'streetwear' },
  { id: 'commute', label: '通勤', value: 'business' },
  { id: 'minimal-luxe', label: '极简高级', value: 'minimal' },
] as const;

type QuickStyleId = typeof quickStyleOptions[number]['id'];

type QuickGenerationStatus =
  | { state: 'generating'; title: string }
  | { state: 'ready'; scene: QuickScene; title: string; profile: UserBodyProfile; result: AIRecommendationResult }
  | { state: 'error'; scene: QuickScene; title: string; profile: UserBodyProfile };

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
  const homeRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useT();
  const [existingProfile, setExistingProfile] = useState<UserBodyProfile | null>(loadProfile);
  const [mode, setMode] = useState<RecommendationMode>(() => existingProfile?.mode === 'advanced' ? 'advanced' : 'daily');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherRefreshing, setWeatherRefreshing] = useState(false);
  const [weatherIsDefault, setWeatherIsDefault] = useState(false);
  const [weatherLocationName, setWeatherLocationName] = useState('');
  const [silkReady, setSilkReady] = useState(false);
  const [quickScene, setQuickScene] = useState<{ scene: QuickScene; title: string } | null>(null);
  const [quickForm, setQuickForm] = useState({ gender: 'male' as Gender, height: '175', weight: '70', budget: '300' });
  const [quickDialogOpen, setQuickDialogOpen] = useState(false);
  const [quickStyleIds, setQuickStyleIds] = useState<QuickStyleId[]>(['daily']);
  const [quickUnlimitedBudget, setQuickUnlimitedBudget] = useState(false);
  const [quickElapsedSeconds, setQuickElapsedSeconds] = useState(0);
  const [quickGenerationStatus, setQuickGenerationStatus] = useState<QuickGenerationStatus | null>(null);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState('');
  const quickRequestInFlight = useRef(false);
  const quickDialogOpenRef = useRef(false);
  const changeMode = (nextMode: RecommendationMode) => {
    if (nextMode !== mode) {
      recordStyleFeedback({
        profile: existingProfile ? { ...existingProfile, mode: nextMode } : { mode: nextMode },
        action: 'mode_switch',
        reason: `${mode}->${nextMode}`,
      });
    }
    setMode(nextMode);
  };

  useEffect(() => {
    const clearProfileState = () => {
      setExistingProfile(null);
    };
    window.addEventListener(STYLEFIT_DATA_CLEARED_EVENT, clearProfileState);
    return () => window.removeEventListener(STYLEFIT_DATA_CLEARED_EVENT, clearProfileState);
  }, []);

  useEffect(() => {
    quickDialogOpenRef.current = quickDialogOpen;
  }, [quickDialogOpen]);

  useEffect(() => {
    if (!quickSubmitting) {
      setQuickElapsedSeconds(0);
      return;
    }

    setQuickElapsedSeconds(0);
    const intervalId = window.setInterval(() => setQuickElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [quickSubmitting]);

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
    navigate('/survey', { state: { restartSurvey: Boolean(existingProfile), mode } });
  };

  const buildQuickProfile = useCallback((scene: QuickScene) => {
    const occasion = quickSceneOccasions[scene];
    const baseProfile = existingProfile ? { ...existingProfile } : getNeutralProfile(occasion);
    const selectedStyle = quickStyleOptions.find((style) => style.id === quickStyleIds[0]) ?? quickStyleOptions[0];
    const budget = quickUnlimitedBudget ? undefined : Number(quickForm.budget);
    if (!existingProfile) {
      baseProfile.gender = quickForm.gender;
      baseProfile.height = Number(quickForm.height);
      baseProfile.weight = Number(quickForm.weight);
    }
    return {
      ...baseProfile,
      occasion,
      budget,
      mode: quickSceneModes[scene],
      stylePreference: selectedStyle.value,
    };
  }, [existingProfile, quickForm, quickStyleIds, quickUnlimitedBudget]);

  const runQuickRecommendation = useCallback(async (scene: QuickScene, title: string, profile: UserBodyProfile) => {
    if (quickRequestInFlight.current) return;
    quickRequestInFlight.current = true;
    setQuickSubmitting(true);
    setQuickError('');
    setQuickGenerationStatus({ state: 'generating', title });
    saveQuickSceneContext(scene, profile);

    try {
      const cached = readCachedAIRecommendation(profile);
      const result = cached || await requestAIRecommendation(profile);
      if (!result) throw new Error('recommendation-unavailable');
      if (!cached) cacheAIRecommendation(profile, result);

      const recommendationState = {
        profile,
        aiRecommendation: result.recommendation,
        aiCandidates: result.candidates,
        quickScene: { entryMode: 'quick_scene' as const, scene, title },
      };

      if (quickDialogOpenRef.current) {
        navigate(`/recommendations?entryMode=quick_scene&scene=${scene}`, { state: recommendationState });
        return;
      }

      setQuickGenerationStatus({ state: 'ready', scene, title, profile, result });
    } catch {
      setQuickError('暂时没能生成这组穿着建议，请重新尝试。');
      setQuickGenerationStatus({ state: 'error', scene, title, profile });
    } finally {
      setQuickSubmitting(false);
      quickRequestInFlight.current = false;
    }
  }, [navigate]);

  const openQuickScene = (scene: QuickScene, title: string) => {
    setQuickScene({ scene, title });
    setQuickDialogOpen(true);
    setQuickError('');
    setQuickGenerationStatus(null);
    setQuickUnlimitedBudget(typeof existingProfile?.budget !== 'number' || existingProfile.budget <= 0);
    setQuickForm({
      gender: existingProfile?.gender ?? 'male',
      height: String(existingProfile?.height ?? 175),
      weight: String(existingProfile?.weight ?? 70),
      budget: String(existingProfile?.budget ?? 300),
    });
    setQuickStyleIds([
      quickStyleOptions.find((style) => style.value === existingProfile?.stylePreference)?.id ?? 'daily',
    ]);
  };

  const toggleQuickStyle = (styleId: QuickStyleId) => {
    setQuickStyleIds((current) => {
      if (current.includes(styleId)) return current.filter((id) => id !== styleId);
      return [styleId, ...current].slice(0, 2);
    });
  };

  const submitQuickScene = () => {
    if (!quickScene) return;
    const height = Number(quickForm.height);
    const weight = Number(quickForm.weight);
    const budget = Number(quickForm.budget);
    if (height < 120 || height > 230 || weight < 30 || weight > 250 || (!quickUnlimitedBudget && budget <= 0)) {
      setQuickError('请填写有效的身高、体重和预算。');
      return;
    }
    if (!quickStyleIds.length) {
      setQuickError('请至少选择一种想要的风格。');
      return;
    }
    void runQuickRecommendation(quickScene.scene, quickScene.title, buildQuickProfile(quickScene.scene));
  };

  const viewQuickRecommendation = (status: Extract<QuickGenerationStatus, { state: 'ready' }>) => {
    navigate(`/recommendations?entryMode=quick_scene&scene=${status.scene}`, {
      state: {
        profile: status.profile,
        aiRecommendation: status.result.recommendation,
        aiCandidates: status.result.candidates,
        quickScene: { entryMode: 'quick_scene', scene: status.scene, title: status.title },
      },
    });
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
      {quickGenerationStatus && !quickDialogOpen && (
        <div className="fixed inset-x-4 top-4 z-[70] mx-auto flex w-auto max-w-md items-center justify-between gap-3 rounded-2xl border border-[#E0782C]/25 bg-white/95 px-4 py-3 text-sm shadow-[0_14px_36px_rgba(26,26,26,0.16)] backdrop-blur sm:left-auto sm:right-6 sm:w-[min(100%-3rem,420px)]" role="status">
          <div className="min-w-0">
            {quickGenerationStatus.state === 'generating' && <><p className="font-semibold text-[#1A1A1A]">AI穿着方案生成中…</p><p className="mt-0.5 truncate text-xs text-[#77756F]">正在生成{quickGenerationStatus.title}穿着</p></>}
            {quickGenerationStatus.state === 'ready' && <><p className="font-semibold text-[#1A1A1A]">你的穿着方案已生成</p><p className="mt-0.5 truncate text-xs text-[#77756F]">{quickGenerationStatus.title}的专属建议已为你保留</p></>}
            {quickGenerationStatus.state === 'error' && <><p className="font-semibold text-[#1A1A1A]">本次生成暂未完成</p><p className="mt-0.5 truncate text-xs text-[#77756F]">你可以重新尝试生成这组穿着</p></>}
          </div>
          {quickGenerationStatus.state === 'generating' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#E0782C]" />}
          {quickGenerationStatus.state === 'ready' && <Button size="sm" onClick={() => viewQuickRecommendation(quickGenerationStatus)} className="sf-primary-button h-9 shrink-0 px-3">查看推荐</Button>}
          {quickGenerationStatus.state === 'error' && <Button size="sm" onClick={() => void runQuickRecommendation(quickGenerationStatus.scene, quickGenerationStatus.title, quickGenerationStatus.profile)} className="sf-primary-button h-9 shrink-0 px-3">重试</Button>}
        </div>
      )}
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
                {t('home.hero.aiRecommend')}
              </p>

              {existingProfile && (
                <div className="mt-7 inline-flex items-center gap-2 rounded-xl border border-[#E0782C]/20 bg-white/90 px-4 py-2.5 text-sm text-[#C96A22] shadow-[0_8px_24px_rgba(26,26,26,0.05)] backdrop-blur">
                  <UserCheck className="h-4 w-4" />
                  {t('home.hero.welcomeBack')}
                </div>
              )}

              <div className="mt-7 flex w-full max-w-[32rem] rounded-2xl border border-[#1A1A1A]/10 bg-white/90 p-1.5 shadow-[0_10px_30px_rgba(26,26,26,0.06)] backdrop-blur sm:inline-flex sm:w-auto" role="group" aria-label="推荐模式">
                {([
                    { value: 'daily', title: '日常穿着', description: '简单好穿 · 实用省心 · 性价比' },
                    { value: 'advanced', title: 'AI潮流穿着', description: '年轻高级 · 风格进阶 · AI Stylist' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => changeMode(option.value)}
                      aria-pressed={mode === option.value}
                      className={`focus-ring min-h-14 min-w-0 flex-1 rounded-xl px-3 text-left transition-colors sm:min-h-12 sm:flex-none sm:px-4 ${mode === option.value ? 'bg-[#1A1A1A] text-white shadow-sm' : 'text-[#555550] hover:bg-[#F4F2EE]'} ${option.value === 'advanced' && mode !== option.value ? 'border border-[#E0782C]/20 bg-[#FFF8F2] sm:border-transparent sm:bg-transparent' : ''}`}
                    >
                      <span className="block text-sm font-semibold">{option.title}</span>
                      <span className={`mt-0.5 block text-xs ${mode === option.value ? 'text-white/75' : 'text-[#77756F]'}`}>{option.description}</span>
                    </button>
                  ))}
              </div>

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

        <section data-motion-section id="occasions" className="scroll-mt-20 bg-[#F7F7F5] px-4 py-20 sm:px-6 lg:pb-12 lg:pt-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading display={t('home.occasions.display')} title={t('home.occasions.title')} subtitle={t('home.occasions.subtitle')} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {occasionEntries.map((entry) => {
                const original = occasionQuickEntries.find((item) => item.key === entry.key)!;
                return (
                  <button
                    key={entry.key}
                    onClick={() => openQuickScene(entry.key as QuickScene, entry.title)}
                    disabled={quickSubmitting}
                    data-motion-card
                    className="spotlight-card focus-ring group min-h-[150px] rounded-2xl p-5 text-left disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-44"
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
      <Dialog open={quickDialogOpen} onOpenChange={(open) => {
        setQuickDialogOpen(open);
        if (!open && !quickSubmitting) {
          setQuickScene(null);
          setQuickError('');
        }
      }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[min(92vw,480px)] overflow-y-auto border-[#E5E2DA] bg-[#FCFAF5] p-5">
          <DialogTitle className="text-lg font-semibold text-[#1A1A1A]">
            {quickSubmitting ? `正在为你生成${quickScene?.title || ''}穿着` : `${quickScene?.title || ''}快速推荐`}
          </DialogTitle>
          {quickSubmitting ? (
            <div className="space-y-5 pt-2 text-sm text-[#666660]">
              <div className="flex flex-col items-center gap-2 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#E0782C]" />
                <p className="font-medium text-[#1A1A1A]">正在为你生成「{quickScene?.title}」穿着</p>
                <p className="text-xs text-[#77756F]">预计需要约 10–20 秒 · 已等待 {quickElapsedSeconds} 秒</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-[#E5E2DA] bg-white p-4 text-sm">
                {[
                  '已读取你的身材资料',
                  '正在分析场景与风格',
                  '正在匹配真实商品',
                  '正在生成完整穿着方案',
                ].map((stage, index) => {
                  const activeIndex = quickElapsedSeconds < 4 ? 1 : quickElapsedSeconds < 9 ? 2 : 3;
                  const completed = index < activeIndex;
                  const active = index === activeIndex;
                  return <p key={stage} className={completed ? 'text-[#68865F]' : active ? 'font-medium text-[#C96A22]' : 'text-[#9A9892]'}>{completed ? '✓' : active ? '●' : '○'} {stage}</p>;
                })}
              </div>
              {quickElapsedSeconds > 35 ? <p className="rounded-xl bg-[#FFF4EC] px-3 py-2 text-xs leading-5 text-[#A8581C]">仍在生成，你可以先关闭窗口，完成后我们会保留结果。</p> : quickElapsedSeconds > 20 ? <p className="rounded-xl bg-[#FFF4EC] px-3 py-2 text-xs leading-5 text-[#A8581C]">商品匹配可能需要一点时间，请稍候。</p> : null}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[#666660]">{existingProfile ? '将保留你的原有资料，本次只临时调整风格、场景和预算。' : '填写基础资料后，即可直接生成本次场景的穿着建议。'}</p>
              {!existingProfile && <>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="性别">
                  {(['male', 'female'] as const).map((gender) => (
                    <Button key={gender} type="button" variant="outline" onClick={() => setQuickForm((current) => ({ ...current, gender }))} className={`h-11 ${quickForm.gender === gender ? 'border-[#E0782C] bg-[#FFF4EC] text-[#C96A22]' : 'border-[#E5E2DA]'}`}>
                      {gender === 'male' ? '男' : '女'}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5 text-sm font-medium text-[#34322E]">身高（cm）<Input inputMode="numeric" value={quickForm.height} onChange={(event) => setQuickForm((current) => ({ ...current, height: event.target.value }))} className="border-[#E5E2DA] bg-white" /></label>
                  <label className="space-y-1.5 text-sm font-medium text-[#34322E]">体重（kg）<Input inputMode="decimal" value={quickForm.weight} onChange={(event) => setQuickForm((current) => ({ ...current, weight: event.target.value }))} className="border-[#E5E2DA] bg-white" /></label>
                </div>
              </>}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#34322E]">今天想穿什么风格</p><span className="text-xs text-[#77756F]">可选 1–2 个</span></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="本次穿着风格">
                  {quickStyleOptions.map((style) => {
                    const selected = quickStyleIds.includes(style.id);
                    return <button key={style.id} type="button" onClick={() => toggleQuickStyle(style.id)} aria-pressed={selected} className={`focus-ring min-h-10 rounded-xl border px-3 text-left text-xs font-medium transition-colors ${selected ? 'border-[#E0782C] bg-[#FFF4EC] text-[#C96A22]' : 'border-[#E5E2DA] bg-white text-[#555550] hover:border-[#E0782C]/45'}`}>{style.label}</button>;
                  })}
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-[#E5E2DA] bg-white p-3.5">
                <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#34322E]">本次预算</p><button type="button" role="switch" aria-checked={quickUnlimitedBudget} onClick={() => setQuickUnlimitedBudget((value) => !value)} className={`focus-ring rounded-full px-3 py-1 text-xs font-medium ${quickUnlimitedBudget ? 'bg-[#1A1A1A] text-white' : 'bg-[#F2F0EB] text-[#666660]'}`}>不限预算</button></div>
                <div className={quickUnlimitedBudget ? 'opacity-45' : ''}>
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs text-[#77756F]">¥100</span><strong className="text-base text-[#C96A22]">¥{quickForm.budget}</strong><span className="text-xs text-[#77756F]">¥2000</span></div>
                  <input type="range" min="100" max="2000" step="50" value={quickForm.budget} disabled={quickUnlimitedBudget} onChange={(event) => setQuickForm((current) => ({ ...current, budget: event.target.value }))} className="h-2 w-full cursor-pointer accent-[#E0782C] disabled:cursor-not-allowed" aria-label="本次预算" />
                </div>
              </div>
              {quickError && <p className="text-sm text-[#C96A22]">{quickError}</p>}
              <Button className="sf-primary-button h-12 w-full" disabled={quickSubmitting} onClick={submitQuickScene}>{quickSubmitting ? '正在生成…' : '生成今天的穿着方案'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
