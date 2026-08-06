import { Shirt } from 'lucide-react';
import { useT } from '@/i18n';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const { t } = useT();
  const displayMessage = message || t('common.loading');
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-transparent animate-spin" />
          <Shirt className="h-8 w-8 text-slate-700" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">{displayMessage}</h2>
        <p className="text-sm text-slate-400">{t('common.loadingSub')}</p>
      </div>
    </div>
  );
}
