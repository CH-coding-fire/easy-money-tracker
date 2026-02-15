import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity as RNTouchableOpacity,
} from 'react-native';
// CRITICAL: Use gesture-handler's TouchableOpacity inside DraggableFlatList
// RN's TouchableOpacity conflicts with gesture-handler and breaks drag
import { TouchableOpacity } from 'react-native-gesture-handler';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import Ionicons from '@expo/vector-icons/Ionicons';
import { generateUUID } from '../src/utils/uuid';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { Button } from '../src/components/Button';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useCategories, useSaveCategories } from '../src/hooks/useCategories';
import { useTheme } from '../src/hooks/useTheme';
import { Category, TransactionType } from '../src/types';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';
import { useUIStore } from '../src/store/uiStore';

const TAG = 'CategoryEditScreen';
const MAX_DEPTH = 3;

const ICON_OPTIONS = [
  '📁', '🍔', '🏠', '💡', '🚗', '🏥', '🛡️', '🏛️', '🎉', '❤️',
  '📚', '💪', '🚬', '🎮', '🛍️', '💄', '👗', '💻', '🔧', '🐾',
  '🤲', '👨‍👩‍👧‍👦', '💰', '💼', '🎁', '🏢', '📈', '🎯', '⭐', '🌟',
];

function CategoryEditScreen() {
  const categories = useCategories();
  const saveMutation = useSaveCategories();
  const { showToast } = useUIStore();
  const theme = useTheme();

  const [catType, setCatType] = useState<TransactionType>('expense');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('📁');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [addParentPath, setAddParentPath] = useState<string[]>([]);

  const topLevelItems = catType === 'expense' ? categories.expense : categories.income;

  // ── helpers ──────────────────────────────────────────────────────────────

  function saveAll(expense: Category[], income: Category[]) {
    saveMutation.mutate({ expense, income });
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openAddModal(parentPath: string[] = []) {
    setEditingCatId(null);
    setAddParentPath(parentPath);
    setEditName('');
    setEditIcon('📁');
    setEditModalVisible(true);
  }

  function openEditModalForCat(cat: Category) {
    setEditingCatId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon ?? '📁');
    setEditModalVisible(true);
  }

  function handleSaveCategory() {
    if (!editName.trim()) {
      showToast('Category name cannot be empty', 'error');
      return;
    }

    const expense = structuredClone(categories.expense);
    const income = structuredClone(categories.income);
    const target = catType === 'expense' ? expense : income;

    if (editingCatId) {
      updateCategoryInTree(target, editingCatId, editName.trim(), editIcon);
      logger.info(TAG, 'Category updated', { id: editingCatId, name: editName });
    } else {
      const newCat: Category = { id: generateUUID(), name: editName.trim(), icon: editIcon };
      const parent = findOrCreateParentArray(target, addParentPath);
      parent.push(newCat);
      logger.info(TAG, 'Category added', { name: editName, parentPath: addParentPath });
    }

    saveAll(expense, income);
    setEditModalVisible(false);
  }

  function handleDeleteCat(cat: Category) {
    const hasChildren = !!(cat.children && cat.children.length > 0);
    const msg = hasChildren
      ? `Delete "${cat.name}" and all its subcategories?`
      : `Delete "${cat.name}"?`;
    Alert.alert('Delete', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const expense = structuredClone(categories.expense);
          const income = structuredClone(categories.income);
          const target = catType === 'expense' ? expense : income;
          deleteCategoryFromTree(target, cat.id);
          saveAll(expense, income);
          logger.info(TAG, 'Category deleted', { id: cat.id, name: cat.name });
        },
      },
    ]);
  }

  // ── drag handlers ────────────────────────────────────────────────────────

  function handleRootDragEnd({ data }: { data: Category[] }) {
    if (catType === 'expense') {
      saveAll(data, structuredClone(categories.income));
    } else {
      saveAll(structuredClone(categories.expense), data);
    }
  }

  function handleChildDragEnd(parentId: string, newChildren: Category[]) {
    const expense = structuredClone(categories.expense);
    const income = structuredClone(categories.income);
    const target = catType === 'expense' ? expense : income;
    updateChildrenById(target, parentId, newChildren);
    saveAll(expense, income);
  }

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <ScreenContainer style={{ paddingTop: SPACING.sm }}>
      {/* Fixed header */}
      <SegmentedControl<TransactionType>
        options={[
          { label: 'Expense', value: 'expense' },
          { label: 'Income', value: 'income' },
        ]}
        selected={catType}
        onSelect={(v) => {
          setCatType(v);
          setExpandedIds(new Set());
        }}
      />

      <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>All Categories</Text>
      <Text style={[styles.sectionHint, { color: theme.text.tertiary }]}>
        Long press ☰ to drag & reorder. Tap ▼ to expand subcategories.
      </Text>

      {/* Scrollable content with nested drag support */}
      <NestableScrollContainer contentContainerStyle={styles.scrollContent}>
        {/* ── Level 1: root categories ── */}
        <NestableDraggableFlatList
          data={topLevelItems}
          keyExtractor={(item) => item.id}
          onDragEnd={handleRootDragEnd}
          dragItemOverflow
          renderItem={({ item, drag, isActive }: RenderItemParams<Category>) => {
            const hasChildren = !!(item.children && item.children.length > 0);
            const isExpanded = expandedIds.has(item.id);

            return (
              <View style={[
                styles.l1Card,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
                isActive && { backgroundColor: `${theme.primary}15`, borderColor: theme.primary, elevation: 6 },
              ]}>
                {/* Root row */}
                <View style={styles.row}>
                  <TouchableOpacity
                    onLongPress={drag}
                    delayLongPress={150}
                    disabled={isActive}
                    style={styles.dragHandle}
                    activeOpacity={0.5}
                  >
                    <Ionicons name="menu" size={20} color={isActive ? theme.primary : theme.text.tertiary} />
                  </TouchableOpacity>

                  <Text style={styles.l1Icon}>{item.icon ?? '📁'}</Text>

                  <View style={styles.info}>
                    <Text style={[styles.l1Name, { color: theme.text.primary }]}>{item.name}</Text>
                    {hasChildren && (
                      <Text style={[styles.count, { color: theme.text.tertiary }]}>
                        {item.children!.length} subcategories
                      </Text>
                    )}
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModalForCat(item)}>
                      <Ionicons name="create-outline" size={20} color={theme.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openAddModal([item.name])}>
                      <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                    </TouchableOpacity>
                    {hasChildren && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => toggleExpand(item.id)}>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={theme.text.secondary}
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteCat(item)}>
                      <Ionicons name="trash-outline" size={20} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── Level 2: expanded children ── */}
                {isExpanded && hasChildren && (
                  <View style={[styles.l2Container, { borderTopColor: theme.divider, backgroundColor: theme.background }]}>
                    <NestableDraggableFlatList
                      data={item.children!}
                      keyExtractor={(child) => child.id}
                      onDragEnd={({ data }) => handleChildDragEnd(item.id, data)}
                      renderItem={({ item: child, drag: childDrag, isActive: childActive }: RenderItemParams<Category>) => {
                        const childHasKids = !!(child.children && child.children.length > 0);
                        const childExpanded = expandedIds.has(child.id);
                        const canAddL3 = MAX_DEPTH > 2;

                        return (
                          <View style={[
                            styles.l2Card,
                            { borderBottomColor: theme.divider },
                            childActive && { backgroundColor: `${theme.primary}15` },
                          ]}>
                            <View style={styles.row}>
                              <TouchableOpacity
                                onLongPress={childDrag}
                                delayLongPress={150}
                                disabled={childActive}
                                style={styles.dragHandle}
                                activeOpacity={0.5}
                              >
                                <Ionicons name="menu" size={18} color={childActive ? theme.primary : theme.text.tertiary} />
                              </TouchableOpacity>

                              <Text style={styles.l2Icon}>{child.icon ?? '📁'}</Text>

                              <View style={styles.info}>
                                <Text style={[styles.l2Name, { color: theme.text.primary }]}>{child.name}</Text>
                                {childHasKids && (
                                  <Text style={[styles.count, { color: theme.text.tertiary }]}>
                                    {child.children!.length} subcategories
                                  </Text>
                                )}
                              </View>

                              <View style={styles.actions}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModalForCat(child)}>
                                  <Ionicons name="create-outline" size={18} color={theme.text.secondary} />
                                </TouchableOpacity>
                                {canAddL3 && (
                                  <TouchableOpacity style={styles.actionBtn} onPress={() => openAddModal([item.name, child.name])}>
                                    <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                                  </TouchableOpacity>
                                )}
                                {childHasKids && (
                                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleExpand(child.id)}>
                                    <Ionicons
                                      name={childExpanded ? 'chevron-up' : 'chevron-down'}
                                      size={18}
                                      color={theme.text.secondary}
                                    />
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteCat(child)}>
                                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* ── Level 3: grandchildren ── */}
                            {childExpanded && childHasKids && (
                              <View style={[styles.l3Container, { borderTopColor: theme.divider, backgroundColor: theme.background }]}>
                                <NestableDraggableFlatList
                                  data={child.children!}
                                  keyExtractor={(gc) => gc.id}
                                  onDragEnd={({ data }) => handleChildDragEnd(child.id, data)}
                                  renderItem={({ item: gc, drag: gcDrag, isActive: gcActive }: RenderItemParams<Category>) => (
                                    <View style={[
                                      styles.l3Card,
                                      { borderBottomColor: theme.divider },
                                      gcActive && { backgroundColor: `${theme.primary}15` },
                                    ]}>
                                      <View style={styles.row}>
                                        <TouchableOpacity
                                          onLongPress={gcDrag}
                                          delayLongPress={150}
                                          disabled={gcActive}
                                          style={styles.dragHandle}
                                          activeOpacity={0.5}
                                        >
                                          <Ionicons name="menu" size={16} color={gcActive ? theme.primary : theme.text.tertiary} />
                                        </TouchableOpacity>

                                        <Text style={styles.l2Icon}>{gc.icon ?? '📁'}</Text>

                                        <View style={styles.info}>
                                          <Text style={[styles.l2Name, { color: theme.text.primary }]}>{gc.name}</Text>
                                        </View>

                                        <View style={styles.actions}>
                                          <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModalForCat(gc)}>
                                            <Ionicons name="create-outline" size={18} color={theme.text.secondary} />
                                          </TouchableOpacity>
                                          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteCat(gc)}>
                                            <Ionicons name="trash-outline" size={18} color={theme.error} />
                                          </TouchableOpacity>
                                        </View>
                                      </View>
                                    </View>
                                  )}
                                />
                              </View>
                            )}
                          </View>
                        );
                      }}
                    />
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>No categories yet</Text>
            </View>
          }
        />

        {/* Add root category button */}
        <View style={styles.addRow}>
          <Button title="+ Add Category" onPress={() => openAddModal([])} variant="primary" />
        </View>
      </NestableScrollContainer>

      {/* ── Edit / Add Modal ── */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
              {editingCatId ? 'Edit Category' : 'New Category'}
            </Text>

            {!editingCatId && addParentPath.length > 0 && (
              <Text style={[styles.modalSubtitle, { color: theme.primary }]}>
                Adding under: {addParentPath.join(' > ')}
              </Text>
            )}

            <TextInput
              style={[styles.modalInput, {
                borderColor: theme.border,
                color: theme.text.primary,
                backgroundColor: theme.background,
              }]}
              placeholder="Category name"
              placeholderTextColor={theme.text.tertiary}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />

            <Text style={[styles.iconLabel, { color: theme.text.secondary }]}>Choose icon:</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <RNTouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    { borderColor: theme.border },
                    editIcon === icon && { borderColor: theme.primary, backgroundColor: `${theme.primary}15` },
                  ]}
                  onPress={() => setEditIcon(icon)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </RNTouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setEditModalVisible(false)}
              />
              <Button title="Save" onPress={handleSaveCategory} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ── Tree helpers ────────────────────────────────────────────────────────────

