// ── FX rate service with provider fallback chain ────────────────────────────
import { FxCache } from '../types';
import { logger } from '../utils/logger';

const TAG = 'FxService';
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

interface ProviderResult {
  base: string;
  rates: Record<string, number>;
}

/** Ordered list of FX providers. First success wins. */
const PROVIDERS: Array<{ name: string; fetch: () => Promise<ProviderResult> }> = [
  {
    // Primary: 160+ currencies incl. TWD, HKD, etc. Free, no key required.
    name: 'open.er-api.com',
    fetch: async () => {
      const res = await fetch('https://open.er-api.com/v6/latest/EUR');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      if (data.result !== 'success') throw new Error(`API error: ${data['error-type'] ?? 'unknown'}`);
      return { base: data.base_code as string, rates: data.rates as Record<string, number> };
    },
  },
  {
    // Fallback: ECB-based, ~33 major currencies. Free, no key required.
    name: 'frankfurter.app',
    fetch: async () => {
      const res = await fetch('https://api.frankfurter.app/latest');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      return { base: (data.base ?? 'EUR') as string, rates: (data.rates ?? {}) as Record<string, number> };
    },
  },
];

/** Check if the cache is stale (older than 6 hours) */
export function isFxCacheStale(cache: FxCache): boolean {
  if (!cache.lastUpdatedAt || Object.keys(cache.rates).length === 0) return true;
  const elapsed = Date.now() - new Date(cache.lastUpdatedAt).getTime();
  return elapsed >= CACHE_DURATION_MS;
}

/**
 * Fetch latest FX rates using a provider fallback chain.
 * If force=false, returns cached data when still fresh (< 6 hours old).
 * If force=true, always hits the APIs.
 * On all providers failing, returns the existing cache (stale > nothing).
 */
export async function fetchFxRates(
  currentCache: FxCache,
  force: boolean = false
): Promise<{ cache: FxCache; error: boolean; provider?: string }> {
  if (!force && !isFxCacheStale(currentCache)) {
    logger.debug(TAG, 'fetchFxRates: using cached rates', {
      age: Math.round((Date.now() - new Date(currentCache.lastUpdatedAt).getTime()) / 60000) + ' min',
    });
    return { cache: currentCache, error: false };
  }

  logger.info(TAG, 'fetchFxRates: fetching fresh rates', { providers: PROVIDERS.map(p => p.name) });

  for (const provider of PROVIDERS) {
    try {
      logger.info(TAG, `fetchFxRates: trying ${provider.name}`);
      const { base, rates } = await provider.fetch();
      const newCache: FxCache = {
        lastUpdatedAt: new Date().toISOString(),
        base,
        rates: { ...rates, [base]: 1 },
        provider: provider.name,
      };
      logger.info(TAG, `fetchFxRates: success via ${provider.name}`, {
        base: newCache.base,
        rateCount: Object.keys(newCache.rates).length,
      });
      return { cache: newCache, error: false, provider: provider.name };
    } catch (err) {
      logger.warn(TAG, `fetchFxRates: ${provider.name} failed, trying next`, err);
    }
  }

  logger.error(TAG, 'fetchFxRates: all providers failed, returning stale cache');
  return { cache: currentCache, error: true };
}
