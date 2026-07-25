import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900">页面出错了</h2>
            <p className="mb-6 text-sm text-slate-500">
              抱歉，页面遇到了意外错误。请尝试刷新页面，或返回首页重新开始。
            </p>
            {this.state.error && (
              <div className="mb-6 rounded-lg bg-red-50 p-3 text-left">
                <p className="text-xs font-mono text-red-600 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex justify-center gap-3">
              <Button onClick={this.handleReset} className="bg-slate-900 hover:bg-slate-800">
                <RefreshCw className="mr-2 h-4 w-4" />
                刷新页面
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                返回首页
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
