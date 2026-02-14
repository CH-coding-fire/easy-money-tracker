import React, { forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../constants/spacing';
import { useTheme } from '../hooks/useTheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerStyle, style, ...rest }, ref) => {
    const theme = useTheme();
    
    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={[styles.label, { color: theme.text.primary }]}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              borderColor: error ? theme.error : theme.border,
              color: theme.text.primary,
              backgroundColor: theme.cardBackground,
            },
            style,
          ]}
          placeholderTextColor={theme.text.tertiary}
          accessibilityLabel={label}
          {...rest}
        />
        {error && <Text style={[styles.error, { color: theme.error }]}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
  },
  error: {
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
  },
});
