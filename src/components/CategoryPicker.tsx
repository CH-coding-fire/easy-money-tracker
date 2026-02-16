import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Category } from '../types';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/spacing';
import { useTheme } from '../hooks/useTheme';
import { useCategoryPickerStore } from '../store/categoryPickerStore';
import { UNCLASSIFIED_NAME } from '../utils/categoryHelpers';

/**
 * Display label for a frequent category path.
 * When the path ends with "Uncategorized", show the parent name instead
 * (e.g. ["Utilities", "Uncategorized"] → "Utilities") to save space.
 */
function frequentDisplayLabel(path: string[]): string {
  if (path.length > 1 && path[path.length - 1] === UNCLASSIFIED_NAME) {
    return path[path.length - 2];
  }
  return path[path.length - 1];
}

/**
 * Check if a category path points to a parent that has children.
 * If so, auto-resolve it to include "Uncategorized" as the subcategory.
 */
function resolveFrequentPath(path: string[], categories: Category[]): string[] {
  let items = categories;
  for (let i = 0; i < path.length; i++) {
    const found = items.find((c) => c.name === path[i]);
    if (!found) return path; // path not found in tree, return as-is
    // If this is the last segment and the category has children,
    // the user should have picked a subcategory — default to "Uncategorized"
    if (i === path.length - 1 && found.children && found.children.length > 0) {
      return [...path, UNCLASSIFIED_NAME];
    }
    items = found.children ?? [];
  }
  return path;
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
  const router = useRouter();
  const setup = useCategoryPickerStore((s) => s.setup);

  const selectedLabel = selectedPath.length > 0 ? selectedPath.join(' > ') : 'Select category';

  const openPicker = useCallback(() => {
    Keyboard.dismiss();
    // Store all data in the picker store so the route can access it
    setup({
      categories,
      selectedPath,
      frequentCategories,
      onSelect,
      onEditFrequent,
      onEditCategories,
    });
    // Navigate to the full-screen category picker
    router.push('/select-category');
  }, [categories, selectedPath, frequentCategories, onSelect, onEditFrequent, onEditCategories, setup, router]);

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
          {frequentCategories.map((rawPath, i) => {
            // Auto-resolve parent-only paths (backward compat): ["Utilities"] → ["Utilities", "Uncategorized"]
            const path = resolveFrequentPath(rawPath, categories);
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
                  {frequentDisplayLabel(path)}
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
});