function updateCategoryInTree(items: Category[], id: string, name: string, icon: string): boolean {
  for (const cat of items) {
    if (cat.id === id) {
      cat.name = name;
      cat.icon = icon;
      return true;
    }
    if (cat.children && updateCategoryInTree(cat.children, id, name, icon)) return true;
  }
  return false;
}

function deleteCategoryFromTree(items: Category[], id: string): boolean {
  const idx = items.findIndex((c) => c.id === id);
  if (idx !== -1) {
    items.splice(idx, 1);
    return true;
  }
  for (const cat of items) {
    if (cat.children && deleteCategoryFromTree(cat.children, id)) return true;
  }
  return false;
}

/** Navigate the tree by path, creating children arrays as needed. */
function findOrCreateParentArray(items: Category[], path: string[]): Category[] {
  let current = items;
  for (const name of path) {
    const found = current.find((c) => c.name === name);
    if (found) {
      if (!found.children) found.children = [];
      current = found.children;
    } else {
      break;
    }
  }
  return current;
}

/** Find a category by ID and replace its children array. */
function updateChildrenById(items: Category[], parentId: string, newChildren: Category[]): boolean {
  for (const cat of items) {
    if (cat.id === parentId) {
      cat.children = newChildren;
      return true;
    }
    if (cat.children && updateChildrenById(cat.children, parentId, newChildren)) return true;
  }
  return false;
}

