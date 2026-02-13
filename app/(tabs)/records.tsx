import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { Card } from '../../src/components/Card';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { useTransactions, useDeleteTransaction } from '../../src/hooks/useTransactions';
import { useUIStore } from '../../src/store/uiStore';
import { Transaction } from '../../src/types';
import { getCurrencySymbol } from '../../src/constants/currencies';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants/spacing';
import { logger } from '../../src/utils/logger';

const TAG = 'EditRecordsScreen';

function EditRecordsScreen() {
  const router = useRouter();
  const transactions = useTransactions();
  const deleteMutation = useDeleteTransaction();
  const { setEditingTransactionId, setTransactionType } = useUIStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');

  const filtered = useMemo(() => {
    let result = [...transactions];

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((t) => t.type === filterType);
    }

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          (t.title?.toLowerCase().includes(q)) ||
          (t.description?.toLowerCase().includes(q)) ||
          t.categoryPath.some((c) => c.toLowerCase().includes(q)) ||
          String(t.amount).includes(q) ||
          t.date.includes(q)
      );
    }

    // Sort by date (newest first)
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [transactions, search, filterType]);

  function handleEdit(tx: Transaction) {
    logger.info(TAG, 'Edit transaction', { id: tx.id });
    setEditingTransactionId(tx.id);
    setTransactionType(tx.type);
    router.push('/(tabs)');
  }

  function handleDelete(tx: Transaction) {
    Alert.alert(
      'Delete Transaction',
      `Delete ${tx.type} of ${getCurrencySymbol(tx.currency)}${tx.amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(tx.id);
            logger.info(TAG, 'Transaction deleted', { id: tx.id });
          },
        },
      ]
    );
  }

  function renderTransaction({ item }: { item: Transaction }) {
    const isExpense = item.type === 'expense';
    return (
      <Card style={styles.txCard}>
        <View style={styles.txRow}>
          <View style={styles.txInfo}>
            <View style={styles.txHeader}>
              <Text style={[styles.txAmount, { color: isExpense ? '#F44336' : '#4CAF50' }]}>
                {isExpense ? '-' : '+'}{getCurrencySymbol(item.currency)}{item.amount.toFixed(2)}
              </Text>
              <Text style={styles.txDate}>{item.date}</Text>
            </View>
            <Text style={styles.txCategory} numberOfLines={1}>
              {item.categoryPath.join(' > ')}
            </Text>
            {item.title && (
              <Text style={styles.txTitle} numberOfLines={1}>{item.title}</Text>
            )}
            {item.description && (
              <Text style={styles.txDesc} numberOfLines={2}>{item.description}</Text>
            )}
            {item.isRecurring && (
              <Text style={styles.txRecurring}>🔄 Recurring</Text>
            )}
          </View>
          <View style={styles.txActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
              <Text style={styles.editText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.screenTitle}>Records</Text>

      {/* Search bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by title, category, amount, date..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#999"
      />

      {/* Type filter */}
      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, filterType === type && styles.filterChipActive]}
            onPress={() => setFilterType(type)}
          >
            <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
              {type === 'all' ? 'All' : type === 'expense' ? '💸 Expense' : '💵 Income'}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.countText}>{filtered.length} records</Text>
      </View>

      {/* Records list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>
              {search ? 'No records match your search' : 'No records yet'}
            </Text>
            {!search && (
              <Text style={styles.emptyHint}>Add a transaction to get started</Text>
            )}
          </View>
        }
      />
    </ScreenContainer>
  );
}

export default function EditRecordsWithBoundary() {
  return (
    <ErrorBoundary screenName="EditRecords">
      <EditRecordsScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: '#222',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    backgroundColor: '#fff',
    marginBottom: SPACING.sm,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#E0E0E0',
  },
  filterChipActive: { backgroundColor: '#2196F3' },
  filterText: { fontSize: FONT_SIZE.xs, color: '#555', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  countText: {
    fontSize: FONT_SIZE.xs,
    color: '#999',
    marginLeft: 'auto',
  },
  list: { paddingBottom: SPACING.xxxl },
  txCard: { marginBottom: SPACING.sm },
  txRow: { flexDirection: 'row', alignItems: 'flex-start' },
  txInfo: { flex: 1 },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txAmount: { fontSize: FONT_SIZE.lg, fontWeight: '800' },
  txDate: { fontSize: FONT_SIZE.xs, color: '#999' },
  txCategory: { fontSize: FONT_SIZE.sm, color: '#666', marginTop: 2 },
  txTitle: { fontSize: FONT_SIZE.sm, color: '#333', fontWeight: '500', marginTop: 2 },
  txDesc: { fontSize: FONT_SIZE.xs, color: '#888', marginTop: 2 },
  txRecurring: { fontSize: FONT_SIZE.xs, color: '#FF9800', marginTop: 4 },
  txActions: { marginLeft: SPACING.md, gap: SPACING.xs },
  editBtn: { padding: SPACING.xs },
  editText: { fontSize: 20 },
  deleteBtn: { padding: SPACING.xs },
  deleteText: { fontSize: 20 },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.lg, color: '#666', fontWeight: '600' },
  emptyHint: { fontSize: FONT_SIZE.sm, color: '#999', marginTop: SPACING.xs },
});
