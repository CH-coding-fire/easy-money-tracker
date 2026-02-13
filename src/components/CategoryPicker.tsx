import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Category } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/spacing';
import { Button } from './Button';

interface CategoryPickerProps {
  categories: Category[];
  selectedPath: string[];
  onSelect: (path: string[]) => void;
  frequentCategories?: string[][]; // quick-pick paths
  onEditFrequent?: () => void;
}

export function CategoryPicker({
  categories,
  selectedPath,
  onSelect,
  frequentCategories = [],
  onEditFrequent,
}: CategoryPickerProps) {
  const [drillStack, setDrillStack] = useState<{ items: Category[]; path: string[] }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const selectedLabel = selectedPath.length > 0 ? selectedPath.join(' > ') : 'Select category';

  function openPicker() {
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
      {/* Frequent category shortcuts */}
      {frequentCategories.length > 0 && (
        <View style={styles.frequentRow}>
          {frequentCategories.map((path, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.frequentChip,
                selectedPath.join('>') === path.join('>') && styles.frequentChipActive,
              ]}
              onPress={() => onSelect(path)}
            >
              <Text
                style={[
                  styles.frequentLabel,
                  selectedPath.join('>') === path.join('>') && styles.frequentLabelActive,
                ]}
                numberOfLines={1}
              >
                {path[path.length - 1]}
              </Text>
            </TouchableOpacity>
          ))}
          {onEditFrequent && (
            <TouchableOpacity style={styles.editFreqBtn} onPress={onEditFrequent}>
              <Ionicons name="create-outline" size={16} color="#1565C0" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main picker button */}
      <TouchableOpacity style={styles.pickerButton} onPress={openPicker}>
        <Text style={[styles.pickerText, !selectedPath.length && { color: '#999' }]}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#999" style={{ marginLeft: SPACING.sm }} />
      </TouchableOpacity>

      {/* Drill-down modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name={drillStack.length > 1 ? 'chevron-back' : 'close'}
                size={20}
                color="#2196F3"
              />
              <Text style={styles.backButton}>
                {drillStack.length > 1 ? 'Back' : 'Close'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {currentPath.length > 0 ? currentPath.join(' > ') : 'Select Category'}
            </Text>
          </View>

          <FlatList
            data={currentItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryRow}
                onPress={() => handleSelectCategory(item)}
              >
                <Text style={styles.categoryIcon}>{item.icon ?? '📁'}</Text>
                <Text style={styles.categoryName}>{item.name}</Text>
                {item.children && item.children.length > 0 && (
                  <Text style={styles.drillIndicator}>›</Text>
                )}
                {(!item.children || item.children.length === 0) && (
                  <View style={styles.selectBadge}>
                    <Text style={styles.selectBadgeText}>Select</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          {/* If at subcategory level, allow selecting the parent directly */}
          {drillStack.length > 1 && (
            <View style={styles.selectParentRow}>
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
    marginBottom: SPACING.sm,
  },
  frequentChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#E3F2FD',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  frequentChipActive: {
    borderColor: '#2196F3',
    backgroundColor: '#BBDEFB',
  },
  frequentLabel: {
    fontSize: FONT_SIZE.xs,
    color: '#1565C0',
  },
  frequentLabelActive: {
    fontWeight: '700',
  },
  editFreqBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#fff',
  },
  pickerText: {
    fontSize: FONT_SIZE.md,
    color: '#222',
    flex: 1,
  },
  // chevron replaced by Ionicons inline
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: FONT_SIZE.md,
    color: '#2196F3',
    fontWeight: '600',
    marginRight: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: '#222',
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#fff',
  },
  categoryIcon: {
    fontSize: 22,
    marginRight: SPACING.md,
  },
  categoryName: {
    fontSize: FONT_SIZE.md,
    color: '#222',
    flex: 1,
  },
  drillIndicator: {
    fontSize: 22,
    color: '#999',
    fontWeight: '300',
  },
  selectBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  selectBadgeText: {
    fontSize: FONT_SIZE.xs,
    color: '#2E7D32',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 56,
  },
  selectParentRow: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
});
