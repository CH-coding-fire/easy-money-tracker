import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/spacing';
import { useTheme } from '../hooks/useTheme';

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
  const theme = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.border }]}>
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => !disabled && onSelect(opt.value)}
            style={[
              styles.segment,
              isActive && { 
                backgroundColor: theme.cardBackground,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 5,
                elevation: 2,
              },
              disabled && isActive && styles.segmentActiveDisabled,
            ]}
            accessibilityLabel={opt.label}
            accessibilityRole="button"
            disabled={disabled}
          >
            <Text style={[
              styles.label,
              { color: theme.text.secondary },
              isActive && { color: theme.primary, fontWeight: '700' },
            ]}>
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
    borderRadius: BORDER_RADIUS.md,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md - 2,
  },
  segmentActiveDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
});
