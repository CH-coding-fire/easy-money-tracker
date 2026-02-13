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

export function DebugPanel() {
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
    <View style={styles.container}>
      <Text style={styles.title}>🛠️ Debug Panel</Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={handleViewStorage}>
          <Text style={styles.btnText}>View Storage</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.dangerBtn]} onPress={handleClearData}>
          <Text style={[styles.btnText, styles.dangerText]}>Clear All Data</Text>
        </TouchableOpacity>
      </View>

      {expanded && storageContents.length > 0 && (
        <ScrollView style={styles.storageView} nestedScrollEnabled>
          <Text style={styles.storageText}>{storageContents}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E1',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: '#F57F17',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  dangerBtn: {
    borderColor: '#F44336',
  },
  btnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#333',
  },
  dangerText: {
    color: '#F44336',
  },
  storageView: {
    maxHeight: 300,
    marginTop: SPACING.md,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  storageText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#333',
  },
});
