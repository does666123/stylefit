import { useState } from 'react';
import { Link } from 'react-router';
import { clearStyleFitLocalData } from '@/lib/localData';

export default function SiteFooter() {
  const [notice, setNotice] = useState('');

  const clearLocalData = () => {
    if (!window.confirm('这将删除本机保存的问卷画像、AI 推荐缓存、收藏内容和问卷草稿，删除后无法恢复。是否继续？')) return;
    clearStyleFitLocalData();
    setNotice('本地数据已清除。');
  };

  return (
    <footer className="site-footer border-t border-white/[0.08] bg-[#08090C] px-4 py-7 text-center text-sm text-[#AAA49B]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <Link to="/privacy" className="focus-ring rounded transition-colors hover:text-[#F7F4EE]">隐私政策</Link>
        <Link to="/terms" className="focus-ring rounded transition-colors hover:text-[#F7F4EE]">用户协议</Link>
        <button type="button" onClick={clearLocalData} className="focus-ring rounded transition-colors hover:text-[#F7F4EE]">清除本地数据</button>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="focus-ring rounded transition-colors hover:text-[#F7F4EE]">
          苏ICP备2026056415号
        </a>
      </div>
      {notice && <p className="mt-3 text-xs text-[#D7C39D]" role="status">{notice}</p>}
    </footer>
  );
}
