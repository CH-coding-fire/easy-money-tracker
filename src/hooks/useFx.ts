// ── React Query hook for FX rates ──────────────────────────────────────────
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFxRates } from '../services/fxService';
import { useSettings, useSaveSettings } from './useSettings';
import { FxCache } from '../types';
import { logger } from '../utils/logger';
import { useState, useCallback } from 'react';

const TAG = 'useFx';
const STALE_TIME = 3 * 60 * 60 * 1000; // 3 hours

export function useFxRates() {
  const settings = useSettings();
  const saveSettings = useSaveSettings();
  const queryClient = useQueryClient();
  const [lastFetchFailed, setLastFetchFailed] = useState(false);

  const query = useQuery({
    queryKey: ['fxRates'],
    queryFn: async () => {
      logger.info(TAG, 'useFxRates: fetching');
      const { cache: newCache, error } = await fetchFxRates(settings.fxCache);
      setLastFetchFailed(error);

      // Persist to settings if updated
      if (newCache.lastUpdatedAt !== settings.fxCache.lastUpdatedAt) {
        saveSettings.mutate({ ...settings, fxCache: newCache });
      }
      return newCache;
    },
    staleTime: STALE_TIME,
    initialData: settings.fxCache.lastUpdatedAt ? settings.fxCache : undefined,
    // Tell React Query the actual age of initialData so it knows when to refetch
    initialDataUpdatedAt: settings.fxCache.lastUpdatedAt
      ? new Date(settings.fxCache.lastUpdatedAt).getTime()
      : 0,
  });

  // Force refresh — bypasses cache check, always hits the API
  const forceRefresh = useCallback(async () => {
    logger.info(TAG, 'forceRefresh: manual refresh triggered');
    setLastFetchFailed(false);
    const { cache: newCache, error } = await fetchFxRates(settings.fxCache, true);
    setLastFetchFailed(error);

    if (newCache.lastUpdatedAt !== settings.fxCache.lastUpdatedAt) {
      saveSettings.mutate({ ...settings, fxCache: newCache });
    }
    // Update React Query cache
    queryClient.setQueryData(['fxRates'], newCache);
    return !error;
  }, [settings, queryClient, saveSettings]);

  return {
    data: query.data ?? settings.fxCache,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: lastFetchFailed,
    forceRefresh,
  };
}
