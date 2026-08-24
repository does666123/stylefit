import { useState } from 'react';
import { Link } from 'react-router';
import { Heart, RotateCw, Sparkles } from 'lucide-react';
import { clearStyleFitLocalData } from '@/lib/localData';
import { useT } from '@/i18n';

export default function SiteFooter() {
  const { t } = useT();
  const [notice, setNotice] = useState('');

  const clearLocalData = () => {
    if (!window.confirm('这将删除本机保存的问卷画像、AI 推荐缓存、收藏内容和问卷草稿，删除后无法恢复。是否继续？')) return;
    clearStyleFitLocalData();
    setNotice('本地数据已清除。');
  };

  const groupLinks = [
    {
      title: 'StyleFit',
      items: [
        { label: 'AI穿着', to: '/' },
        { label: '为你推荐', to: '/recommendations' },
        { label: '我的收藏', to: '/favorites' },
      ],
    },
    {
      title: '支持',
      items: [
        { label: '隐私政策', to: '/privacy' },
        { label: '用户协议', to: '/terms' },
      ],
    },
  ];

  return (
    <footer className="site-footer border-t border-[#1A1A1A]/[0.08] bg-[#F1F1EE] px-4 py-10 text-sm text-[#5F5F5A]">
      <div className="mx-auto grid max-w-7xl gap-8 text-left md:grid-cols-[1.4fr_1fr_1fr] md:gap-12">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 overflow-hidden rounded-lg border border-[#E0782C]/30 bg-white">
              <img src="/stylefit-logo.jpg" alt="" width="32" height="32" className="h-full w-full object-cover" />
            </span>
            <span className="text-base font-semibold tracking-[-0.02em] text-[#1A1A1A]">StyleFit</span>
          </div>
          <p className="mt-3 max-w-xs text-xs leading-5 text-[#666660]">
            TRENDY * FEEL AUTHENTIC —— {t('footer.tagline')}。
          </p>
        </div>

        {groupLinks.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-semibold tracking-[0.14em] text-[#1A1A1A]">{group.title.toUpperCase()}</h3>
            <ul className="mt-3 space-y-2">
              {group.items.map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className="focus-ring rounded transition-colors hover:text-[#C96A22]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div>
          <h3 className="text-xs font-semibold tracking-[0.14em] text-[#1A1A1A]">{t('footer.settings')}</h3>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/" className="focus-ring inline-flex items-center gap-1.5 rounded transition-colors hover:text-[#C96A22]">
                <Sparkles className="h-3.5 w-3.5" />
                AI穿着
              </Link>
            </li>
            <li>
              <Link to="/favorites" className="focus-ring inline-flex items-center gap-1.5 rounded transition-colors hover:text-[#C96A22]">
                <Heart className="h-3.5 w-3.5" />
                我的收藏
              </Link>
            </li>
            <li>
              <Link to="/survey" className="focus-ring inline-flex items-center gap-1.5 rounded transition-colors hover:text-[#C96A22]">
                <RotateCw className="h-3.5 w-3.5" />
                重新测试
              </Link>
            </li>
            <li>
              <button type="button" onClick={clearLocalData} className="focus-ring rounded transition-colors hover:text-[#C96A22]">
                清除本地数据
              </button>
            </li>
            <li>
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="focus-ring rounded transition-colors hover:text-[#C96A22]">
                苏ICP备2026056415号
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-[#1A1A1A]/[0.08] pt-5 text-center text-xs text-[#8A8A85]">
        © {new Date().getFullYear()} StyleFit · {t('footer.aiStylingStudio')}
        {notice && <p className="mt-2 text-xs text-[#C96A22]" role="status">{notice}</p>}
      </div>
    </footer>
  );
}
