// ── Unclassified category helpers ──────────────────────────────────────────
import { Category } from '../types';
import { generateUUID } from './uuid';

export const UNCLASSIFIED_NAME = 'Unclassified';
export const UNCLASSIFIED_ICON = '📁';

/**
 * Check whether a category is the special "Unclassified" entry.
 */
export function isUnclassified(cat: Category): boolean {
  return cat.name === UNCLASSIFIED_NAME;
}

/**
 * Create a fresh Unclassified category node (no children).
 */
export function createUnclassified(): Category {
  return { id: generateUUID(), name: UNCLASSIFIED_NAME, icon: UNCLASSIFIED_ICON };
}

/**
 * Ensure every level of a category tree has "Unclassified" as the first item.
 *
 * - If the array is non-empty and no "Unclassified" exists, one is prepended.
 * - If "Unclassified" exists but is not at index 0, it is moved there.
 * - Recursively applied to every child array that contains items.
 *
 * Returns a **new** array (does not mutate the input).
 */
export function ensureUnclassified(categories: Category[]): Category[] {
  if (categories.length === 0) return categories;

  // Deep-clone so we never mutate the original
  const result = categories.map((cat) => ({
    ...cat,
    children: cat.children ? [...cat.children] : undefined,
  }));

  // Find existing Unclassified at this level
  const existingIdx = result.findIndex((c) => c.name === UNCLASSIFIED_NAME);

  if (existingIdx === -1) {
    // Not present — create and prepend
    result.unshift(createUnclassified());
  } else if (existingIdx !== 0) {
    // Present but not first — move to front
    const [unclassified] = result.splice(existingIdx, 1);
    result.unshift(unclassified);
  }

  // Ensure the Unclassified entry at this level never has children
  // (it is always a leaf / direct-select item)
  if (result[0] && isUnclassified(result[0])) {
    result[0] = { ...result[0], children: undefined };
  }

  // Recurse into children of every NON-Unclassified category
  for (let i = 0; i < result.length; i++) {
    const cat = result[i];
    if (cat.children && cat.children.length > 0) {
      result[i] = { ...cat, children: ensureUnclassified(cat.children) };
    }
  }

  return result;
}
