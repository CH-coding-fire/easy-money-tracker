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
import { useTheme } from '../src/hooks/useTheme';
import { LANGUAGES } from '../src/constants/languages';
import { ALL_CURRENCIES } from '../src/constants/currencies';
import { THEME_OPTIONS } from '../src/constants/themes';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';
import type { ThemeMode } from '../src/types';

const TAG = 'OnboardingScreen';

function OnboardingScreen() {
  const router = useRouter();
  const settings = useSettings();
  const saveMutation = useSaveSettings();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [step, setStep] = useState(0); // 0=lang, 1=currency, 2=preferences, 3=education
  const [selectedLang, setSelectedLang] = useState(settings.language);
  const [selectedCurrency, setSelectedCurrency] = useState(settings.mainCurrency);
  const [secondaryCurrencies, setSecondaryCurrencies] = useState<string[]>(settings.secondaryCurrencies);
  const [selectedWeekStart, setSelectedWeekStart] = useState<'monday' | 'sunday'>(settings.weekStartsOn);
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(settings.themeMode || 'light');

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
          language: selectedLang,
          mainCurrency: selectedCurrency,
          secondaryCurrencies,
          frequentCurrencies: [selectedCurrency, ...secondaryCurrencies.slice(0, 2)],
          weekStartsOn: selectedWeekStart,
          themeMode: selectedTheme,
          onboardingComplete: true,
        },
        {
          onSuccess: () => {
            logger.info(TAG, 'Onboarding complete', {
              lang: selectedLang,
              currency: selectedCurrency,
              weekStartsOn: selectedWeekStart,
              theme: selectedTheme,
            });
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

  function removeSecondary(code: string) {
    setSecondaryCurrencies((prev) => prev.filter((c) => c !== code));
  }

  function moveSecondary(code: string, direction: 'up' | 'down') {
    setSecondaryCurrencies((prev) => {
      const idx = prev.indexOf(code);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
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
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: theme.border },
                step === i && { backgroundColor: theme.primary, width: 24 },
              ]}
            />
          ))}
        </View>

        {/* Step 0: Language */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <Ionicons name="globe-outline" size={56} color={theme.primary} style={{ marginBottom: SPACING.md }} />
            <Text style={[styles.title, { color: theme.text.primary }]}>Welcome to Easy Money Tracker!</Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>Choose your language</Text>

            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    { borderBottomColor: theme.divider },
                    selectedLang === item.code && { backgroundColor: `${theme.primary}15` },
                  ]}
                  onPress={() => setSelectedLang(item.code)}
                >
                  <Text style={styles.optionFlag}>{item.flag}</Text>
                  <Text style={[styles.optionText, { color: theme.text.primary }]}>
                    {item.label === item.nativeName ? item.label : `${item.label} ${item.nativeName}`}
                  </Text>
                  {selectedLang === item.code && <Ionicons name="checkmark" size={20} color={theme.primary} />}
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
            <Ionicons name="wallet-outline" size={56} color={theme.primary} style={{ marginBottom: SPACING.md }} />
            <Text style={[styles.title, { color: theme.text.primary }]}>Set Your Currency</Text>

            {/* Main currency — dropdown */}
            <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>Main Currency</Text>
            <TouchableOpacity
              style={[styles.currencyDropdown, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => {
                setCurrencySearch('');
                setShowCurrencyDropdown(true);
              }}
            >
              <View style={styles.currencyDropdownContent}>
                <Text style={[styles.currencyDropdownSymbol, { color: theme.text.primary }]}>
                  {mainCurrencyInfo?.symbol ?? '?'}
                </Text>
                <View>
                  <Text style={[styles.currencyDropdownCode, { color: theme.text.primary }]}>{selectedCurrency}</Text>
                  <Text style={[styles.currencyDropdownName, { color: theme.text.tertiary }]}>{mainCurrencyInfo?.name ?? ''}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color={theme.text.secondary} />
            </TouchableOpacity>

            {/* Secondary currencies — dropdown */}
            <Text style={[styles.sectionLabel, { marginTop: SPACING.xl, color: theme.text.primary }]}>
              Secondary Currencies
            </Text>
            <Text style={[styles.sectionHint, { color: theme.text.tertiary }]}>
              Optional. These appear as quick-switch tags in Add &amp; Statistics screens.
            </Text>
            <TouchableOpacity
              style={[styles.currencyDropdown, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => {
                setCurrencySearch('');
                setShowSecondaryPicker(true);
              }}
            >
              <View style={styles.currencyDropdownContent}>
                <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
                <Text style={[styles.addCurrencyText, { color: theme.primary }]}>
                  {secondaryCurrencies.length > 0
                    ? `${secondaryCurrencies.length} selected`
                    : 'Add Currency'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={theme.text.secondary} />
            </TouchableOpacity>

            {/* Currency Order — same as currency-tags settings */}
            {secondaryCurrencies.length > 0 && (
              <View style={{ width: '100%' }}>
                <Text style={[styles.sectionLabel, { marginTop: SPACING.lg, color: theme.text.primary }]}>Currency Order</Text>
                <Text style={[styles.sectionHint, { color: theme.text.tertiary }]}>
                  Use the arrows to reorder your currencies.
                </Text>

                {/* Main currency — fixed at top */}
                {mainCurrencyInfo && (
                  <View style={[styles.orderItem, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}40` }]}>
                    <View style={styles.orderArrowPlaceholder} />
                    <Text style={[styles.orderSymbol, { color: theme.text.primary }]}>{mainCurrencyInfo.symbol}</Text>
                    <View style={styles.orderInfo}>
                      <Text style={[styles.orderCode, { color: theme.text.primary }]}>{mainCurrencyInfo.code}</Text>
                      <Text style={[styles.orderName, { color: theme.text.tertiary }]}>{mainCurrencyInfo.name}</Text>
                    </View>
                    <View style={[styles.defaultBadge, { backgroundColor: `${theme.primary}20` }]}>
                      <Text style={[styles.defaultBadgeText, { color: theme.primary }]}>Default</Text>
                    </View>
                  </View>
                )}

                {/* Secondary currencies — reorderable */}
                {secondaryCurrencies.map((code, idx) => {
                  const info = ALL_CURRENCIES.find((c) => c.code === code);
                  if (!info) return null;
                  return (
                    <View key={code} style={[styles.orderItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                      <View style={styles.orderArrows}>
                        <TouchableOpacity
                          onPress={() => moveSecondary(code, 'up')}
                          disabled={idx === 0}
                          style={styles.arrowBtn}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={16}
                            color={idx === 0 ? theme.border : theme.text.secondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveSecondary(code, 'down')}
                          disabled={idx === secondaryCurrencies.length - 1}
                          style={styles.arrowBtn}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color={idx === secondaryCurrencies.length - 1 ? theme.border : theme.text.secondary}
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.orderSymbol, { color: theme.text.primary }]}>{info.symbol}</Text>
                      <View style={styles.orderInfo}>
                        <Text style={[styles.orderCode, { color: theme.text.primary }]}>{info.code}</Text>
                        <Text style={[styles.orderName, { color: theme.text.tertiary }]}>{info.name}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeSecondary(code)}
                      >
                        <Ionicons name="close-circle" size={20} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Ionicons name="settings-outline" size={56} color={theme.warning} style={{ marginBottom: SPACING.md }} />
            <Text style={[styles.title, { color: theme.text.primary }]}>Set Your Preferences</Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>Customize how you view your data</Text>

            {/* Theme Selection */}
            <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>Theme</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeScroll}>
              {THEME_OPTIONS.map((themeOpt) => (
                <TouchableOpacity
                  key={themeOpt.mode}
                  style={[
                    styles.themeCard,
                    { 
                      backgroundColor: theme.cardBackground,
                      borderColor: theme.border,
                    },
                    selectedTheme === themeOpt.mode && {
                      borderColor: theme.primary,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    setSelectedTheme(themeOpt.mode);
                    saveMutation.mutate({ themeMode: themeOpt.mode });
                  }}
                >
                  <Ionicons
                    name={themeOpt.icon as any}
                    size={32}
                    color={selectedTheme === themeOpt.mode ? theme.primary : theme.text.secondary}
                  />
                  <Text style={[
                    styles.themeCardLabel,
                    { color: theme.text.primary },
                    selectedTheme === themeOpt.mode && { fontWeight: '700' },
                  ]}>
                    {themeOpt.label}
                  </Text>
                  {selectedTheme === themeOpt.mode && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} style={styles.themeCheckmark} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: theme.text.primary, marginTop: SPACING.xl }]}>Week Starts On</Text>
            <View style={styles.weekRow}>
              {(['monday', 'sunday'] as const).map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.weekBtn,
                    { 
                      backgroundColor: theme.border,
                      borderColor: theme.border,
                    },
                    selectedWeekStart === day && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setSelectedWeekStart(day)}
                >
                  <Text style={[
                    styles.weekBtnText,
                    { color: theme.text.secondary },
                    selectedWeekStart === day && { color: '#fff' },
                  ]}>
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
            <Ionicons name="checkmark-circle-outline" size={56} color={theme.success} style={{ marginBottom: SPACING.md }} />
            <Text style={[styles.title, { color: theme.text.primary }]}>You're All Set!</Text>
            <Text style={[styles.subtitle, { color: theme.text.secondary }]}>Here's what you can do</Text>

            <Card style={styles.featureCard}>
              <Ionicons name="wallet-outline" size={32} color={theme.primary} style={{ marginBottom: SPACING.sm }} />
              <Text style={[styles.featureTitle, { color: theme.text.primary }]}>Track Expenses & Income</Text>
              <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                Quick-add with category shortcuts, multi-level categories, and recurring transactions.
              </Text>
            </Card>

            <Card style={styles.featureCard}>
              <Ionicons name="stats-chart-outline" size={32} color={theme.success} style={{ marginBottom: SPACING.sm }} />
              <Text style={[styles.featureTitle, { color: theme.text.primary }]}>View Statistics</Text>
              <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                Pie charts with drill-down, bar charts, and line charts for your balance over time.
              </Text>
            </Card>

            <Card style={styles.featureCard}>
              <Ionicons name="folder-open-outline" size={32} color={theme.warning} style={{ marginBottom: SPACING.sm }} />
              <Text style={[styles.featureTitle, { color: theme.text.primary }]}>Custom Categories</Text>
              <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                Up to 3 levels of categories, fully customizable with icons.
              </Text>
            </Card>

            <Card style={styles.featureCard}>
              <Ionicons name="swap-horizontal-outline" size={32} color={theme.chartColors[3]} style={{ marginBottom: SPACING.sm }} />
              <Text style={[styles.featureTitle, { color: theme.text.primary }]}>Multi-Currency</Text>
              <Text style={[styles.featureDesc, { color: theme.text.secondary }]}>
                Track in any currency with automatic FX conversion for statistics.
              </Text>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Floating Navigation buttons */}
      <View style={[
        styles.floatingNavContainer,
        {
          paddingBottom: Math.max(insets.bottom, SPACING.md),
          backgroundColor: theme.cardBackground,
          borderTopColor: theme.divider,
          shadowColor: theme.shadow,
        },
      ]}>
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
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Select Main Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyDropdown(false)}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.searchInput, {
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text.primary,
              }]}
              placeholder="Search currencies..."
              value={currencySearch}
              onChangeText={setCurrencySearch}
              placeholderTextColor={theme.text.tertiary}
              autoFocus
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = selectedCurrency === item.code;
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerRow,
                      { borderBottomColor: theme.divider },
                      isSelected && { backgroundColor: `${theme.primary}15` },
                    ]}
                    onPress={() => {
                      setSelectedCurrency(item.code);
                      setSecondaryCurrencies((prev) => prev.filter((c) => c !== item.code));
                      setShowCurrencyDropdown(false);
                    }}
                  >
                    <Text style={[styles.pickerSymbol, { color: theme.text.primary }]}>{item.symbol}</Text>
                    <View style={styles.pickerInfo}>
                      <Text style={[styles.pickerCode, { color: theme.text.primary }]}>{item.code}</Text>
                      <Text style={[styles.pickerName, { color: theme.text.tertiary }]}>{item.name}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
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
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Add Secondary Currencies</Text>
              <TouchableOpacity onPress={() => setShowSecondaryPicker(false)}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.searchInput, {
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text.primary,
              }]}
              placeholder="Search currencies..."
              value={currencySearch}
              onChangeText={setCurrencySearch}
              placeholderTextColor={theme.text.tertiary}
              autoFocus
            />
            <FlatList
              data={filteredCurrencies.filter((c) => c.code !== selectedCurrency)}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isChecked = secondaryCurrencies.includes(item.code);
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerRow,
                      { borderBottomColor: theme.divider },
                      isChecked && { backgroundColor: `${theme.primary}08` },
                    ]}
                    onPress={() => toggleSecondary(item.code)}
                  >
                    <Text style={[styles.pickerSymbol, { color: theme.text.primary }]}>{item.symbol}</Text>
                    <View style={styles.pickerInfo}>
                      <Text style={[styles.pickerCode, { color: theme.text.primary }]}>{item.code}</Text>
                      <Text style={[styles.pickerName, { color: theme.text.tertiary }]}>{item.name}</Text>
                    </View>
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isChecked ? theme.primary : theme.text.tertiary}
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
  },
  stepContainer: { alignItems: 'center' },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionHint: {
    fontSize: FONT_SIZE.xs,
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
  },
  optionFlag: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  optionText: { fontSize: FONT_SIZE.md, flex: 1 },
  // Currency dropdown (matches currency-tags page)
  currencyDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
  },
  currencyDropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  currencyDropdownSymbol: {
    fontSize: 20,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  currencyDropdownCode: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  currencyDropdownName: { fontSize: FONT_SIZE.xs },
  addCurrencyText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  // Currency order items (matches currency-tags page)
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
  },
  orderArrows: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
  },
  orderArrowPlaceholder: {
    width: 26,
  },
  arrowBtn: {
    padding: 1,
  },
  orderSymbol: {
    fontSize: 16,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  orderInfo: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  orderCode: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  orderName: { fontSize: FONT_SIZE.xs },
  defaultBadge: {
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  defaultBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  removeBtn: {
    padding: SPACING.xs,
  },
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
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 2,
  },
  weekBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  // Theme cards
  themeScroll: {
    width: '100%',
    marginTop: SPACING.sm,
  },
  themeCard: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    padding: SPACING.sm,
  },
  themeCardLabel: {
    fontSize: FONT_SIZE.xs,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  themeCheckmark: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  // Education
  featureCard: { width: '100%', marginBottom: SPACING.md, alignItems: 'center' },
  featureTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', marginBottom: SPACING.xs },
  featureDesc: { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },
  floatingNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  // Modal (bottom sheet style — matches currency-tags page)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerSymbol: {
    fontSize: 18,
    fontWeight: '700',
    width: 36,
    textAlign: 'center',
  },
  pickerInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  pickerCode: { fontSize: FONT_SIZE.md, fontWeight: '600' },
  pickerName: { fontSize: FONT_SIZE.xs },
});
