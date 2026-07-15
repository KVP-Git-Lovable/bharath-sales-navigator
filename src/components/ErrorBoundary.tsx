import React from 'react';

type Props = { children: React.ReactNode; resetKey?: string };
type State = { hasError: boolean };

const isRecoverableRuntimeError = (error: Error) => {
  const message = `${error?.message || ''}`.toLowerCase();
  return (
    message.includes('tried to subscribe multiple times') ||
    message.includes('channel') && message.includes('subscribe')
  );
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State | null {
    if (isRecoverableRuntimeError(error)) {
      return null;
    }

    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (isRecoverableRuntimeError(error)) {
      console.warn('[ErrorBoundary] Recovered from transient runtime error:', error.message);
      return;
    }

    // Always log real render crashes — never hide them.
    console.error('[ErrorBoundary] Render crash:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    // Auto-recover when the user navigates to a different route.
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              This page hit an error. Try again, or reload the app.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Try again
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 border rounded-md"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
