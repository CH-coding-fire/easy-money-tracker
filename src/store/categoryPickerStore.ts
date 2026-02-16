// ── Zustand store for CategoryPicker ↔ select-category screen communication ──
import { create } from 'zustand';
import { Category } from '../types';

interface CategoryPickerState {
  /** Categories to display in the picker */
  categories: Category[];
  /** Currently selected path (for opening at the right drill level) */
  selectedPath: string[];
  /** Frequent category shortcuts */
  frequentCategories: string[][];
  /** Callback when a category is selected */
  onSelectCallback: ((path: string[]) => void) | null;
  /** Callback to navigate to frequent categories editor */
  onEditFrequentCallback: (() => void) | null;
  /** Callback to navigate to category editor */
  onEditCategoriesCallback: (() => void) | null;

  /** Set up the picker and open it */
  setup: (params: {
    categories: Category[];
    selectedPath: string[];
    frequentCategories?: string[][];
    onSelect: (path: string[]) => void;
    onEditFrequent?: () => void;
    onEditCategories?: () => void;
  }) => void;

  /** Clear all state after picker closes */
  clear: () => void;
}

export const useCategoryPickerStore = create<CategoryPickerState>((set) => ({
  categories: [],
  selectedPath: [],
  frequentCategories: [],
  onSelectCallback: null,
  onEditFrequentCallback: null,
  onEditCategoriesCallback: null,

  setup: (params) =>
    set({
      categories: params.categories,
      selectedPath: params.selectedPath,
      frequentCategories: params.frequentCategories ?? [],
      onSelectCallback: params.onSelect,
      onEditFrequentCallback: params.onEditFrequent ?? null,
      onEditCategoriesCallback: params.onEditCategories ?? null,
    }),

  clear: () =>
    set({
      categories: [],
      selectedPath: [],
      frequentCategories: [],
      onSelectCallback: null,
      onEditFrequentCallback: null,
      onEditCategoriesCallback: null,
    }),
}));
