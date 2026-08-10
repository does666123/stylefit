import { useLang } from '../i18n';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-sm backdrop-blur transition-all hover:border-foreground/20 hover:text-foreground',
        className,
      )}
      aria-label={lang === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{lang === 'zh' ? 'EN' : '中'}</span>
    </button>
  );
}
