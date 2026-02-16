// ── Types ──────────────────────────────────────────────────────────────────

export type TransactionType = 'expense' | 'income';

export interface RecurringRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  startDate: string;
  endDate?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string; // ISO code e.g. "USD"
  categoryPath: string[]; // 1–3 levels, e.g. ["Beauty", "Skincare"]
  date: string; // ISO local date e.g. "2026-02-13"
  title?: string;
  description?: string;
  isRecurring: boolean;
  recurringRule?: RecurringRule;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export interface Category {
  id: string;
  name: string;
  icon?: string; // emoji or icon name
  children?: Category[];
}

export interface CategoryGroup {
  expense: Category[];
  income: Category[];
}

export interface CurrencyConfig {
  mainCurrency: string;
  secondaryCurrencies: string[];
  frequentCurrencies: string[];
}

export interface FxCache {
  lastUpdatedAt: string;
  base: string;
  rates: Record<string, number>;
}

// ── Theme ──────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'pastel';

export interface Theme {
  // Background colors
  background: string;
  cardBackground: string;
  
  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  
  // Primary colors
  primary: string;
  success: string;
  error: string;
  warning: string;
  
  // Borders and dividers
  border: string;
  divider: string;
  
  // Chart colors
  chartColors: string[];
  
  // Effects
  shadow: string;
  overlay: string;
}

export interface Settings {
  language: string;
  mainCurrency: string;
  secondaryCurrencies: string[];
  frequentCurrencies: string[];
  weekStartsOn: 'monday' | 'sunday';
  fxCache: FxCache;
  onboardingComplete: boolean;
  debugMode: boolean;
  categoryLevelMode: 'auto'; // auto = drill if subcategories exist
  frequentExpenseCategories: string[][]; // paths like [["Food","Delivery"]]
  frequentIncomeCategories: string[][];
  themeMode: ThemeMode;
  autoFocusCategorySearch: boolean;
}

export interface AppData {
  schemaVersion: number;
  transactions: Transaction[];
  categories: CategoryGroup;
  settings: Settings;
}

export interface ExportData {
  schemaVersion: number;
  exportedAt: string;
  records: Transaction[];
  categories: CategoryGroup;
  settings: Omit<Settings, 'fxCache'>;
}

// ── Date range helpers ─────────────────────────────────────────────────────

export type DateRangePreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_year'
  | 'last_7'
  | 'last_30'
  | 'last_365';

export interface DateRange {
  start: string; // ISO date
  end: string;   // ISO date
}

// ── Statistics ─────────────────────────────────────────────────────────────

export type StatsMode = 'expense_pie' | 'income_pie' | 'balance_line';

export interface PieDataItem {
  label: string;
  value: number;
  color: string;
  children?: PieDataItem[];
}
