import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSettings } from '../../src/hooks/useSettings';
import { useTheme } from '../../src/hooks/useTheme';
import { useI18n } from '../../src/hooks/useI18n';
import { useAppData } from '../../src/hooks/useTransactions';

export default function TabLayout() {
  const router = useRouter();
  const { data, isLoading } = useAppData();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    if (!isLoading && data && !data.settings.onboardingComplete) {
      router.replace('/onboarding');
    }
  }, [isLoading, data]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.text.tertiary,
        tabBarStyle: {
          paddingBottom: Math.max(insets.bottom, 4),
          height: 56 + Math.max(insets.bottom, 4),
          backgroundColor: theme.cardBackground,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="records"
        options={{
          title: t('tab.records'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: t('tab.stats'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('add.expense'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'arrow-down-circle' : 'arrow-down-circle-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-income"
        options={{
          title: t('add.income'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'arrow-up-circle' : 'arrow-up-circle-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab.settings'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
