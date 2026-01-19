import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 */

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // Here you could also send to an error reporting service
    // e.g., Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>

            {/* Error Message */}
            <h1 className="text-2xl font-black text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-8">
              We're sorry, but something unexpected happened. Please try again or go back to the homepage.
            </p>

            {/* Error Details (Development only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-left overflow-auto">
                <p className="text-sm font-mono text-red-800">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={this.handleReset}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                leftIcon={<Home className="w-4 h-4" />}
                onClick={this.handleGoHome}
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
