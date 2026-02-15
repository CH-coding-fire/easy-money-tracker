import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Svg, { Line, G, Text as SvgText } from 'react-native-svg';
import { FONT_SIZE } from '../constants/spacing';
import { useTheme } from '../hooks/useTheme';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PieDataItem {
  value: number;
  text: string;
  color: string;
  children?: Record<string, number>;
}

interface PieChartWithLabelsProps {
  data: PieDataItem[];
  radius?: number;
  innerRadius?: number;
  centerLabel?: string;
  currency: string;
  onSlicePress?: (item: PieDataItem) => void;
  /** Name of the currently-expanded category (shows a highlight on that label) */
  expandedCategory?: string | null;
  containerWidth: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface ComputedLabel {
  /** mid-angle of slice in degrees (-90 = 12 o'clock) */
  angle: number;
  isRight: boolean;
  /** Y of the label (before overlap fix) */
  rawY: number;
  /** Y of the label (after overlap fix) */
  y: number;
  item: PieDataItem;
  pct: number;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PieChartWithLabels({
  data,
  radius: radiusProp = 80,
  innerRadius: innerRadiusProp = 40,
  centerLabel,
  currency,
  onSlicePress,
  expandedCategory,
  containerWidth,
}: PieChartWithLabelsProps) {
  const theme = useTheme();
  const total = useMemo(
    () => data.reduce((s, d) => s + d.value, 0),
    [data],
  );

  /* ---- Responsive sizing ----------------------------------------- */
  // Ensure at least 70 px on each side for labels.
  const LABEL_MIN_WIDTH = 70;
  const LINE_GAP = 14; // radial gap between pie edge and elbow
  const maxRadius = (containerWidth / 2) - LABEL_MIN_WIDTH - LINE_GAP;
  const pieRadius = Math.max(45, Math.min(radiusProp, maxRadius));
  const pieInnerRadius = Math.round(pieRadius * (innerRadiusProp / radiusProp));

  const centerX = containerWidth / 2;
  // The chart area: pie + labels.  Height = 2*(pieRadius + verticalPadding)
  const verticalPad = 60;                       // room above & below pie for labels
  const chartH = (pieRadius + verticalPad) * 2;
  const centerY = chartH / 2;

  /* ---- Build label list ------------------------------------------ */
  const labels = useMemo((): ComputedLabel[] => {
    if (data.length === 0 || total === 0) return [];

    let cur = -90; // start at 12 o'clock
    return data.map((item) => {
      const pct = (item.value / total) * 100;
      const slice = (item.value / total) * 360;
      const mid = cur + slice / 2;
      cur += slice;

      const rad = toRad(mid);
      const isRight = Math.cos(rad) >= 0;
      const rawY = centerY + (pieRadius + 24) * Math.sin(rad);

      return { angle: mid, isRight, rawY, y: rawY, item, pct };
    });
  }, [data, total, pieRadius, centerY]);

  /* ---- De-overlap labels ----------------------------------------- */
  const positioned = useMemo(() => {
    if (labels.length === 0) return [];

    const clone = labels.map((l) => ({ ...l }));
    const left = clone.filter((l) => !l.isRight).sort((a, b) => a.rawY - b.rawY);
    const right = clone.filter((l) => l.isRight).sort((a, b) => a.rawY - b.rawY);

    const ROW_H = 38; // height of one label row (allows 2-line names)

    const deOverlap = (arr: ComputedLabel[]) => {
      // push down
      for (let i = 1; i < arr.length; i++) {
        if (arr[i].y - arr[i - 1].y < ROW_H) {
          arr[i].y = arr[i - 1].y + ROW_H;
        }
      }
      // if last label overflows bottom, shift everything up
      const maxY = chartH - 16;
      if (arr.length && arr[arr.length - 1].y > maxY) {
        const shift = arr[arr.length - 1].y - maxY;
        arr.forEach((l) => (l.y -= shift));
      }
      // clamp top
      const minY = 16;
      arr.forEach((l) => {
        if (l.y < minY) l.y = minY;
      });
      // final push-down after clamp
      for (let i = 1; i < arr.length; i++) {
        if (arr[i].y - arr[i - 1].y < ROW_H) {
          arr[i].y = arr[i - 1].y + ROW_H;
        }
      }
    };

    deOverlap(left);
    deOverlap(right);

    return [...left, ...right];
  }, [labels, chartH]);

  /* ---- Leader lines ----------------------------------------------- */
  const lines = useMemo(() => {
    return positioned.map((l) => {
      const rad = toRad(l.angle);

      // p1 – on pie edge
      const x1 = centerX + pieRadius * Math.cos(rad);
      const y1 = centerY + pieRadius * Math.sin(rad);

      // p2 – elbow (extend outward)
      const elbowR = pieRadius + LINE_GAP;
      const x2 = centerX + elbowR * Math.cos(rad);
      const y2 = centerY + elbowR * Math.sin(rad);

      // p3 – horizontal end, near the label
      const HORIZ_GAP = 4;
      const x3 = l.isRight
        ? Math.max(x2, centerX + pieRadius + LINE_GAP) + HORIZ_GAP
        : Math.min(x2, centerX - pieRadius - LINE_GAP) - HORIZ_GAP;
      const y3 = l.y;

      return { x1, y1, x2, y2, x3, y3, color: l.item.color };
    });
  }, [positioned, pieRadius, centerX, centerY, LINE_GAP]);

  /* ---- Percentage positions (inside the slices) -------------------- */
  const slicePctLabels = useMemo(() => {
    if (data.length === 0 || total === 0) return [];
    const midR = (pieRadius + pieInnerRadius) / 2;
    let cur = -90;
    return data.map((item) => {
      const pct = (item.value / total) * 100;
      const slice = (item.value / total) * 360;
      const mid = cur + slice / 2;
      cur += slice;
      const rad = toRad(mid);
      return {
        x: centerX + midR * Math.cos(rad),
        y: centerY + midR * Math.sin(rad),
        pct,
        // only show if slice is big enough to fit the text
        visible: pct >= 5,
      };
    });
  }, [data, total, pieRadius, pieInnerRadius, centerX, centerY]);

  /* ---- Available width for each label ----------------------------- */
  const rightLabelStart = centerX + pieRadius + LINE_GAP + 10;
  const leftLabelEnd = centerX - pieRadius - LINE_GAP - 10;
  const rightLabelWidth = containerWidth - rightLabelStart - 4;
  const leftLabelWidth = leftLabelEnd - 4;

  if (data.length === 0) return null;

  return (
    <View style={[styles.container, { width: containerWidth }]}>
      {/* Donut */}
      <View style={[styles.pieWrap, { width: containerWidth, height: chartH }]}>
        <View
          style={{
            position: 'absolute',
            top: centerY - pieRadius,
            left: centerX - pieRadius,
          }}
        >
          <PieChart
            data={data.map((d) => ({
              value: d.value,
              color: d.color,
              text: d.text,
            }))}
            radius={pieRadius}
            donut
            innerRadius={pieInnerRadius}
            centerLabelComponent={() =>
              centerLabel ? (
                <Text style={[styles.centerLabel, { color: '#222222' }]}>{centerLabel}</Text>
              ) : null
            }
            showText={false}
            focusOnPress={false}
          />
        </View>

        {/* SVG: leader lines */}
        <Svg
          width={containerWidth}
          height={chartH}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {lines.map((ln, i) => (
            <G key={i}>
              <Line
                x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2}
                stroke={ln.color} strokeWidth="1.2" opacity={0.55}
              />
              <Line
                x1={ln.x2} y1={ln.y2} x2={ln.x3} y2={ln.y3}
                stroke={ln.color} strokeWidth="1.2" opacity={0.55}
              />
            </G>
          ))}
          {/* Percentage labels inside pie slices */}
          {slicePctLabels.map((s, i) =>
            s.visible ? (
              <SvgText
                key={`pct-${i}`}
                x={s.x}
                y={s.y + 4}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#fff"
              >
                {Math.round(s.pct)}%
              </SvgText>
            ) : null,
          )}
        </Svg>

        {/* Labels (native Text for crisp rendering & accessibility) */}
        {positioned.map((l, i) => {
          const hasChildren = l.item.children && Object.keys(l.item.children).length > 0;
          const isExpanded = expandedCategory === l.item.text;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={onSlicePress ? 0.6 : 1}
              onPress={() => onSlicePress?.(l.item)}
              style={[
                styles.labelTouch,
                l.isRight
                  ? { left: rightLabelStart, width: rightLabelWidth, top: l.y - 16 }
                  : { left: 4, width: leftLabelWidth, top: l.y - 16 },
              ]}
            >
              <View
                style={l.isRight ? styles.labelInnerRight : styles.labelInnerLeft}
              >
                <View style={styles.labelNameRow}>
                  {!l.isRight && hasChildren && (
                    <Text style={[styles.labelExpandHint, { color: isExpanded ? theme.primary : l.item.color }]}>
                      {isExpanded ? '▼' : '▶'}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.labelName,
                      { color: l.item.color },
                      isExpanded && styles.labelNameExpanded,
                    ]}
                    numberOfLines={2}
                  >
                    {l.item.text}
                  </Text>
                  {l.isRight && hasChildren && (
                    <Text style={[styles.labelExpandHint, { color: isExpanded ? theme.primary : l.item.color }]}>
                      {isExpanded ? ' ▼' : ' ▶'}
                    </Text>
                  )}
                </View>
                <Text style={[styles.labelAmount, { color: theme.text.secondary }]} numberOfLines={1}>
                  {currency} {l.item.value.toFixed(0)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  pieWrap: {
    position: 'relative',
  },
  centerLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    textAlign: 'center',
  },
  /* --- label touch target ------------------------------------------ */
  labelTouch: {
    position: 'absolute',
    justifyContent: 'center',
  },
  labelInnerRight: {
    alignItems: 'flex-start',
  },
  labelInnerLeft: {
    alignItems: 'flex-end',
  },
  labelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelName: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  labelNameExpanded: {
    textDecorationLine: 'underline',
  },
  labelExpandHint: {
    fontSize: 8,
    fontWeight: '700',
  },
  labelAmount: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
});
