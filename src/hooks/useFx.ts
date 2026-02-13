// ── React Query hook for FX rates ──────────────────────────────────────────
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFxRates } from '../services/fxService';
import { useSettings, useSaveSettings } from './useSettings';
import { FxCache } from '../types';
import { logger } from '../utils/logger';
import { useCallback } from 'react';

const TAG = 'useFx';

export function useFxRates() {
  const settings = useSettings();
  const saveSettings = useSaveSettings();

  const query = useQuery({
    queryKey: ['fxRates', settings.fxCache.lastUpdatedAt],
    queryFn: async () => {
      logger.info(TAG, 'useFxRates: fetching');
      const newCache = await fetchFxRates(settings.fxCache);
      // Persist to settings if updated
      if (newCache.lastUpdatedAt !== settings.fxCache.lastUpdatedAt) {
        saveSettings.mutate({ ...settings, fxCache: newCache });
      }
      return newCache;
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    initialData: settings.fxCache.lastUpdatedAt ? settings.fxCache : undefined,
  });

  return query.data ?? settings.fxCache;
}
