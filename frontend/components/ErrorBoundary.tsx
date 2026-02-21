'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    /** Fallback UI to render when an error is caught. Defaults to a styled error card. */
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * DashboardErrorBoundary
 *
 * Catches any runtime JavaScript errors in dashboard pages and renders a
 * user-friendly error card instead of crashing the whole app.
 * Add this around page content to prevent blank/broken screens.
 */
export class DashboardErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Log to console in dev — in production you'd send to a monitoring service
        console.error('[BizMind] Dashboard error caught by boundary:', error, info);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[60vh] flex items-center justify-center px-4">
                    <div className="bg-white border border-red-100 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span
                                className="material-symbols-outlined text-red-500"
                                style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}
                            >
                                error
                            </span>
                        </div>
                        <h2
                            className="text-lg font-bold text-[#2D2D2D] mb-2"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            Something went wrong
                        </h2>
                        <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
                            An unexpected error occurred while loading this page.
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <span className="block mt-2 text-xs font-mono bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-red-700 text-left">
                                    {this.state.error.message}
                                </span>
                            )}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 text-sm font-bold text-[#1d73c9] border border-[#1d73c9]/30 rounded-xl hover:bg-[#1d73c9]/5 transition-all"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="px-4 py-2 text-sm font-bold bg-[#1d73c9] text-white rounded-xl hover:bg-[#155fa0] transition-all"
                            >
                                Go to Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
