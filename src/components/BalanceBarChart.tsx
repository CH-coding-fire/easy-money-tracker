import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SPACING, FONT_SIZE } from '../constants/spacing';
import { useTheme } from '../hooks/useTheme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface BalanceBarItem {
  value: number;
  label: string;
}

interface BalanceBarChartProps {
  data: BalanceBarItem[];
  height?: number;
  currency?: string;
}

/** Format large numbers with K/M suffixes */
function formatLabel(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

export function BalanceBarChart({ data, height = 200, currency }: BalanceBarChartProps) {
  const theme = useTheme();

  const { maxAbs, hasPos, hasNeg, posRatio, negRatio, yLabels } = useMemo(() => {
    if (data.length === 0) return { maxAbs: 1, hasPos: false, hasNeg: false, posRatio: 0.5, negRatio: 0.5, yLabels: [] };

    const values = data.map((d) => d.value);
    const dataMax = Math.max(...values, 0);
    const dataMin = Math.min(...values, 0);
    const absMax = Math.abs(dataMax);
    const absMin = Math.abs(dataMin);
    const maxAbs = Math.max(absMax, absMin, 1);

    const hasPos = dataMax > 0;
    const hasNeg = dataMin < 0;

    // Allocate space: proportional to the data range, with minimum 15% for the minor side
    let posRatio = 0.5;
    let negRatio = 0.5;
    if (hasPos && hasNeg) {
      posRatio = absMax / (absMax + absMin);
      negRatio = 1 - posRatio;
      // Ensure at least 15% for the smaller side
      if (posRatio < 0.15) { posRatio = 0.15; negRatio = 0.85; }
      if (negRatio < 0.15) { negRatio = 0.15; posRatio = 0.85; }
    } else if (hasPos) {
      posRatio = 0.9; negRatio = 0.1;
    } else {
      posRatio = 0.1; negRatio = 0.9;
    }

    // Y-axis labels
    const posHeight = absMax > 0 ? absMax : maxAbs * 0.1;
    const negHeight = absMin > 0 ? absMin : 0;
    const yLabels: { value: number; position: 'pos' | 'neg' | 'zero' }[] = [];

    // Positive labels
    if (hasPos) {
      yLabels.push({ value: Math.ceil(posHeight * 1.05), position: 'pos' });
      yLabels.push({ value: Math.ceil(posHeight * 0.5), position: 'pos' });
    }
    yLabels.push({ value: 0, position: 'zero' });
    // Negative labels
    if (hasNeg) {
      yLabels.push({ value: -Math.ceil(negHeight * 0.5), position: 'neg' });
      yLabels.push({ value: -Math.ceil(negHeight * 1.05), position: 'neg' });
    }

    return { maxAbs, hasPos, hasNeg, posRatio, negRatio, yLabels };
  }, [data]);

  if (data.length === 0) {
    return <Text style={[styles.noData, { color: theme.text.tertiary }]}>No data for this period</Text>;
  }

  const posAreaHeight = height * posRatio;
  const negAreaHeight = height * negRatio;

  // Scale: what's the max value each area can show
  const values = data.map((d) => d.value);
  const dataMax = Math.max(...values, 0);
  const dataMin = Math.min(...values, 0);
  const posScale = (dataMax > 0 ? dataMax : maxAbs * 0.1) * 1.1; // 10% buffer
  const negScale = (dataMin < 0 ? Math.abs(dataMin) : 1) * 1.1;

  const yAxisWidth = 42;
  // Dynamically size bars to fill available width (similar to Daily Trend chart)
  const availableWidth = SCREEN_WIDTH - SPACING.lg * 4 - yAxisWidth;
  const barSpacing = Math.max(4, Math.min(12, availableWidth / data.length * 0.2));
  const barWidth = Math.max(8, Math.min(32, (availableWidth - barSpacing * (data.length + 1)) / data.length));
  const barStep = barWidth + barSpacing;

  return (
    <View style={styles.container}>
      {/* Y-axis labels */}
      <View style={[styles.yAxis, { width: yAxisWidth }]}>
        <View style={{ height: posAreaHeight, justifyContent: 'space-between' }}>
          {hasPos ? (
            <>
              <Text style={[styles.yLabel, { color: theme.text.tertiary }]}>{formatLabel(Math.ceil(posScale))}</Text>
              <Text style={[styles.yLabel, { color: theme.text.tertiary }]}>{formatLabel(Math.ceil(posScale / 2))}</Text>
            </>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
        <Text style={[styles.yLabel, styles.zeroLabel, { color: theme.text.secondary }]}>0</Text>
        <View style={{ height: negAreaHeight, justifyContent: 'space-between' }}>
          {hasNeg ? (
            <>
              <Text style={[styles.yLabel, { color: theme.text.tertiary }]}>{formatLabel(-Math.ceil(negScale / 2))}</Text>
              <Text style={[styles.yLabel, { color: theme.text.tertiary }]}>{formatLabel(-Math.ceil(negScale))}</Text>
            </>
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </View>
      </View>

      {/* Chart area */}
      <View style={styles.chartArea}>
        {/* Positive area */}
        <View style={[styles.posArea, { height: posAreaHeight }]}>
          <View style={[styles.barsRow, { paddingLeft: barSpacing }]}>
            {data.map((item, i) => {
              const barH = item.value > 0
                ? (item.value / posScale) * posAreaHeight
                : 0;
              return (
                <View key={i} style={[styles.barColumn, { width: barWidth, marginRight: barSpacing }]}>
                  <View style={{ flex: 1 }} />
                  {barH > 0 && (
                    <View
                      style={[styles.bar, { height: barH, backgroundColor: theme.success }]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Zero line */}
        <View style={[styles.zeroLine, { backgroundColor: theme.text.secondary }]} />

        {/* Negative area */}
        <View style={[styles.negArea, { height: negAreaHeight }]}>
          <View style={[styles.barsRow, { paddingLeft: barSpacing }]}>
            {data.map((item, i) => {
              const barH = item.value < 0
                ? (Math.abs(item.value) / negScale) * negAreaHeight
                : 0;
              return (
                <View key={i} style={[styles.barColumn, { width: barWidth, marginRight: barSpacing }]}>
                  {barH > 0 && (
                    <View
                      style={[styles.bar, { height: barH, backgroundColor: theme.error }]}
                    />
                  )}
                  <View style={{ flex: 1 }} />
                </View>
              );
            })}
          </View>
        </View>

        {/* X-axis labels */}
        <View style={[styles.xLabelsRow, { height: 18 }]}>
          {data.map((item, i) => {
            if (!item.label) return null;
            const centerX = barSpacing + i * barStep + barWidth / 2;
            return (
              <Text
                key={i}
                numberOfLines={1}
                style={[styles.xLabel, {
                  color: theme.text.tertiary,
                  position: 'absolute',
                  left: centerX - 22,
                  width: 44,
                }]}
              >
                {item.label}
              </Text>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  yAxis: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: SPACING.xs,
  },
  yLabel: {
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
  zeroLabel: {
    fontWeight: '600',
  },
  chartArea: {
    flex: 1,
  },
  posArea: {
    overflow: 'hidden',
  },
  negArea: {
    overflow: 'hidden',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 3,
  },
  zeroLine: {
    height: 1,
  },
  xLabelsRow: {
    position: 'relative',
    marginTop: 4,
  },
  xLabel: {
    fontSize: 9,
    textAlign: 'center',
  },
  noData: {
    textAlign: 'center',
    fontSize: FONT_SIZE.md,
    paddingVertical: SPACING.xl,
  },
});
