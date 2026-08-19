import { Shirt, Sparkles } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useT } from '@/i18n';

const LoadingBallpit = lazy(() => import('./LoadingBallpit'));

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const { t } = useT();
  const stages = [
    t('loading.analysis.body'),
    t('loading.analysis.context'),
    t('loading.analysis.budget'),
    t('loading.analysis.finish'),
  ];
  const [stage, setStage] = useState(0);
  const [showBallpit, setShowBallpit] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setStage((current) => (current + 1) % stages.length), 2600);
    return () => window.clearInterval(timer);
  }, [stages.length]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)');
    const update = () => setShowBallpit(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const displayMessage = message || t('loading.title');
  return (
    <div className="phase-two-loading flex min-h-screen items-center justify-center px-4">
      {showBallpit && <Suspense fallback={null}><LoadingBallpit /></Suspense>}
      <div className="phase-two-loading-card relative z-10 text-center" aria-live="polite">
        <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#E0782C]/30" />
          <div className="absolute inset-2 rounded-full border border-[#1A1A1A]/10" />
          <Shirt className="h-7 w-7 text-[#E0782C]" />
        </div>
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-[#E0782C]">
          <Sparkles className="h-3.5 w-3.5" /> {t('loading.brand')}
        </p>
        <h2 className="mb-2 text-lg font-semibold text-[#1A1A1A]">{displayMessage}</h2>
        <p key={stage} className="phase-two-loading-stage text-sm text-[#6B6B66]">{stages[stage]}</p>
        <p className="mt-3 text-xs text-[#6B6B66]">通常约需 15–30 秒，网络较慢时可能更久</p>
      </div>
    </div>
  );
}
