import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useSettings, useSaveSettings } from '../src/hooks/useSettings';
import { LANGUAGES } from '../src/constants/languages';
import { ALL_CURRENCIES } from '../src/constants/currencies';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';

const TAG = 'OnboardingScreen';

function OnboardingScreen() {
  const router = useRouter();
  const settings = useSettings();
  const saveMutation = useSaveSettings();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0); // 0=lang, 1=currency, 2=preferences, 3=education
  const [selectedLang, setSelectedLang] = useState(settings.language);
  const [selectedCurrency, setSelectedCurrency] = useState(settings.mainCurrency);
  const [secondaryCurrencies, setSecondaryCurrencies] = useState<string[]>(settings.secondaryCurrencies);
  const [selectedWeekStart, setSelectedWeekStart] = useState<'monday' | 'sunday'>(settings.weekStartsOn);

  // Currency picker state
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const filteredCurrencies = currencySearch.trim()
    ? ALL_CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
          c.name.toLowerCase().includes(currencySearch.toLowerCase())
      )
    : ALL_CURRENCIES;

  function nextStep() {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Complete onboarding — navigate only AFTER save succeeds
      saveMutation.mutate(
        {
          ...settings,
          language: selectedLang,
          mainCurrency: selectedCurrency,
          secondaryCurrencies,
          frequentCurrencies: [selectedCurrency, ...secondaryCurrencies.slice(0, 2)],
          weekStartsOn: selectedWeekStart,
          onboardingComplete: true,
        },
        {
          onSuccess: () => {
            logger.info(TAG, 'Onboarding complete', { lang: selectedLang, currency: selectedCurrency, weekStartsOn: selectedWeekStart });
            router.replace('/(tabs)');
          },
        }
      );
    }
  }

  function toggleSecondary(code: string) {
    if (code === selectedCurrency) return; // can't add main as secondary
    setSecondaryCurrencies((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  }

  const mainCurrencyInfo = ALL_CURRENCIES.find((c) => c.code === selectedCurrency);

  return (
    <ScreenContainer>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 80 + Math.max(insets.bottom, SPACING.md) }
        ]}
      >
        {/* Progress dots */}
        <View style={styles.progressRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.dot, step === i && styles.dotActive]} />
          ))}
        </View>

        {/* Step 0: Language */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <Ionicons name="globe-outline" size={56} color="#2196F3" style={{ marginBottom: SPACING.md }} />
            <Text style={styles.title}>Welcome to Easy Money Tracker!</Text>
            <Text style={styles.subtitle}>Choose your language</Text>

            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionRow, selectedLang === item.code && styles.optionRowActive]}
                  onPress={() => setSelectedLang(item.code)}
                >
                  <Text style={styles.optionText}>
                    {item.label === item.nativeName ? item.label : `${item.label} ${item.nativeName}`}
                  </Text>
                  {selectedLang === item.code && <Ionicons name="checkmark" size={20} color="#2196F3" />}
                </TouchableOpacity>
              )}
              style={styles.optionList}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Step 1: Currency */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Ionicons name="wallet-outline" size={56} color="#2196F3" style={{ marginBottom: SPACING.md }} />
            <Text style={styles.title}>Set Your Currency</Text>

            {/* Main currency — dropdown */}
            <Text style={styles.sectionLabel}>Main Currency</Text>
            <TouchableOpacity
              style={styles.currencyDropdown}
              onPress={() => {
                setCurrencySearch('');
                setShowCurrencyDropdown(true);
              }}
            >
              <View style={styles.currencyDropdownContent}>
                <Text style={styles.currencyDropdownSymbol}>
                  {mainCurrencyInfo?.symbol ?? '?'}
                </Text>
                <View>
                  <Text style={styles.currencyDropdownCode}>{selectedCurrency}</Text>
                  <Text style={styles.currencyDropdownName}>{mainCurrencyInfo?.name ?? ''}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {/* Secondary currencies — dropdown */}
            <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>
              Secondary Currencies
            </Text>
            <Text style={styles.sectionHint}>
              Optional. These appear as quick-switch tags in Add &amp; Statistics screens.
            </Text>
            <TouchableOpacity
              style={styles.currencyDropdown}
              onPress={() => {
                setCurrencySearch('');
                setShowSecondaryPicker(true);
              }}
            >
              <View style={styles.currencyDropdownContent}>
                <Ionicons name="add-circle-outline" size={22} color="#2196F3" />
                <Text style={styles.addCurrencyText}>
                  {secondaryCurrencies.length > 0
                    ? `${secondaryCurrencies.length} selected`
                    : 'Add Currency'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Ionicons name="settings-outline" size={56} color="#FF9800" style={{ marginBottom: SPACING.md }} />
            <Text style={styles.title}>Set Your Preferences</Text>
            <Text style={styles.subtitle}>Customize how you view your data</Text>

            <Text style={styles.sectionLabel}>Week Starts On</Text>
            <View style={styles.weekRow}>
              {(['monday', 'sunday'] as const).map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.weekBtn, selectedWeekStart === day && styles.weekBtnActive]}
                  onPress={() => setSelectedWeekStart(day)}
                >
                  <Text style={[styles.weekBtnText, selectedWeekStart === day && styles.weekBtnTextActive]}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Education */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Ionicons name="checkmark-circle-outline" size={56} color="#4CAF50" style={{ marginBottom: SPACING.md }} />
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>Here's what you can do</Text>

            <Card style={styles.featureCard}>
              <Ionicons name="wallet-outline" size={32} color="#2196F3" style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.featureTitle}>Track Expenses & Income</Text>
              <Text style={styles.featureDesc}>
                Quick-add with category shortcuts, multi-level categories, and recurring transactions.
              </Text>
            </Card>

            <Card style={styles.featureCard}>
              <Ionicons name="stats-chart-outline" size={32} color="#4CAF50" style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.featureTitle}>View Statistics</Text>
              <Text style={styles.featureDesc}>
                Pie charts with drill-down, bar charts, and line charts for your balance over time.
              </Text>
            </Card>

            <Card style={styles.featureCard}>
              <Ionicons name="folder-open-outline" size={32} color="#FF9800" style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.featureTitle}>Custom Categories</Text>
              <Text style={styles.featureDesc}>
                Up to 3 levels of categories, fully customizable with icons.
              </Text>
            </Card>

            <Card style={styles.featureCard}>
              <Ionicons name="swap-horizontal-outline" size={32} color="#9C27B0" style={{ marginBottom: SPACING.sm }} />
              <Text style={styles.featureTitle}>Multi-Currency</Text>
              <Text style={styles.featureDesc}>
                Track in any currency with automatic FX conversion for statistics.
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Floating Navigation buttons */}
      <View style={[styles.floatingNavContainer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
        <View style={styles.navRow}>
          {step > 0 && (
            <Button
              title="Back"
              variant="ghost"
              onPress={() => setStep(step - 1)}
              style={{ flex: 1 }}
            />
          )}
          <Button
            title={step === 3 ? 'Get Started' : 'Next'}
            onPress={nextStep}
            style={{ flex: 1 }}
            size="lg"
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
          />
        </View>
      </View>

      {/* Main currency picker modal */}
      <Modal visible={showCurrencyDropdown} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Main Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyDropdown(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search currencies..."
              value={currencySearch}
              onChangeText={setCurrencySearch}
              placeholderTextColor="#999"
              autoFocus
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = selectedCurrency === item.code;
                return (
                  <TouchableOpacity
                    style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                    onPress={() => {
                      setSelectedCurrency(item.code);
                      setSecondaryCurrencies((prev) => prev.filter((c) => c !== item.code));
                      setShowCurrencyDropdown(false);
                    }}
                  >
                    <Text style={styles.pickerSymbol}>{item.symbol}</Text>
                    <View style={styles.pickerInfo}>
                      <Text style={styles.pickerCode}>{item.code}</Text>
                      <Text style={styles.pickerName}>{item.name}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color="#2196F3" />}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: SPACING.lg }}
            />
          </View>
        </View>
      </Modal>

      {/* Secondary currency picker modal */}
      <Modal visible={showSecondaryPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Secondary Currencies</Text>
              <TouchableOpacity onPress={() => setShowSecondaryPicker(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search currencies..."
              value={currencySearch}
              onChangeText={setCurrencySearch}
              placeholderTextColor="#999"
              autoFocus
            />
            <FlatList
              data={filteredCurrencies.filter((c) => c.code !== selectedCurrency)}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isChecked = secondaryCurrencies.includes(item.code);
                return (
                  <TouchableOpacity
                    style={[styles.pickerRow, isChecked && styles.pickerRowChecked]}
                    onPress={() => toggleSecondary(item.code)}
                  >
                    <Text style={styles.pickerSymbol}>{item.symbol}</Text>
                    <View style={styles.pickerInfo}>
                      <Text style={styles.pickerCode}>{item.code}</Text>
                      <Text style={styles.pickerName}>{item.name}</Text>
                    </View>
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isChecked ? '#2196F3' : '#ccc'}
                    />
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: SPACING.lg }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

export default function OnboardingWithBoundary() {
  return (
    <ErrorBoundary screenName="Onboarding">
      <OnboardingScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scrollContent: { 
    // paddingBottom is set dynamically with safe area insets
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  dotActive: { backgroundColor: '#2196F3', width: 24 },
  stepContainer: { alignItems: 'center' },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: '#222',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: '#666',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionHint: {
    fontSize: FONT_SIZE.xs,
    color: '#888',
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  optionList: { width: '100%' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionRowActive: { backgroundColor: '#E3F2FD' },
  optionText: { fontSize: FONT_SIZE.md, color: '#222' },
  check: { fontSize: FONT_SIZE.lg, color: '#2196F3', fontWeight: '700' },
  // Currency dropdown (matches currency-tags page)
  currencyDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currencyDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  currencyDropdownSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    width: 32,
    textAlign: 'center',
  },
  currencyDropdownCode: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#222' },
  currencyDropdownName: { fontSize: FONT_SIZE.xs, color: '#888' },
  addCurrencyText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: '#2196F3' },
  // Week starts on
  weekRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
    marginTop: SPACING.md,
  },
  weekBtn: {
    flex: 1,
    paddingVertical: SPACING.lg,
    backgroundColor: '#f0f0f0',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  weekBtnActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  weekBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: '#666',
  },
  weekBtnTextActive: {
    color: '#fff',
  },
  // Education
  featureCard: { width: '100%', marginBottom: SPACING.md, alignItems: 'center' },
  featureTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#222', marginBottom: SPACING.xs },
  featureDesc: { fontSize: FONT_SIZE.sm, color: '#666', textAlign: 'center', lineHeight: 20 },
  floatingNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    // paddingBottom is set dynamically with safe area insets
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  // Modal (bottom sheet style — matches currency-tags page)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    maxHeight: '80%',
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: '#222',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: '#fafafa',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  pickerRowSelected: { backgroundColor: '#E3F2FD' },
  pickerRowChecked: { backgroundColor: '#F5F9FF' },
  pickerSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    width: 36,
    textAlign: 'center',
  },
  pickerInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  pickerCode: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#222' },
  pickerName: { fontSize: FONT_SIZE.xs, color: '#888' },
});
