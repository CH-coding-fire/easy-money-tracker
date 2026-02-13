// ── Zustand UI Store ───────────────────────────────────────────────────────
import { create } from 'zustand';
import { TransactionType, DateRangePreset, StatsMode } from '../types';
import { logger } from '../utils/logger';

const TAG = 'UIStore';

interface UIState {
  // Add Transaction screen
  transactionType: TransactionType;
  setTransactionType: (type: TransactionType) => void;

  // Statistics screen
  statsMode: StatsMode;
  setStatsMode: (mode: StatsMode) => void;
  statsDatePreset: DateRangePreset;
  setStatsDatePreset: (preset: DateRangePreset) => void;
  statsCurrency: string;
  setStatsCurrency: (currency: string) => void;

  // Edit Records screen
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Debug
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;

  // Edit transaction (pass ID to pre-fill form)
  editingTransactionId: string | null;
  setEditingTransactionId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Add Transaction
  transactionType: 'expense',
  setTransactionType: (type) => {
    logger.debug(TAG, 'setTransactionType', { type });
    set({ transactionType: type });
  },

  // Statistics
  statsMode: 'expense_pie',
  setStatsMode: (mode) => {
    logger.debug(TAG, 'setStatsMode', { mode });
    set({ statsMode: mode });
  },
  statsDatePreset: 'this_month',
  setStatsDatePreset: (preset) => {
    logger.debug(TAG, 'setStatsDatePreset', { preset });
    set({ statsDatePreset: preset });
  },
  statsCurrency: 'USD',
  setStatsCurrency: (currency) => {
    logger.debug(TAG, 'setStatsCurrency', { currency });
    set({ statsCurrency: currency });
  },

  // Edit Records
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Debug
  debugMode: false,
  setDebugMode: (enabled) => {
    logger.info(TAG, 'setDebugMode', { enabled });
    set({ debugMode: enabled });
  },

  // Editing
  editingTransactionId: null,
  setEditingTransactionId: (id) => {
    logger.debug(TAG, 'setEditingTransactionId', { id });
    set({ editingTransactionId: id });
  },
}));
