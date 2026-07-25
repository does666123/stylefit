import { Shirt } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = '正在为你准备推荐...' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-slate-900 border-t-transparent animate-spin" />
          <Shirt className="h-8 w-8 text-slate-700" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">{message}</h2>
        <p className="text-sm text-slate-400">请稍候，AI 正在分析你的体型数据</p>
      </div>
    </div>
  );
}
