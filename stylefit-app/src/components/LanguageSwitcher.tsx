import { useLang } from '../i18n';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-[#1A1A1A]/[0.1] bg-white px-3 py-1.5 text-xs font-medium text-[#555550] shadow-sm transition-colors hover:border-[#E0782C]/40 hover:bg-white hover:text-[#C96A22]',
        className,
      )}
      aria-label={lang === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{lang === 'zh' ? 'EN' : '中'}</span>
    </button>
  );
}
