// ── React Query hooks for Settings ─────────────────────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveSettings } from '../services/storage';
import { Settings } from '../types';
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
    mutationFn: (settings: Settings) => saveSettings(settings),
    onSuccess: (data) => {
      logger.info(TAG, 'useSaveSettings: cache updated');
      qc.setQueryData(QUERY_KEY, data);
    },
    onError: (err) => {
      logger.error(TAG, 'useSaveSettings: failed', err);
    },
  });
}
