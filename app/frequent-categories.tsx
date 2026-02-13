import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useCategories } from '../src/hooks/useCategories';
import { useSettings, useSaveSettings } from '../src/hooks/useSettings';
import { Category, TransactionType } from '../src/types';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';
import { useUIStore } from '../src/store/uiStore';

const TAG = 'FrequentCategoriesScreen';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Flatten the category tree into a list of { path, icon } tuples. */
function flattenCategories(
  cats: Category[],
  parentPath: string[] = [],
): { path: string[]; icon: string }[] {
  const result: { path: string[]; icon: string }[] = [];
  for (const cat of cats) {
    const currentPath = [...parentPath, cat.name];
    // Add this node (any level is selectable)
    result.push({ path: currentPath, icon: cat.icon ?? '📁' });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, currentPath));
    }
  }
  return result;
}

function pathKey(path: string[]): string {
  return path.join(' > ');
}

// ── Main component ─────────────────────────────────────────────────────────

function FrequentCategoriesScreen() {
  const categories = useCategories();
  const settings = useSettings();
  const saveMutation = useSaveSettings();
  const { showToast } = useUIStore();

  const [catType, setCatType] = useState<TransactionType>('expense');

  const currentCategories = catType === 'expense' ? categories.expense : categories.income;

  const frequentList =
    catType === 'expense'
      ? settings.frequentExpenseCategories
      : settings.frequentIncomeCategories;

  const settingsKey =
    catType === 'expense'
      ? 'frequentExpenseCategories'
      : 'frequentIncomeCategories';

  // Flat list of all categories for selection
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
    for (const name of path) {
      const found = items.find((c) => c.name === name);
      if (found) {
        icon = found.icon ?? '📁';
        items = found.children ?? [];
      } else {
        break;
      }
    }
    return icon;
  }

  return (
    <ScreenContainer style={{ paddingTop: SPACING.sm }}>
      {/* Type toggle */}
      <SegmentedControl<TransactionType>
        options={[
          { label: 'Expense', value: 'expense' },
          { label: 'Income', value: 'income' },
        ]}
        selected={catType}
        onSelect={setCatType}
      />

      <FlatList
        data={allFlat}
        keyExtractor={(item) => pathKey(item.path)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Selected frequent categories */}
            <Text style={styles.sectionLabel}>
              Frequent Categories
            </Text>
            <Text style={styles.sectionHint}>
              These appear as quick-pick tags in the Add screen.
            </Text>

            {frequentList.length > 0 ? (
              <View style={styles.chipRow}>
                {frequentList.map((path) => (
                  <View key={pathKey(path)} style={styles.chip}>
                    <Text style={styles.chipIcon}>{findIcon(path)}</Text>
                    <Text style={styles.chipLabel} numberOfLines={1}>
                      {path[path.length - 1]}
                    </Text>
                    <TouchableOpacity
                      style={styles.chipRemove}
                      onPress={() => removeFrequent(path)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyChips}>
                <Text style={styles.emptyChipsText}>
                  No frequent categories yet. Tap categories below to add them.
                </Text>
              </View>
            )}

            {/* All categories header */}
            <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>
              All Categories
            </Text>
            <Text style={styles.sectionHint}>
              Tap to toggle as frequent. Shows full path for subcategories.
            </Text>
          </>
        }
        renderItem={({ item }) => {
          const selected = isFrequent(item.path);
          const depth = item.path.length - 1;
          return (
            <TouchableOpacity
              style={[
                styles.catRow,
                selected && styles.catRowSelected,
                { paddingLeft: SPACING.md + depth * 20 },
              ]}
              onPress={() => toggleFrequent(item.path)}
              activeOpacity={0.6}
            >
              <Text style={styles.catIcon}>{item.icon}</Text>
              <View style={styles.catInfo}>
                <Text
                  style={[styles.catName, selected && styles.catNameSelected]}
                  numberOfLines={1}
                >
                  {item.path.length > 1 ? item.path.join(' > ') : item.path[0]}
                </Text>
              </View>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                size={22}
                color={selected ? '#2196F3' : '#ccc'}
              />
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  listContent: {
    paddingBottom: SPACING.xxxl,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#222',
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  sectionHint: {
    fontSize: FONT_SIZE.xs,
    color: '#999',
    marginBottom: SPACING.sm,
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
    backgroundColor: '#E3F2FD',
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
    color: '#1565C0',
    maxWidth: 120,
  },
  chipRemove: {
    marginLeft: 2,
  },
  emptyChips: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#fafafa',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: SPACING.sm,
  },
  emptyChipsText: {
    fontSize: FONT_SIZE.sm,
    color: '#999',
    textAlign: 'center',
  },
  // ── Category list ──
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#fff',
  },
  catRowSelected: {
    backgroundColor: '#F5F9FF',
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
    color: '#222',
  },
  catNameSelected: {
    fontWeight: '700',
    color: '#1565C0',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 48,
  },
});
