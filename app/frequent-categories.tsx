import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useCategories } from '../src/hooks/useCategories';
import { useSettings, useSaveSettings } from '../src/hooks/useSettings';
import { useTheme } from '../src/hooks/useTheme';
import { useI18n } from '../src/hooks/useI18n';
import { Category, TransactionType } from '../src/types';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';
import { useUIStore } from '../src/store/uiStore';
import { UNCLASSIFIED_NAME } from '../src/utils/categoryHelpers';
import { translateCategoryName } from '../src/utils/categoryTranslation';

const TAG = 'FrequentCategoriesScreen';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Display label for a frequent category path.
 * When the path ends with "Uncategorized", show the parent name instead
 * (e.g. ["Utilities", "Uncategorized"] → "Utilities").
 */
function frequentDisplayLabel(path: string[]): string {
  if (path.length > 1 && path[path.length - 1] === UNCLASSIFIED_NAME) {
    return path[path.length - 2];
  }
  return path[path.length - 1];
}

/** Flatten the category tree into a list of { path, icon, hasChildren } tuples. */
function flattenCategories(
  cats: Category[],
  parentPath: string[] = [],
): { path: string[]; icon: string; hasChildren: boolean }[] {
  const result: { path: string[]; icon: string; hasChildren: boolean }[] = [];
  for (const cat of cats) {
    const currentPath = [...parentPath, cat.name];
    const hasChildren = !!(cat.children && cat.children.length > 0);
    result.push({ path: currentPath, icon: cat.icon ?? '📁', hasChildren });
    if (hasChildren) {
      result.push(...flattenCategories(cat.children!, currentPath));
    }
  }
  return result;
}

function pathKey(path: string[]): string {
  return path.join(' > ');
}

// ── Tree row component ──────────────────────────────────────────────────────

