import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';

import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SegmentedControl } from '../../src/components/SegmentedControl';
import { Card } from '../../src/components/Card';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';

import { useTransactions } from '../../src/hooks/useTransactions';
import { useSettings } from '../../src/hooks/useSettings';
import { useFxRates } from '../../src/hooks/useFx';
import { useUIStore } from '../../src/store/uiStore';
import { StatsMode, DateRangePreset, Transaction } from '../../src/types';
import { getCurrencySymbol } from '../../src/constants/currencies';
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
  const transactions = useTransactions();
  const settings = useSettings();
  const fxCache = useFxRates();
  const {
    statsMode, setStatsMode,
    statsDatePreset, setStatsDatePreset,
    statsCurrency, setStatsCurrency,
  } = useUIStore();

  const [dateRange, setDateRange] = useState(
    getDateRange(statsDatePreset, settings.weekStartsOn)
  );
  const [drillCategory, setDrillCategory] = useState<string | null>(null);

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
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        value: Math.round(value * 100) / 100,
        label: date.slice(5), // MM-DD
        frontColor: statsMode === 'expense_pie' ? '#F44336' : '#4CAF50',
      }));
  }, [filteredTx, statsMode]);

  // ── Line chart data (balance mode) ───────────────────────────────────────

  const lineData = useMemo(() => {
    if (statsMode !== 'balance_line') return [];

    const dailyNet: Record<string, number> = {};
    for (const t of transactions) {
      if (t.date < dateRange.start || t.date > dateRange.end) continue;
      const converted = convertCurrency(t.amount, t.currency, statsCurrency, fxCache);
      const sign = t.type === 'income' ? 1 : -1;
      dailyNet[t.date] = (dailyNet[t.date] ?? 0) + sign * converted;
    }

    // Cumulative balance
    let cumulative = 0;
    return Object.entries(dailyNet)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, net]) => {
        cumulative += net;
        return {
          value: Math.round(cumulative * 100) / 100,
          label: date.slice(5),
          dataPointText: '',
        };
      });
  }, [transactions, statsMode, dateRange, statsCurrency, fxCache]);

  const sym = getCurrencySymbol(statsCurrency);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Statistics</Text>

        {/* Mode selector */}
        <SegmentedControl<StatsMode>
          options={[
            { label: '💸 Expense', value: 'expense_pie' },
            { label: '💵 Income', value: 'income_pie' },
            { label: '📈 Balance', value: 'balance_line' },
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
          <TouchableOpacity onPress={() => handleShift('prev')}>
            <Text style={styles.navArrow}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.dateRangeText}>{formatDateRange(dateRange)}</Text>
          <TouchableOpacity onPress={() => handleShift('next')}>
            <Text style={styles.navArrow}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Currency */}
        <Text style={styles.currencyInfo}>
          Currency: {sym} {statsCurrency}
        </Text>

        {/* Total */}
        {statsMode !== 'balance_line' && (
          <Card style={styles.totalCard}>
            <Text style={styles.totalLabel}>
              Total {statsMode === 'expense_pie' ? 'Expense' : 'Income'}
            </Text>
            <Text style={[styles.totalAmount, { color: statsMode === 'expense_pie' ? '#F44336' : '#4CAF50' }]}>
              {sym}{total.toFixed(2)}
            </Text>
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
                  <Text style={styles.backToPieText}>← Back to overview</Text>
                </TouchableOpacity>
              )}
              {(drillCategory ? drillPieData : pieData).length > 0 ? (
                <View style={styles.pieContainer}>
                  <PieChart
                    data={(drillCategory ? drillPieData : pieData).map((d) => ({
                      value: d.value,
                      color: d.color,
                      text: d.text,
                    }))}
                    radius={80}
                    donut
                    innerRadius={40}
                    centerLabelComponent={() => (
                      <Text style={styles.pieCenter}>{sym}{total.toFixed(0)}</Text>
                    )}
                    showText={false}
                  />
                  {/* Legend */}
                  <View style={styles.legend}>
                    {(drillCategory ? drillPieData : pieData).map((d) => (
                      <TouchableOpacity
                        key={d.text}
                        style={styles.legendItem}
                        onPress={() => {
                          if (!drillCategory && 'children' in d && Object.keys((d as any).children ?? {}).length > 0) {
                            setDrillCategory(d.text);
                          }
                        }}
                      >
                        <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                        <Text style={styles.legendText} numberOfLines={1}>
                          {d.text}
                        </Text>
                        <Text style={styles.legendValue}>{sym}{d.value.toFixed(0)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.noData}>No data for this period</Text>
              )}
            </Card>

            {/* Bar chart */}
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Daily Trend</Text>
              {barData.length > 0 ? (
                <BarChart
                  data={barData}
                  barWidth={Math.max(8, Math.min(24, CHART_WIDTH / barData.length - 4))}
                  spacing={4}
                  xAxisLabelTextStyle={styles.axisLabel}
                  yAxisTextStyle={styles.axisLabel}
                  noOfSections={4}
                  width={CHART_WIDTH}
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

        {/* Balance line chart */}
        {statsMode === 'balance_line' && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Net Balance Over Time</Text>
            {lineData.length > 0 ? (
              <LineChart
                data={lineData}
                width={CHART_WIDTH}
                height={200}
                color="#2196F3"
                thickness={2}
                dataPointsColor="#2196F3"
                xAxisLabelTextStyle={styles.axisLabel}
                yAxisTextStyle={styles.axisLabel}
                noOfSections={4}
                hideRules
                curved
                isAnimated
                startFillColor="rgba(33,150,243,0.15)"
                endFillColor="rgba(33,150,243,0.01)"
                areaChart
              />
            ) : (
              <Text style={styles.noData}>No data for this period</Text>
            )}
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
  navArrow: { fontSize: 20, color: '#2196F3', padding: SPACING.sm },
  dateRangeText: { fontSize: FONT_SIZE.sm, color: '#555', fontWeight: '600' },
  currencyInfo: {
    fontSize: FONT_SIZE.xs,
    color: '#888',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  totalCard: { alignItems: 'center', marginBottom: SPACING.md },
  totalLabel: { fontSize: FONT_SIZE.sm, color: '#666' },
  totalAmount: { fontSize: FONT_SIZE.xxl, fontWeight: '900' },
  chartCard: { marginBottom: SPACING.md },
  chartTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: '#333',
    marginBottom: SPACING.md,
  },
  backToPie: { marginBottom: SPACING.sm },
  backToPieText: { fontSize: FONT_SIZE.sm, color: '#2196F3', fontWeight: '600' },
  pieContainer: { alignItems: 'center' },
  pieCenter: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: '#222' },
  legend: { marginTop: SPACING.md, width: '100%' },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  legendText: { flex: 1, fontSize: FONT_SIZE.xs, color: '#555' },
  legendValue: { fontSize: FONT_SIZE.xs, color: '#333', fontWeight: '700' },
  noData: {
    textAlign: 'center',
    color: '#999',
    fontSize: FONT_SIZE.md,
    paddingVertical: SPACING.xl,
  },
  axisLabel: { fontSize: 9, color: '#999' },
});
