import { FxCache } from '../types';

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
    if (!fromRate) return amount; // unknown currency, return as-is
    amountInBase = amount / fromRate;
  }

  if (toCurrency === base) return amountInBase;

  const toRate = rates[toCurrency];
  if (!toRate) return amount; // unknown currency, return as-is

  return amountInBase * toRate;
}
