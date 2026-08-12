import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import type { ReactNode } from 'react';

type LegalPageProps = { title: string; updatedAt: string; children: ReactNode };

function LegalPage({ title, updatedAt, children }: LegalPageProps) {
  const navigate = useNavigate();

  return (
    <main className="min-h-[60vh] bg-[#08090C] px-4 py-10 text-[#F7F4EE] sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <Link to="/" className="focus-ring flex items-center gap-2 rounded-lg text-lg font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C9A46A]/30 bg-[#1B1E26]">
              <ShieldCheck className="h-4 w-4 text-[#D7C39D]" />
            </span>
            StyleFit
          </Link>
          <button type="button" className="focus-ring inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-[#AAA49B] transition-colors hover:text-[#F7F4EE]" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> 返回
          </button>
        </div>
        <article className="rounded-3xl border border-white/[0.08] bg-[#12141A] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:p-10">
          <p className="mb-3 text-xs font-medium tracking-[0.18em] text-[#C9A46A]">STYLEFIT</p>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-[#AAA49B]">最后更新：{updatedAt}</p>
          <div className="legal-copy mt-10 space-y-8 text-sm leading-7 text-[#C6C1B8] sm:text-base">{children}</div>
        </article>
      </div>
    </main>
  );
}

export function PrivacyPage() {
  return <LegalPage title="隐私政策" updatedAt="2026年8月">
    <section><h2>我们收集的信息</h2><p>我们仅处理你主动填写的穿搭偏好资料：性别、身高、体重、年龄、体型、肤色、风格偏好、场合、季节和预算，以及你保存的收藏和推荐结果。</p></section>
    <section><h2>信息的使用目的</h2><p>这些信息用于生成个性化穿搭推荐、保存问卷进度、展示收藏内容和最近的推荐结果。</p></section>
    <section><h2>数据保存方式</h2><p>当前版本主要将上述数据保存在你正在使用的浏览器 localStorage 中。更换浏览器或设备，或清理浏览器数据后，这些数据可能消失。</p></section>
    <section><h2>第三方服务</h2><p>AI 推荐请求会将生成推荐所需的问卷信息发送至网站后端接口。我们会在后续服务变化时更新本政策。</p></section>
    <section><h2>你的权利</h2><p>你可以随时通过页脚的“清除本地数据”删除本机保存的画像、收藏、推荐缓存和问卷草稿。删除后无法恢复，需要重新填写问卷。</p></section>
    <section><h2>联系我们</h2><p>如有隐私相关问题，请通过网站后续公布的联系方式联系我们。</p></section>
  </LegalPage>;
}

export function TermsPage() {
  return <LegalPage title="用户协议" updatedAt="2026年8月">
    <section><h2>服务说明</h2><p>StyleFit 提供穿搭参考和商品信息展示，不构成医疗、健康、专业形象咨询或购买保证。</p></section>
    <section><h2>推荐参考</h2><p>推荐结果仅供参考。请结合自身需求、实际尺码和商品信息，自行判断是否适合。</p></section>
    <section><h2>使用规范</h2><p>你不得利用网站从事违法、攻击、爬取、干扰或破坏服务等行为。</p></section>
    <section><h2>服务调整</h2><p>网站可能因功能升级、服务维护或第三方服务异常而调整或暂停部分功能。</p></section>
  </LegalPage>;
}
