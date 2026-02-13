// ── React Query hooks for Categories ───────────────────────────────────────
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveCategories } from '../services/storage';
import { CategoryGroup } from '../types';
import { useAppData } from './useTransactions';
import { logger } from '../utils/logger';

const TAG = 'useCategories';
const QUERY_KEY = ['appData'];

export function useCategories() {
  const { data } = useAppData();
  return data?.categories ?? { expense: [], income: [] };
}

export function useSaveCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categories: CategoryGroup) => saveCategories(categories),
    onSuccess: (data) => {
      logger.info(TAG, 'useSaveCategories: cache updated');
      qc.setQueryData(QUERY_KEY, data);
    },
    onError: (err) => {
      logger.error(TAG, 'useSaveCategories: failed', err);
    },
  });
}
