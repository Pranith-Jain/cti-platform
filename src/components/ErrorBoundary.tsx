import { Component, type ReactNode, type ErrorInfo, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExpanded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isExpanded: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
    console.error('ErrorBoundary:', error.message);
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.props.resetOnChange && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, isExpanded: false });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback ?? (
          <ErrorFallback
            error={this.state.error}
            isExpanded={this.state.isExpanded}
            onReset={this.handleReset}
            onToggle={() => this.setState((s) => ({ isExpanded: !s.isExpanded }))}
          />
        )
      );
    }
    return this.props.children;
  }
}

function ErrorFallback({
  error,
  isExpanded,
  onReset,
  onToggle,
}: {
  error: Error;
  isExpanded: boolean;
  onReset: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="border border-threat/30 bg-threat/5 p-6">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 border border-threat/30 bg-threat/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-threat" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-mono font-semibold text-ink-1 mb-1">Runtime Error</h3>
          <p className="text-sm text-ink-2 mb-3">{error.message || 'An unexpected error occurred.'}</p>

          <button
            onClick={onToggle}
            className="flex items-center gap-1 text-xs font-mono text-ink-3 hover:text-ink-1 transition-colors mb-3"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {isExpanded ? 'Hide' : 'Show'} details
          </button>

          {isExpanded && (
            <div className="bg-surface-sunken border border-rule p-3 mb-4 max-h-48 overflow-auto">
              <pre className="text-[10px] font-mono text-ink-2 whitespace-pre-wrap break-all">{error.stack}</pre>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 border border-accent bg-accent/10 px-3 py-1.5 font-mono text-xs text-accent transition-colors duration-enter hover:bg-accent hover:text-surface-page"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
            <Link
              to="/"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 border border-rule px-3 py-1.5 font-mono text-xs text-ink-2 transition-colors duration-enter hover:border-ink-1 hover:text-ink-1"
            >
              <Home className="w-3 h-3" /> Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);
  const resetError = useCallback(() => setError(null), []);
  return { error, resetError, setError };
}

export function withErrorBoundary<P extends object>(WrappedComponent: React.ComponentType<P>, fallback?: ReactNode) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
