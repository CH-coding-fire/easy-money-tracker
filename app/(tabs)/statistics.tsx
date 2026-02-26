import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import Ionicons from '@expo/vector-icons/Ionicons';
import { BalanceBarChart } from '../../src/components/BalanceBarChart';
import { Card } from '../../src/components/Card';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { PieChartWithLabels } from '../../src/components/PieChartWithLabels';
import { ScreenContainer } from '../../src/components/ScreenContainer';
import { SegmentedControl } from '../../src/components/SegmentedControl';

import { BORDER_RADIUS, FONT_SIZE, SPACING } from '../../src/constants/spacing';
import { useFxRates } from '../../src/hooks/useFx';
import { useSettings } from '../../src/hooks/useSettings';
import { useTheme } from '../../src/hooks/useTheme';
import { useI18n } from '../../src/hooks/useI18n';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useUIStore } from '../../src/store/uiStore';
import { DateRangePreset, StatsMode } from '../../src/types';
import {
    formatISODate,
    formatDateRange,
    getDateRange,
    parseLocalDate,
    shiftDateRange
} from '../../src/utils/dateHelpers';
import { convertCurrency } from '../../src/utils/fxConvert';
import { translateCategoryName } from '../../src/utils/categoryTranslation';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 4;
/** Let pie charts bleed into the Card padding so labels have more room. */
const PIE_BLEED = SPACING.md; // 12 px each side

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

// Will be populated with translations in the component
const DATE_PRESET_VALUES: DateRangePreset[] = [
  'today', 'this_week', 'this_month', 'this_year', 'last_7', 'last_30', 'last_365'
];

type TrendUnit = 'day' | 'week' | 'month' | 'year';

const TREND_UNIT_BY_PRESET: Record<DateRangePreset, TrendUnit> = {
  today: 'day',
  this_week: 'week',
  this_month: 'month',
  this_year: 'year',
  last_7: 'day',
  last_30: 'day',
  last_365: 'month',
};

// Removed static titles, will use t() directly in component

function formatTrendXAxisLabel(date: string, unit: TrendUnit): string {
  if (unit === 'year') return date.slice(0, 4);
  if (unit === 'month') return `${date.slice(0, 4)}-\n${date.slice(5, 7)}`;
  return `${date.slice(0, 4)}-\n${date.slice(5)}`;
}

function getTrendLabelWidth(unit: TrendUnit): number {
  if (unit === 'year') return 42;
  if (unit === 'month') return 56;
  return 72;
}

