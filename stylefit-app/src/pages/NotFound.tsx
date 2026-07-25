import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Shirt, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <Shirt className="h-10 w-10 text-slate-400" />
        </div>
        <h1 className="mb-2 text-5xl font-extrabold tracking-tight text-slate-900">404</h1>
        <p className="mb-2 text-lg font-semibold text-slate-700">页面走丢了</p>
        <p className="mb-8 text-sm text-slate-500">
          你访问的页面不存在，可能已被移除或地址有误。
        </p>
        <div className="flex justify-center gap-3">
          <Button
            onClick={() => navigate('/')}
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回上页
          </Button>
        </div>
      </div>
    </div>
  );
}
