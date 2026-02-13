// ── FX rate service using frankfurter.app ──────────────────────────────────
import { FxCache } from '../types';
import { logger } from '../utils/logger';

const TAG = 'FxService';
const BASE_URL = 'https://api.frankfurter.app/latest';
const CACHE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

/** Check if the cache is stale (older than 3 hours) */
export function isFxCacheStale(cache: FxCache): boolean {
  if (!cache.lastUpdatedAt || Object.keys(cache.rates).length === 0) return true;
  const elapsed = Date.now() - new Date(cache.lastUpdatedAt).getTime();
  return elapsed >= CACHE_DURATION_MS;
}

/**
 * Fetch latest FX rates.
 * If force=false, returns cached data when still fresh (< 3 hours old).
 * If force=true, always hits the API.
 * On failure, returns the existing cache (stale data is better than no data).
 */
export async function fetchFxRates(
  currentCache: FxCache,
  force: boolean = false
): Promise<{ cache: FxCache; error: boolean }> {
  // Check if cache is still valid (skip if forced)
  if (!force && !isFxCacheStale(currentCache)) {
    logger.debug(TAG, 'fetchFxRates: using cached rates', {
      age: Math.round((Date.now() - new Date(currentCache.lastUpdatedAt).getTime()) / 60000) + ' min',
    });
    return { cache: currentCache, error: false };
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
    return { cache: newCache, error: false };
  } catch (err) {
    logger.error(TAG, 'fetchFxRates: failed, returning stale cache', err);
    return { cache: currentCache, error: true };
  }
}