function StatisticsScreen() {
  const router = useRouter();
  const transactions = useTransactions();
  const settings = useSettings();
  const theme = useTheme();
  const { t } = useI18n();
  const { data: fxCache, isLoading: fxLoading, isFetching: fxFetching, isError: fxError, forceRefresh: fxRefresh } = useFxRates();
  const [fxRefreshing, setFxRefreshing] = useState(false);
  const [showFxRates, setShowFxRates] = useState(false);
  const {
    statsMode, setStatsMode,
    statsDatePreset, setStatsDatePreset,
    statsCurrency, setStatsCurrency,
    statsDrillCategory, setStatsDrillCategory,
    statsDrillSubCategory, setStatsDrillSubCategory,
  } = useUIStore();

  const scrollViewRef = useRef<ScrollView>(null);

  const [dateRange, setDateRange] = useState(
    getDateRange(statsDatePreset, settings.weekStartsOn)
  );
  const [trendDatePreset, setTrendDatePreset] = useState<DateRangePreset>(statsDatePreset);
  const [trendDateRange, setTrendDateRange] = useState(
    getDateRange(statsDatePreset, settings.weekStartsOn)
  );

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
  }

  function handleShift(direction: 'prev' | 'next') {
    const newRange = shiftDateRange(dateRange, direction, statsDatePreset, settings.weekStartsOn);
    setDateRange(newRange);
  }

  function handleTrendPresetChange(preset: DateRangePreset) {
    setTrendDatePreset(preset);
    setTrendDateRange(getDateRange(preset, settings.weekStartsOn));
  }

  function handleTrendShift(direction: 'prev' | 'next') {
    const newRange = shiftDateRange(trendDateRange, direction, trendDatePreset, settings.weekStartsOn);
    setTrendDateRange(newRange);
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

  const trendUnit = TREND_UNIT_BY_PRESET[trendDatePreset];
  const trendTitle = trendUnit === 'day' ? t('stats.dailyTrend')
                   : trendUnit === 'week' ? t('stats.weeklyTrend')
                   : trendUnit === 'month' ? t('stats.monthlyTrend')
                   : t('stats.yearlyTrend');

  const trendFilteredTx = useMemo(() => {
    const type = statsMode === 'expense_pie' ? 'expense'
               : statsMode === 'income_pie' ? 'income'
               : null;

    return transactions
      .filter((t) => {
        if (type && t.type !== type) return false;
        return t.date >= trendDateRange.start && t.date <= trendDateRange.end;
      })
      .map((t) => ({
        ...t,
        convertedAmount: convertCurrency(t.amount, t.currency, statsCurrency, fxCache),
      }));
  }, [transactions, statsMode, trendDateRange, statsCurrency, fxCache]);

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

    const grouped: Record<string, {
      amount: number;
      children: Record<string, { amount: number; children: Record<string, number> }>;
    }> = {};

    for (const tx of filteredTx) {
      const cat1 = tx.categoryPath[0] ?? 'Uncategorized';
      if (!grouped[cat1]) grouped[cat1] = { amount: 0, children: {} };
      grouped[cat1].amount += tx.convertedAmount;

      // When categoryPath is just [cat1] (length 1), treat it as [cat1, "Uncategorized"]
      // so that parent-only transactions appear correctly in the subcategory drill-down.
      const cat2 = tx.categoryPath.length > 1 ? tx.categoryPath[1] : 'Uncategorized';
      if (!grouped[cat1].children[cat2]) grouped[cat1].children[cat2] = { amount: 0, children: {} };
      grouped[cat1].children[cat2].amount += tx.convertedAmount;

      if (tx.categoryPath.length > 2) {
        const cat3 = tx.categoryPath[2];
        grouped[cat1].children[cat2].children[cat3] =
          (grouped[cat1].children[cat2].children[cat3] ?? 0) + tx.convertedAmount;
      }
    }

    return Object.entries(grouped)
      .map(([name, data], i) => ({
        value: Math.round(data.amount * 100) / 100,
        text: translateCategoryName(name, t),
        color: theme.chartColors[i % theme.chartColors.length],
        // Translate child keys so drill-down labels are also localized
        children: Object.fromEntries(
          Object.entries(data.children).map(([k, v]) => [translateCategoryName(k, t), v.amount]),
        ),
        // nested children for Level 3 drill-down (keys translated so lookup works)
        _l3: Object.fromEntries(
          Object.entries(data.children).map(([k, v]) => [
            translateCategoryName(k, t),
            {
              amount: v.amount,
              children: Object.fromEntries(
                Object.entries(v.children).map(([k2, v2]) => [translateCategoryName(k2, t), v2]),
              ),
            },
          ]),
        ),
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTx, statsMode, theme.chartColors, t]);

  // ── Drill-down pie data ──────────────────────────────────────────────────

  const drillPieData = useMemo(() => {
    if (!statsDrillCategory) return [];
    const parent = pieData.find((d) => d.text === statsDrillCategory);
    if (!parent) return [];
    const l3 = (parent as any)._l3 as Record<string, { amount: number; children: Record<string, number> }> | undefined;
    return Object.entries(parent.children)
      .map(([name, amount], i) => ({
        value: Math.round(amount * 100) / 100,
        text: name,
        color: theme.chartColors[(i + 5) % theme.chartColors.length],
        children: l3?.[name]?.children,
      }))
      .sort((a, b) => b.value - a.value);
  }, [statsDrillCategory, pieData, theme.chartColors]);

  // Subtotal for the drilled category
  const drillTotal = useMemo(
    () => drillPieData.reduce((sum, d) => sum + d.value, 0),
    [drillPieData],
  );

  // ── Level-3 drill-down pie data ────────────────────────────────────────

  const drillL3PieData = useMemo(() => {
    if (!statsDrillSubCategory) return [];
    const parent = drillPieData.find((d) => d.text === statsDrillSubCategory);
    if (!parent || !parent.children || Object.keys(parent.children).length === 0) return [];
    return Object.entries(parent.children)
      .map(([name, amount], i) => ({
        value: Math.round(amount * 100) / 100,
        text: name,
        color: theme.chartColors[(i + 3) % theme.chartColors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [statsDrillSubCategory, drillPieData, theme.chartColors]);

  const drillL3Total = useMemo(
    () => drillL3PieData.reduce((sum, d) => sum + d.value, 0),
    [drillL3PieData],
  );

  // ── Bar chart data ───────────────────────────────────────────────────────

  const barData = useMemo(() => {
    if (statsMode === 'balance_line') return [];
    // Group into buckets based on selected trend unit.
    const grouped: Record<string, number> = {};

    for (const t of trendFilteredTx) {
      const d = parseLocalDate(t.date);
      let bucket = new Date(d);

      if (trendUnit === 'week') {
        const dow = bucket.getDay();
        const diff = settings.weekStartsOn === 'monday'
          ? (dow === 0 ? -6 : 1) - dow
          : -dow;
        bucket.setDate(bucket.getDate() + diff);
      } else if (trendUnit === 'month') {
        bucket = new Date(bucket.getFullYear(), bucket.getMonth(), 1);
      } else if (trendUnit === 'year') {
        bucket = new Date(bucket.getFullYear(), 0, 1);
      }

      const key = formatISODate(bucket);
      grouped[key] = (grouped[key] ?? 0) + t.convertedAmount;
    }

    const start = parseLocalDate(trendDateRange.start);
    const end = parseLocalDate(trendDateRange.end);
    const cursor = new Date(start);

    if (trendUnit === 'week') {
      const dow = cursor.getDay();
      const diff = settings.weekStartsOn === 'monday'
        ? (dow === 0 ? -6 : 1) - dow
        : -dow;
      cursor.setDate(cursor.getDate() + diff);
    } else if (trendUnit === 'month') {
      cursor.setDate(1);
    } else if (trendUnit === 'year') {
      cursor.setMonth(0, 1);
    }

    const entries: [string, number][] = [];
    while (cursor <= end) {
      const key = formatISODate(cursor);
      entries.push([key, Math.round((grouped[key] ?? 0) * 100) / 100]);

      if (trendUnit === 'day') {
        cursor.setDate(cursor.getDate() + 1);
      } else if (trendUnit === 'week') {
        cursor.setDate(cursor.getDate() + 7);
      } else if (trendUnit === 'month') {
        cursor.setMonth(cursor.getMonth() + 1, 1);
      } else {
        cursor.setFullYear(cursor.getFullYear() + 1, 0, 1);
      }
    }

    const showEveryNth = entries.length > 12 ? Math.ceil(entries.length / 6) : 1;
    const chartSpacing = 4;
    const barWidth = Math.max(8, Math.min(24, CHART_WIDTH / Math.max(entries.length, 1) - chartSpacing));
    const baseLabelWidth = barWidth + chartSpacing;

    return entries.map(([date, value], idx) => {
      const label = idx % showEveryNth === 0 ? formatTrendXAxisLabel(date, trendUnit) : '';
      const customLabelWidth = getTrendLabelWidth(trendUnit);
      const centerFixOffset = -(customLabelWidth - baseLabelWidth) / 2;

      return {
        value: Math.round(value * 100) / 100,
        label,
        labelComponent: label
          ? () => (
              <View style={{ width: customLabelWidth, marginLeft: centerFixOffset }}>
                <Text style={[styles.axisLabel, styles.trendAxisLabel, { color: theme.text.tertiary }]}>
                  {label}
                </Text>
              </View>
            )
          : undefined,
        frontColor: statsMode === 'expense_pie' ? theme.error : theme.success,
      };
    });
  }, [
    trendFilteredTx,
    trendDateRange,
    trendUnit,
    settings.weekStartsOn,
    statsMode,
    theme.error,
    theme.success,
  ]);

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
        frontColor: val >= 0 ? theme.success : theme.error,
      };
    });
  }, [transactions, statsMode, dateRange, statsCurrency, fxCache, theme.success, theme.error]);

  return (
    <ScreenContainer padBottom={false}>
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        {/* Mode selector */}
        <SegmentedControl<StatsMode>
          options={[
            { label: t('stats.expense'), value: 'expense_pie' },
            { label: t('stats.income'), value: 'income_pie' },
            { label: t('stats.balance'), value: 'balance_line' },
          ]}
          selected={statsMode}
          onSelect={(m) => setStatsMode(m)}
        />

        {/* Date range */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          {DATE_PRESET_VALUES.map((preset) => {
            const isActive = statsDatePreset === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  { backgroundColor: `${theme.primary}15` },
                  isActive && { backgroundColor: theme.primary },
                ]}
                onPress={() => handlePresetChange(preset)}
              >
                <Text style={[
                  styles.presetText,
                  { color: theme.primary },
                  isActive && { color: '#fff' },
                ]}>
                  {t(`dateRange.${preset}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Date range nav */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => handleShift('prev')} style={styles.navArrowBtn}>
            <Ionicons name="chevron-back" size={20} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.dateRangeText, { color: theme.text.secondary }]}>{formatDateRange(dateRange)}</Text>
          <TouchableOpacity onPress={() => handleShift('next')} style={styles.navArrowBtn}>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Currency Selector */}
        <Card style={styles.currencySelector}>
          <View style={styles.currencySelectorRow}>
            <View style={[styles.selectedCurrencyBtn, { backgroundColor: `${theme.primary}20` }]}>
              <Text style={[styles.selectedCurrencyText, { color: theme.primary }]}>
                {statsCurrency}
              </Text>
            </View>

            {/* Secondary currency quick-switch tags */}
            <View style={styles.currencyTagsRow}>
              {[...new Set([settings.mainCurrency, ...settings.secondaryCurrencies, ...settings.frequentCurrencies])]
                .filter(code => code !== statsCurrency)
                .slice(0, 4)
                .map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={[styles.currencyTag, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => setStatsCurrency(code)}
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

          {/* FX Update Info */}
          <View style={styles.fxInfoRow}>
            <View style={styles.fxInfoLeft}>
              {(fxFetching || fxRefreshing) ? (
                <View style={styles.fxLoadingRow}>
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.fxInfoText, { color: theme.text.tertiary }]}>{t('stats.updating')}</Text>
                </View>
              ) : fxError ? (
                <Text style={[styles.fxInfoText, { color: theme.error }]}>
                  {t('stats.updateFailed')}
                </Text>
              ) : fxCache.lastUpdatedAt ? (
                <Text style={[styles.fxInfoText, { color: theme.text.tertiary }]}>
                  {t('stats.updated')}: {new Date(fxCache.lastUpdatedAt).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })} • Source: frankfurter.app
                </Text>
              ) : (
                <Text style={[styles.fxInfoText, { color: theme.text.tertiary }]}>{t('stats.noFxRates')}</Text>
              )}
            </View>
            <View style={styles.fxActions}>
              {/* Show rates button */}
              <TouchableOpacity
                style={[styles.fxSmallBtn, { backgroundColor: theme.background }]}
                onPress={() => setShowFxRates(!showFxRates)}
              >
                <Ionicons
                  name={showFxRates ? 'chevron-up' : 'information-circle-outline'}
                  size={14}
                  color={theme.primary}
                />
              </TouchableOpacity>
              {/* Refresh button */}
              <TouchableOpacity
                style={[styles.fxSmallBtn, { backgroundColor: theme.background }]}
                disabled={fxFetching || fxRefreshing}
                onPress={async () => {
                  setFxRefreshing(true);
                  await fxRefresh();
                  setFxRefreshing(false);
                }}
              >
                <Ionicons name="refresh" size={14} color={(fxFetching || fxRefreshing) ? theme.border : theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Expandable FX rates – only currencies involved in transactions */}
          {showFxRates && fxCache.lastUpdatedAt && (
            <View style={[styles.fxRatesBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.fxRatesTitle, { color: theme.text.tertiary }]}>
                {t('stats.rates', { base: statsCurrency })}
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
                      <Text key={code} style={[styles.fxRateItem, { color: theme.text.secondary }]}>
                        {code}:{'  '}{crossRate.toFixed(4)}
                      </Text>
                    );
                  })}
                {involvedCurrencies.filter((c) => c !== statsCurrency).length === 0 && (
                  <Text style={[styles.fxRateItem, { color: theme.text.secondary }]}>
                    {t('stats.allTransactionsIn', { currency: statsCurrency })}
                  </Text>
                )}
              </View>
            </View>
          )}
        </Card>

        {/* Total */}
        {statsMode !== 'balance_line' && (
          <Card style={styles.totalCard}>
            <Text style={[styles.totalCardTitle, { color: theme.text.tertiary }]}>
              {t('stats.total')} {statsMode === 'expense_pie' ? t('stats.expense') : t('stats.income')}
            </Text>
            
            <View style={styles.totalCardContent}>
              {/* Left: Original amounts */}
              <View style={styles.totalCardLeft}>
                <Text style={[styles.totalCardSectionLabel, { color: theme.text.tertiary }]}>{t('stats.original')}</Text>
                {originalCurrencyTotals.length > 0 && (
                  <View style={styles.originalAmountsList}>
                    {originalCurrencyTotals.map(({ currency, amount }) => (
                      <Text key={currency} style={[styles.originalAmountItem, { color: theme.text.secondary }]}>
                        {currency} {amount.toFixed(2)}
                      </Text>
                    ))}
                  </View>
                )}
              </View>

              {/* Divider */}
              <View style={[styles.totalCardDivider, { backgroundColor: theme.divider }]} />

              {/* Right: Converted total */}
              <View style={styles.totalCardRight}>
                <Text style={[styles.totalCardSectionLabel, { color: theme.text.tertiary }]}>{t('stats.total')}</Text>
                <Text style={[styles.totalAmount, { color: statsMode === 'expense_pie' ? theme.error : theme.success }]}>
                  {statsCurrency}
                </Text>
                <Text style={[styles.totalAmountValue, { color: statsMode === 'expense_pie' ? theme.error : theme.success }]}>
                  {total.toFixed(2)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Charts */}
        {statsMode !== 'balance_line' && (
          <>
            {/* Pie chart – Level 1 (always visible) */}
            <Card style={styles.chartCard}>
              <Text style={[styles.chartTitle, { color: theme.text.primary }]}>{t('stats.byCategory')}</Text>
              {pieData.length > 0 ? (
                <View style={{ marginHorizontal: -PIE_BLEED }}>
                  <PieChartWithLabels
                    data={pieData}
                    radius={80}
                    innerRadius={40}
                    centerLabel={`${statsCurrency} ${total.toFixed(0)}`}
                    currency={statsCurrency}
                    expandedCategory={statsDrillCategory}
                    onSlicePress={(item) => {
                      if ('children' in item && Object.keys(item.children ?? {}).length > 0) {
                        // Toggle: tap same → collapse, tap different → expand
                        setStatsDrillCategory(
                          statsDrillCategory === item.text ? null : item.text,
                        );
                      }
                    }}
                    containerWidth={CHART_WIDTH + PIE_BLEED * 2}
                  />
                </View>
              ) : (
                <Text style={[styles.noData, { color: theme.text.tertiary }]}>{t('stats.noData')}</Text>
              )}
            </Card>

            {/* Pie chart – Level 2 (expanded subcategories) */}
            {statsDrillCategory && drillPieData.length > 0 && (
              <Card
                style={styles.chartCard}
                onLayout={(event) => {
                  const y = event.nativeEvent.layout.y;
                  // Small delay to ensure layout is fully settled
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: y - 10, animated: true });
                  }, 100);
                }}
              >
                <View style={styles.drillHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.chartTitle, { color: theme.text.primary }]}>
                      {statsDrillCategory}
                    </Text>
                    <Text style={[styles.drillSubtitle, { color: theme.text.tertiary }]}>{t('stats.drillDown')}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setStatsDrillCategory(null)}
                    style={[styles.drillCloseBtn, { backgroundColor: theme.background }]}
                  >
                    <Ionicons name="close" size={18} color={theme.text.tertiary} />
                  </TouchableOpacity>
                </View>
                <View style={{ marginHorizontal: -PIE_BLEED }}>
                  <PieChartWithLabels
                    data={drillPieData}
                    radius={70}
                    innerRadius={35}
                    centerLabel={`${statsCurrency} ${drillTotal.toFixed(0)}`}
                    currency={statsCurrency}
                    expandedCategory={statsDrillSubCategory}
                    onSlicePress={(item) => {
                      if ('children' in item && Object.keys(item.children ?? {}).length > 0) {
                        setStatsDrillSubCategory(
                          statsDrillSubCategory === item.text ? null : item.text,
                        );
                      }
                    }}
                    containerWidth={CHART_WIDTH + PIE_BLEED * 2}
                  />
                </View>
              </Card>
            )}

            {/* Pie chart – Level 3 (expanded sub-subcategories) */}
            {statsDrillSubCategory && drillL3PieData.length > 0 && (
              <Card
                style={styles.chartCard}
                onLayout={(event) => {
                  const y = event.nativeEvent.layout.y;
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: y - 10, animated: true });
                  }, 100);
                }}
              >
                <View style={styles.drillHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.chartTitle, { color: theme.text.primary }]}>
                      {statsDrillSubCategory}
                    </Text>
                    <Text style={[styles.drillSubtitle, { color: theme.text.tertiary }]}>
                      {statsDrillCategory} {'>'} {t('stats.drillDown')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setStatsDrillSubCategory(null)}
                    style={[styles.drillCloseBtn, { backgroundColor: theme.background }]}
                  >
                    <Ionicons name="close" size={18} color={theme.text.tertiary} />
                  </TouchableOpacity>
                </View>
                <View style={{ marginHorizontal: -PIE_BLEED }}>
                  <PieChartWithLabels
                    data={drillL3PieData}
                    radius={60}
                    innerRadius={30}
                    centerLabel={`${statsCurrency} ${drillL3Total.toFixed(0)}`}
                    currency={statsCurrency}
                    containerWidth={CHART_WIDTH + PIE_BLEED * 2}
                  />
                </View>
              </Card>
            )}

            {/* Bar chart */}
            <Card style={styles.chartCard}>
              <View style={styles.chartTitleRow}>
                <Text style={[styles.chartTitle, { color: theme.text.primary }]}>{trendTitle}</Text>
                <Text style={[styles.chartCurrency, { color: theme.primary, backgroundColor: `${theme.primary}20` }]}>{statsCurrency}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendPresetScroll}>
                {DATE_PRESET_VALUES.map((preset) => {
                  const isActive = trendDatePreset === preset;
                  return (
                    <TouchableOpacity
                      key={`trend-${preset}`}
                      style={[
                        styles.presetChip,
                        { backgroundColor: `${theme.primary}15` },
                        isActive && { backgroundColor: theme.primary },
                      ]}
                      onPress={() => handleTrendPresetChange(preset)}
                    >
                      <Text style={[
                        styles.presetText,
                        { color: theme.primary },
                        isActive && { color: '#fff' },
                      ]}>
                        {t(`dateRange.${preset}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={styles.trendDateNav}>
                <TouchableOpacity onPress={() => handleTrendShift('prev')} style={styles.navArrowBtn}>
                  <Ionicons name="chevron-back" size={18} color={theme.primary} />
                </TouchableOpacity>
                <Text style={[styles.dateRangeText, { color: theme.text.secondary }]}>
                  {formatDateRange(trendDateRange)}
                </Text>
                <TouchableOpacity onPress={() => handleTrendShift('next')} style={styles.navArrowBtn}>
                  <Ionicons name="chevron-forward" size={18} color={theme.primary} />
                </TouchableOpacity>
              </View>
              {barData.length > 0 ? (
                <BarChart
                  data={barData}
                  barWidth={Math.max(8, Math.min(24, CHART_WIDTH / barData.length - 4))}
                  spacing={4}
                  height={180}
                  xAxisTextNumberOfLines={2}
                  xAxisLabelsHeight={36}
                  xAxisLabelTextStyle={[styles.axisLabel, { color: theme.text.tertiary }]}
                  yAxisTextStyle={[styles.axisLabel, { color: theme.text.tertiary }]}
                  yAxisLabelWidth={40}
                  formatYLabel={formatYAxisLabel}
                  noOfSections={4}
                  width={CHART_WIDTH - 44}
                  hideRules
                  barBorderRadius={4}
                  isAnimated
                  xAxisColor={theme.border}
                  yAxisColor={theme.border}
                />
              ) : (
                <Text style={[styles.noData, { color: theme.text.tertiary }]}>{t('stats.noData')}</Text>
              )}
            </Card>
          </>
        )}

        {/* Balance bar chart */}
        {statsMode === 'balance_line' && (
          <Card style={styles.chartCard}>
            <View style={styles.chartTitleRow}>
              <Text style={[styles.chartTitle, { color: theme.text.primary }]}>Net Balance</Text>
              <Text style={[styles.chartCurrency, { color: theme.primary, backgroundColor: `${theme.primary}20` }]}>{statsCurrency}</Text>
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
    marginRight: SPACING.xs,
  },
  presetText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  navArrowBtn: { padding: SPACING.sm },
  dateRangeText: { fontSize: FONT_SIZE.sm, fontWeight: '600' },
  currencySelector: {
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  selectedCurrencyBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  selectedCurrencyText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
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
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
  },
  currencyTagText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  currencyEditBtn: {
    paddingVertical: SPACING.xs - 2,
    paddingHorizontal: SPACING.xs,
    borderRadius: 4,
    borderWidth: 1,
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
  },
  fxRatesBox: {
    marginTop: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
  },
  fxRatesTitle: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  fxRatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  fxRateItem: {
    fontSize: 9,
    fontFamily: 'monospace',
  },
  totalCard: { 
    marginBottom: SPACING.md, 
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  totalCardTitle: {
    fontSize: FONT_SIZE.xs,
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
    marginBottom: SPACING.xs,
  },
  originalAmountsList: {
    gap: SPACING.xs - 2,
  },
  originalAmountItem: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  totalCardDivider: {
    width: 1,
    height: '100%',
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
  },
  chartCurrency: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    paddingVertical: SPACING.xs - 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: 4,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  drillSubtitle: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  drillCloseBtn: {
    padding: SPACING.xs,
    borderRadius: 20,
  },
  noData: {
    textAlign: 'center',
    fontSize: FONT_SIZE.md,
    paddingVertical: SPACING.xl,
  },
  axisLabel: { fontSize: 9 },
  trendAxisLabel: {
    textAlign: 'center',
    lineHeight: 11,
  },
  trendPresetScroll: {
    marginBottom: SPACING.xs,
  },
  trendDateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
});
