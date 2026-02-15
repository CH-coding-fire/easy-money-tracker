import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Keyboard,
  TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Category } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/spacing';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';
import { UNCLASSIFIED_NAME } from '../utils/categoryHelpers';

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

interface CategoryPickerProps {
  categories: Category[];
  selectedPath: string[];
  onSelect: (path: string[]) => void;
  frequentCategories?: string[][]; // quick-pick paths
  onEditFrequent?: () => void;
  onEditCategories?: () => void;
}

export function CategoryPicker({
  categories,
  selectedPath,
  onSelect,
  frequentCategories = [],
  onEditFrequent,
  onEditCategories,
}: CategoryPickerProps) {
  const theme = useTheme();
  const [drillStack, setDrillStack] = useState<{ items: Category[]; path: string[] }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedLabel = selectedPath.length > 0 ? selectedPath.join(' > ') : 'Select category';

  // Flatten all categories for search
  const allFlatCategories = useMemo(
    () => flattenCategoryTree(categories),
    [categories],
  );

  // Filter flattened categories by search keyword
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return allFlatCategories.filter(
      ({ category, path }) =>
        category.name.toLowerCase().includes(q) ||
        path.join(' > ').toLowerCase().includes(q),
    );
  }, [searchQuery, allFlatCategories]);

  const isSearching = searchQuery.trim().length > 0;

  function openPicker() {
    Keyboard.dismiss();
    setSearchQuery('');
    setDrillStack([{ items: categories, path: [] }]);
    setModalVisible(true);
  }

  function handleSelectCategory(cat: Category) {
    const currentLevel = drillStack[drillStack.length - 1];
    const newPath = [...currentLevel.path, cat.name];

    // Auto-drill: if has children, drill into them
    if (cat.children && cat.children.length > 0) {
      setDrillStack([...drillStack, { items: cat.children, path: newPath }]);
    } else {
      // Leaf node — select and close
      onSelect(newPath);
      setModalVisible(false);
    }
  }

  function goBack() {
    if (drillStack.length > 1) {
      setDrillStack(drillStack.slice(0, -1));
    } else {
      setModalVisible(false);
    }
  }

  const currentItems = drillStack.length > 0
    ? drillStack[drillStack.length - 1].items
    : categories;

  const currentPath = drillStack.length > 0
    ? drillStack[drillStack.length - 1].path
    : [];

  return (
    <View>
      {/* Main picker button */}
      <TouchableOpacity
        style={[styles.pickerButton, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}
        onPress={openPicker}
      >
        <Text style={[styles.pickerText, { color: selectedPath.length ? theme.text.primary : theme.text.tertiary }]}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={theme.text.tertiary} style={{ marginLeft: SPACING.sm }} />
      </TouchableOpacity>

      {/* Frequent category shortcuts — below the picker */}
      {frequentCategories.length > 0 ? (
        <View style={styles.frequentRow}>
          {frequentCategories.map((path, i) => {
            const isActive = selectedPath.join('>') === path.join('>');
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.frequentChip,
                  { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}15` },
                  isActive && { borderColor: theme.primary, backgroundColor: `${theme.primary}30` },
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  onSelect(path);
                }}
              >
                <Text
                  style={[
                    styles.frequentLabel,
                    { color: theme.primary },
                    isActive && { fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {path[path.length - 1]}
                </Text>
              </TouchableOpacity>
            );
          })}
          {onEditFrequent && (
            <TouchableOpacity style={styles.editFreqBtn} onPress={onEditFrequent}>
              <Ionicons name="create-outline" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        onEditFrequent && (
          <View style={[styles.emptyFrequentRow, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20` }]}>
            <Text style={[styles.emptyFrequentText, { color: theme.primary }]}>
              No frequent categories yet. Tap to add.
            </Text>
            <TouchableOpacity
              style={[styles.emptyFrequentBtn, { backgroundColor: `${theme.primary}15` }]}
              onPress={onEditFrequent}
            >
              <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
              <Text style={[styles.emptyFrequentBtnText, { color: theme.primary }]}>Add Frequent</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Drill-down modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={drillStack.length > 1 ? 'chevron-back' : 'close'}
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.backButton, { color: theme.primary }]}>
                {drillStack.length > 1 ? 'Back' : 'Close'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]} numberOfLines={1}>
              {currentPath.length > 0 ? currentPath.join(' > ') : 'Select Category'}
            </Text>
            {onEditCategories && (
              <TouchableOpacity
                style={styles.editCategoriesBtn}
                onPress={() => {
                  setModalVisible(false);
                  onEditCategories();
                }}
              >
                <Ionicons name="create-outline" size={18} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search bar */}
          <View style={[styles.searchContainer, { borderBottomColor: theme.border }]}>
            <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="search" size={16} color={theme.text.tertiary} style={{ marginRight: SPACING.xs }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text.primary }]}
                placeholder="Search categories..."
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
                        // Has children — drill into it (same as normal navigation)
                        setSearchQuery('');
                        setDrillStack(buildDrillStack(categories, item.path));
                      } else {
                        // Leaf node — select and close
                        onSelect(item.path);
                        setSearchQuery('');
                        setModalVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.categoryIcon}>{item.category.icon ?? '📁'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.categoryName, { color: theme.text.primary }]}>{item.category.name}</Text>
                      {item.path.length > 1 && (
                        <Text style={[styles.searchPathHint, { color: theme.text.tertiary }]}>
                          {item.path.join(' > ')}
                        </Text>
                      )}
                    </View>
                    {hasChildren && (
                      <>
                        <TouchableOpacity
                          style={[styles.iconButton, { backgroundColor: `${theme.success}15` }]}
                          onPress={() => {
                            onSelect([...item.path, UNCLASSIFIED_NAME]);
                            setSearchQuery('');
                            setModalVisible(false);
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
                          onSelect(item.path);
                          setSearchQuery('');
                          setModalVisible(false);
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
                  <Text style={[styles.emptySearchText, { color: theme.text.tertiary }]}>No categories found</Text>
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
                    <Text style={[styles.categoryName, { color: theme.text.primary }]}>{item.name}</Text>
                    {hasChildren && (
                      <>
                        <TouchableOpacity
                          style={[styles.iconButton, { backgroundColor: `${theme.success}15` }]}
                          onPress={() => {
                            const lvl = drillStack[drillStack.length - 1];
                            onSelect([...lvl.path, item.name, UNCLASSIFIED_NAME]);
                            setModalVisible(false);
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  frequentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  frequentChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  frequentLabel: {
    fontSize: FONT_SIZE.xs,
  },
  editFreqBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  emptyFrequentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyFrequentText: {
    fontSize: FONT_SIZE.xs,
    flex: 1,
  },
  emptyFrequentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  emptyFrequentBtnText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  pickerText: {
    fontSize: FONT_SIZE.md,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginRight: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    flex: 1,
  },
  editCategoriesBtn: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
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
