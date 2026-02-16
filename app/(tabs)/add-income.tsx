import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Keyboard,
  Modal,
  FlatList,
  Pressable,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarPicker } from '../../src/components/CalendarPicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { generateUUID } from '../../src/utils/uuid';

import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { CategoryPicker } from '../../src/components/CategoryPicker';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { MultiTimesSheet, MultiTimesConfig } from '../../src/components/MultiTimesSheet';
import { CalculatorModal } from '../../src/components/CalculatorModal';

import { useCategories } from '../../src/hooks/useCategories';
import { useSettings } from '../../src/hooks/useSettings';
import { useTheme } from '../../src/hooks/useTheme';
import { useAddTransaction, useAddTransactions } from '../../src/hooks/useTransactions';
import { useUIStore } from '../../src/store/uiStore';
import { TransactionType, Transaction } from '../../src/types';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants/spacing';
import { ALL_CURRENCIES } from '../../src/constants/currencies';
import { todayISO, nowISO, formatISODate, generateMultiDates } from '../../src/utils/dateHelpers';
import { logger } from '../../src/utils/logger';
import { getRandomFinancialQuote } from '../../src/constants/financialQuotes';

const TAG = 'AddIncomeScreen';

const txSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine(
    (v) => !isNaN(Number(v)) && Number(v) > 0,
    'Must be a positive number'
  ),
  title: z.string().optional(),
  description: z.string().optional(),
});

type TxFormData = z.infer<typeof txSchema>;

function AddIncomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const categories = useCategories();
  const settings = useSettings();
  const addMutation = useAddTransaction();
  const addBatchMutation = useAddTransactions();
  const amountInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const titleRowY = useRef(0);
  const descRowY = useRef(0);

  // Tab bar height (mirrors _layout.tsx calculation)
  const tabBarHeight = 56 + Math.max(insets.bottom, 4);

  // Scroll the ScrollView so the focused input is visible above the keyboard
  const scrollToInput = useCallback((yRef: React.MutableRefObject<number>) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, yRef.current - 100),
        animated: true,
      });
    }, 300);
  }, []);

  const transactionType: TransactionType = 'income';
  const { showToast } = useUIStore();

  // Auto-focus amount input when the tab is focused (triggers numpad on mobile)
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, Platform.OS === 'android' ? 350 : 100);
      return () => clearTimeout(timer);
    }, [])
  );

  const [selectedCurrency, setSelectedCurrency] = useState(settings.mainCurrency);
  const [categoryPath, setCategoryPath] = useState<string[]>(['Uncategorized']);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isMultiTimes, setIsMultiTimes] = useState(false);
  const [multiTimesConfig, setMultiTimesConfig] = useState<MultiTimesConfig | null>(null);
  const [multiTimesSheetVisible, setMultiTimesSheetVisible] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');
  const [isQuickMode, setIsQuickMode] = useState(true);
  const [calculatorVisible, setCalculatorVisible] = useState(false);

  const filteredCurrencies = currencySearch.trim()
    ? ALL_CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
          c.name.toLowerCase().includes(currencySearch.toLowerCase())
      )
    : ALL_CURRENCIES;

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
    trigger,
    setValue,
  } = useForm<TxFormData>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      amount: '',
      title: '',
      description: '',
    },
  });

  // Progressive blur logic
  const [amountEntered, setAmountEntered] = useState(false);
  const [titleEntered, setTitleEntered] = useState(false);
  const categorySelected = categoryPath.length > 0;
  const canShowMultiTimes = amountEntered && categorySelected;
  const canShowTitle = canShowMultiTimes;
  const canShowDescription = canShowTitle && titleEntered;

  const canSave = amountEntered && categorySelected;

  const currentCategories = categories.income;
  const frequentCats = settings.frequentIncomeCategories;

  async function quickSave(path: string[]) {
    const isValid = await trigger('amount');
    if (!isValid) return;

    const data = getValues();
    const now = nowISO();

    const tx: Transaction = {
      id: generateUUID(),
      type: transactionType,
      amount: Number(data.amount),
      currency: selectedCurrency,
      categoryPath: path,
      date: formatISODate(selectedDate),
      title: undefined,
      description: undefined,
      isRecurring: false,
      recurringRule: undefined,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await addMutation.mutateAsync(tx);
      logger.info(TAG, 'Quick-save transaction added', { id: tx.id });
      showToast(`Transaction saved! 💡 ${getRandomFinancialQuote()}`, 'success');

      // Reset form
      reset({ amount: '', title: '', description: '' });
      setCategoryPath(['Uncategorized']);
      setSelectedDate(new Date());
      setAmountEntered(false);
      setTitleEntered(false);

      // Re-focus amount input for next quick entry
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      logger.error(TAG, 'Quick-save failed', err);
      showToast(`Failed to save: ${err.message}`, 'error');
    }
  }

  async function onSubmit(data: TxFormData) {
    const now = nowISO();

    try {
      if (isMultiTimes && multiTimesConfig) {
        // Multi-times: create N transactions with different dates
        const dates = generateMultiDates(
          multiTimesConfig.startDate,
          multiTimesConfig.frequency,
          multiTimesConfig.count,
        );
        const txs: Transaction[] = dates.map((d) => ({
          id: generateUUID(),
          type: transactionType,
          amount: Number(data.amount),
          currency: selectedCurrency,
          categoryPath,
          date: formatISODate(d),
          title: data.title || undefined,
          description: data.description || undefined,
          isRecurring: false,
          recurringRule: undefined,
          createdAt: now,
          updatedAt: now,
        }));
        await addBatchMutation.mutateAsync(txs);
        logger.info(TAG, 'Multi-times transactions added', { count: txs.length });
        showToast(`${txs.length} transactions saved! 💡 ${getRandomFinancialQuote()}`, 'success');
      } else {
        // One-time: create single transaction
        const tx: Transaction = {
          id: generateUUID(),
          type: transactionType,
          amount: Number(data.amount),
          currency: selectedCurrency,
          categoryPath,
          date: formatISODate(selectedDate),
          title: data.title || undefined,
          description: data.description || undefined,
          isRecurring: false,
          recurringRule: undefined,
          createdAt: now,
          updatedAt: now,
        };
        await addMutation.mutateAsync(tx);
        logger.info(TAG, 'Transaction added', { id: tx.id });
        showToast(`Transaction saved! 💡 ${getRandomFinancialQuote()}`, 'success');
      }

      // Reset form
      reset({ amount: '', title: '', description: '' });
      setCategoryPath(['Uncategorized']);
      setSelectedDate(new Date());
      setIsMultiTimes(false);
      setMultiTimesConfig(null);
      setAmountEntered(false);
      setTitleEntered(false);
    } catch (err: any) {
      logger.error(TAG, 'Save failed', err);
      showToast(`Failed to save: ${err.message}`, 'error');
    }
  }

  return (
    <ScreenContainer padBottom={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? tabBarHeight : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleRow}>
            <Ionicons name="arrow-up-circle" size={28} color={theme.success} />
            <Text style={[styles.screenTitle, { color: theme.text.primary }]}>Add Income</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.modeToggle}>
              <Text style={[styles.modeToggleText, { color: isQuickMode ? theme.primary : theme.text.tertiary }]}>
                {isQuickMode ? '⚡ Quick' : '📝 Detail'}
              </Text>
              <Switch
                value={isQuickMode}
                onValueChange={setIsQuickMode}
                trackColor={{ false: `${theme.text.tertiary}30`, true: `${theme.primary}50` }}
                thumbColor={isQuickMode ? theme.primary : theme.text.tertiary}
                style={{ transform: [{ scale: 0.9 }] }}
              />
            </View>
          </View>

          {/* Row 1: Amount + Currency + Tags */}
          <View style={styles.row}>
            <View style={styles.sectionLabelRow}>
              <Text style={[styles.sectionLabel, { color: theme.text.secondary, marginBottom: 0 }]}>Amount</Text>
              <TouchableOpacity
                style={[styles.calculatorBtn, { backgroundColor: `${theme.primary}15`, borderColor: `${theme.primary}40` }]}
                onPress={() => setCalculatorVisible(true)}
              >
                <Ionicons name="calculator-outline" size={14} color={theme.primary} />
                <Text style={[styles.calculatorBtnText, { color: theme.primary }]}>Calc</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.amountRow}>
              <TouchableOpacity
                style={[styles.currencyBtn, { backgroundColor: `${theme.primary}20` }]}
                onPress={() => { setCurrencySearch(''); setCurrencyPickerVisible(true); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.currencyText, { color: theme.primary }]}>
                  {selectedCurrency}
                </Text>
              </TouchableOpacity>
              <View style={styles.amountInput}>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      ref={amountInputRef}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      showSoftInputOnFocus={true}
                      value={value}
                      onChangeText={(v) => {
                        onChange(v);
                        setAmountEntered(v.length > 0 && !isNaN(Number(v)) && Number(v) > 0);
                      }}
                      onBlur={onBlur}
                      error={errors.amount?.message}
                      containerStyle={{ marginBottom: 0 }}
                      style={{ paddingVertical: 6, paddingHorizontal: 8, fontSize: FONT_SIZE.md }}
                    />
                  )}
                />
              </View>
              {/* Currency quick-switch tags inline with amount */}
              {[...new Set([settings.mainCurrency, ...settings.secondaryCurrencies, ...settings.frequentCurrencies])]
                .filter(code => code !== selectedCurrency)
                .slice(0, 6)
                .map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={[styles.currencyTag, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setSelectedCurrency(code)}
                  >
                    <Text style={[styles.currencyTagText, { color: theme.text.secondary }]}>{code}</Text>
                  </TouchableOpacity>
                ))}
              <TouchableOpacity
                style={[styles.currencyEditBtn, { backgroundColor: `${theme.warning}15`, borderColor: `${theme.warning}40` }]}
                onPress={() => router.push('/currency-tags')}
              >
                <Ionicons name="create-outline" size={16} color={theme.warning} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick mode: Date before Category */}
          {isQuickMode && (
            <View style={[styles.row, !amountEntered && styles.blurred]}>
              <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Date</Text>
              <TouchableOpacity
                style={[styles.dateBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}
                disabled={!amountEntered}
              >
                <Text style={[styles.dateText, { color: theme.text.primary }]}>{formatISODate(selectedDate)}</Text>
              </TouchableOpacity>
              <CalendarPicker
                visible={showDatePicker}
                value={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
              />
            </View>
          )}

          {/* Category (always shown) */}
          <View style={[styles.row, !amountEntered && styles.blurred]}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Category</Text>
            <CategoryPicker
              categories={currentCategories}
              selectedPath={categoryPath}
              onSelect={(path) => {
                amountInputRef.current?.blur();
                Keyboard.dismiss();
                setCategoryPath(path);
                if (isQuickMode && amountEntered) {
                  quickSave(path);
                }
              }}
              frequentCategories={frequentCats}
              onEditFrequent={() => router.push('/frequent-categories')}
              onEditCategories={() => router.push('/category-edit')}
            />
          </View>

          {/* Detail mode only: Date, Type, Title, Description */}
          {!isQuickMode && (
            <>
              {/* Date / Starting Date */}
              <View style={[styles.row, !amountEntered && styles.blurred]}>
                <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>
                  {isMultiTimes && multiTimesConfig ? 'Starting Date' : 'Date'}
                </Text>
                <TouchableOpacity
                  style={[styles.dateBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => {
                    if (isMultiTimes && multiTimesConfig) {
                      setMultiTimesSheetVisible(true);
                    } else {
                      setShowDatePicker(true);
                    }
                  }}
                  disabled={!amountEntered}
                >
                  <Text style={[styles.dateText, { color: theme.text.primary }]}>{formatISODate(selectedDate)}</Text>
                </TouchableOpacity>
                <CalendarPicker
                  visible={showDatePicker}
                  value={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setShowDatePicker(false);
                  }}
                  onCancel={() => setShowDatePicker(false)}
                />
              </View>

              {/* One-time / Multi-times */}
              <View style={[styles.row, !canShowMultiTimes && styles.blurred]}>
                <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Type</Text>
                <SegmentedControl
                  options={[
                    { label: 'One-time', value: 'onetime' },
                    { label: 'Multi-times', value: 'multi' },
                  ]}
                  selected={isMultiTimes ? 'multi' : 'onetime'}
                  onSelect={(v) => {
                    const wantsMulti = v === 'multi';
                    setIsMultiTimes(wantsMulti);
                    if (wantsMulti) {
                      setMultiTimesSheetVisible(true);
                    } else {
                      setMultiTimesConfig(null);
                    }
                  }}
                  disabled={!canShowMultiTimes}
                />
                {isMultiTimes && multiTimesConfig && (
                  <Pressable
                    style={styles.multiSummary}
                    onPress={() => setMultiTimesSheetVisible(true)}
                  >
                    <Ionicons name="repeat-outline" size={14} color={theme.text.tertiary} />
                    <Text style={[styles.multiSummaryText, { color: theme.text.tertiary }]}>
                      {multiTimesConfig.frequency.charAt(0).toUpperCase() + multiTimesConfig.frequency.slice(1)} x{multiTimesConfig.count}, starting {formatISODate(multiTimesConfig.startDate)}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.text.tertiary} />
                  </Pressable>
                )}
              </View>

              {/* Title */}
              <View
                style={[styles.row, !canShowTitle && styles.blurred]}
                onLayout={(e) => { titleRowY.current = e.nativeEvent.layout.y; }}
              >
                <Controller
                  control={control}
                  name="title"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Title (optional)"
                      placeholder="e.g. Monthly salary"
                      value={value}
                      onChangeText={(v) => {
                        onChange(v);
                        setTitleEntered(v.length > 0);
                      }}
                      onBlur={onBlur}
                      onFocus={() => scrollToInput(titleRowY)}
                      editable={canShowTitle}
                    />
                  )}
                />
              </View>

              {/* Description */}
              <View
                style={[styles.row, !canShowDescription && styles.blurred]}
                onLayout={(e) => { descRowY.current = e.nativeEvent.layout.y; }}
              >
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Description (optional)"
                      placeholder="Add notes..."
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      onFocus={() => scrollToInput(descRowY)}
                      multiline
                      numberOfLines={3}
                      editable={canShowDescription}
                    />
                  )}
                />
              </View>
            </>
          )}

          {/* Spacer – extra room so keyboard can't cover the last input */}
          <View style={{ height: 160 }} />
        </ScrollView>

        {/* Floating Save Button */}
        <View style={[styles.floatingBtnContainer, { backgroundColor: `${theme.background}F2` }]}>
          <Button
            title="Save"
            onPress={handleSubmit(onSubmit)}
            disabled={!canSave}
            loading={addMutation.isPending || addBatchMutation.isPending}
            size="lg"
            style={styles.saveBtn}
          />
        </View>

        {/* Multi-times Sheet */}
        <MultiTimesSheet
          visible={multiTimesSheetVisible}
          initialDate={selectedDate}
          initialConfig={multiTimesConfig ?? undefined}
          onConfirm={(config) => {
            setMultiTimesConfig(config);
            setSelectedDate(config.startDate);
            setMultiTimesSheetVisible(false);
            logger.info(TAG, 'Multi-times configured', {
              frequency: config.frequency,
              count: config.count,
              startDate: formatISODate(config.startDate),
            });
          }}
          onCancel={() => {
            setMultiTimesSheetVisible(false);
            // If no config was previously set, revert to one-time
            if (!multiTimesConfig) {
              setIsMultiTimes(false);
            }
          }}
        />

        {/* Calculator Modal */}
        <CalculatorModal
          visible={calculatorVisible}
          initialValue={getValues('amount')}
          onConfirm={(value) => {
            setValue('amount', value, { shouldValidate: true });
            setAmountEntered(!isNaN(Number(value)) && Number(value) > 0);
            setCalculatorVisible(false);
          }}
          onCancel={() => setCalculatorVisible(false)}
        />

        {/* Currency Picker Modal */}
        <Modal visible={currencyPickerVisible} animationType="slide" transparent>
          <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Select Currency</Text>
                <Pressable onPress={() => setCurrencyPickerVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text.secondary} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.modalSearch, {
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
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected = item.code === selectedCurrency;
                  return (
                    <Pressable
                      style={[
                        styles.pickerRow,
                        { borderBottomColor: theme.divider },
                        isSelected && { backgroundColor: `${theme.primary}15` },
                      ]}
                      onPress={() => {
                        setSelectedCurrency(item.code);
                        setCurrencyPickerVisible(false);
                        setCurrencySearch('');
                        logger.info(TAG, 'Currency selected from picker', { code: item.code });
                      }}
                    >
                      <Text style={[styles.pickerSymbol, { color: theme.text.primary }]}>{item.symbol}</Text>
                      <View style={styles.pickerInfo}>
                        <Text style={[styles.pickerCode, { color: theme.text.primary }]}>{item.code}</Text>
                        <Text style={[styles.pickerName, { color: theme.text.tertiary }]}>{item.name}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
                    </Pressable>
                  );
                }}
                contentContainerStyle={{ paddingBottom: SPACING.lg }}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

export default function AddIncomeWithBoundary() {
  return (
    <ErrorBoundary screenName="AddIncome">
      <AddIncomeScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxxl },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  screenTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
  },
  row: {
    marginTop: SPACING.lg,
  },
  blurred: {
    opacity: 0.35,
    pointerEvents: 'none',
  },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  amountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    rowGap: 6,
  },
  currencyBtn: {
    paddingVertical: 7,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
  },
  currencyText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  amountInput: {
    width: 120,
  },
  currencyTag: {
    paddingVertical: 5,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  currencyTagText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  currencyEditBtn: {
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  calculatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
  },
  calculatorBtnText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  dateBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateText: {
    fontSize: FONT_SIZE.md,
  },
  multiSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  multiSummaryText: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
  },
  floatingBtnContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  saveBtn: {
    width: '100%',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    gap: 6,
  },
  modeToggleText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  // Currency picker modal
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
  modalSearch: {
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
