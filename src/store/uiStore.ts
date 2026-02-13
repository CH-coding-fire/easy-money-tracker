// ── Zustand UI Store ───────────────────────────────────────────────────────
import { create } from 'zustand';
import { TransactionType, DateRangePreset, StatsMode } from '../types';
import { logger } from '../utils/logger';

const TAG = 'UIStore';

interface ToastConfig {
  message: string;
  type: 'success' | 'error' | 'info';
}

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
  /** Which Level-1 category is expanded to show Level-2 pie chart (persists across visits) */
  statsDrillCategory: string | null;
  setStatsDrillCategory: (cat: string | null) => void;

  // Edit Records screen
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Debug
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;

  // Toast
  toast: ToastConfig | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
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
  statsDrillCategory: null,
  setStatsDrillCategory: (cat) => {
    logger.debug(TAG, 'setStatsDrillCategory', { cat });
    set({ statsDrillCategory: cat });
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

  // Toast
  toast: null,
  showToast: (message, type = 'success') => {
    logger.debug(TAG, 'showToast', { message, type });
    set({ toast: { message, type } });
  },
  hideToast: () => {
    set({ toast: null });
  },
}));
