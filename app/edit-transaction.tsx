import React, { useState, useMemo, useRef, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarPicker } from '../src/components/CalendarPicker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ScreenContainer } from '../src/components/ScreenContainer';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { CategoryPicker } from '../src/components/CategoryPicker';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

import { useCategories } from '../src/hooks/useCategories';
import { useSettings } from '../src/hooks/useSettings';
import { useTheme } from '../src/hooks/useTheme';
import { useUpdateTransaction, useTransactions } from '../src/hooks/useTransactions';
import { useUIStore } from '../src/store/uiStore';
import { TransactionType, Transaction } from '../src/types';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { ALL_CURRENCIES } from '../src/constants/currencies';
import { nowISO, parseLocalDate, formatISODate } from '../src/utils/dateHelpers';
import { logger } from '../src/utils/logger';

const TAG = 'EditTransactionScreen';

const txSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine(
    (v) => !isNaN(Number(v)) && Number(v) > 0,
    'Must be a positive number'
  ),
  title: z.string().optional(),
  description: z.string().optional(),
});

type TxFormData = z.infer<typeof txSchema>;

function EditTransactionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const categories = useCategories();
  const settings = useSettings();
  const updateMutation = useUpdateTransaction();
  const transactions = useTransactions();
  const scrollViewRef = useRef<ScrollView>(null);
  const titleRowY = useRef(0);
  const descRowY = useRef(0);
  const { showToast } = useUIStore();

  // Scroll the ScrollView so the focused input is visible above the keyboard
  const scrollToInput = useCallback((yRef: React.MutableRefObject<number>) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, yRef.current - 100),
        animated: true,
      });
    }, 300);
  }, []);

  // Find the transaction to edit
  const editingTx = useMemo(() => {
    if (!id) return null;
    return transactions.find((t) => t.id === id) ?? null;
  }, [id, transactions]);

  // ALL hooks must be called unconditionally (React Rules of Hooks).
  const [transactionType, setTransactionType] = useState<TransactionType>(editingTx?.type ?? 'expense');
  const [selectedCurrency, setSelectedCurrency] = useState(editingTx?.currency ?? settings.mainCurrency);
  const [categoryPath, setCategoryPath] = useState<string[]>(editingTx ? [...editingTx.categoryPath] : []);
  const [selectedDate, setSelectedDate] = useState(editingTx ? parseLocalDate(editingTx.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

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
    watch,
  } = useForm<TxFormData>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      amount: editingTx ? String(editingTx.amount) : '',
      title: editingTx?.title ?? '',
      description: editingTx?.description ?? '',
    },
  });

  // Watch form values for change detection
  const formValues = watch();

  // Snapshot of original values for change detection
  const original = useMemo(() => ({
    amount: editingTx?.amount ?? 0,
    currency: editingTx?.currency ?? '',
    categoryPath: editingTx?.categoryPath ?? [],
    date: editingTx?.date ?? '',
    title: editingTx?.title,
    description: editingTx?.description,
    type: editingTx?.type ?? 'expense',
  }), [editingTx?.id]);

  // Check if form has changed
  const hasChanges = useMemo(() => {
    if (!editingTx) return false;
    const currentAmount = Number(formValues.amount) || 0;
    const currentDate = formatISODate(selectedDate);

    return (
      currentAmount !== original.amount ||
      selectedCurrency !== original.currency ||
      JSON.stringify(categoryPath) !== JSON.stringify(original.categoryPath) ||
      currentDate !== original.date ||
      (formValues.title || '') !== (original.title || '') ||
      (formValues.description || '') !== (original.description || '') ||
      transactionType !== original.type
    );
  }, [editingTx, formValues, selectedCurrency, categoryPath, selectedDate, transactionType, original]);

  // If transaction not found, show error (AFTER all hooks)
  if (!editingTx) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text.secondary }]}>Transaction not found</Text>
          <Button title="Go Back" onPress={() => router.back()} size="md" />
        </View>
      </ScreenContainer>
    );
  }

  const categorySelected = categoryPath.length > 0;
  const canSave = categorySelected && hasChanges;

  const currentCategories = transactionType === 'expense'
    ? categories.expense
    : categories.income;
  const frequentCats = transactionType === 'expense'
    ? settings.frequentExpenseCategories
    : settings.frequentIncomeCategories;

  async function onSubmit(data: TxFormData) {
    const now = nowISO();
    const tx: Transaction = {
      id: editingTx.id,
      type: transactionType,
      amount: Number(data.amount),
      currency: selectedCurrency,
      categoryPath,
      date: formatISODate(selectedDate),
      title: data.title || undefined,
      description: data.description || undefined,
      isRecurring: false,
      recurringRule: undefined,
      createdAt: editingTx.createdAt,
      updatedAt: now,
    };

    try {
      await updateMutation.mutateAsync(tx);
      logger.info(TAG, 'Transaction updated', { id: tx.id });
      showToast('Transaction updated!', 'success');
      router.back();
    } catch (err: any) {
      logger.error(TAG, 'Update failed', err);
      showToast(`Failed to update: ${err.message}`, 'error');
    }
  }

  // Tab bar height (mirrors _layout.tsx calculation)
  const tabBarHeight = 56 + Math.max(insets.bottom, 4);

  const TAB_ITEMS: { route: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { route: '/(tabs)', label: 'Expense', icon: 'arrow-down-circle-outline' },
    { route: '/(tabs)/add-income', label: 'Income', icon: 'arrow-up-circle-outline' },
    { route: '/(tabs)/statistics', label: 'Statistics', icon: 'stats-chart-outline' },
    { route: '/(tabs)/records', label: 'Records', icon: 'document-text-outline' },
    { route: '/(tabs)/settings', label: 'Settings', icon: 'settings-outline' },
  ];

  return (
    <ScreenContainer padBottom={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 80 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with back button */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.screenTitle, { color: theme.text.primary }]}>Edit Transaction</Text>
          </View>

          {/* Row 0: Expense / Income toggle */}
          <SegmentedControl<TransactionType>
            options={[
              { label: 'Expense', value: 'expense' },
              { label: 'Income', value: 'income' },
            ]}
            selected={transactionType}
            onSelect={setTransactionType}
          />

          {/* Row 1: Amount + Currency + Tags */}
          <View style={styles.row}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Amount</Text>
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
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      showSoftInputOnFocus={true}
                      value={value}
                      onChangeText={onChange}
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

          {/* Row 2+3: Category */}
          <View style={styles.row}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Category</Text>
            <CategoryPicker
              categories={currentCategories}
              selectedPath={categoryPath}
              onSelect={(path) => {
                Keyboard.dismiss();
                setCategoryPath(path);
              }}
              frequentCategories={frequentCats}
              onEditCategories={() => router.push('/category-edit')}
            />
          </View>

          {/* Row 4: Date */}
          <View style={styles.row}>
            <Text style={[styles.sectionLabel, { color: theme.text.secondary }]}>Date</Text>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
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

          {/* Row 5: Title */}
          <View
            style={styles.row}
            onLayout={(e) => { titleRowY.current = e.nativeEvent.layout.y; }}
          >
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Title (optional)"
                  placeholder="e.g. Lunch at cafe"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  onFocus={() => scrollToInput(titleRowY)}
                />
              )}
            />
          </View>

          {/* Row 7: Description */}
          <View
            style={styles.row}
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
                />
              )}
            />
          </View>

          {/* Spacer — room for floating button + tab bar */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Update Button — sits above the custom tab bar */}
        <View style={[styles.floatingBtnContainer, { bottom: tabBarHeight, backgroundColor: `${theme.background}F2` }]}>
          <Button
            title="Update"
            onPress={handleSubmit(onSubmit)}
            disabled={!canSave}
            loading={updateMutation.isPending}
            size="lg"
            style={styles.saveBtn}
          />
        </View>

        {/* Custom bottom tab bar — all icons inactive */}
        <View style={[
          styles.customTabBar,
          {
            height: tabBarHeight,
            paddingBottom: Math.max(insets.bottom, 4),
            backgroundColor: theme.cardBackground,
            borderTopColor: theme.border,
          },
        ]}>
          {TAB_ITEMS.map((tab) => (
            <TouchableOpacity
              key={tab.route}
              style={styles.tabItem}
              onPress={() => router.replace(tab.route as any)}
              activeOpacity={0.6}
            >
              <Ionicons name={tab.icon} size={24} color={theme.text.tertiary} />
              <Text style={[styles.tabLabel, { color: theme.text.tertiary }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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

export default function EditTransactionWithBoundary() {
  return (
    <ErrorBoundary screenName="EditTransaction">
      <EditTransactionScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  backBtn: {
    padding: SPACING.xs,
    marginLeft: -SPACING.xs,
  },
  screenTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
  },
  row: {
    marginTop: SPACING.lg,
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
  dateBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateText: {
    fontSize: FONT_SIZE.md,
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
  // Custom tab bar
  customTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
