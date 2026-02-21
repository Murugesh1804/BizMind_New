'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { AnalysisResult } from '@/lib/types';

/**
 * useAnalysisData
 *
 * Shared hook used by all dashboard sub-pages.
 * - Reads analysis from sessionStorage (set when a new analysis is run).
 * - If not found (e.g., new tab, direct navigation), redirects to home.
 * - Eliminates the 4-line copy-paste block that existed on every dashboard page.
 */
export function useAnalysisData(): {
    data: AnalysisResult | null;
    isLoading: boolean;
} {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [data, setData] = useState<AnalysisResult | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        // Guard: must be logged in
        if (!user) {
            router.push('/login');
            return;
        }

        // Read from sessionStorage
        const raw = sessionStorage.getItem('analysisResult');
        if (!raw) {
            // No active analysis — send the user to run a new one
            router.push('/');
            return;
        }

        try {
            const parsed = JSON.parse(raw) as AnalysisResult;
            setData(parsed);
        } catch {
            // Corrupted session data — clear it and redirect
            sessionStorage.removeItem('analysisResult');
            router.push('/');
        } finally {
            setDataLoading(false);
        }
    }, [authLoading, user, router]);

    return { data, isLoading: authLoading || dataLoading };
}
