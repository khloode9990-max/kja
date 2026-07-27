/**
 * ErrorBoundary — Class component that catches JavaScript render errors
 * in its child tree and displays a fallback UI instead of crashing the app.
 * Uses getDerivedStateFromError + componentDidCatch (the standard React pattern).
 * Each dashboard widget should be wrapped in its own ErrorBoundary so one
 * failing widget doesn't take down the entire dashboard.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
// ICON: AlertTriangle → warning/error state indicator
// ICON: RefreshCw → circular refresh arrows for the "Retry" button

interface Props {
  children: ReactNode;
  widgetName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Called during the render phase when a child throws — sets state to show fallback UI
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Called after the error is caught — use for side effects like logging
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Widget error (${this.props.widgetName || 'Unknown'}):`, error, errorInfo);
  }

  render() {
    // If an error was caught, show the fallback UI instead of the crashed children
    if (this.state.hasError) {
      return (
        <div className="dashboard-card p-4 flex flex-col items-center justify-center min-h-[80px] space-y-2">
          <div className="flex items-center space-x-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">{this.props.widgetName || 'Widget'} Error</span>
          </div>
          <p className="text-[10px] text-gray-500 text-center max-w-[200px]">
            {this.state.error?.message || 'Something went wrong'}
          </p>
          {/* Retry: reset error state so React re-renders the children */}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center space-x-1 px-2 py-1 text-[10px] text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    // No error — render children normally (the happy path)
    return this.props.children;
  }
}
