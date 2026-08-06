import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { useT } from '@/i18n';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useT();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 page-enter">
      <div className="text-center">
        <div className="mb-6 text-8xl font-bold text-slate-200">404</div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">
          {t('notFound.title')}
        </h1>
        <p className="mb-8 text-slate-500">
          {t('notFound.desc')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={() => navigate('/')}
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Home className="mr-2 h-4 w-4" />
            {t('notFound.backHome')}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('notFound.goBack')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
