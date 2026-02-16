// ── Uncategorized category helpers ──────────────────────────────────────────
import { Category } from '../types';
import { generateUUID } from './uuid';

export const UNCLASSIFIED_NAME = 'Uncategorized';
export const UNCLASSIFIED_ICON = '📁';

/**
 * Check whether a category is the special "Uncategorized" entry.
 */
export function isUnclassified(cat: Category): boolean {
  return cat.name === UNCLASSIFIED_NAME;
}

/**
 * Create a fresh Uncategorized category node (no children).
 */
export function createUnclassified(): Category {
  return { id: generateUUID(), name: UNCLASSIFIED_NAME, icon: UNCLASSIFIED_ICON };
}

/**
 * Ensure every level of a category tree has "Uncategorized" as the first item.
 *
 * - If the array is non-empty and no "Uncategorized" exists, one is prepended.
 * - If "Uncategorized" exists but is not at index 0, it is moved there.
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

  // Find ALL "Uncategorized" entries and remove duplicates
  const uncategorizedEntries = result.filter((c) => c.name === UNCLASSIFIED_NAME);
  const otherCategories = result.filter((c) => c.name !== UNCLASSIFIED_NAME);
  
  // Keep only one Uncategorized entry (prefer the first one found, or create a new one)
  let singleUnclassified: Category;
  if (uncategorizedEntries.length > 0) {
    // Use the first existing one
    singleUnclassified = { ...uncategorizedEntries[0], children: undefined };
  } else {
    // Create a new one
    singleUnclassified = createUnclassified();
  }
  
  // Rebuild array with single Uncategorized at front
  const finalResult = [singleUnclassified, ...otherCategories];

  // Recurse into children of every NON-Uncategorized category
  for (let i = 1; i < finalResult.length; i++) {
    const cat = finalResult[i];
    if (cat.children && cat.children.length > 0) {
      finalResult[i] = { ...cat, children: ensureUnclassified(cat.children) };
    }
  }

  return finalResult;
}
