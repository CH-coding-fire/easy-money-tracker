import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../hooks/useTheme';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/spacing';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarPickerProps {
  visible: boolean;
  value: Date;
  onSelect: (date: Date) => void;
  onCancel: () => void;
}

/** Return the number of days in a given month (1-indexed month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Clamp a day to the max days in a given year/month. */
function clampDay(day: number, year: number, month: number): number {
  return Math.min(day, daysInMonth(year, month));
}

export function CalendarPicker({ visible, value, onSelect, onCancel }: CalendarPickerProps) {
  const theme = useTheme();

  // The "viewing" month/year (what month the calendar shows)
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());

  // The day-of-month to carry across months when navigating
  const [anchorDay, setAnchorDay] = useState(value.getDate());

  // Reset everything when modal opens so it always reflects the current value prop
  React.useEffect(() => {
    if (visible) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
      setAnchorDay(value.getDate());
    }
  }, [visible]);

  // The highlighted day in the current viewing month (clamped)
  const highlightedDay = useMemo(
    () => clampDay(anchorDay, viewYear, viewMonth),
    [anchorDay, viewYear, viewMonth],
  );

  // Navigate to the previous month
  const goToPrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  // Navigate to the next month
  const goToNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  // Build the grid of day cells
  const calendarGrid = useMemo(() => {
    const totalDays = daysInMonth(viewYear, viewMonth);
    // Day of week for the 1st (0 = Sunday)
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const cells: (number | null)[] = [];
    // Leading blanks
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    // Trailing blanks to fill last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  // When user taps a day → immediately confirm
  const handleDayPress = useCallback(
    (day: number) => {
      const picked = new Date(viewYear, viewMonth, day);
      onSelect(picked);
    },
    [viewYear, viewMonth, onSelect],
  );

  const isToday = (day: number) => {
    const now = new Date();
    return (
      day === now.getDate() &&
      viewMonth === now.getMonth() &&
      viewYear === now.getFullYear()
    );
  };

  const cellSize = Math.floor((Dimensions.get('window').width - SPACING.lg * 2 - SPACING.md * 2) / 7);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: theme.cardBackground }]} onPress={() => {}}>
          {/* Month / Year header */}
          <View style={styles.header}>
            <Pressable onPress={goToPrevMonth} hitSlop={12} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.text.primary} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: theme.text.primary }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={goToNextMonth} hitSlop={12} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={theme.text.primary} />
            </Pressable>
          </View>

          {/* Day-of-week labels */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((d, i) => (
              <View key={i} style={[styles.cell, { width: cellSize, height: 32 }]}>
                <Text style={[styles.weekDay, { color: theme.text.tertiary }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.grid}>
            {calendarGrid.map((day, idx) => {
              if (day === null) {
                return <View key={`blank-${idx}`} style={[styles.cell, { width: cellSize, height: cellSize }]} />;
              }
              const isHighlighted = day === highlightedDay;
              const todayMark = isToday(day);
              return (
                <Pressable
                  key={`day-${day}`}
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize },
                  ]}
                  onPress={() => handleDayPress(day)}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      isHighlighted && { backgroundColor: theme.primary },
                      todayMark && !isHighlighted && {
                        borderWidth: 1.5,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: theme.text.primary },
                        isHighlighted && { color: '#FFFFFF', fontWeight: '700' },
                        todayMark && !isHighlighted && { color: theme.primary, fontWeight: '700' },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Cancel at the bottom */}
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={[styles.cancelText, { color: theme.text.secondary }]}>CANCEL</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    width: '88%',
    maxWidth: 380,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.md,
  },
  navBtn: {
    padding: SPACING.xs,
  },
  monthLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  weekDay: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: FONT_SIZE.md,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  cancelText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
});
