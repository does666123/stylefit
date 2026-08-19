import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Heart, RotateCw, Sparkles, Wand2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useT } from '@/i18n';

type HeaderNavItem = {
  key: string;
  label: string;
  icon: ReactNode;
  to: string;
  onClick: () => void;
  badge?: number;
};

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useT();
  const [favCount, setFavCount] = useState(0);

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

  const goHome = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const navItems: HeaderNavItem[] = [
    { key: 'home', label: t('common.aiStyling'), icon: <Sparkles className="h-5 w-5" />, to: '/', onClick: goHome },
    { key: 'recommendations', label: t('home.nav.viewRecommendations'), icon: <Wand2 className="h-5 w-5" />, to: '/recommendations', onClick: () => navigate('/recommendations') },
    { key: 'favorites', label: t('common.favorites'), icon: <Heart className="h-5 w-5" />, to: '/favorites', onClick: () => navigate('/favorites'), badge: favCount },
    { key: 'retake', label: t('common.retakeTest'), icon: <RotateCw className="h-5 w-5" />, to: '/survey', onClick: () => navigate('/survey') },
  ];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <header className="sf-header sticky top-0 z-50 border-b border-[#1A1A1A]/[0.06]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <button onClick={goHome} className="focus-ring flex shrink-0 items-center gap-2 rounded-xl" aria-label="StyleFit">
          <span className="flex h-9 w-9 overflow-hidden rounded-xl border border-[#E0782C]/30 bg-white shadow-[0_8px_24px_rgba(224,120,44,0.16)]">
            <img src="/stylefit-logo.jpg" alt="" width="36" height="36" className="h-full w-full object-cover" />
          </span>
          <span className="text-lg font-semibold tracking-[-0.02em] text-[#1A1A1A]">StyleFit</span>
        </button>

        <nav className="hidden items-center gap-6 text-sm text-[#555550] md:flex" aria-label="主导航">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`focus-ring relative inline-flex items-center gap-1.5 rounded-lg px-1 py-2 transition-colors ${
                isActive(item.to) ? 'font-semibold text-[#C96A22]' : 'hover:text-[#1A1A1A]'
              }`}
            >
              {item.label}
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E0782C] px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher className="border-[#1A1A1A]/[0.1] bg-white text-[#555550] shadow-none hover:border-[#E0782C]/40 hover:text-[#C96A22]" />
          <div className="flex items-center gap-1.5 md:hidden">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={item.onClick}
                aria-label={item.label}
                className={`focus-ring relative flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                  isActive(item.to)
                    ? 'border-[#E0782C]/40 bg-[#FFF4EC] text-[#C96A22]'
                    : 'border-[#1A1A1A]/[0.08] bg-white text-[#555550] hover:border-[#E0782C]/30 hover:text-[#C96A22]'
                }`}
              >
                {item.icon}
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E0782C] px-1 text-[9px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
