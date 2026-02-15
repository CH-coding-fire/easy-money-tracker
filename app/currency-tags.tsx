import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useQueryClient } from '@tanstack/react-query';
import { useSettings, useSaveSettings } from '../src/hooks/useSettings';
import { useTheme } from '../src/hooks/useTheme';
import { ALL_CURRENCIES, CurrencyInfo } from '../src/constants/currencies';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';
import { AppData } from '../src/types';

const TAG = 'CurrencyTagsScreen';

function CurrencyTagsScreen() {
  const settings = useSettings();
  const saveMutation = useSaveSettings();
  const queryClient = useQueryClient();
  const theme = useTheme();

  const [mainPickerVisible, setMainPickerVisible] = useState(false);
  const [secPickerVisible, setSecPickerVisible] = useState(false);
  const [search, setSearch] = useState('');

  const mainInfo = ALL_CURRENCIES.find((c) => c.code === settings.mainCurrency);
  const secondaryList = settings.secondaryCurrencies
    .map((code) => ALL_CURRENCIES.find((c) => c.code === code))
    .filter(Boolean) as CurrencyInfo[];

  // Helper: read the freshest settings from React Query cache
  const getLatestSettings = useCallback(() => {
    const appData = queryClient.getQueryData<AppData>(['appData']);
    return appData?.settings ?? settings;
  }, [queryClient, settings]);

  // ── Main currency ──────────────────────────────────────────────────────
  const selectMainCurrency = useCallback((code: string) => {
    logger.info(TAG, 'Set main currency', { code });
    const latest = getLatestSettings();
    const sec = latest.secondaryCurrencies.filter((c: string) => c !== code);
    saveMutation.mutate({ mainCurrency: code, secondaryCurrencies: sec });
    setMainPickerVisible(false);
    setSearch('');
  }, [getLatestSettings, saveMutation]);

  // ── Secondary currencies ───────────────────────────────────────────────
  const toggleSecondary = useCallback((code: string) => {
    const latest = getLatestSettings();
    const sec = [...latest.secondaryCurrencies];
    const idx = sec.indexOf(code);
    if (idx === -1) {
      sec.push(code);
    } else {
      sec.splice(idx, 1);
    }
    logger.info(TAG, 'Toggle secondary currency', { code, isSecondary: idx === -1 });
    saveMutation.mutate({ secondaryCurrencies: sec });
  }, [getLatestSettings, saveMutation]);

  const removeSecondary = useCallback((code: string) => {
    const latest = getLatestSettings();
    const sec = latest.secondaryCurrencies.filter((c: string) => c !== code);
    logger.info(TAG, 'Remove secondary currency', { code });
    saveMutation.mutate({ secondaryCurrencies: sec });
  }, [getLatestSettings, saveMutation]);

  // ── Drag reorder ───────────────────────────────────────────────────────
  const handleDragEnd = useCallback(({ data: newData }: { data: CurrencyInfo[] }) => {
    const newOrder = newData.map((c) => c.code);
    logger.info(TAG, 'Reorder secondary currencies', { newOrder });
    saveMutation.mutate({ secondaryCurrencies: newOrder });
  }, [saveMutation]);

  // ── Filtered list for modals ───────────────────────────────────────────
  const filteredCurrencies = search.trim()
    ? ALL_CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_CURRENCIES;

  // ── Draggable render item ──────────────────────────────────────────────
  const renderDragItem = useCallback(({ item, drag, isActive }: RenderItemParams<CurrencyInfo>) => (
    <View style={[
      styles.orderItem,
      { backgroundColor: theme.cardBackground, borderColor: theme.border },
      isActive && { backgroundColor: `${theme.primary}15`, borderColor: theme.primary, elevation: 6 },
    ]}>
      <TouchableOpacity
        onLongPress={drag}
        delayLongPress={150}
        disabled={isActive}
        style={styles.dragHandle}
        activeOpacity={0.5}
      >
        <Ionicons name="menu" size={18} color={isActive ? theme.primary : theme.text.tertiary} />
      </TouchableOpacity>
      <Text style={[styles.orderSymbol, { color: theme.text.primary }]}>{item.symbol}</Text>
      <View style={styles.orderInfo}>
        <Text style={[styles.orderCode, { color: theme.text.primary }]}>{item.code}</Text>
        <Text style={[styles.orderName, { color: theme.text.tertiary }]}>{item.name}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => removeSecondary(item.code)}
      >
        <Ionicons name="close-circle" size={20} color={theme.error} />
      </TouchableOpacity>
    </View>
  ), [removeSecondary, theme]);

  // ── Header content (sections 1, 2, 3-main) rendered above the draggable items ──
  const listHeader = (
    <>
      {/* ── Section 1: Main Currency ── */}
      <Text style={[styles.sectionLabel, { color: theme.text.primary }]}>Main Currency</Text>
      <Pressable
        style={[styles.dropdown, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => { setSearch(''); setMainPickerVisible(true); }}
      >
        <View style={styles.dropdownContent}>
          <Text style={[styles.dropdownSymbol, { color: theme.text.primary }]}>{mainInfo?.symbol ?? '?'}</Text>
          <View>
            <Text style={[styles.dropdownCode, { color: theme.text.primary }]}>{settings.mainCurrency}</Text>
            <Text style={[styles.dropdownName, { color: theme.text.tertiary }]}>{mainInfo?.name ?? ''}</Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.text.secondary} />
      </Pressable>

      {/* ── Section 2: Secondary Currencies ── */}
      <Text style={[styles.sectionLabel, { marginTop: SPACING.xl, color: theme.text.primary }]}>
        Secondary Currencies
      </Text>
      <Text style={[styles.sectionHint, { color: theme.text.tertiary }]}>
        Optional. These appear as quick-switch tags in Add &amp; Statistics screens.
      </Text>
      <Pressable
        style={[styles.dropdown, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => { setSearch(''); setSecPickerVisible(true); }}
      >
        <View style={styles.dropdownContent}>
          <Ionicons name="add-circle-outline" size={22} color={theme.primary} />
          <Text style={[styles.addBtnText, { color: theme.primary }]}>
            {secondaryList.length > 0
              ? `${secondaryList.length} selected`
              : 'Add Currency'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.text.secondary} />
      </Pressable>

      {/* ── Section 3 header: Currency Order ── */}
      {secondaryList.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: SPACING.lg, color: theme.text.primary }]}>Currency Order</Text>
          <Text style={[styles.sectionHint, { color: theme.text.tertiary }]}>
            Long press the ≡ handle to drag and reorder.
          </Text>

          {/* Main currency — fixed at top */}
          {mainInfo && (
            <View style={[styles.orderItem, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}40` }]}>
              <View style={styles.dragHandlePlaceholder} />
              <Text style={[styles.orderSymbol, { color: theme.text.primary }]}>{mainInfo.symbol}</Text>
              <View style={styles.orderInfo}>
                <Text style={[styles.orderCode, { color: theme.text.primary }]}>{mainInfo.code}</Text>
                <Text style={[styles.orderName, { color: theme.text.tertiary }]}>{mainInfo.name}</Text>
              </View>
              <View style={[styles.defaultBadge, { backgroundColor: `${theme.primary}20` }]}>
                <Text style={[styles.defaultBadgeText, { color: theme.primary }]}>Default</Text>
              </View>
            </View>
          )}
        </>
      )}
    </>
  );

  return (
    <ScreenContainer style={{ paddingTop: SPACING.sm }}>
      {/* Single DraggableFlatList with all content in header */}
      <DraggableFlatList
        data={secondaryList}
        keyExtractor={(item) => item.code}
        onDragEnd={handleDragEnd}
        renderItem={renderDragItem}
        ListHeaderComponent={listHeader}
        containerStyle={styles.listContainer}
        contentContainerStyle={styles.listContent}
        dragItemOverflow={true}
        ListEmptyComponent={null}
      />

      {/* ── Modal: Main Currency Picker ── */}
      <Modal visible={mainPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Select Main Currency</Text>
              <Pressable onPress={() => setMainPickerVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.modalSearch, {
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text.primary,
              }]}
              placeholder="Search currencies..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={theme.text.tertiary}
              autoFocus
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = item.code === settings.mainCurrency;
                return (
                  <Pressable
                    style={[
                      styles.pickerRow,
                      { borderBottomColor: theme.divider },
                      isSelected && { backgroundColor: `${theme.primary}15` },
                    ]}
                    onPress={() => selectMainCurrency(item.code)}
                  >
                    <Text style={[styles.pickerSymbol, { color: theme.text.primary }]}>{item.symbol}</Text>
                    <View style={styles.pickerInfo}>
                      <Text style={[styles.pickerCode, { color: theme.text.primary }]}>{item.code}</Text>
                      <Text style={[styles.pickerName, { color: theme.text.tertiary }]}>{item.name}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
                  </Pressable>
                );
              }}
              contentContainerStyle={{ paddingBottom: SPACING.lg }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Modal: Secondary Currency Picker ── */}
      <Modal visible={secPickerVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text.primary }]}>Add Secondary Currencies</Text>
              <Pressable onPress={() => setSecPickerVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.modalSearch, {
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text.primary,
              }]}
              placeholder="Search currencies..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={theme.text.tertiary}
              autoFocus
            />
            <FlatList
              data={filteredCurrencies.filter((c) => c.code !== settings.mainCurrency)}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isChecked = settings.secondaryCurrencies.includes(item.code);
                return (
                  <Pressable
                    style={[
                      styles.pickerRow,
                      { borderBottomColor: theme.divider },
                      isChecked && { backgroundColor: `${theme.primary}08` },
                    ]}
                    onPress={() => toggleSecondary(item.code)}
                  >
                    <Text style={[styles.pickerSymbol, { color: theme.text.primary }]}>{item.symbol}</Text>
                    <View style={styles.pickerInfo}>
                      <Text style={[styles.pickerCode, { color: theme.text.primary }]}>{item.code}</Text>
                      <Text style={[styles.pickerName, { color: theme.text.tertiary }]}>{item.name}</Text>
                    </View>
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isChecked ? theme.primary : theme.text.tertiary}
                    />
                  </Pressable>
                );
              }}
              contentContainerStyle={{ paddingBottom: SPACING.lg }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

export default function CurrencyTagsWithBoundary() {
  return (
    <ErrorBoundary screenName="CurrencyTags">
      <CurrencyTagsScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  listContainer: { flex: 1, backgroundColor: 'transparent' },
  listContent: { paddingBottom: SPACING.lg },
  // Section labels
  sectionLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  sectionHint: {
    fontSize: FONT_SIZE.xs,
    marginBottom: SPACING.sm,
  },
  // Dropdown (main currency)
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dropdownSymbol: {
    fontSize: 20,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  dropdownCode: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  dropdownName: { fontSize: FONT_SIZE.xs },
  addBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  // Order items
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
  },
  dragHandle: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandlePlaceholder: {
    width: 26,
  },
  orderSymbol: {
    fontSize: 16,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  orderInfo: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  orderCode: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  orderName: { fontSize: FONT_SIZE.xs },
  defaultBadge: {
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  defaultBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
  removeBtn: {
    padding: SPACING.xs,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    maxHeight: '80%',
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  modalSearch: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerSymbol: {
    fontSize: 18,
    fontWeight: '700',
    width: 36,
    textAlign: 'center',
  },
  pickerInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  pickerCode: { fontSize: FONT_SIZE.md, fontWeight: '600' },
  pickerName: { fontSize: FONT_SIZE.xs },
});
