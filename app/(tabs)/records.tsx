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
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { Card } from '../../src/components/Card';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { useTransactions, useDeleteTransaction } from '../../src/hooks/useTransactions';
import { useCategories } from '../../src/hooks/useCategories';
import { useTheme } from '../../src/hooks/useTheme';
import { useI18n } from '../../src/hooks/useI18n';
import { Transaction, Category } from '../../src/types';
import { UNCLASSIFIED_NAME } from '../../src/utils/categoryHelpers';
import { translateCategoryPath } from '../../src/utils/categoryTranslation';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants/spacing';
import { logger } from '../../src/utils/logger';

const TAG = 'EditRecordsScreen';

function EditRecordsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const transactions = useTransactions();
  const categories = useCategories();
  const deleteMutation = useDeleteTransaction();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [includeFuture, setIncludeFuture] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const today = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const filtered = useMemo(() => {
    let result = [...transactions];

    // Exclude future transactions unless toggled on
    if (!includeFuture) {
      result = result.filter((t) => t.date <= today);
    }

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

    // Sort by date (newest first), then by createdAt time (newest first) for same-date entries
    result.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.createdAt.localeCompare(a.createdAt);
    });
    return result;
  }, [transactions, search, filterType, includeFuture, today]);

  function handleEdit(tx: Transaction) {
    logger.info(TAG, 'Edit transaction', { id: tx.id });
    router.push(`/edit-transaction?id=${tx.id}`);
  }

  function handleDelete(tx: Transaction) {
    Alert.alert(
      t('records.deleteConfirm'),
      t('records.deleteMessage', { type: tx.type, currency: tx.currency, amount: tx.amount }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(tx.id);
            logger.info(TAG, 'Transaction deleted', { id: tx.id });
          },
        },
      ]
    );
  }

  function formatTxDateTime(tx: Transaction): string {
    if (!showTime) return tx.date;
    try {
      const d = new Date(tx.createdAt);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${tx.date} ${hh}:${mm}`;
    } catch {
      return tx.date;
    }
  }

  /** Look up the emoji icon for a transaction's category path */
  function findIconForPath(path: string[], type: 'expense' | 'income'): string {
    const roots = type === 'expense' ? categories.expense : categories.income;
    let items: Category[] = roots;
    let icon = '📁';
    let parentIcon = '📁';
    for (const name of path) {
      const found = items.find((c) => c.name === name);
      if (found) {
        parentIcon = icon;
        icon = found.icon ?? '📁';
        items = found.children ?? [];
      } else {
        break;
      }
    }
    // When path ends with "Uncategorized", use the parent's icon instead
    if (path.length > 1 && path[path.length - 1] === UNCLASSIFIED_NAME) {
      return parentIcon;
    }
    return icon;
  }

  function renderTransaction({ item }: { item: Transaction }) {
    const isExpense = item.type === 'expense';
    const hasDetails = item.title || item.description;
    const categoryIcon = findIconForPath(item.categoryPath, item.type);
    
    return (
      <Card style={[styles.txCard, !hasDetails && styles.txCardCompact]}>
        <View style={styles.txRow}>
          <Text style={styles.txIcon}>{categoryIcon}</Text>
          <View style={styles.txInfo}>
            <View style={styles.txHeader}>
              <Text style={[styles.txAmount, { color: isExpense ? theme.error : theme.success }]}>
                {isExpense ? '-' : '+'}{item.currency} {item.amount.toFixed(2)}
              </Text>
              <Text style={[styles.txDate, { color: theme.text.tertiary }]}>{formatTxDateTime(item)}</Text>
            </View>
            <Text style={[styles.txCategory, { color: theme.text.secondary }]} numberOfLines={1}>
              {translateCategoryPath(item.categoryPath, t).join(' > ')}
            </Text>
            {item.title && (
              <Text style={[styles.txTitle, { color: theme.text.primary }]} numberOfLines={1}>{item.title}</Text>
            )}
            {item.description && (
              <Text style={[styles.txDesc, { color: theme.text.tertiary }]} numberOfLines={2}>{item.description}</Text>
            )}
            {item.isRecurring && (
              <View style={styles.txRecurringRow}>
                <Ionicons name="repeat" size={14} color={theme.warning} />
                <Text style={[styles.txRecurring, { color: theme.warning }]}> {t('transaction.multiTimes')}</Text>
              </View>
            )}
          </View>
          <View style={styles.txActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
              <Ionicons name="create-outline" size={20} color={theme.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <ScreenContainer padBottom={false}>
      {/* Search bar */}
      <TextInput
        style={[styles.searchInput, {
          borderColor: theme.border,
          backgroundColor: theme.cardBackground,
          color: theme.text.primary,
        }]}
        placeholder={t('records.search')}
        value={search}
        onChangeText={setSearch}
        placeholderTextColor={theme.text.tertiary}
      />

      {/* Type filter */}
      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as const).map((type) => {
          const isActive = filterType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                { backgroundColor: `${theme.primary}15` },
                isActive && { backgroundColor: theme.primary },
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[
                styles.filterText,
                { color: theme.primary },
                isActive && { color: '#fff' },
              ]}>
                {t(`records.${type}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.countText, { color: theme.text.tertiary }]}>{filtered.length} {t('tab.records').toLowerCase()}</Text>
      </View>

      {/* Toggle row: Include future & Show time */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={styles.toggleItem}
          onPress={() => setIncludeFuture((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={includeFuture ? 'checkbox' : 'square-outline'}
            size={20}
            color={includeFuture ? theme.primary : theme.text.tertiary}
          />
          <Text style={[styles.futureToggleText, { color: theme.text.secondary }]}>
            {t('records.includeFuture')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toggleItem}
          onPress={() => setShowTime((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showTime ? 'checkbox' : 'square-outline'}
            size={20}
            color={showTime ? theme.primary : theme.text.tertiary}
          />
          <Text style={[styles.futureToggleText, { color: theme.text.secondary }]}>
            {t('records.showTime')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Records list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={theme.border} style={{ marginBottom: SPACING.md }} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              {search ? t('records.noRecords') : t('common.empty')}
            </Text>
            {!search && (
              <Text style={[styles.emptyHint, { color: theme.text.tertiary }]}>{t('records.addToGetStarted')}</Text>
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
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
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
  },
  filterText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  countText: {
    fontSize: FONT_SIZE.xs,
    marginLeft: 'auto',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  futureToggleText: {
    fontSize: FONT_SIZE.sm,
  },
  list: { paddingBottom: SPACING.xxxl },
  txCard: { marginBottom: SPACING.sm },
  txCardCompact: { 
    paddingVertical: SPACING.md,
  },
  txRow: { flexDirection: 'row', alignItems: 'flex-start' },
  txIcon: { fontSize: 20, marginRight: SPACING.sm, marginTop: 2 },
  txInfo: { flex: 1 },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txAmount: { fontSize: FONT_SIZE.lg, fontWeight: '800' },
  txDate: { fontSize: FONT_SIZE.xs },
  txCategory: { fontSize: FONT_SIZE.sm, marginTop: 2 },
  txTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', marginTop: SPACING.xs },
  txDesc: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  txRecurringRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  txRecurring: { fontSize: FONT_SIZE.xs },
  txActions: { 
    flexDirection: 'row',
    marginLeft: SPACING.md, 
    gap: SPACING.sm,
  },
  editBtn: { padding: SPACING.xs },
  deleteBtn: { padding: SPACING.xs },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyText: { fontSize: FONT_SIZE.lg, fontWeight: '600' },
  emptyHint: { fontSize: FONT_SIZE.sm, marginTop: SPACING.xs },
});
