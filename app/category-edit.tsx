import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
// CRITICAL: Use gesture-handler's TouchableOpacity inside DraggableFlatList
// RN's TouchableOpacity conflicts with gesture-handler and breaks drag
import { TouchableOpacity } from 'react-native-gesture-handler';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import Ionicons from '@expo/vector-icons/Ionicons';
import { generateUUID } from '../src/utils/uuid';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { Button } from '../src/components/Button';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories, useSaveCategories } from '../src/hooks/useCategories';
import { Category, TransactionType, AppData } from '../src/types';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';
import { useUIStore } from '../src/store/uiStore';

const TAG = 'CategoryEditScreen';

const ICON_OPTIONS = [
  '📁', '🍔', '🏠', '💡', '🚗', '🏥', '🛡️', '🏛️', '🎉', '❤️',
  '📚', '💪', '🚬', '🎮', '🛍️', '💄', '👗', '💻', '🔧', '🐾',
  '🤲', '👨‍👩‍👧‍👦', '💰', '💼', '🎁', '🏢', '📈', '🎯', '⭐', '🌟',
];

function CategoryEditScreen() {
  const categories = useCategories();
  const saveMutation = useSaveCategories();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const [catType, setCatType] = useState<TransactionType>('expense');
  const [drillStack, setDrillStack] = useState<{ items: Category[]; path: string[] }[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('📁');
  const [editingCatId, setEditingCatId] = useState<string | null>(null); // null = adding new

  const topLevelItems = catType === 'expense' ? categories.expense : categories.income;
  const currentItems = drillStack.length > 0
    ? drillStack[drillStack.length - 1].items
    : topLevelItems;
  const currentPath = drillStack.length > 0
    ? drillStack[drillStack.length - 1].path
    : [];

  // Deep clone + save
  function saveAll(expense: Category[], income: Category[]) {
    saveMutation.mutate({ expense, income });
  }

  // Navigate into subcategories
  function drillInto(cat: Category) {
    if (cat.children && cat.children.length > 0) {
      setDrillStack([...drillStack, { items: cat.children, path: [...currentPath, cat.name] }]);
    } else {
      showToast(`${cat.name} has no subcategories`, 'info');
    }
  }

  function goBack() {
    if (drillStack.length > 0) {
      setDrillStack(drillStack.slice(0, -1));
    }
  }

  // Add new category
  function openAddModal() {
    setEditingCatId(null);
    setEditName('');
    setEditIcon('📁');
    setEditModalVisible(true);
  }

  // Edit existing
  function openEditModal(cat: Category) {
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
      // Update existing
      updateCategoryInTree(target, editingCatId, editName.trim(), editIcon);
      logger.info(TAG, 'Category updated', { id: editingCatId, name: editName });
    } else {
      // Add new
      const newCat: Category = { id: generateUUID(), name: editName.trim(), icon: editIcon };
      const parent = findParentArray(target, currentPath);
      parent.push(newCat);
      logger.info(TAG, 'Category added', { name: editName, path: currentPath });
    }

    saveAll(expense, income);
    setEditModalVisible(false);
    // Refresh drill stack
    refreshDrillStack(catType === 'expense' ? expense : income);
  }

  function handleDelete(cat: Category) {
    Alert.alert('Delete', `Delete "${cat.name}" and all its subcategories?`, [
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
          refreshDrillStack(catType === 'expense' ? expense : income);
          logger.info(TAG, 'Category deleted', { id: cat.id, name: cat.name });
        },
      },
    ]);
  }

  function refreshDrillStack(items: Category[]) {
    const newStack: { items: Category[]; path: string[] }[] = [];
    let current = items;
    for (const name of currentPath) {
      const found = current.find((c) => c.name === name);
      if (found?.children) {
        newStack.push({ items: found.children, path: [...(newStack[newStack.length - 1]?.path ?? []), name] });
        current = found.children;
      } else {
        break;
      }
    }
    setDrillStack(newStack);
  }

  const handleDragEnd = useCallback(({ data: newData }: { data: Category[] }) => {
    const expense = structuredClone(categories.expense);
    const income = structuredClone(categories.income);
    const target = catType === 'expense' ? expense : income;
    const arr = findParentArray(target, currentPath);
    // Replace contents in-place with the new order
    arr.length = 0;
    arr.push(...newData);
    logger.info(TAG, 'Categories reordered via drag', { path: currentPath, count: newData.length });

    // Optimistically update React Query cache BEFORE async save
    queryClient.setQueryData(['appData'], (old: AppData | undefined) => {
      if (!old) return old;
      return { ...old, categories: { expense, income } };
    });

    saveAll(expense, income);
    refreshDrillStack(catType === 'expense' ? expense : income);
  }, [categories, catType, currentPath, queryClient]);

  const depthLevel = drillStack.length;
  const maxDepth = 3; // can't go deeper than L3
  const canDrill = depthLevel < maxDepth - 1;

  // renderItem for DraggableFlatList — includes all dependencies that the
  // inner callbacks (openEditModal, drillInto, handleDelete) close over so
  // that the rendered rows always use fresh state (drillStack, categories, etc.).
  const renderItem = useCallback(({ item, drag, isActive }: RenderItemParams<Category>) => (
    <View style={[
      styles.catCard,
      isActive && styles.catCardActive,
    ]}>
      <View style={styles.catRow}>
        {/* Drag handle — long press to drag */}
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={150}
          disabled={isActive}
          style={styles.dragHandle}
          activeOpacity={0.5}
        >
          <Ionicons name="menu" size={20} color={isActive ? '#2196F3' : '#bbb'} />
        </TouchableOpacity>
        <Text style={styles.catIcon}>{item.icon ?? '📁'}</Text>
        <View style={styles.catInfo}>
          <Text style={styles.catName}>{item.name}</Text>
          {item.children && (
            <Text style={styles.catCount}>
              {item.children.length} subcategories
            </Text>
          )}
        </View>
        <View style={styles.catActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={20} color="#666" />
          </TouchableOpacity>
          {canDrill && item.children !== undefined && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => drillInto(item)}>
              <Ionicons name="folder-open-outline" size={20} color="#666" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [canDrill, drillStack, categories, catType, currentPath]);

  return (
    <ScreenContainer style={{ paddingTop: SPACING.sm }}>
      {/* Type toggle */}
      <SegmentedControl<TransactionType>
        options={[
          { label: 'Expense', value: 'expense' },
          { label: 'Income', value: 'income' },
        ]}
        selected={catType}
        onSelect={(v) => {
          setCatType(v);
          setDrillStack([]);
        }}
      />

      {/* Breadcrumb */}
      {drillStack.length > 0 && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => setDrillStack([])}>
            <Text style={styles.breadcrumbLink}>Root</Text>
          </TouchableOpacity>
          {currentPath.map((name, i) => (
            <React.Fragment key={i}>
              <Text style={styles.breadcrumbSep}> › </Text>
              <TouchableOpacity onPress={() => setDrillStack(drillStack.slice(0, i + 1))}>
                <Text
                  style={[
                    styles.breadcrumbLink,
                    i === currentPath.length - 1 && styles.breadcrumbActive,
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Back button */}
      {drillStack.length > 0 && (
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chevron-back" size={18} color="#2196F3" />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Category list — draggable */}
      <DraggableFlatList
        data={currentItems}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        renderItem={renderItem}
        containerStyle={styles.listContainer}
        contentContainerStyle={styles.list}
        dragItemOverflow={true}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No categories yet</Text>
          </View>
        }
      />

      {/* Add button */}
      <View style={styles.addRow}>
        <Button title="+ Add Category" onPress={openAddModal} variant="primary" />
      </View>

      {/* Edit/Add Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCatId ? 'Edit Category' : 'New Category'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Category name"
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />

            <Text style={styles.iconLabel}>Choose icon:</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    editIcon === icon && styles.iconOptionActive,
                  ]}
                  onPress={() => setEditIcon(icon)}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </TouchableOpacity>
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

function findParentArray(items: Category[], path: string[]): Category[] {
  let current = items;
  for (const name of path) {
    const found = current.find((c) => c.name === name);
    if (found?.children) {
      current = found.children;
    } else {
      break;
    }
  }
  return current;
}

export default function CategoryEditWithBoundary() {
  return (
    <ErrorBoundary screenName="CategoryEdit">
      <CategoryEditScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    flexWrap: 'wrap',
  },
  breadcrumbLink: { fontSize: FONT_SIZE.sm, color: '#2196F3', fontWeight: '500' },
  breadcrumbSep: { fontSize: FONT_SIZE.sm, color: '#999' },
  breadcrumbActive: { color: '#222', fontWeight: '700' },
  backBtn: { marginTop: SPACING.sm, marginBottom: SPACING.xs },
  backText: { fontSize: FONT_SIZE.md, color: '#2196F3', fontWeight: '600' },
  listContainer: { flex: 1, backgroundColor: 'transparent' },
  list: { paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  catCard: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  catCardActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  catRow: { flexDirection: 'row', alignItems: 'center' },
  dragHandle: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    marginLeft: -SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catIcon: { fontSize: 24, marginRight: SPACING.md },
  catInfo: { flex: 1 },
  catName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#222' },
  catCount: { fontSize: FONT_SIZE.xs, color: '#888', marginTop: 2 },
  catActions: { flexDirection: 'row', gap: SPACING.xs },
  actionBtn: { padding: SPACING.xs },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyText: { fontSize: FONT_SIZE.md, color: '#999' },
  addRow: { paddingVertical: SPACING.md },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: '#222',
    marginBottom: SPACING.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.lg,
  },
  iconLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#555',
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
    borderColor: '#eee',
  },
  iconOptionActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  iconText: { fontSize: 20 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
});