function CategoryTreeRow({
  cat,
  parentPath,
  depth,
  expandedIds,
  toggleExpand,
  isFrequent,
  toggleFrequent,
  theme,
  t,
}: {
  cat: Category;
  parentPath: string[];
  depth: number;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  isFrequent: (path: string[]) => boolean;
  toggleFrequent: (path: string[]) => void;
  theme: ReturnType<typeof useTheme>;
  t: (key: string) => string;
}) {
  const currentPath = [...parentPath, cat.name];
  const hasChildren = !!(cat.children && cat.children.length > 0);
  const isExpanded = expandedIds.has(cat.id);
  const selected = isFrequent(currentPath);

  return (
    <>
      <View style={[
        styles.catRow,
        { backgroundColor: theme.cardBackground },
        !hasChildren && selected && { backgroundColor: `${theme.primary}08` },
        { paddingLeft: SPACING.md + depth * 20 },
      ]}>
        <View style={styles.expandPlaceholder} />

        <TouchableOpacity
          style={styles.catRowInner}
          onPress={() => {
            if (hasChildren) {
              // Parent categories with subcategories cannot be directly selected;
              // expand so the user picks a specific subcategory instead.
              toggleExpand(cat.id);
            } else {
              toggleFrequent(currentPath);
            }
          }}
          activeOpacity={0.6}
        >
          <Text style={styles.catIcon}>{cat.icon ?? '📁'}</Text>
          <View style={styles.catInfo}>
            <Text
              style={[
                styles.catName,
                { color: theme.text.primary },
                !hasChildren && selected && { fontWeight: '700', color: theme.primary },
              ]}
              numberOfLines={1}
            >
              {translateCategoryName(cat.name, t)}
            </Text>
            {hasChildren && (
              <Text style={[styles.catSubCount, { color: theme.text.tertiary }]}>
                {cat.children!.length} subcategories — expand to select
              </Text>
            )}
          </View>
          {hasChildren ? (
            <Ionicons
              name="chevron-down"
              size={20}
              color={theme.text.tertiary}
            />
          ) : (
            <Ionicons
              name={selected ? 'checkmark-circle' : 'add-circle-outline'}
              size={22}
              color={selected ? theme.primary : theme.text.tertiary}
            />
          )}
        </TouchableOpacity>
      </View>
      <View style={[styles.separator, { backgroundColor: theme.divider }]} />

      {/* Render children if expanded */}
      {isExpanded && hasChildren && cat.children!.map((child) => (
        <CategoryTreeRow
          key={child.id}
          cat={child}
          parentPath={currentPath}
          depth={depth + 1}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          isFrequent={isFrequent}
          toggleFrequent={toggleFrequent}
          theme={theme}
          t={t}
        />
      ))}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

function FrequentCategoriesScreen() {
  const categories = useCategories();
  const settings = useSettings();
  const saveMutation = useSaveSettings();
  const { showToast } = useUIStore();
  const theme = useTheme();
  const { t } = useI18n();

  const [catType, setCatType] = useState<TransactionType>('expense');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const currentCategories = catType === 'expense' ? categories.expense : categories.income;

  const frequentList =
    catType === 'expense'
      ? settings.frequentExpenseCategories
      : settings.frequentIncomeCategories;

  const settingsKey =
    catType === 'expense'
      ? 'frequentExpenseCategories'
      : 'frequentIncomeCategories';

  // Flat list of all categories for search
  const allFlat = useMemo(
    () => flattenCategories(currentCategories),
    [currentCategories],
  );

  const frequentKeys = useMemo(
    () => new Set(frequentList.map(pathKey)),
    [frequentList],
  );

  const isFrequent = useCallback(
    (path: string[]) => frequentKeys.has(pathKey(path)),
    [frequentKeys],
  );

  const isSearching = searchQuery.trim().length > 0;

  // Filter flattened categories by search keyword (matches English and translated names)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return allFlat.filter(
      ({ path }) =>
        path[path.length - 1].toLowerCase().includes(q) ||
        translateCategoryName(path[path.length - 1], t).toLowerCase().includes(q) ||
        path.join(' > ').toLowerCase().includes(q) ||
        path.map((s) => translateCategoryName(s, t)).join(' > ').toLowerCase().includes(q),
    );
  }, [searchQuery, allFlat, t]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFrequent(path: string[]) {
    const key = pathKey(path);
    let updated: string[][];
    if (frequentKeys.has(key)) {
      updated = frequentList.filter((p) => pathKey(p) !== key);
      logger.info(TAG, 'Remove frequent category', { path });
    } else {
      updated = [...frequentList, path];
      logger.info(TAG, 'Add frequent category', { path });
    }
    saveMutation.mutate({ [settingsKey]: updated });
  }

  function removeFrequent(path: string[]) {
    const key = pathKey(path);
    const updated = frequentList.filter((p) => pathKey(p) !== key);
    logger.info(TAG, 'Remove frequent category', { path });
    saveMutation.mutate({ [settingsKey]: updated });
  }

  // Find icon for a given path
  function findIcon(path: string[]): string {
    let items = currentCategories;
    let icon = '📁';
    let parentIcon = '📁';
    for (const name of path) {
      const found = items.find((c) => c.name === name);
      if (found) {
        parentIcon = icon;
        icon = found.icon ?? '📁';
        items = found.children ?? [];
      } else {
        break;
      }
    }
    // When path ends with "Uncategorized", use the parent's icon instead
    // (e.g. Food > Uncategorized should show 🍔, not 📁)
    if (path.length > 1 && path[path.length - 1] === UNCLASSIFIED_NAME) {
      return parentIcon;
    }
    return icon;
  }

  return (
    <ScreenContainer padTop={false}>
      {/* Fixed header: Type toggle */}
      <View style={[styles.header, { borderBottomColor: theme.divider, backgroundColor: theme.background }]}>
        <SegmentedControl<TransactionType>
          options={[
            { label: t('add.expense'), value: 'expense' },
            { label: t('add.income'), value: 'income' },
          ]}
          selected={catType}
          onSelect={(v) => {
            setCatType(v);
            setExpandedIds(new Set());
            setSearchQuery('');
          }}
        />

        {/* Selected frequent categories */}
        <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>
          {t('frequentCategories.title')}
        </Text>
        <Text style={[styles.sectionHint, { color: theme.text.tertiary }]}>
          {t('frequentCategories.hint')}
        </Text>

        {frequentList.length > 0 ? (
          <View style={styles.chipRow}>
            {frequentList.map((path) => (
              <View key={pathKey(path)} style={[styles.chip, { backgroundColor: `${theme.primary}20` }]}>
                <Text style={styles.chipIcon}>{findIcon(path)}</Text>
                <Text style={[styles.chipLabel, { color: theme.primary }]} numberOfLines={1}>
                  {translateCategoryName(frequentDisplayLabel(path), t)}
                </Text>
                <TouchableOpacity
                  style={styles.chipRemove}
                  onPress={() => removeFrequent(path)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={16} color={theme.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyChips, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.emptyChipsText, { color: theme.text.tertiary }]}>
              {t('frequentCategories.emptyHint')}
            </Text>
          </View>
        )}

        {/* All categories header */}
        <Text style={[styles.sectionLabel, { marginTop: SPACING.md, color: theme.text.primary }]}>
          {t('category.allCategories')}
        </Text>
        <Text style={[styles.sectionHint, { color: theme.text.tertiary }]}>
          {t('frequentCategories.tapHint')}
        </Text>

        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.text.tertiary} style={{ marginRight: SPACING.xs }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text.primary }]}
            placeholder={t('category.searchCategories')}
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

      {/* Category list: search results (flat) or tree view */}
      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => pathKey(item.path)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const selected = !item.hasChildren && isFrequent(item.path);
            return (
              <TouchableOpacity
                style={[
                  styles.catRow,
                  { backgroundColor: theme.cardBackground, paddingLeft: SPACING.md },
                  selected && { backgroundColor: `${theme.primary}08` },
                ]}
                onPress={() => {
                  if (!item.hasChildren) {
                    toggleFrequent(item.path);
                  }
                  // Parent categories cannot be selected — user should pick a subcategory
                }}
                activeOpacity={item.hasChildren ? 1 : 0.6}
              >
                <View style={styles.expandPlaceholder} />
                <Text style={styles.catIcon}>{item.icon}</Text>
                <View style={styles.catInfo}>
                  <Text
                    style={[
                      styles.catName,
                      { color: item.hasChildren ? theme.text.tertiary : theme.text.primary },
                      selected && { fontWeight: '700', color: theme.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {translateCategoryName(item.path[item.path.length - 1], t)}
                  </Text>
                  {item.path.length > 1 && (
                    <Text style={[styles.catPathHint, { color: theme.text.tertiary }]} numberOfLines={1}>
                      {item.path.slice(0, -1).map((s) => translateCategoryName(s, t)).join(' > ')}
                    </Text>
                  )}
                  {item.hasChildren && (
                    <Text style={[styles.catPathHint, { color: theme.text.tertiary }]} numberOfLines={1}>
                      Has subcategories — select a subcategory instead
                    </Text>
                  )}
                </View>
                {!item.hasChildren && (
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={22}
                    color={selected ? theme.primary : theme.text.tertiary}
                  />
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.divider }]} />}
          ListEmptyComponent={
            <View style={styles.emptySearch}>
              <Text style={[styles.emptySearchText, { color: theme.text.tertiary }]}>
                No categories match "{searchQuery}"
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {currentCategories.map((cat) => (
            <CategoryTreeRow
              key={cat.id}
              cat={cat}
              parentPath={[]}
              depth={0}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              isFrequent={isFrequent}
              toggleFrequent={toggleFrequent}
              theme={theme}
              t={t}
            />
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

export default function FrequentCategoriesWithBoundary() {
  return (
    <ErrorBoundary screenName="FrequentCategories">
      <FrequentCategoriesScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  listContent: {
    paddingBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  sectionHint: {
    fontSize: FONT_SIZE.xs,
    marginBottom: SPACING.sm,
  },
  // ── Search bar ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    paddingVertical: SPACING.xs,
  },
  // ── Chips (selected frequent) ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.xs,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
    gap: 4,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    maxWidth: 120,
  },
  chipRemove: {
    marginLeft: 2,
  },
  emptyChips: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  emptyChipsText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  // ── Category list ──
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.md,
  },
  catRowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandPlaceholder: {
    width: 28,
  },
  catIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontSize: FONT_SIZE.md,
  },
  catSubCount: {
    fontSize: FONT_SIZE.xs,
    marginTop: 1,
  },
  catPathHint: {
    fontSize: FONT_SIZE.xs,
    marginTop: 1,
  },
  separator: {
    height: 1,
    marginLeft: 48,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptySearchText: {
    fontSize: FONT_SIZE.md,
  },
});
