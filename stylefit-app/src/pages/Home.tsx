import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Shirt,
  Sparkles,
  ShoppingBag,
  UserCheck,
  ArrowRight,
  Ruler,
  Palette,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <Shirt className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              StyleFit
            </span>
          </div>
          <Button
            onClick={() => navigate('/survey')}
            className="bg-slate-900 hover:bg-slate-800"
          >
            开始穿搭测试
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 pt-16 pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm text-slate-600 shadow-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            AI 智能穿搭推荐引擎
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            找到最适合你的
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-900">
              穿搭风格
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-500 leading-relaxed">
            输入你的身高、体重、体型等信息，AI 会为你精准推荐最适合的服装搭配。
            不再为"这件衣服适不适合我"而困扰，让穿搭变得简单又有趣。
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/survey')}
              className="h-12 px-8 text-base bg-slate-900 hover:bg-slate-800"
            >
              立即测试我的穿搭
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 h-32 w-32 rounded-full bg-slate-100 opacity-50 blur-2xl" />
        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-slate-200 opacity-40 blur-3xl" />
      </section>

      {/* How it works */}
      <section className="border-y bg-slate-50/50 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-900">
              三步找到你的风格
            </h2>
            <p className="text-slate-500">
              简单快捷，为你量身推荐
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <StepCard
              icon={<UserCheck className="h-6 w-6" />}
              step="01"
              title="输入体型信息"
              desc="告诉我们你的身高、体重、体型、肤色等基本信息，仅需1分钟。"
            />
            <StepCard
              icon={<Sparkles className="h-6 w-6" />}
              step="02"
              title="AI 智能分析"
              desc="我们的推荐引擎会结合你的体型数据，分析最适合你的服装类型。"
            />
            <StepCard
              icon={<ShoppingBag className="h-6 w-6" />}
              step="03"
              title="获取推荐清单"
              desc="查看为你量身定制的服装推荐，一键跳转到购买页面。"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 sm:grid-cols-2">
            <FeatureCard
              icon={<Ruler className="h-5 w-5" />}
              title="精准体型匹配"
              desc="基于身高体重计算 BMI，结合体型分类，为你推荐最显身材的版型。"
            />
            <FeatureCard
              icon={<Palette className="h-5 w-5" />}
              title="肤色色彩分析"
              desc="根据你的肤色推荐最适合的服装颜色，让你气色更好、更显精神。"
            />
            <FeatureCard
              icon={<Shirt className="h-5 w-5" />}
              title="多风格覆盖"
              desc="商务、休闲、街头、简约、优雅……无论你喜欢哪种风格都能找到。"
            />
            <FeatureCard
              icon={<ShoppingBag className="h-5 w-5" />}
              title="一键购买直达"
              desc="每件推荐都附带购买链接，看中即可直接跳转购买，省心省力。"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 px-4 py-20 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold">
            准备好发现你的专属风格了吗？
          </h2>
          <p className="mb-8 text-slate-300">
            无需注册，只需1分钟，即可获取你的个性化穿搭推荐
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/survey')}
            className="h-12 px-8 text-base bg-white text-slate-900 hover:bg-slate-100"
          >
            开始穿搭测试
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-8 text-center text-sm text-slate-400">
        <p> StyleFit — 智能穿搭推荐</p>
      </footer>
    </div>
  );
}

function StepCard({
  icon,
  step,
  title,
  desc,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div className="mb-2 text-xs font-semibold text-slate-400">{step}</div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </div>
      <div>
        <h3 className="mb-1 font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
