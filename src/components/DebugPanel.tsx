import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/spacing';
import { clearAllData, loadAppData } from '../services/storage';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../hooks/useTheme';

export function DebugPanel() {
  const theme = useTheme();
  const [storageContents, setStorageContents] = useState<string>('');
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  async function handleViewStorage() {
    const data = await loadAppData();
    setStorageContents(JSON.stringify(data, null, 2));
    setExpanded(true);
  }

  async function handleClearData() {
    Alert.alert('Clear All Data', 'This will delete everything. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearAllData();
          qc.invalidateQueries({ queryKey: ['appData'] });
          setStorageContents('');
          Alert.alert('Done', 'All data cleared. Restart the app.');
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: `${theme.warning}15`, borderColor: `${theme.warning}40` }]}>
      <Text style={[styles.title, { color: theme.warning }]}>🛠️ Debug Panel</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={handleViewStorage}
        >
          <Text style={[styles.btnText, { color: theme.text.primary }]}>View Storage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.cardBackground, borderColor: theme.error }]}
          onPress={handleClearData}
        >
          <Text style={[styles.btnText, { color: theme.error }]}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      {expanded && storageContents.length > 0 && (
        <ScrollView style={[styles.storageView, { backgroundColor: theme.cardBackground }]} nestedScrollEnabled>
          <Text style={[styles.storageText, { color: theme.text.secondary }]}>{storageContents}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  storageView: {
    maxHeight: 300,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  storageText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
