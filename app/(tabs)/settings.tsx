import React, { useState, useRef, useEffect } from 'react';
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
import { useTheme } from '../../src/hooks/useTheme';
import { exportData, importData } from '../../src/services/exportService';
import { LANGUAGES } from '../../src/constants/languages';
import { THEME_OPTIONS } from '../../src/constants/themes';
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
  const theme = useTheme();

  const scrollRef = useRef<ScrollView>(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const prevDebugMode = useRef(settings.debugMode);

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

  function handleThemeSelect(mode: string) {
    logger.info(TAG, 'Theme changed', { mode });
    saveMutation.mutate({ themeMode: mode as any });
    setShowThemePicker(false);
  }

  // Scroll to bottom when debug mode is toggled on
  useEffect(() => {
    if (settings.debugMode && !prevDebugMode.current) {
      // Wait for the debug panel to render, then scroll to end
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevDebugMode.current = settings.debugMode;
  }, [settings.debugMode]);

  const selectedLang = LANGUAGES.find((l) => l.code === settings.language)?.label ?? settings.language;
  const selectedLangFlag = LANGUAGES.find((l) => l.code === settings.language)?.flag ?? '';
  const selectedTheme = THEME_OPTIONS.find((t) => t.mode === settings.themeMode)?.label ?? 'Light';

  return (
    <ScreenContainer padBottom={false}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {/* Language */}
        <Card style={styles.settingCard}>
          <Text style={[styles.settingLabel, { color: theme.text.secondary }]}>Language</Text>
          <TouchableOpacity style={styles.settingValue} onPress={() => setShowLangPicker(true)}>
            <View style={styles.settingValueWithFlag}>
              {selectedLangFlag && <Text style={styles.settingFlag}>{selectedLangFlag}</Text>}
              <Text style={[styles.valueText, { color: theme.text.primary }]}>{selectedLang}</Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </Card>

        {/* Theme */}
        <Card style={styles.settingCard}>
          <Text style={[styles.settingLabel, { color: theme.text.secondary }]}>Theme</Text>
          <TouchableOpacity style={styles.settingValue} onPress={() => setShowThemePicker(true)}>
            <Text style={[styles.valueText, { color: theme.text.primary }]}>{selectedTheme}</Text>
            <Ionicons name="chevron-down" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </Card>

        {/* Currency */}
        <Card style={styles.settingCard}>
          <Text style={[styles.settingLabel, { color: theme.text.secondary }]}>Default Currency</Text>
          <TouchableOpacity style={styles.settingValue} onPress={() => router.push('/currency-tags')}>
            <Text style={[styles.valueText, { color: theme.text.primary }]}>{settings.mainCurrency}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </Card>

        {/* Categories */}
        <Card style={styles.settingCard}>
          <Text style={[styles.settingLabel, { color: theme.text.secondary }]}>Categories</Text>
          <TouchableOpacity style={styles.settingValue} onPress={() => router.push('/category-edit')}>
            <Text style={[styles.valueText, { color: theme.text.primary }]}>Edit Categories</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </Card>

        {/* Frequent Categories */}
        <Card style={styles.settingCard}>
          <Text style={[styles.settingLabel, { color: theme.text.secondary }]}>Frequent Categories</Text>
          <TouchableOpacity style={styles.settingValue} onPress={() => router.push('/frequent-categories')}>
            <Text style={[styles.valueText, { color: theme.text.primary }]}>Edit Frequent Categories</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </Card>

        {/* Week starts on */}
        <Card style={styles.settingCard}>
          <Text style={[styles.settingLabel, { color: theme.text.secondary }]}>Week Starts On</Text>
          <View style={styles.weekRow}>
            {(['monday', 'sunday'] as const).map((day) => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.weekBtn,
                  { backgroundColor: theme.border },
                  settings.weekStartsOn === day && { backgroundColor: theme.primary },
                ]}
                onPress={() => saveMutation.mutate({ weekStartsOn: day })}
              >
                <Text
                  style={[
                    styles.weekBtnText,
                    { color: theme.text.secondary },
                    settings.weekStartsOn === day && styles.weekBtnTextActive,
                  ]}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Export/Import */}
        <Card style={styles.settingCard}>
          <Text style={[styles.settingLabel, { color: theme.text.secondary }]}>Data</Text>
          <Text style={[styles.dataDesc, { color: theme.text.secondary }]}>
            Back up your data or migrate it to another phone.
          </Text>
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
            <Text style={[styles.settingLabel, { color: theme.text.secondary }]}>Debug Mode</Text>
            <View style={[
              styles.toggle,
              { backgroundColor: theme.border },
              settings.debugMode && { backgroundColor: theme.primary },
            ]}>
              <View style={[
                styles.toggleKnob,
                { backgroundColor: theme.cardBackground },
                settings.debugMode && styles.toggleKnobActive,
              ]} />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Debug panel + replay onboarding */}
        {settings.debugMode && (
          <>
            <Card style={styles.settingCard}>
              <Text style={[styles.settingLabel, { color: theme.text.secondary }]}>Developer Tools</Text>
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

      {/* Theme picker modal */}
      <Modal visible={showThemePicker} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Select Theme</Text>
            <FlatList
              data={THEME_OPTIONS}
              keyExtractor={(item) => item.mode}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.themeRow,
                    { borderBottomColor: theme.border },
                    settings.themeMode === item.mode && {
                      backgroundColor: `${theme.primary}20`,
                    },
                  ]}
                  onPress={() => handleThemeSelect(item.mode)}
                >
                  <Ionicons name={item.icon as any} size={24} color={theme.primary} />
                  <View style={styles.themeInfo}>
                    <Text style={[styles.themeLabel, { color: theme.text.primary }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.themeDesc, { color: theme.text.secondary }]}>
                      {item.description}
                    </Text>
                  </View>
                  {settings.themeMode === item.mode && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 500 }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowThemePicker(false)}
              style={{ marginTop: SPACING.md }}
            />
          </View>
        </View>
      </Modal>

      {/* Language picker modal */}
      <Modal visible={showLangPicker} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Select Language</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langRow,
                    { borderBottomColor: theme.border },
                    settings.language === item.code && {
                      backgroundColor: `${theme.primary}20`,
                    },
                  ]}
                  onPress={() => handleLanguageSelect(item.code)}
                >
                  <Text style={styles.langFlag}>{item.flag}</Text>
                  <Text style={[styles.langText, { color: theme.text.primary }]}>
                    {item.label === item.nativeName ? item.label : `${item.label} ${item.nativeName}`}
                  </Text>
                  {settings.language === item.code && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
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
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  settingCard: { marginBottom: SPACING.md },
  settingLabel: { fontSize: FONT_SIZE.sm, fontWeight: '600', marginBottom: SPACING.xs },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  settingValueWithFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  settingFlag: {
    fontSize: 20,
  },
  valueText: { fontSize: FONT_SIZE.md },
  weekRow: { flexDirection: 'row', gap: SPACING.sm },
  weekBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  weekBtnText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  weekBtnTextActive: { color: '#fff' },
  dataDesc: { fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm, opacity: 0.7 },
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
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginBottom: SPACING.lg,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  themeInfo: {
    flex: 1,
  },
  themeLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeDesc: {
    fontSize: FONT_SIZE.xs,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
  },
  langFlag: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  langText: { fontSize: FONT_SIZE.md, flex: 1 },
});
