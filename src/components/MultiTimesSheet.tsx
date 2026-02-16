import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { CalendarPicker } from './CalendarPicker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SegmentedControl } from './SegmentedControl';
import { Button } from './Button';
import { useTheme } from '../hooks/useTheme';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/spacing';
import { formatISODate, generateMultiDates } from '../utils/dateHelpers';

export type MultiTimesFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface MultiTimesConfig {
  startDate: Date;
  frequency: MultiTimesFrequency;
  count: number;
}

interface MultiTimesSheetProps {
  visible: boolean;
  initialDate: Date;
  initialConfig?: MultiTimesConfig;
  onConfirm: (config: MultiTimesConfig) => void;
  onCancel: () => void;
}

export function MultiTimesSheet({
  visible,
  initialDate,
  initialConfig,
  onConfirm,
  onCancel,
}: MultiTimesSheetProps) {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(initialConfig?.startDate ?? initialDate);
  const [frequency, setFrequency] = useState<MultiTimesFrequency>(initialConfig?.frequency ?? 'monthly');
  const [countText, setCountText] = useState(String(initialConfig?.count ?? 2));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sync when modal opens with new initialDate/initialConfig
  useEffect(() => {
    if (visible) {
      setStartDate(initialConfig?.startDate ?? initialDate);
      setFrequency(initialConfig?.frequency ?? 'monthly');
      setCountText(String(initialConfig?.count ?? 2));
      setShowDatePicker(false);
    }
  }, [visible]);

  const count = Math.max(2, parseInt(countText, 10) || 2);

  // Generate preview dates (show max 6, with ellipsis if more)
  const previewDates = generateMultiDates(startDate, frequency, count);
  const maxPreview = 6;
  const showEllipsis = previewDates.length > maxPreview;
  const displayDates = showEllipsis ? previewDates.slice(0, maxPreview) : previewDates;

  const frequencyLabel: Record<MultiTimesFrequency, string> = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    yearly: 'year',
  };

  function handleConfirm() {
    onConfirm({ startDate, frequency, count });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text.primary }]}>Multi-times Setup</Text>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Ionicons name="close" size={24} color={theme.text.secondary} />
            </Pressable>
          </View>

          {/* Start Date */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>Start Date</Text>
            <Pressable
              style={[styles.dateBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={theme.text.secondary} />
              <Text style={[styles.dateText, { color: theme.text.primary }]}>
                {formatISODate(startDate)}
              </Text>
            </Pressable>
            <CalendarPicker
              visible={showDatePicker}
              value={startDate}
              onSelect={(date) => {
                setStartDate(date);
                setShowDatePicker(false);
              }}
              onCancel={() => setShowDatePicker(false)}
            />
          </View>

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>Repeat Every</Text>
            <SegmentedControl<MultiTimesFrequency>
              options={[
                { label: 'Daily', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Yearly', value: 'yearly' },
              ]}
              selected={frequency}
              onSelect={setFrequency}
            />
          </View>

          {/* Count */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.text.secondary }]}>How Many Times</Text>
            <View style={styles.countRow}>
              <Pressable
                style={[styles.countBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setCountText(String(Math.max(2, count - 1)))}
              >
                <Ionicons name="remove" size={20} color={theme.text.primary} />
              </Pressable>
              <TextInput
                style={[styles.countInput, {
                  color: theme.text.primary,
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                }]}
                value={countText}
                onChangeText={(v) => setCountText(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                textAlign="center"
                selectTextOnFocus
              />
              <Pressable
                style={[styles.countBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => setCountText(String(count + 1))}
              >
                <Ionicons name="add" size={20} color={theme.text.primary} />
              </Pressable>
              <Text style={[styles.countSuffix, { color: theme.text.secondary }]}>
                {frequencyLabel[frequency]}{count !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Preview */}
          <View style={[styles.previewBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.previewTitle, { color: theme.text.secondary }]}>
              {count} transactions will be created:
            </Text>
            <Text style={[styles.previewDates, { color: theme.text.tertiary }]}>
              {displayDates.map((d) => formatISODate(d)).join(', ')}
              {showEllipsis ? ` ... +${previewDates.length - maxPreview} more` : ''}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onCancel}
              style={{ flex: 1 }}
            />
            <Button
              title="Confirm"
              variant="primary"
              onPress={handleConfirm}
              disabled={count < 2}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  dateText: {
    fontSize: FONT_SIZE.md,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  countBtn: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countInput: {
    width: 70,
    height: 44,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  countSuffix: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
  previewBox: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  previewDates: {
    fontSize: FONT_SIZE.xs,
    lineHeight: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
});
