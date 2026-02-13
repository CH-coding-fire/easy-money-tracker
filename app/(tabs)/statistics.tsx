import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PieChart, BarChart } from 'react-native-gifted-charts';

import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { Card } from '../../src/components/Card';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { PieChartWithLabels } from '../../src/components/PieChartWithLabels';
import { BalanceBarChart } from '../../src/components/BalanceBarChart';

import { useTransactions } from '../../src/hooks/useTransactions';
import { useSettings } from '../../src/hooks/useSettings';
import { useFxRates } from '../../src/hooks/useFx';
import { useUIStore } from '../../src/store/uiStore';
import { StatsMode, DateRangePreset, Transaction } from '../../src/types';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants/spacing';
import {
  getDateRange,
  shiftDateRange,
  formatDateRange,
  parseLocalDate,
} from '../../src/utils/dateHelpers';
import { convertCurrency } from '../../src/utils/fxConvert';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 4;

/** Shorten large Y-axis numbers: 1200 → 1.2K, 1500000 → 1.5M */
function formatYAxisLabel(val: string): string {
  const n = Number(val);
  if (isNaN(n)) return val;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

const PIE_COLORS = [
  '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#795548', '#607D8B', '#E91E63', '#3F51B5',
  '#009688', '#FF5722', '#CDDC39', '#FFC107', '#8BC34A',
  '#673AB7', '#03A9F4', '#FFEB3B', '#FF6F00', '#1B5E20',
];

const DATE_PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'this_week' },
  { label: 'Month', value: 'this_month' },
  { label: 'Year', value: 'this_year' },
  { label: '7d', value: 'last_7' },
  { label: '30d', value: 'last_30' },
  { label: '365d', value: 'last_365' },
];

