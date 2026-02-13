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
import { ScreenContainer } from '../src/components/ScreenContainer';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useSettings, useSaveSettings } from '../src/hooks/useSettings';
import { LANGUAGES } from '../src/constants/languages';
import { ALL_CURRENCIES, getCurrencySymbol } from '../src/constants/currencies';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';

const TAG = 'OnboardingScreen';

function OnboardingScreen() {
  const router = useRouter();
  const settings = useSettings();
  const saveMutation = useSaveSettings();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0); // 0=lang, 1=currency, 2=education
  const [selectedLang, setSelectedLang] = useState(settings.language);
  const [selectedCurrency, setSelectedCurrency] = useState(settings.mainCurrency);
  const [secondaryCurrencies, setSecondaryCurrencies] = useState<string[]>(settings.secondaryCurrencies);

  // Currency dropdown state
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const filteredCurrencies = currencySearch.trim()
    ? ALL_CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
          c.name.toLowerCase().includes(currencySearch.toLowerCase())
      )
    : ALL_CURRENCIES;

  function nextStep() {
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      saveMutation.mutate({
        ...settings,
        language: selectedLang,
        mainCurrency: selectedCurrency,
        secondaryCurrencies,
        frequentCurrencies: [selectedCurrency, ...secondaryCurrencies.slice(0, 2)],
        onboardingComplete: true,
      });
      logger.info(TAG, 'Onboarding complete', { lang: selectedLang, currency: selectedCurrency });
      router.replace('/(tabs)');
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
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, step === i && styles.dotActive]} />
          ))}
        </View>

        {/* Step 0: Language */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>🌍</Text>
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
                  <Text style={styles.optionText}>{item.label} {item.nativeName}</Text>
                  {selectedLang === item.code && <Text style={styles.check}>✓</Text>}
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
            <Text style={styles.emoji}>💰</Text>
            <Text style={styles.title}>Set Your Currency</Text>

            {/* Main currency — dropdown selector */}
            <Text style={styles.sectionLabel}>Main currency</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => {
                setCurrencySearch('');
                setShowCurrencyDropdown(true);
              }}
            >
              <Text style={styles.dropdownText}>
                {mainCurrencyInfo
                  ? `${mainCurrencyInfo.symbol}  ${mainCurrencyInfo.code} — ${mainCurrencyInfo.name}`
                  : 'Select currency'}
              </Text>
              <Text style={styles.dropdownChevron}>▼</Text>
            </TouchableOpacity>

            {/* Secondary currencies — multi-select chips */}
            <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>
              Secondary currencies (optional)
            </Text>
            <Text style={styles.sectionHint}>
              Tap to toggle. These will appear as quick-switch options.
            </Text>
            <View style={styles.secondaryRow}>
              {ALL_CURRENCIES.filter((c) => c.code !== selectedCurrency).map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.secChip,
                    secondaryCurrencies.includes(c.code) && styles.secChipActive,
                  ]}
                  onPress={() => toggleSecondary(c.code)}
                >
                  <Text style={[
                    styles.secChipText,
                    secondaryCurrencies.includes(c.code) && styles.secChipTextActive,
                  ]}>
                    {c.symbol} {c.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Education */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.emoji}>✨</Text>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>Here's what you can do</Text>

            <Card style={styles.featureCard}>
              <Text style={styles.featureIcon}>💰</Text>
              <Text style={styles.featureTitle}>Track Expenses & Income</Text>
              <Text style={styles.featureDesc}>
                Quick-add with category shortcuts, multi-level categories, and recurring transactions.
              </Text>
            </Card>

            <Card style={styles.featureCard}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureTitle}>View Statistics</Text>
              <Text style={styles.featureDesc}>
                Pie charts with drill-down, bar charts, and line charts for your balance over time.
              </Text>
            </Card>

            <Card style={styles.featureCard}>
              <Text style={styles.featureIcon}>📁</Text>
              <Text style={styles.featureTitle}>Custom Categories</Text>
              <Text style={styles.featureDesc}>
                Up to 3 levels of categories, fully customizable with icons.
              </Text>
            </Card>

            <Card style={styles.featureCard}>
              <Text style={styles.featureIcon}>💱</Text>
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
            title={step === 2 ? 'Get Started' : 'Next'}
            onPress={nextStep}
            style={{ flex: 1 }}
            size="lg"
          />
        </View>
      </View>

      {/* Currency dropdown modal */}
      <Modal visible={showCurrencyDropdown} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Main Currency</Text>
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyRow,
                    selectedCurrency === item.code && styles.currencyRowActive,
                  ]}
                  onPress={() => {
                    setSelectedCurrency(item.code);
                    // Remove from secondary if it was there
                    setSecondaryCurrencies((prev) => prev.filter((c) => c !== item.code));
                    setShowCurrencyDropdown(false);
                  }}
                >
                  <Text style={styles.currencyRowSymbol}>{item.symbol}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currencyRowCode}>{item.code}</Text>
                    <Text style={styles.currencyRowName}>{item.name}</Text>
                  </View>
                  {selectedCurrency === item.code && (
                    <Text style={styles.currencyCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 350 }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowCurrencyDropdown(false)}
              style={{ marginTop: SPACING.md }}
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
  emoji: { fontSize: 56, marginBottom: SPACING.md },
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
  // Dropdown
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  dropdownText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#222', flex: 1 },
  dropdownChevron: { fontSize: FONT_SIZE.sm, color: '#2196F3', marginLeft: SPACING.sm },
  // Secondary chips
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'flex-start',
    width: '100%',
  },
  secChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  secChipActive: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  secChipText: { fontSize: FONT_SIZE.sm, color: '#555', fontWeight: '600' },
  secChipTextActive: { color: '#1565C0' },
  // Education
  featureCard: { width: '100%', marginBottom: SPACING.md, alignItems: 'center' },
  featureIcon: { fontSize: 32, marginBottom: SPACING.sm },
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
  // Currency dropdown modal
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
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: '#222',
    marginBottom: SPACING.md,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    backgroundColor: '#fafafa',
    marginBottom: SPACING.md,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currencyRowActive: { backgroundColor: '#E3F2FD' },
  currencyRowSymbol: { fontSize: 20, fontWeight: '700', width: 36, textAlign: 'center', marginRight: SPACING.sm },
  currencyRowCode: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#222' },
  currencyRowName: { fontSize: FONT_SIZE.xs, color: '#888' },
  currencyCheck: { fontSize: FONT_SIZE.lg, color: '#2196F3', fontWeight: '700' },
});
