// ── React Query hooks for Settings ─────────────────────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveSettings } from '../services/storage';
import { Settings, AppData } from '../types';
import { useAppData } from './useTransactions';
import { getDefaultSettings } from '../services/storage';
import { logger } from '../utils/logger';

const TAG = 'useSettings';
const QUERY_KEY = ['appData'];

export function useSettings(): Settings {
  const { data } = useAppData();
  return data?.settings ?? getDefaultSettings();
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partial: Partial<Settings>) => saveSettings(partial),
    onMutate: async (partial) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<AppData>(QUERY_KEY);
      // Optimistically update the cache so subsequent reads see the latest values
      qc.setQueryData(QUERY_KEY, (old: AppData | undefined) => {
        if (!old) return old;
        return { ...old, settings: { ...old.settings, ...partial } };
      });
      return { prev };
    },
    onSuccess: (data) => {
      logger.info(TAG, 'useSaveSettings: cache updated');
      qc.setQueryData(QUERY_KEY, data);
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err, _partial, context) => {
      logger.error(TAG, 'useSaveSettings: failed, rolling back', err);
      // Rollback to previous state on error
      if (context?.prev) {
        qc.setQueryData(QUERY_KEY, context.prev);
      }
    },
  });
}
