import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  Keyboard,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Category } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/spacing';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';

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

  const selectedLabel = selectedPath.length > 0 ? selectedPath.join(' > ') : 'Select category';

  function openPicker() {
    Keyboard.dismiss();
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

  function selectCurrentLevel(cat: Category) {
    // Allow selecting a non-leaf if user taps the "Select" button
    const currentLevel = drillStack[drillStack.length - 1];
    const newPath = [...currentLevel.path, cat.name];
    onSelect(newPath);
    setModalVisible(false);
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

          <FlatList
            data={currentItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryRow, { backgroundColor: theme.cardBackground }]}
                onPress={() => handleSelectCategory(item)}
              >
                <Text style={styles.categoryIcon}>{item.icon ?? '📁'}</Text>
                <Text style={[styles.categoryName, { color: theme.text.primary }]}>{item.name}</Text>
                {item.children && item.children.length > 0 && (
                  <Text style={[styles.drillIndicator, { color: theme.text.tertiary }]}>›</Text>
                )}
                {(!item.children || item.children.length === 0) && (
                  <View style={[styles.selectBadge, { backgroundColor: `${theme.success}20` }]}>
                    <Text style={[styles.selectBadgeText, { color: theme.success }]}>Select</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.divider }]} />}
          />

          {/* If at subcategory level, allow selecting the parent directly */}
          {drillStack.length > 1 && (
            <View style={[styles.selectParentRow, { borderTopColor: theme.border, backgroundColor: theme.cardBackground }]}>
              <Button
                title={`Select "${currentPath[currentPath.length - 1]}"`}
                variant="outline"
                onPress={() => {
                  onSelect(currentPath);
                  setModalVisible(false);
                }}
              />
            </View>
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
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
  drillIndicator: {
    fontSize: 22,
    fontWeight: '300',
  },
  selectBadge: {
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  selectBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginLeft: 56,
  },
  selectParentRow: {
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
});
