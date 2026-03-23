'use client';
import { useEffect, useCallback, useRef } from 'react';

interface AutosaveData {
    businessName: string;
    businessType: string;
    customBusinessType: string;
    budget: string;
    location: string;
    latitude: string;
    longitude: string;
    radius: string;
    ownerType: 'new' | 'existing';
    selectedLocation: string;
    timestamp: number;
}

const STORAGE_KEY = 'bizmind_draft_analysis';
const SAVE_INTERVAL = 30000; // 30 seconds

export function useAutosave(
    data: Omit<AutosaveData, 'timestamp'>,
    enabled: boolean = true
) {
    const lastSaveTime = useRef<number>(0);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Save to localStorage
    const saveDraft = useCallback(() => {
        if (!enabled) return;
        
        const now = Date.now();
        // Prevent saving too frequently
        if (now - lastSaveTime.current < 5000) return;
        
        const draft: AutosaveData = {
            ...data,
            timestamp: now
        };
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
            lastSaveTime.current = now;
            console.log('[Autosave] Draft saved at', new Date(now).toLocaleTimeString());
        } catch (e) {
            console.error('[Autosave] Failed to save:', e);
        }
    }, [data, enabled]);

    // Auto-save on interval
    useEffect(() => {
        if (!enabled) return;
        
        const interval = setInterval(() => {
            // Only save if there's meaningful data
            if (data.businessName || data.location || data.latitude) {
                saveDraft();
            }
        }, SAVE_INTERVAL);

        return () => clearInterval(interval);
    }, [saveDraft, enabled, data]);

    // Save on page unload
    useEffect(() => {
        if (!enabled) return;
        
        const handleBeforeUnload = () => {
            if (data.businessName || data.location || data.latitude) {
                saveDraft();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [saveDraft, enabled, data]);

    return { saveDraft };
}

// Check for existing draft
export function checkExistingDraft(): AutosaveData | null {
    if (typeof window === 'undefined') return null;
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        
        const draft = JSON.parse(stored) as AutosaveData;
        
        // Check if draft is older than 7 days
        const age = Date.now() - draft.timestamp;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (age > maxAge) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
        
        return draft;
    } catch (e) {
        console.error('[Autosave] Failed to load draft:', e);
        return null;
    }
}

// Clear draft
export function clearDraft() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}
