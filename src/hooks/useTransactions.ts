// ── React Query hooks for Transactions ─────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  loadAppData,
  addTransaction as addTx,
  addTransactions as addTxBatch,
  updateTransaction as updateTx,
  deleteTransaction as deleteTx,
  deleteAllTransactions as deleteAllTx,
} from '../services/storage';
import { Transaction } from '../types';
import { logger } from '../utils/logger';

const TAG = 'useTransactions';
const QUERY_KEY = ['appData'];

export function useAppData() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: loadAppData,
    staleTime: Infinity, // data only changes via mutations
  });
}

export function useTransactions() {
  const { data } = useAppData();
  return data?.transactions ?? [];
}

export function useAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tx: Transaction) => addTx(tx),
    onSuccess: (data) => {
      logger.info(TAG, 'useAddTransaction: invalidating cache');
      qc.setQueryData(QUERY_KEY, data);
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => {
      logger.error(TAG, 'useAddTransaction: failed', err);
    },
  });
}

export function useAddTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (txs: Transaction[]) => addTxBatch(txs),
    onSuccess: (data) => {
      logger.info(TAG, 'useAddTransactions: invalidating cache');
      qc.setQueryData(QUERY_KEY, data);
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => {
      logger.error(TAG, 'useAddTransactions: failed', err);
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tx: Transaction) => updateTx(tx),
    onSuccess: (data) => {
      logger.info(TAG, 'useUpdateTransaction: invalidating cache');
      qc.setQueryData(QUERY_KEY, data);
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => {
      logger.error(TAG, 'useUpdateTransaction: failed', err);
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTx(id),
    onSuccess: (data) => {
      logger.info(TAG, 'useDeleteTransaction: invalidating cache');
      qc.setQueryData(QUERY_KEY, data);
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => {
      logger.error(TAG, 'useDeleteTransaction: failed', err);
    },
  });
}

export function useDeleteAllTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllTx(),
    onSuccess: (data) => {
      logger.info(TAG, 'useDeleteAllTransactions: invalidating cache');
      qc.setQueryData(QUERY_KEY, data);
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => {
      logger.error(TAG, 'useDeleteAllTransactions: failed', err);
    },
  });
}
