import React from 'react';
import { LayoutChangeEvent, View, ViewStyle } from 'react-native';
import { SPACING, BORDER_RADIUS } from '../constants/spacing';
import { useTheme } from '../hooks/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onLayout?: (event: LayoutChangeEvent) => void;
}

export function Card({ children, style, onLayout }: CardProps) {
  const theme = useTheme();
  
  return (
    <View
      onLayout={onLayout}
      style={[
        {
          backgroundColor: theme.cardBackground,
          borderRadius: BORDER_RADIUS.lg,
          padding: SPACING.lg,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
