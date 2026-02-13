import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/spacing';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => !disabled && onSelect(opt.value)}
            style={[
              styles.segment,
              isActive && styles.segmentActive,
              disabled && isActive && styles.segmentActiveDisabled,
            ]}
            accessibilityLabel={opt.label}
            accessibilityRole="button"
            disabled={disabled}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: BORDER_RADIUS.md,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md - 2,
  },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentActiveDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    color: '#666',
  },
  labelActive: {
    color: '#2196F3',
    fontWeight: '700',
  },
});
