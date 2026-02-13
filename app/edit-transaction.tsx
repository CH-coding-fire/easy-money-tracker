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
import DateTimePicker from '@react-native-community/datetimepicker';
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

  // If transaction not found, show error
  if (!editingTx) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
          <Text style={styles.errorText}>Transaction not found</Text>
          <Button title="Go Back" onPress={() => router.back()} size="md" />
        </View>
      </ScreenContainer>
    );
  }

  // All state is initialized from the transaction being edited — completely independent
  const [transactionType, setTransactionType] = useState<TransactionType>(editingTx.type);
  const [selectedCurrency, setSelectedCurrency] = useState(editingTx.currency);
  const [categoryPath, setCategoryPath] = useState<string[]>([...editingTx.categoryPath]);
  const [selectedDate, setSelectedDate] = useState(parseLocalDate(editingTx.date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(editingTx.isRecurring);
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
      amount: String(editingTx.amount),
      title: editingTx.title ?? '',
      description: editingTx.description ?? '',
    },
  });

  // Watch form values for change detection
  const formValues = watch();

  // Snapshot of original values for change detection
  const original = useMemo(() => ({
    amount: editingTx.amount,
    currency: editingTx.currency,
    categoryPath: editingTx.categoryPath,
    date: editingTx.date,
    isRecurring: editingTx.isRecurring,
    title: editingTx.title,
    description: editingTx.description,
    type: editingTx.type,
  }), [editingTx.id]);

  // Check if form has changed
  const hasChanges = useMemo(() => {
    const currentAmount = Number(formValues.amount) || 0;
    const currentDate = formatISODate(selectedDate);

    return (
      currentAmount !== original.amount ||
      selectedCurrency !== original.currency ||
      JSON.stringify(categoryPath) !== JSON.stringify(original.categoryPath) ||
      currentDate !== original.date ||
      isRecurring !== original.isRecurring ||
      (formValues.title || '') !== (original.title || '') ||
      (formValues.description || '') !== (original.description || '') ||
      transactionType !== original.type
    );
  }, [formValues, selectedCurrency, categoryPath, selectedDate, isRecurring, transactionType, original]);

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
      isRecurring,
      recurringRule: editingTx.recurringRule,
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
    { route: '/(tabs)', label: 'Add', icon: 'wallet-outline' },
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
              <Ionicons name="arrow-back" size={24} color="#222" />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Edit Transaction</Text>
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

          {/* Row 1: Amount + Currency */}
          <Card style={styles.row}>
            <View style={styles.amountRow}>
              <TouchableOpacity
                style={styles.currencyBtn}
                onPress={() => { setCurrencySearch(''); setCurrencyPickerVisible(true); }}
                activeOpacity={0.7}
              >
                <Text style={styles.currencyText}>
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
                    />
                  )}
                />
              </View>
            </View>

            {/* Secondary currency quick-switch tags */}
            {(settings.secondaryCurrencies.length > 0 || settings.frequentCurrencies.length > 0) && (
              <View style={styles.currencyTagsRow}>
                {[...new Set([settings.mainCurrency, ...settings.secondaryCurrencies, ...settings.frequentCurrencies])]
                  .filter(code => code !== selectedCurrency)
                  .slice(0, 6)
                  .map((code) => (
                    <TouchableOpacity
                      key={code}
                      style={styles.currencyTag}
                      onPress={() => setSelectedCurrency(code)}
                    >
                      <Text style={styles.currencyTagText}>{code}</Text>
                    </TouchableOpacity>
                  ))}
                <TouchableOpacity
                  style={styles.currencyEditBtn}
                  onPress={() => router.push('/currency-tags')}
                >
                  <Ionicons name="create-outline" size={16} color="#E65100" />
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Row 2+3: Category */}
          <View style={styles.row}>
            <Text style={styles.sectionLabel}>Category</Text>
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
            <Text style={styles.sectionLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>{formatISODate(selectedDate)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setSelectedDate(date);
                }}
              />
            )}
          </View>

          {/* Row 5: One-off / Recurring */}
          <View style={styles.row}>
            <Text style={styles.sectionLabel}>Type</Text>
            <SegmentedControl
              options={[
                { label: 'One-off', value: 'oneoff' },
                { label: 'Recurring', value: 'recurring' },
              ]}
              selected={isRecurring ? 'recurring' : 'oneoff'}
              onSelect={(v) => setIsRecurring(v === 'recurring')}
            />
          </View>

          {/* Row 6: Title */}
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
        <View style={[styles.floatingBtnContainer, { bottom: tabBarHeight }]}>
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
          },
        ]}>
          {TAB_ITEMS.map((tab) => (
            <TouchableOpacity
              key={tab.route}
              style={styles.tabItem}
              onPress={() => router.replace(tab.route as any)}
              activeOpacity={0.6}
            >
              <Ionicons name={tab.icon} size={24} color="#999" />
              <Text style={styles.tabLabel}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Currency Picker Modal */}
        <Modal visible={currencyPickerVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Currency</Text>
                <Pressable onPress={() => setCurrencyPickerVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </Pressable>
              </View>
              <TextInput
                style={styles.modalSearch}
                placeholder="Search currencies..."
                value={currencySearch}
                onChangeText={setCurrencySearch}
                placeholderTextColor="#999"
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
                      style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                      onPress={() => {
                        setSelectedCurrency(item.code);
                        setCurrencyPickerVisible(false);
                        setCurrencySearch('');
                        logger.info(TAG, 'Currency selected from picker', { code: item.code });
                      }}
                    >
                      <Text style={styles.pickerSymbol}>{item.symbol}</Text>
                      <View style={styles.pickerInfo}>
                        <Text style={styles.pickerCode}>{item.code}</Text>
                        <Text style={styles.pickerName}>{item.name}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color="#1565C0" />}
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
    marginBottom: SPACING.lg,
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
    color: '#222',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZE.lg,
    color: '#666',
    fontWeight: '600',
  },
  row: {
    marginTop: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#555',
    marginBottom: SPACING.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  currencyBtn: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginTop: 2,
  },
  currencyText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#1565C0',
  },
  amountInput: {
    flex: 1,
  },
  currencyTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  currencyTag: {
    paddingVertical: SPACING.sm - 2,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 55,
    alignItems: 'center',
  },
  currencyTagText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#666',
  },
  currencyEditBtn: {
    paddingVertical: SPACING.xs - 2,
    paddingHorizontal: SPACING.xs,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginLeft: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: FONT_SIZE.md,
    color: '#222',
  },
  floatingBtnContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
    backgroundColor: 'rgba(245,245,245,0.95)',
  },
  saveBtn: {
    width: '100%',
  },
  // Currency picker modal
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
  modalSearch: {
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
  pickerRowSelected: {
    backgroundColor: '#E3F2FD',
  },
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
  // Custom tab bar
  customTabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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
    color: '#999',
    marginTop: 2,
  },
});
