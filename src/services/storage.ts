// ── AsyncStorage CRUD with schema versioning + full logging ────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, Transaction, CategoryGroup, Settings } from '../types';
import { DEFAULT_CATEGORIES } from '../constants/categories';
import { DEFAULT_CURRENCY } from '../constants/currencies';
import { logger } from '../utils/logger';
import { nowISO } from '../utils/dateHelpers';

const STORAGE_KEY = '@easy_money_tracker';
const SCHEMA_VERSION = 1;
const TAG = 'Storage';

// ── Default state ──────────────────────────────────────────────────────────

export function getDefaultSettings(): Settings {
  return {
    language: 'en-US',
    mainCurrency: DEFAULT_CURRENCY,
    secondaryCurrencies: [],
    frequentCurrencies: ['USD', 'EUR', 'GBP'],
    weekStartsOn: 'monday',
    fxCache: { lastUpdatedAt: '', base: 'EUR', rates: {} },
    onboardingComplete: false,
    debugMode: false,
    categoryLevelMode: 'auto',
    frequentExpenseCategories: [],
    frequentIncomeCategories: [],
    themeMode: 'light',
  };
}

function getDefaultAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    transactions: [],
    categories: structuredClone(DEFAULT_CATEGORIES),
    settings: getDefaultSettings(),
  };
}

// ── Read / Write ───────────────────────────────────────────────────────────

export async function loadAppData(): Promise<AppData> {
  logger.info(TAG, 'loadAppData: start');
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      logger.info(TAG, 'loadAppData: no data found, returning defaults');
      return getDefaultAppData();
    }
    const parsed: AppData = JSON.parse(raw);
    // Basic validation
    if (!parsed.schemaVersion || !Array.isArray(parsed.transactions)) {
      logger.warn(TAG, 'loadAppData: corrupted data, returning defaults', {
        hasSchema: !!parsed.schemaVersion,
        hasTx: Array.isArray(parsed.transactions),
      });
      return getDefaultAppData();
    }
    logger.info(TAG, 'loadAppData: success', {
      txCount: parsed.transactions.length,
      schemaVersion: parsed.schemaVersion,
      dataSize: raw.length,
    });
    return parsed;
  } catch (err) {
    logger.error(TAG, 'loadAppData: failed', err);
    return getDefaultAppData();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  logger.info(TAG, 'saveAppData: start', {
    txCount: data.transactions.length,
    schemaVersion: data.schemaVersion,
  });
  try {
    const json = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEY, json);
    logger.info(TAG, 'saveAppData: success', { dataSize: json.length });
  } catch (err) {
    logger.error(TAG, 'saveAppData: failed', err);
    throw err;
  }
}

// ── Transaction helpers ────────────────────────────────────────────────────

export async function addTransaction(tx: Transaction): Promise<AppData> {
  logger.info(TAG, 'addTransaction: start', { id: tx.id, type: tx.type, amount: tx.amount });
  const data = await loadAppData();
  data.transactions.push(tx);
  await saveAppData(data);
  logger.info(TAG, 'addTransaction: complete', { id: tx.id });
  return data;
}

export async function addTransactions(txs: Transaction[]): Promise<AppData> {
  logger.info(TAG, 'addTransactions: start', { count: txs.length });
  const data = await loadAppData();
  data.transactions.push(...txs);
  await saveAppData(data);
  logger.info(TAG, 'addTransactions: complete', { count: txs.length, ids: txs.map(t => t.id) });
  return data;
}

export async function updateTransaction(tx: Transaction): Promise<AppData> {
  logger.info(TAG, 'updateTransaction: start', { id: tx.id });
  const data = await loadAppData();
  const idx = data.transactions.findIndex((t) => t.id === tx.id);
  if (idx === -1) {
    logger.error(TAG, 'updateTransaction: not found', { id: tx.id });
    throw new Error(`Transaction ${tx.id} not found`);
  }
  data.transactions[idx] = { ...tx, updatedAt: nowISO() };
  await saveAppData(data);
  logger.info(TAG, 'updateTransaction: complete', { id: tx.id });
  return data;
}

export async function deleteTransaction(id: string): Promise<AppData> {
  logger.info(TAG, 'deleteTransaction: start', { id });
  const data = await loadAppData();
  data.transactions = data.transactions.filter((t) => t.id !== id);
  await saveAppData(data);
  logger.info(TAG, 'deleteTransaction: complete', { id });
  return data;
}

// ── Categories helpers ─────────────────────────────────────────────────────

export async function saveCategories(categories: CategoryGroup): Promise<AppData> {
  logger.info(TAG, 'saveCategories: start');
  const data = await loadAppData();
  data.categories = categories;
  await saveAppData(data);
  logger.info(TAG, 'saveCategories: complete');
  return data;
}

// ── Settings helpers ───────────────────────────────────────────────────────

export async function saveSettings(partial: Partial<Settings>): Promise<AppData> {
  logger.info(TAG, 'saveSettings: start', { keys: Object.keys(partial) });
  const data = await loadAppData();
  data.settings = { ...data.settings, ...partial };
  await saveAppData(data);
  logger.info(TAG, 'saveSettings: complete');
  return data;
}

// ── Clear all data (debug) ─────────────────────────────────────────────────

export async function clearAllData(): Promise<void> {
  logger.warn(TAG, 'clearAllData: removing all stored data');
  await AsyncStorage.removeItem(STORAGE_KEY);
  logger.info(TAG, 'clearAllData: complete');
}