export default function CategoryEditWithBoundary() {
  return (
    <ErrorBoundary screenName="CategoryEdit">
      <CategoryEditScreen />
    </ErrorBoundary>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  sectionHint: {
    fontSize: FONT_SIZE.xs,
    marginBottom: SPACING.sm,
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },

  // ── Shared row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHandle: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  count: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: SPACING.xs },
  actionBtn: { padding: SPACING.xs },

  // ── Level 1: root cards ──
  l1Card: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  l1Icon: { fontSize: 24, marginRight: SPACING.md },
  l1Name: { fontSize: FONT_SIZE.md, fontWeight: '600' },

  // ── Level 2: children ──
  l2Container: {
    borderTopWidth: 1,
    marginTop: SPACING.xs,
    paddingLeft: SPACING.lg,
  },
  l2Card: {
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.xs,
    borderBottomWidth: 1,
  },
  l2Icon: { fontSize: 18, marginRight: SPACING.sm },
  l2Name: { fontSize: FONT_SIZE.sm, fontWeight: '500' },

  // ── Level 3: grandchildren ──
  l3Container: {
    borderTopWidth: 1,
    marginTop: SPACING.xs,
    paddingLeft: SPACING.lg,
  },
  l3Card: {
    paddingVertical: SPACING.xs,
    paddingRight: SPACING.xs,
    borderBottomWidth: 1,
  },

  // ── Empty + add ──
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyText: { fontSize: FONT_SIZE.md },
  addRow: { paddingVertical: SPACING.md },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  modalSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    marginBottom: SPACING.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.lg,
  },
  iconLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  iconOption: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  iconText: { fontSize: 20 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
});