function StatisticsScreen() {
  const router = useRouter();
  const transactions = useTransactions();
  const settings = useSettings();
  const { data: fxCache, isLoading: fxLoading, isFetching: fxFetching, isError: fxError, forceRefresh: fxRefresh } = useFxRates();
  const [fxRefreshing, setFxRefreshing] = useState(false);
  const [showFxRates, setShowFxRates] = useState(false);
  const {
    statsMode, setStatsMode,
    statsDatePreset, setStatsDatePreset,
    statsCurrency, setStatsCurrency,
  } = useUIStore();

  const [dateRange, setDateRange] = useState(
    getDateRange(statsDatePreset, settings.weekStartsOn)
  );
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

  // Initialize statsCurrency to user's main currency (once on mount)
  const currencyInitialized = useRef(false);
  useEffect(() => {
    if (!currencyInitialized.current && settings.mainCurrency) {
      currencyInitialized.current = true;
      setStatsCurrency(settings.mainCurrency);
    }
  }, [settings.mainCurrency, setStatsCurrency]);

  // Update date range when preset changes
  function handlePresetChange(preset: DateRangePreset) {
    setStatsDatePreset(preset);
    setDateRange(getDateRange(preset, settings.weekStartsOn));
    setDrillCategory(null);
  }

  function handleShift(direction: 'prev' | 'next') {
    const newRange = shiftDateRange(dateRange, direction, statsDatePreset, settings.weekStartsOn);
    setDateRange(newRange);
    setDrillCategory(null);
  }

  // Currencies involved in ALL transactions within the date range (regardless of expense/income filter)
  const involvedCurrencies = useMemo(() => {
    const currencySet = new Set<string>();
    for (const t of transactions) {
      if (t.date >= dateRange.start && t.date <= dateRange.end) {
        currencySet.add(t.currency);
      }
    }
    return Array.from(currencySet);
  }, [transactions, dateRange]);

  // Filter transactions within date range + convert currency
  const filteredTx = useMemo(() => {
    const type = statsMode === 'expense_pie' ? 'expense'
               : statsMode === 'income_pie' ? 'income'
               : null; // balance = both

    return transactions
      .filter((t) => {
        if (type && t.type !== type) return false;
        return t.date >= dateRange.start && t.date <= dateRange.end;
      })
      .map((t) => ({
        ...t,
        convertedAmount: convertCurrency(t.amount, t.currency, statsCurrency, fxCache),
      }));
  }, [transactions, statsMode, dateRange, statsCurrency, fxCache]);

  const total = useMemo(
    () => filteredTx.reduce((sum, t) => sum + t.convertedAmount, 0),
    [filteredTx]
  );

  // ── Original currency totals ─────────────────────────────────────────────
  const originalCurrencyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const t of filteredTx) {
      totals[t.currency] = (totals[t.currency] ?? 0) + t.amount;
    }
    return Object.entries(totals)
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTx]);

  // ── Pie chart data ───────────────────────────────────────────────────────

  const pieData = useMemo(() => {
    if (statsMode === 'balance_line') return [];

    const grouped: Record<string, { amount: number; children: Record<string, number> }> = {};
    for (const t of filteredTx) {
      const cat1 = t.categoryPath[0] ?? 'Unclassified';
      if (!grouped[cat1]) grouped[cat1] = { amount: 0, children: {} };
      grouped[cat1].amount += t.convertedAmount;

      if (t.categoryPath.length > 1) {
        const cat2 = t.categoryPath[1];
        grouped[cat1].children[cat2] = (grouped[cat1].children[cat2] ?? 0) + t.convertedAmount;
      }
    }

    return Object.entries(grouped)
      .map(([name, data], i) => ({
        value: Math.round(data.amount * 100) / 100,
        text: name,
        color: PIE_COLORS[i % PIE_COLORS.length],
        children: data.children,
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTx, statsMode]);

  // ── Drill-down pie data ──────────────────────────────────────────────────

  const drillPieData = useMemo(() => {
    if (!drillCategory) return [];
    const parent = pieData.find((d) => d.text === drillCategory);
    if (!parent) return [];
    return Object.entries(parent.children)
      .map(([name, amount], i) => ({
        value: Math.round(amount * 100) / 100,
        text: name,
        color: PIE_COLORS[(i + 5) % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [drillCategory, pieData]);

  // ── Bar chart data ───────────────────────────────────────────────────────

  const barData = useMemo(() => {
    if (statsMode === 'balance_line') return [];
    // Group by date for stacked bars
    const grouped: Record<string, number> = {};
    for (const t of filteredTx) {
      grouped[t.date] = (grouped[t.date] ?? 0) + t.convertedAmount;
    }
    const entries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    const showEveryNth = entries.length > 10 ? Math.ceil(entries.length / 6) : 1;
    return entries.map(([date, value], idx) => ({
      value: Math.round(value * 100) / 100,
      label: idx % showEveryNth === 0 ? date.slice(5) : '',
      frontColor: statsMode === 'expense_pie' ? '#F44336' : '#4CAF50',
    }));
  }, [filteredTx, statsMode]);

  // ── Balance bar chart data ───────────────────────────────────────────────

  const balanceBarData = useMemo(() => {
    if (statsMode !== 'balance_line') return [];

    const dailyNet: Record<string, number> = {};
    for (const t of transactions) {
      if (t.date < dateRange.start || t.date > dateRange.end) continue;
      const converted = convertCurrency(t.amount, t.currency, statsCurrency, fxCache);
      const sign = t.type === 'income' ? 1 : -1;
      dailyNet[t.date] = (dailyNet[t.date] ?? 0) + sign * converted;
    }

    const entries = Object.entries(dailyNet).sort(([a], [b]) => a.localeCompare(b));
    const showEveryNth = entries.length > 10 ? Math.ceil(entries.length / 6) : 1;

    return entries.map(([date, net], idx) => {
      const val = Math.round(net * 100) / 100;
      return {
        value: val,
        label: idx % showEveryNth === 0 ? date.slice(5) : '',
        frontColor: val >= 0 ? '#4CAF50' : '#F44336',
      };
    });
  }, [transactions, statsMode, dateRange, statsCurrency, fxCache]);

  return (
    <ScreenContainer padBottom={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Mode selector */}
        <SegmentedControl<StatsMode>
          options={[
            { label: 'Expense', value: 'expense_pie' },
            { label: 'Income', value: 'income_pie' },
            { label: 'Balance', value: 'balance_line' },
          ]}
          selected={statsMode}
          onSelect={(m) => {
            setStatsMode(m);
            setDrillCategory(null);
          }}
        />

        {/* Date range */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          {DATE_PRESETS.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.presetChip, statsDatePreset === p.value && styles.presetChipActive]}
              onPress={() => handlePresetChange(p.value)}
            >
              <Text style={[styles.presetText, statsDatePreset === p.value && styles.presetTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date range nav */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => handleShift('prev')} style={styles.navArrowBtn}>
            <Ionicons name="chevron-back" size={20} color="#2196F3" />
          </TouchableOpacity>
          <Text style={styles.dateRangeText}>{formatDateRange(dateRange)}</Text>
          <TouchableOpacity onPress={() => handleShift('next')} style={styles.navArrowBtn}>
            <Ionicons name="chevron-forward" size={20} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Currency Selector */}
        <Card style={styles.currencySelector}>
          <View style={styles.currencySelectorRow}>
            <View style={styles.selectedCurrencyBtn}>
              <Text style={styles.selectedCurrencyText}>
                {statsCurrency}
              </Text>
            </View>

            {/* Secondary currency quick-switch tags */}
            <View style={styles.currencyTagsRow}>
              {[...new Set([...settings.secondaryCurrencies, ...settings.frequentCurrencies])]
                .filter(code => code !== statsCurrency)
                .slice(0, 4)
                .map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={styles.currencyTag}
                    onPress={() => setStatsCurrency(code)}
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
          </View>

          {/* FX Update Info */}
          <View style={styles.fxInfoRow}>
            <View style={styles.fxInfoLeft}>
              {(fxFetching || fxRefreshing) ? (
                <View style={styles.fxLoadingRow}>
                  <ActivityIndicator size="small" color="#2196F3" style={{ marginRight: 4 }} />
                  <Text style={styles.fxInfoText}>Updating...</Text>
                </View>
              ) : fxError ? (
                <Text style={[styles.fxInfoText, { color: '#F44336' }]}>
                  Update failed • using previous rates
                </Text>
              ) : fxCache.lastUpdatedAt ? (
                <Text style={styles.fxInfoText}>
                  Updated: {new Date(fxCache.lastUpdatedAt).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              ) : (
                <Text style={styles.fxInfoText}>No FX rates loaded</Text>
              )}
            </View>
            <View style={styles.fxActions}>
              {/* Show rates button */}
              <TouchableOpacity
                style={styles.fxSmallBtn}
                onPress={() => setShowFxRates(!showFxRates)}
              >
                <Ionicons
                  name={showFxRates ? 'chevron-up' : 'information-circle-outline'}
                  size={14}
                  color="#2196F3"
                />
              </TouchableOpacity>
              {/* Refresh button */}
              <TouchableOpacity
                style={styles.fxSmallBtn}
                disabled={fxFetching || fxRefreshing}
                onPress={async () => {
                  setFxRefreshing(true);
                  await fxRefresh();
                  setFxRefreshing(false);
                }}
              >
                <Ionicons name="refresh" size={14} color={(fxFetching || fxRefreshing) ? '#ccc' : '#2196F3'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Expandable FX rates – only currencies involved in transactions */}
          {showFxRates && fxCache.lastUpdatedAt && (
            <View style={styles.fxRatesBox}>
              <Text style={styles.fxRatesTitle}>
                Rates (base: {statsCurrency})
              </Text>
              <View style={styles.fxRatesGrid}>
                {involvedCurrencies
                  .filter((code) => code !== statsCurrency)
                  .sort()
                  .map((code) => {
                    // Compute cross-rate: 1 statsCurrency = ? code
                    const crossRate = convertCurrency(1, statsCurrency, code, fxCache);
                    if (crossRate === 1 && statsCurrency !== code) return null; // no rate available
                    return (
                      <Text key={code} style={styles.fxRateItem}>
                        {code}:{'  '}{crossRate.toFixed(4)}
                      </Text>
                    );
                  })}
                {involvedCurrencies.filter((c) => c !== statsCurrency).length === 0 && (
                  <Text style={styles.fxRateItem}>
                    All transactions are in {statsCurrency}
                  </Text>
                )}
              </View>
            </View>
          )}
        </Card>

        {/* Total */}
        {statsMode !== 'balance_line' && (
          <Card style={styles.totalCard}>
            <Text style={styles.totalCardTitle}>
              Total {statsMode === 'expense_pie' ? 'Expense' : 'Income'}
            </Text>
            
            <View style={styles.totalCardContent}>
              {/* Left: Original amounts */}
              <View style={styles.totalCardLeft}>
                <Text style={styles.totalCardSectionLabel}>Original</Text>
                {originalCurrencyTotals.length > 0 && (
                  <View style={styles.originalAmountsList}>
                    {originalCurrencyTotals.map(({ currency, amount }) => (
                      <Text key={currency} style={styles.originalAmountItem}>
                        {currency} {amount.toFixed(2)}
                      </Text>
                    ))}
                  </View>
                )}
              </View>

              {/* Divider */}
              <View style={styles.totalCardDivider} />

              {/* Right: Converted total */}
              <View style={styles.totalCardRight}>
                <Text style={styles.totalCardSectionLabel}>Total</Text>
                <Text style={[styles.totalAmount, { color: statsMode === 'expense_pie' ? '#F44336' : '#4CAF50' }]}>
                  {statsCurrency}
                </Text>
                <Text style={[styles.totalAmountValue, { color: statsMode === 'expense_pie' ? '#F44336' : '#4CAF50' }]}>
                  {total.toFixed(2)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Charts */}
        {statsMode !== 'balance_line' && (
          <>
            {/* Pie chart */}
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                {drillCategory ? `${drillCategory} breakdown` : 'By Category'}
              </Text>
              {drillCategory && (
                <TouchableOpacity onPress={() => setDrillCategory(null)} style={styles.backToPie}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="chevron-back" size={16} color="#2196F3" />
                    <Text style={styles.backToPieText}>Back to overview</Text>
                  </View>
                </TouchableOpacity>
              )}
              {(drillCategory ? drillPieData : pieData).length > 0 ? (
                <PieChartWithLabels
                  data={drillCategory ? drillPieData : pieData}
                  radius={80}
                  innerRadius={40}
                  centerLabel={`${statsCurrency} ${total.toFixed(0)}`}
                  currency={statsCurrency}
                  onSlicePress={(item) => {
                    if (!drillCategory && 'children' in item && Object.keys(item.children ?? {}).length > 0) {
                      setDrillCategory(item.text);
                    }
                  }}
                  containerWidth={SCREEN_WIDTH - SPACING.lg * 4}
                />
              ) : (
                <Text style={styles.noData}>No data for this period</Text>
              )}
            </Card>

            {/* Bar chart */}
            <Card style={styles.chartCard}>
              <View style={styles.chartTitleRow}>
                <Text style={styles.chartTitle}>Daily Trend</Text>
                <Text style={styles.chartCurrency}>{statsCurrency}</Text>
              </View>
              {barData.length > 0 ? (
                <BarChart
                  data={barData}
                  barWidth={Math.max(8, Math.min(24, CHART_WIDTH / barData.length - 4))}
                  spacing={4}
                  height={180}
                  xAxisLabelTextStyle={styles.axisLabel}
                  yAxisTextStyle={styles.axisLabel}
                  yAxisLabelWidth={40}
                  formatYLabel={formatYAxisLabel}
                  noOfSections={4}
                  width={CHART_WIDTH - 44}
                  hideRules
                  barBorderRadius={4}
                  isAnimated
                />
              ) : (
                <Text style={styles.noData}>No data for this period</Text>
              )}
            </Card>
          </>
        )}

        {/* Balance bar chart */}
        {statsMode === 'balance_line' && (
          <Card style={styles.chartCard}>
            <View style={styles.chartTitleRow}>
              <Text style={styles.chartTitle}>Net Balance</Text>
              <Text style={styles.chartCurrency}>{statsCurrency}</Text>
            </View>
            <BalanceBarChart
              data={balanceBarData}
              height={220}
              currency={statsCurrency}
            />
          </Card>
        )}

        <View style={{ height: SPACING.xxxl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

export default function StatisticsWithBoundary() {
  return (
    <ErrorBoundary screenName="Statistics">
      <StatisticsScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: '#222',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  presetScroll: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  presetChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: '#E0E0E0',
    marginRight: SPACING.xs,
  },
  presetChipActive: { backgroundColor: '#2196F3' },
  presetText: { fontSize: FONT_SIZE.xs, color: '#555', fontWeight: '600' },
  presetTextActive: { color: '#fff' },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  navArrowBtn: { padding: SPACING.sm },
  dateRangeText: { fontSize: FONT_SIZE.sm, color: '#555', fontWeight: '600' },
  currencySelector: {
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  selectedCurrencyBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  selectedCurrencyText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
    color: '#1565C0',
  },
  currencyTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    alignItems: 'center',
    flex: 1,
  },
  currencyTag: {
    paddingVertical: SPACING.xs - 2,
    paddingHorizontal: SPACING.sm,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 48,
    alignItems: 'center',
  },
  currencyTagText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: '#666',
  },
  currencyEditBtn: {
    paddingVertical: SPACING.xs - 2,
    paddingHorizontal: SPACING.xs,
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  fxInfoRow: {
    marginTop: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fxInfoLeft: {
    flex: 1,
  },
  fxInfoText: {
    fontSize: 9,
    color: '#999',
  },
  fxLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fxActions: {
    flexDirection: 'row',
    gap: 4,
  },
  fxSmallBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  fxRatesBox: {
    marginTop: SPACING.xs,
    backgroundColor: '#fafafa',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
  },
  fxRatesTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#888',
    marginBottom: 4,
  },
  fxRatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  fxRateItem: {
    fontSize: 9,
    color: '#666',
    fontFamily: 'monospace',
  },
  totalCard: { 
    marginBottom: SPACING.md, 
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  totalCardTitle: {
    fontSize: FONT_SIZE.xs,
    color: '#888',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  totalCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalCardLeft: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  totalCardSectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: '#999',
    marginBottom: SPACING.xs,
  },
  originalAmountsList: {
    gap: SPACING.xs - 2,
  },
  originalAmountItem: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#555',
  },
  totalCardDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E0E0E0',
    marginHorizontal: SPACING.sm,
  },
  totalCardRight: {
    flex: 1,
    alignItems: 'center',
    paddingLeft: SPACING.sm,
  },
  totalAmount: { 
    fontSize: FONT_SIZE.sm, 
    fontWeight: '600',
    marginBottom: SPACING.xs - 2,
  },
  totalAmountValue: { 
    fontSize: FONT_SIZE.xl, 
    fontWeight: '900',
  },
  chartCard: { marginBottom: SPACING.md },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  chartTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#333',
  },
  chartCurrency: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#1565C0',
    backgroundColor: '#E3F2FD',
    paddingVertical: SPACING.xs - 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: 4,
  },
  backToPie: { marginBottom: SPACING.sm },
  backToPieText: { fontSize: FONT_SIZE.sm, color: '#2196F3', fontWeight: '600' },
  noData: {
    textAlign: 'center',
    color: '#999',
    fontSize: FONT_SIZE.md,
    paddingVertical: SPACING.xl,
  },
  axisLabel: { fontSize: 9, color: '#999' },
});
