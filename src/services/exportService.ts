// ── Export / Import service ─────────────────────────────────────────────────
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppData, ExportData } from '../types';
import { loadAppData, saveAppData } from './storage';
import { logger } from '../utils/logger';
import { nowISO } from '../utils/dateHelpers';

const TAG = 'ExportService';
const EXPORT_FILENAME = 'easy-money-tracker-backup.json';
const SCHEMA_VERSION = 1;

/**
 * Export all app data to a shareable JSON file.
 */
export async function exportData(): Promise<void> {
  logger.info(TAG, 'exportData: start');
  try {
    const appData = await loadAppData();
    const exportPayload: ExportData = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: nowISO(),
      records: appData.transactions,
      categories: appData.categories,
      settings: {
        language: appData.settings.language,
        mainCurrency: appData.settings.mainCurrency,
        secondaryCurrencies: appData.settings.secondaryCurrencies,
        frequentCurrencies: appData.settings.frequentCurrencies,
        weekStartsOn: appData.settings.weekStartsOn,
        onboardingComplete: appData.settings.onboardingComplete,
        debugMode: appData.settings.debugMode,
        categoryLevelMode: appData.settings.categoryLevelMode,
        frequentExpenseCategories: appData.settings.frequentExpenseCategories,
        frequentIncomeCategories: appData.settings.frequentIncomeCategories,
      },
    };

    const json = JSON.stringify(exportPayload, null, 2);
    const fileUri = FileSystem.documentDirectory + EXPORT_FILENAME;
    await FileSystem.writeAsStringAsync(fileUri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    logger.info(TAG, 'exportData: file written', { uri: fileUri, size: json.length });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Easy Money Tracker Backup',
      });
      logger.info(TAG, 'exportData: shared successfully');
    } else {
      logger.warn(TAG, 'exportData: sharing not available on this device');
      throw new Error('Sharing is not available on this device');
    }
  } catch (err) {
    logger.error(TAG, 'exportData: failed', err);
    throw err;
  }
}

/**
 * Import data from a JSON string (from file picker).
 */
export async function importData(jsonString: string): Promise<AppData> {
  logger.info(TAG, 'importData: start', { size: jsonString.length });
  try {
    const imported: ExportData = JSON.parse(jsonString);

    // Validate structure
    if (!imported.schemaVersion || !Array.isArray(imported.records)) {
      throw new Error('Invalid backup file: missing schemaVersion or records');
    }
    if (!imported.categories?.expense || !imported.categories?.income) {
      throw new Error('Invalid backup file: missing categories');
    }

    const currentData = await loadAppData();
    const merged: AppData = {
      schemaVersion: SCHEMA_VERSION,
      transactions: imported.records,
      categories: imported.categories,
      settings: {
        ...currentData.settings,
        ...imported.settings,
        fxCache: currentData.settings.fxCache, // keep current FX cache
      },
    };

    await saveAppData(merged);
    logger.info(TAG, 'importData: success', {
      txCount: merged.transactions.length,
    });
    return merged;
  } catch (err) {
    logger.error(TAG, 'importData: failed', err);
    throw err;
  }
}
