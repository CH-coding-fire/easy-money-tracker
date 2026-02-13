import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { generateUUID } from '../../src/utils/uuid';

import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { CategoryPicker } from '../../src/components/CategoryPicker';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

import { useCategories } from '../../src/hooks/useCategories';
import { useSettings } from '../../src/hooks/useSettings';
import { useAddTransaction, useUpdateTransaction, useTransactions } from '../../src/hooks/useTransactions';
import { useUIStore } from '../../src/store/uiStore';
import { TransactionType, Transaction } from '../../src/types';
import { SPACING, FONT_SIZE } from '../../src/constants/spacing';
import { todayISO, nowISO, parseLocalDate, formatISODate } from '../../src/utils/dateHelpers';
import { logger } from '../../src/utils/logger';

const TAG = 'AddTransactionScreen';

const txSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine(
    (v) => !isNaN(Number(v)) && Number(v) > 0,
    'Must be a positive number'
  ),
  title: z.string().optional(),
  description: z.string().optional(),
});

type TxFormData = z.infer<typeof txSchema>;

function AddTransactionScreen() {
  const router = useRouter();
  const categories = useCategories();
  const settings = useSettings();
  const addMutation = useAddTransaction();
  const updateMutation = useUpdateTransaction();
  const transactions = useTransactions();

  const { transactionType, setTransactionType, editingTransactionId, setEditingTransactionId } = useUIStore();

  // Editing state
  const editingTx = useMemo(() => {
    if (!editingTransactionId) return null;
    return transactions.find((t) => t.id === editingTransactionId) ?? null;
  }, [editingTransactionId, transactions]);

  const [selectedCurrency, setSelectedCurrency] = useState(
    editingTx?.currency ?? settings.mainCurrency
  );
  const [categoryPath, setCategoryPath] = useState<string[]>(
    editingTx?.categoryPath ?? []
  );
  const [selectedDate, setSelectedDate] = useState(
    editingTx ? parseLocalDate(editingTx.date) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(editingTx?.isRecurring ?? false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TxFormData>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      amount: editingTx ? String(editingTx.amount) : '',
      title: editingTx?.title ?? '',
      description: editingTx?.description ?? '',
    },
  });

  // Progressive blur logic
  const [amountEntered, setAmountEntered] = useState(!!editingTx);
  const [titleEntered, setTitleEntered] = useState(!!editingTx?.title);
  const categorySelected = categoryPath.length > 0;
  const canShowRecurring = amountEntered && categorySelected;
  const canShowTitle = canShowRecurring;
  const canShowDescription = canShowTitle && titleEntered;
  const canSave = amountEntered && categorySelected;

  const currentCategories = transactionType === 'expense'
    ? categories.expense
    : categories.income;
  const frequentCats = transactionType === 'expense'
    ? settings.frequentExpenseCategories
    : settings.frequentIncomeCategories;

  async function onSubmit(data: TxFormData) {
    const now = nowISO();
    const tx: Transaction = {
      id: editingTx?.id ?? generateUUID(),
      type: transactionType,
      amount: Number(data.amount),
      currency: selectedCurrency,
      categoryPath,
      date: formatISODate(selectedDate),
      title: data.title || undefined,
      description: data.description || undefined,
      isRecurring,
      recurringRule: undefined, // TODO: recurring rule editor
      createdAt: editingTx?.createdAt ?? now,
      updatedAt: now,
    };

    try {
      if (editingTx) {
        await updateMutation.mutateAsync(tx);
        logger.info(TAG, 'Transaction updated', { id: tx.id });
        setEditingTransactionId(null);
        Alert.alert('Success', 'Transaction updated!');
      } else {
        await addMutation.mutateAsync(tx);
        logger.info(TAG, 'Transaction added', { id: tx.id });
        Alert.alert('Success', 'Transaction saved!');
      }
      // Reset form
      reset({ amount: '', title: '', description: '' });
      setCategoryPath([]);
      setSelectedDate(new Date());
      setIsRecurring(false);
      setAmountEntered(false);
      setTitleEntered(false);
    } catch (err: any) {
      logger.error(TAG, 'Save failed', err);
      Alert.alert('Error', `Failed to save: ${err.message}`);
    }
  }

  return (
    <ScreenContainer padBottom={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.screenTitle}>
            {editingTx ? 'Edit Transaction' : 'Add Transaction'}
          </Text>

          {/* Row 0: Expense / Income toggle */}
          <SegmentedControl<TransactionType>
            options={[
              { label: '💸 Expense', value: 'expense' },
              { label: '💵 Income', value: 'income' },
            ]}
            selected={transactionType}
            onSelect={setTransactionType}
          />

          {/* Row 1: Amount + Currency */}
          <Card style={styles.row}>
            <View style={styles.amountRow}>
              <TouchableOpacity
                style={styles.currencyBtn}
                onPress={() => router.push('/currency-tags')}
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
                      value={value}
                      onChangeText={(v) => {
                        onChange(v);
                        setAmountEntered(v.length > 0 && !isNaN(Number(v)) && Number(v) > 0);
                      }}
                      onBlur={onBlur}
                      error={errors.amount?.message}
                      containerStyle={{ marginBottom: 0 }}
                    />
                  )}
                />
              </View>
            </View>
          </Card>

          {/* Row 2+3: Category (frequent + full picker) */}
          <View style={[styles.row, !amountEntered && styles.blurred]}>
            <Text style={styles.sectionLabel}>Category</Text>
            <CategoryPicker
              categories={currentCategories}
              selectedPath={categoryPath}
              onSelect={setCategoryPath}
              frequentCategories={frequentCats}
            />
          </View>

          {/* Row 4: Date */}
          <View style={[styles.row, !amountEntered && styles.blurred]}>
            <Text style={styles.sectionLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
              disabled={!amountEntered}
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
          <View style={[styles.row, !canShowRecurring && styles.blurred]}>
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
          <View style={[styles.row, !canShowTitle && styles.blurred]}>
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Title (optional)"
                  placeholder="e.g. Lunch at cafe"
                  value={value}
                  onChangeText={(v) => {
                    onChange(v);
                    setTitleEntered(v.length > 0);
                  }}
                  onBlur={onBlur}
                  editable={canShowTitle}
                />
              )}
            />
          </View>

          {/* Row 7: Description */}
          <View style={[styles.row, !canShowDescription && styles.blurred]}>
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
                  multiline
                  numberOfLines={3}
                  editable={canShowDescription}
                />
              )}
            />
          </View>

          {/* Spacer for floating button */}
          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Floating Save Button */}
        <View style={styles.floatingBtnContainer}>
          <Button
            title={editingTx ? 'Update' : 'Save'}
            onPress={handleSubmit(onSubmit)}
            disabled={!canSave}
            loading={addMutation.isPending || updateMutation.isPending}
            size="lg"
            style={styles.saveBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

export default function AddTransactionWithBoundary() {
  return (
    <ErrorBoundary screenName="AddTransaction">
      <AddTransactionScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxxl },
  screenTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: '#222',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
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
});
