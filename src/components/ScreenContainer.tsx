import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../constants/spacing';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padBottom?: boolean;
}

export function ScreenContainer({ children, style, padBottom = true }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + SPACING.sm,
          paddingBottom: padBottom ? insets.bottom + SPACING.sm : 0,
          paddingLeft: insets.left + SPACING.lg,
          paddingRight: insets.right + SPACING.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});
