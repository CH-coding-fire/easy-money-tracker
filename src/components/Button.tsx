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
import { useTheme } from '../hooks/useTheme';

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
  const theme = useTheme();
  const sz = SIZES[size];

  // Dynamic colors based on theme and variant
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return { bg: theme.primary, text: '#fff', border: theme.primary };
      case 'secondary':
        return { bg: `${theme.primary}20`, text: theme.primary, border: `${theme.primary}20` };
      case 'outline':
        return { bg: 'transparent', text: theme.primary, border: theme.primary };
      case 'ghost':
        return { bg: 'transparent', text: theme.primary, border: 'transparent' };
      case 'danger':
        return { bg: theme.error, text: '#fff', border: theme.error };
    }
  };

  const color = getColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={title}
      accessibilityRole="button"
      style={[
        styles.base,
        {
          backgroundColor: disabled ? theme.border : color.bg,
          borderColor: disabled ? theme.border : color.border,
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
              { color: disabled ? theme.text.tertiary : color.text, fontSize: sz.fontSize },
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
