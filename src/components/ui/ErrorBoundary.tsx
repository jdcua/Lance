import { Component, type ErrorInfo, type ReactNode } from 'react';
import Button from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Lance ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="h-full flex items-center justify-center bg-[var(--bg-primary)] p-6">
          <div className="text-center max-w-sm">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Something went wrong</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              An unexpected error occurred. Please try reloading the application.
            </p>
            <pre className="text-[10px] text-[var(--text-tertiary)] mb-4 bg-[var(--bg-secondary)] p-3 rounded-[8px] text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              size="sm"
            >
              Reload Application
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
