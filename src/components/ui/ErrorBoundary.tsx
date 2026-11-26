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

  handleReload = () => {
    window.location.reload();
  };

  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isDomError =
        this.state.error?.message?.includes('removeChild') ||
        this.state.error?.message?.includes('Node');

      return (
        <div className="h-full flex items-center justify-center bg-[var(--bg-primary)] p-6">
          <div className="text-center max-w-sm">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {isDomError
                ? 'A rendering error occurred. This can happen after navigating between pages.'
                : 'An unexpected error occurred.'}
            </p>
            <details className="text-left mb-4">
              <summary className="text-xs text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]">
                Error details
              </summary>
              <pre className="text-[10px] text-[var(--text-tertiary)] mt-2 bg-[var(--bg-secondary)] p-3 rounded-sm text-left overflow-auto max-h-32 whitespace-pre-wrap break-all">
                {this.state.error?.message || 'Unknown error'}
                {'\n\n'}
                {this.state.error?.stack || ''}
              </pre>
            </details>
            <div className="flex flex-col gap-2">
              <Button onClick={this.handleReload} size="sm">
                Reload Application
              </Button>
              <Button variant="secondary" onClick={this.handleDismiss} size="sm">
                Dismiss &amp; Continue
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
