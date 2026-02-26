import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { BORDER_RADIUS, FONT_SIZE, SPACING } from '../src/constants/spacing';
import { useSaveSettings, useSettings } from '../src/hooks/useSettings';
import { useTheme } from '../src/hooks/useTheme';
import { useI18n } from '../src/hooks/useI18n';
import { useCategoryPickerStore } from '../src/store/categoryPickerStore';
import { Category } from '../src/types';
import { UNCLASSIFIED_NAME } from '../src/utils/categoryHelpers';
import { translateCategoryName } from '../src/utils/categoryTranslation';

/** Flatten the category tree into a list of { category, path } tuples for search. */
function flattenCategoryTree(
  cats: Category[],
  parentPath: string[] = [],
): { category: Category; path: string[] }[] {
  const result: { category: Category; path: string[] }[] = [];
  for (const cat of cats) {
    const currentPath = [...parentPath, cat.name];
    result.push({ category: cat, path: currentPath });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategoryTree(cat.children, currentPath));
    }
  }
  return result;
}

/** Build a drill stack from root to the given path (navigating into each level). */
function buildDrillStack(
  rootCategories: Category[],
  path: string[],
): { items: Category[]; path: string[] }[] {
  const stack: { items: Category[]; path: string[] }[] = [{ items: rootCategories, path: [] }];
  let currentItems = rootCategories;
  for (let i = 0; i < path.length; i++) {
    const cat = currentItems.find((c) => c.name === path[i]);
    if (cat && cat.children && cat.children.length > 0) {
      const pathSoFar = path.slice(0, i + 1);
      stack.push({ items: cat.children, path: pathSoFar });
      currentItems = cat.children;
    } else {
      break;
    }
  }
  return stack;
}

function SelectCategoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const settingsData = useSettings();
  const saveSettings = useSaveSettings();
  const searchInputRef = useRef<TextInput>(null);

  const {
    categories,
    selectedPath,
    onSelectCallback,
    onEditFrequentCallback,
    onEditCategoriesCallback,
    clear,
  } = useCategoryPickerStore();

  const [drillStack, setDrillStack] = useState<{ items: Category[]; path: string[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const autoFocus = settingsData.autoFocusCategorySearch ?? true;

  const toggleAutoFocus = useCallback(() => {
    saveSettings.mutate({ autoFocusCategorySearch: !autoFocus });
  }, [autoFocus, saveSettings]);

  // Initialize drill stack on mount
  useEffect(() => {
    if (categories.length === 0) return;
    if (selectedPath.length > 0) {
      setDrillStack(buildDrillStack(categories, selectedPath));
    } else {
      setDrillStack([{ items: categories, path: [] }]);
    }
    // Auto-focus search
    if (autoFocus) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 350);
    }
  }, []); // Run once on mount

  // Flatten all categories for search
  const allFlatCategories = useMemo(
    () => flattenCategoryTree(categories),
    [categories],
  );

  // Filter flattened categories by search keyword (matches both English and translated names)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return allFlatCategories.filter(
      ({ category, path }) =>
        category.name.toLowerCase().includes(q) ||
        translateCategoryName(category.name, t).toLowerCase().includes(q) ||
        path.join(' > ').toLowerCase().includes(q) ||
        path.map((s) => translateCategoryName(s, t)).join(' > ').toLowerCase().includes(q),
    );
  }, [searchQuery, allFlatCategories, t]);

  const isSearching = searchQuery.trim().length > 0;

  function handleSelectCategory(cat: Category) {
    const currentLevel = drillStack[drillStack.length - 1];
    const newPath = [...currentLevel.path, cat.name];

    // Auto-drill: if has children, drill into them
    if (cat.children && cat.children.length > 0) {
      setDrillStack([...drillStack, { items: cat.children, path: newPath }]);
    } else {
      // Leaf node — select and close
      onSelectCallback?.(newPath);
      clear();
      router.back();
    }
  }

  function goBack() {
    if (drillStack.length > 1) {
      setDrillStack(drillStack.slice(0, -1));
    } else {
      clear();
      router.back();
    }
  }

  const currentItems = drillStack.length > 0
    ? drillStack[drillStack.length - 1].items
    : categories;

  const currentPath = drillStack.length > 0
    ? drillStack[drillStack.length - 1].path
    : [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={1}>
          {currentPath.length > 0 ? currentPath.map((s) => translateCategoryName(s, t)).join(' > ') : t('category.selectCategory')}
        </Text>
        {/* Toggle auto-focus keyboard */}
        <TouchableOpacity
          style={styles.autoFocusToggle}
          onPress={toggleAutoFocus}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.autoFocusLabel, { color: theme.text.secondary }]}>
            {t('category.popupKeyboard')}
          </Text>
          <Ionicons
            name={autoFocus ? 'checkbox' : 'square-outline'}
            size={20}
            color={autoFocus ? theme.primary : theme.text.tertiary}
          />
        </TouchableOpacity>
        {onEditCategoriesCallback && (
          <TouchableOpacity
            style={styles.editCategoriesBtn}
            onPress={() => {
              const cb = onEditCategoriesCallback;
              clear();
              router.back();
              setTimeout(() => cb(), 100);
            }}
          >
            <Ionicons name="create-outline" size={23} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search bar */}
      <View style={[styles.searchContainer, { borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.text.tertiary} style={{ marginRight: SPACING.xs }} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder={t('category.searchPlaceholder')}
            placeholderTextColor={theme.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        /* Search results */
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => `${item.path.join('>')}__${index}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const hasChildren = !!(item.category.children && item.category.children.length > 0);
            return (
              <TouchableOpacity
                style={[styles.categoryRow, { backgroundColor: theme.cardBackground }]}
                onPress={() => {
                  if (hasChildren) {
                    setSearchQuery('');
                    setDrillStack(buildDrillStack(categories, item.path));
                  } else {
                    onSelectCallback?.(item.path);
                    clear();
                    router.back();
                  }
                }}
              >
                <Text style={styles.categoryIcon}>{item.category.icon ?? '📁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.categoryName, { color: theme.text.primary }]}>{translateCategoryName(item.category.name, t)}</Text>
                  {item.path.length > 1 && (
                    <Text style={[styles.searchPathHint, { color: theme.text.tertiary }]}>
                      {item.path.map((s) => translateCategoryName(s, t)).join(' > ')}
                    </Text>
                  )}
                </View>
                {hasChildren && (
                  <>
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: `${theme.success}15` }]}
                      onPress={() => {
                        onSelectCallback?.([...item.path, UNCLASSIFIED_NAME]);
                        setSearchQuery('');
                        clear();
                        router.back();
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="arrow-forward" size={18} color={theme.success} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: `${theme.text.tertiary}10`, marginLeft: SPACING.xl }]}
                      onPress={() => {
                        setSearchQuery('');
                        setDrillStack(buildDrillStack(categories, item.path));
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chevron-forward" size={16} color={theme.text.secondary} />
                    </TouchableOpacity>
                  </>
                )}
                {!hasChildren && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: `${theme.success}15` }]}
                    onPress={() => {
                      onSelectCallback?.(item.path);
                      setSearchQuery('');
                      clear();
                      router.back();
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="arrow-forward" size={18} color={theme.success} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.divider }]} />}
          ListEmptyComponent={() => (
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={36} color={theme.text.tertiary} />
              <Text style={[styles.emptySearchText, { color: theme.text.tertiary }]}>{t('category.noCategories')}</Text>
            </View>
          )}
        />
      ) : (
        /* Normal drill-down list */
        <FlatList
          data={currentItems}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const hasChildren = !!(item.children && item.children.length > 0);
            return (
              <TouchableOpacity
                style={[styles.categoryRow, { backgroundColor: theme.cardBackground }]}
                onPress={() => handleSelectCategory(item)}
              >
                <Text style={styles.categoryIcon}>{item.icon ?? '📁'}</Text>
                <Text style={[styles.categoryName, { color: theme.text.primary }]}>{translateCategoryName(item.name, t)}</Text>
                {hasChildren && (
                  <>
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: `${theme.success}15` }]}
                      onPress={() => {
                        const lvl = drillStack[drillStack.length - 1];
                        onSelectCallback?.([...lvl.path, item.name, UNCLASSIFIED_NAME]);
                        clear();
                        router.back();
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="arrow-forward" size={18} color={theme.success} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: `${theme.text.tertiary}10`, marginLeft: SPACING.xl }]}
                      onPress={() => handleSelectCategory(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chevron-forward" size={16} color={theme.text.secondary} />
                    </TouchableOpacity>
                  </>
                )}
                {!hasChildren && (
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: `${theme.success}15` }]}
                    onPress={() => handleSelectCategory(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="arrow-forward" size={18} color={theme.success} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.divider }]} />}
        />
      )}
    </View>
  );
}

export default function SelectCategoryWithBoundary() {
  return (
    <ErrorBoundary screenName="SelectCategory">
      <SelectCategoryScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    height: 48,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: SPACING.md,
    padding: SPACING.xs,
    alignSelf: 'center',
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    flex: 1,
    includeFontPadding: false,
    alignSelf: 'center',
  },
  autoFocusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: SPACING.xs,
    marginLeft: SPACING.xs,
    gap: SPACING.xs,
  },
  autoFocusLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '500',
    includeFontPadding: false,
  },
  editCategoriesBtn: {
    paddingHorizontal: SPACING.sm,
    marginLeft: SPACING.xs,
    alignSelf: 'center',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    paddingVertical: 4,
  },
  searchPathHint: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.sm,
  },
  emptySearchText: {
    fontSize: FONT_SIZE.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  categoryIcon: {
    fontSize: 22,
    marginRight: SPACING.md,
  },
  categoryName: {
    fontSize: FONT_SIZE.md,
    flex: 1,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    marginLeft: 56,
  },
});
