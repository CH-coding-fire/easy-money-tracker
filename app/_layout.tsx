import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import { Toast } from '../src/components/Toast';
import { useUIStore } from '../src/store/uiStore';
import * as SystemUI from 'expo-system-ui';
import { useTheme } from '../src/hooks/useTheme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: Infinity },
  },
});

function RootLayoutInner() {
  const { toast, hideToast } = useUIStore();
  const theme = useTheme();

  // Determine if we're in a dark-ish theme
  const isDark = theme.background !== '#F5F5F5' && theme.background !== '#FFF5F7';

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(theme.background);
    }
  }, [theme.background]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="category-edit"
          options={{
            headerShown: true,
            title: 'Edit Categories',
            headerStyle: { backgroundColor: theme.cardBackground },
            headerTintColor: theme.text.primary,
          }}
        />
        <Stack.Screen
          name="currency-tags"
          options={{
            headerShown: true,
            title: 'Currency Settings',
            headerStyle: { backgroundColor: theme.cardBackground },
            headerTintColor: theme.text.primary,
          }}
        />
        <Stack.Screen
          name="frequent-categories"
          options={{
            headerShown: true,
            title: 'Frequent Categories',
            headerStyle: { backgroundColor: theme.cardBackground },
            headerTintColor: theme.text.primary,
          }}
        />
        <Stack.Screen
          name="select-category"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="edit-transaction"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={6000}
          onHide={hideToast}
        />
      )}
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
