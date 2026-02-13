// ── FX rate service using frankfurter.app ──────────────────────────────────
import { FxCache } from '../types';
import { logger } from '../utils/logger';

const TAG = 'FxService';
const BASE_URL = 'https://api.frankfurter.app/latest';
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Fetch latest FX rates. Returns cached data if still fresh (< 6 hours old).
 */
export async function fetchFxRates(currentCache: FxCache): Promise<FxCache> {
  // Check if cache is still valid
  if (currentCache.lastUpdatedAt) {
    const elapsed = Date.now() - new Date(currentCache.lastUpdatedAt).getTime();
    if (elapsed < CACHE_DURATION_MS && Object.keys(currentCache.rates).length > 0) {
      logger.debug(TAG, 'fetchFxRates: using cached rates', {
        age: Math.round(elapsed / 60000) + ' min',
      });
      return currentCache;
    }
  }

  logger.info(TAG, 'fetchFxRates: fetching fresh rates from frankfurter.app');
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const newCache: FxCache = {
      lastUpdatedAt: new Date().toISOString(),
      base: data.base ?? 'EUR',
      rates: { ...(data.rates ?? {}), [data.base ?? 'EUR']: 1 },
    };
    logger.info(TAG, 'fetchFxRates: success', {
      base: newCache.base,
      rateCount: Object.keys(newCache.rates).length,
    });
    return newCache;
  } catch (err) {
    logger.error(TAG, 'fetchFxRates: failed, returning stale cache', err);
    return currentCache;
  }
}
