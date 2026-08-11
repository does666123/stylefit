import { Shirt, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/i18n';

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

  useEffect(() => {
    const timer = window.setInterval(() => setStage((current) => (current + 1) % stages.length), 2600);
    return () => window.clearInterval(timer);
  }, [stages.length]);

  const displayMessage = message || t('common.loading');
  return (
    <div className="phase-two-loading flex min-h-screen items-center justify-center px-4">
      <div className="phase-two-loading-card text-center" aria-live="polite">
        <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#C9A46A]/30" />
          <div className="absolute inset-2 rounded-full border border-[#F7F4EE]/10" />
          <Shirt className="h-7 w-7 text-[#F7F4EE]" />
        </div>
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-[#D7C39D]">
          <Sparkles className="h-3.5 w-3.5" /> STYLEFIT AI
        </p>
        <h2 className="mb-2 text-lg font-semibold text-[#F7F4EE]">{displayMessage}</h2>
        <p key={stage} className="phase-two-loading-stage text-sm text-[#BDB8B0]">{stages[stage]}</p>
      </div>
    </div>
  );
}
