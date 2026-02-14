import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING } from '../constants/spacing';
import { useTheme } from '../hooks/useTheme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padBottom?: boolean;
  padTop?: boolean;
}

export function ScreenContainer({ children, style, padBottom = true, padTop = true }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.background,
          paddingTop: padTop ? insets.top + SPACING.sm : 0,
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
