import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';

import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { DebugPanel } from '../../src/components/DebugPanel';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

import { useSettings, useSaveSettings } from '../../src/hooks/useSettings';
import { exportData, importData } from '../../src/services/exportService';
import { LANGUAGES } from '../../src/constants/languages';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants/spacing';
import { logger } from '../../src/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../../src/store/uiStore';

const TAG = 'SettingsScreen';

function SettingsScreen() {
  const router = useRouter();
  const settings = useSettings();
  const saveMutation = useSaveSettings();
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  const [showLangPicker, setShowLangPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportData();
      logger.info(TAG, 'Export successful');
      showToast('Export successful!', 'success');
    } catch (err: any) {
      logger.error(TAG, 'Export failed', err);
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        setImporting(false);
        return;
      }

      const fileUri = result.assets[0].uri;
      const jsonString = await FileSystem.readAsStringAsync(fileUri);
      await importData(jsonString);
      qc.invalidateQueries({ queryKey: ['appData'] });
      showToast('Import successful! Data restored.', 'success');
      logger.info(TAG, 'Import successful');
    } catch (err: any) {
      logger.error(TAG, 'Import failed', err);
      showToast(`Import failed: ${err.message}`, 'error');
    } finally {
      setImporting(false);
    }
  }

  function handleLanguageSelect(code: string) {
    logger.info(TAG, 'Language changed', { code });
    saveMutation.mutate({ language: code });
    setShowLangPicker(false);
  }

  const selectedLang = LANGUAGES.find((l) => l.code === settings.language)?.label ?? settings.language;

  return (
    <ScreenContainer padBottom={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Settings</Text>

        {/* Language */}
        <Card style={styles.settingCard}>
          <Text style={styles.settingLabel}>Language</Text>
          <TouchableOpacity style={styles.settingValue} onPress={() => setShowLangPicker(true)}>
            <Text style={styles.valueText}>{selectedLang}</Text>
            <Ionicons name="chevron-down" size={16} color="#999" />
          </TouchableOpacity>
        </Card>

        {/* Currency */}
        <Card style={styles.settingCard}>
          <Text style={styles.settingLabel}>Default Currency</Text>
          <TouchableOpacity style={styles.settingValue} onPress={() => router.push('/currency-tags')}>
            <Text style={styles.valueText}>{settings.mainCurrency}</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        </Card>

        {/* Categories */}
        <Card style={styles.settingCard}>
          <Text style={styles.settingLabel}>Categories</Text>
          <TouchableOpacity style={styles.settingValue} onPress={() => router.push('/category-edit')}>
            <Text style={styles.valueText}>Edit Categories</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        </Card>

        {/* Frequent Categories */}
        <Card style={styles.settingCard}>
          <Text style={styles.settingLabel}>Frequent Categories</Text>
          <TouchableOpacity style={styles.settingValue} onPress={() => router.push('/frequent-categories')}>
            <Text style={styles.valueText}>Edit Frequent Categories</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        </Card>

        {/* Week starts on */}
        <Card style={styles.settingCard}>
          <Text style={styles.settingLabel}>Week Starts On</Text>
          <View style={styles.weekRow}>
            {(['monday', 'sunday'] as const).map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.weekBtn, settings.weekStartsOn === day && styles.weekBtnActive]}
                onPress={() => saveMutation.mutate({ weekStartsOn: day })}
              >
                <Text style={[styles.weekBtnText, settings.weekStartsOn === day && styles.weekBtnTextActive]}>
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Export/Import */}
        <Card style={styles.settingCard}>
          <Text style={styles.settingLabel}>Data</Text>
          <View style={styles.dataRow}>
            <Button
              title="Export"
              variant="outline"
              size="sm"
              onPress={handleExport}
              loading={exporting}
              style={{ flex: 1 }}
            />
            <Button
              title="Import"
              variant="outline"
              size="sm"
              onPress={handleImport}
              loading={importing}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        {/* Debug mode toggle */}
        <Card style={styles.settingCard}>
          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => saveMutation.mutate({ debugMode: !settings.debugMode })}
          >
            <Text style={styles.settingLabel}>Debug Mode</Text>
            <View style={[styles.toggle, settings.debugMode && styles.toggleActive]}>
              <View style={[styles.toggleKnob, settings.debugMode && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Debug panel + replay onboarding */}
        {settings.debugMode && (
          <>
            <Card style={styles.settingCard}>
              <Text style={styles.settingLabel}>Developer Tools</Text>
              <Button
                title="Replay Onboarding Flow"
                variant="outline"
                size="sm"
                onPress={() => {
                  saveMutation.mutate({ onboardingComplete: false });
                  logger.info(TAG, 'Replaying onboarding flow');
                  router.replace('/onboarding');
                }}
              />
            </Card>
            <DebugPanel />
          </>
        )}

      </ScrollView>

      {/* Language picker modal */}
      <Modal visible={showLangPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langRow,
                    settings.language === item.code && styles.langRowActive,
                  ]}
                  onPress={() => handleLanguageSelect(item.code)}
                >
                  <Text style={styles.langText}>
                    {item.label === item.nativeName ? item.label : `${item.label} ${item.nativeName}`}
                  </Text>
                  {settings.language === item.code && (
                    <Ionicons name="checkmark" size={20} color="#2196F3" />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 400 }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowLangPicker(false)}
              style={{ marginTop: SPACING.md }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

export default function SettingsWithBoundary() {
  return (
    <ErrorBoundary screenName="Settings">
      <SettingsScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: '#222',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  settingCard: { marginBottom: SPACING.md },
  settingLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: '#555', marginBottom: SPACING.xs },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  valueText: { fontSize: FONT_SIZE.md, color: '#222' },
  // chevron replaced by Ionicons inline
  weekRow: { flexDirection: 'row', gap: SPACING.sm },
  weekBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#f0f0f0',
  },
  weekBtnActive: { backgroundColor: '#2196F3' },
  weekBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: '#555' },
  weekBtnTextActive: { color: '#fff' },
  dataRow: { flexDirection: 'row', gap: SPACING.sm },
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: '#2196F3' },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: '#222',
    marginBottom: SPACING.lg,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  langRowActive: { backgroundColor: '#E3F2FD' },
  langText: { fontSize: FONT_SIZE.md, color: '#222' },
  // langCheck replaced by Ionicons inline
});
