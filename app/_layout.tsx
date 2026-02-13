import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import { Toast } from '../src/components/Toast';
import { useUIStore } from '../src/store/uiStore';
import * as SystemUI from 'expo-system-ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: Infinity },
  },
});

export default function RootLayout() {
  const { toast, hideToast } = useUIStore();

  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#ffffff');
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="category-edit"
            options={{ presentation: 'modal', headerShown: true, title: 'Edit Categories' }}
          />
          <Stack.Screen
            name="currency-tags"
            options={{ presentation: 'modal', headerShown: true, title: 'Currency Settings' }}
          />
          <Stack.Screen
            name="frequent-categories"
            options={{ presentation: 'modal', headerShown: true, title: 'Frequent Categories' }}
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
            duration={2000}
            onHide={hideToast}
          />
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
});
