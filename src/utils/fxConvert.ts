import { FxCache } from '../types';
import { logger } from './logger';

/**
 * Convert an amount from one currency to another using cached FX rates.
 * Rates are relative to the cache base currency.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  fxCache: FxCache
): number {
  if (fromCurrency === toCurrency) return amount;

  const base = fxCache.base;
  const rates = fxCache.rates;

  // Convert from → base → to
  let amountInBase = amount;
  if (fromCurrency !== base) {
    const fromRate = rates[fromCurrency];
    if (!fromRate) {
      logger.warn('fxConvert', `Missing rate for fromCurrency: ${fromCurrency} (base: ${base})`);
      return 0;
    }
    amountInBase = amount / fromRate;
  }

  if (toCurrency === base) return amountInBase;

  const toRate = rates[toCurrency];
  if (!toRate) {
    logger.warn('fxConvert', `Missing rate for toCurrency: ${toCurrency} (base: ${base})`);
    return 0;
  }

  return amountInBase * toRate;
}
