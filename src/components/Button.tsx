import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/spacing';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const COLORS: Record<Variant, { bg: string; text: string; border: string }> = {
  primary: { bg: '#2196F3', text: '#fff', border: '#2196F3' },
  secondary: { bg: '#E3F2FD', text: '#1565C0', border: '#E3F2FD' },
  outline: { bg: 'transparent', text: '#2196F3', border: '#2196F3' },
  ghost: { bg: 'transparent', text: '#2196F3', border: 'transparent' },
  danger: { bg: '#F44336', text: '#fff', border: '#F44336' },
};

const SIZES: Record<Size, { paddingV: number; paddingH: number; fontSize: number }> = {
  sm: { paddingV: SPACING.xs, paddingH: SPACING.md, fontSize: FONT_SIZE.sm },
  md: { paddingV: SPACING.sm, paddingH: SPACING.lg, fontSize: FONT_SIZE.md },
  lg: { paddingV: SPACING.md, paddingH: SPACING.xl, fontSize: FONT_SIZE.lg },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
}: ButtonProps) {
  const color = COLORS[variant];
  const sz = SIZES[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={title}
      accessibilityRole="button"
      style={[
        styles.base,
        {
          backgroundColor: disabled ? '#ccc' : color.bg,
          borderColor: disabled ? '#ccc' : color.border,
          paddingVertical: sz.paddingV,
          paddingHorizontal: sz.paddingH,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: disabled ? '#888' : color.text, fontSize: sz.fontSize },
              icon ? { marginLeft: SPACING.xs } : undefined,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
  },
});
