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
import { ALL_CURRENCIES, CurrencyInfo } from '../src/constants/currencies';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';
import { AppData } from '../src/types';

const TAG = 'CurrencyTagsScreen';

function CurrencyTagsScreen() {
  const settings = useSettings();
  const saveMutation = useSaveSettings();
  const queryClient = useQueryClient();

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
    <View style={[styles.orderItem, isActive && styles.orderItemActive]}>
      <TouchableOpacity
        onLongPress={drag}
        delayLongPress={150}
        disabled={isActive}
        style={styles.dragHandle}
        activeOpacity={0.5}
      >
        <Ionicons name="menu" size={18} color={isActive ? '#2196F3' : '#bbb'} />
      </TouchableOpacity>
      <Text style={styles.orderSymbol}>{item.symbol}</Text>
      <View style={styles.orderInfo}>
        <Text style={styles.orderCode}>{item.code}</Text>
        <Text style={styles.orderName}>{item.name}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => removeSecondary(item.code)}
      >
        <Ionicons name="close-circle" size={20} color="#F44336" />
      </TouchableOpacity>
    </View>
  ), [removeSecondary]);

  // ── Header content (sections 1, 2, 3-main) rendered above the draggable items ──
  const listHeader = (
    <>
      {/* ── Section 1: Main Currency ── */}
      <Text style={styles.sectionLabel}>Main Currency</Text>
      <Pressable
        style={styles.dropdown}
        onPress={() => { setSearch(''); setMainPickerVisible(true); }}
      >
        <View style={styles.dropdownContent}>
          <Text style={styles.dropdownSymbol}>{mainInfo?.symbol ?? '?'}</Text>
          <View>
            <Text style={styles.dropdownCode}>{settings.mainCurrency}</Text>
            <Text style={styles.dropdownName}>{mainInfo?.name ?? ''}</Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </Pressable>

      {/* ── Section 2: Secondary Currencies ── */}
      <Text style={[styles.sectionLabel, { marginTop: SPACING.xl }]}>
        Secondary Currencies
      </Text>
      <Text style={styles.sectionHint}>
        Optional. These appear as quick-switch tags in Add &amp; Statistics screens.
      </Text>
      <Pressable
        style={styles.dropdown}
        onPress={() => { setSearch(''); setSecPickerVisible(true); }}
      >
        <View style={styles.dropdownContent}>
          <Ionicons name="add-circle-outline" size={22} color="#2196F3" />
          <Text style={styles.addBtnText}>
            {secondaryList.length > 0
              ? `${secondaryList.length} selected`
              : 'Add Currency'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </Pressable>

      {/* ── Section 3 header: Currency Order ── */}
      {secondaryList.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>Currency Order</Text>
          <Text style={styles.sectionHint}>
            Long press the ≡ handle to drag and reorder.
          </Text>

          {/* Main currency — fixed at top */}
          {mainInfo && (
            <View style={[styles.orderItem, styles.orderItemMain]}>
              <View style={styles.dragHandlePlaceholder} />
              <Text style={styles.orderSymbol}>{mainInfo.symbol}</Text>
              <View style={styles.orderInfo}>
                <Text style={styles.orderCode}>{mainInfo.code}</Text>
                <Text style={styles.orderName}>{mainInfo.name}</Text>
              </View>
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Main Currency</Text>
              <Pressable onPress={() => setMainPickerVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search currencies..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#999"
              autoFocus
            />
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = item.code === settings.mainCurrency;
                return (
                  <Pressable
                    style={[styles.pickerRow, isSelected && styles.pickerRowSelected]}
                    onPress={() => selectMainCurrency(item.code)}
                  >
                    <Text style={styles.pickerSymbol}>{item.symbol}</Text>
                    <View style={styles.pickerInfo}>
                      <Text style={styles.pickerCode}>{item.code}</Text>
                      <Text style={styles.pickerName}>{item.name}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color="#2196F3" />}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Secondary Currencies</Text>
              <Pressable onPress={() => setSecPickerVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </Pressable>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search currencies..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#999"
              autoFocus
            />
            <FlatList
              data={filteredCurrencies.filter((c) => c.code !== settings.mainCurrency)}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isChecked = settings.secondaryCurrencies.includes(item.code);
                return (
                  <Pressable
                    style={[styles.pickerRow, isChecked && styles.pickerRowChecked]}
                    onPress={() => toggleSecondary(item.code)}
                  >
                    <Text style={styles.pickerSymbol}>{item.symbol}</Text>
                    <View style={styles.pickerInfo}>
                      <Text style={styles.pickerCode}>{item.code}</Text>
                      <Text style={styles.pickerName}>{item.name}</Text>
                    </View>
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isChecked ? '#2196F3' : '#ccc'}
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
    color: '#222',
    marginBottom: SPACING.xs,
  },
  sectionHint: {
    fontSize: FONT_SIZE.xs,
    color: '#999',
    marginBottom: SPACING.sm,
  },
  // Dropdown (main currency)
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dropdownSymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    width: 32,
    textAlign: 'center',
  },
  dropdownCode: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#222' },
  dropdownName: { fontSize: FONT_SIZE.xs, color: '#888' },
  addBtnText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: '#2196F3',
  },
  // Order items
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  orderItemMain: {
    borderColor: '#BBDEFB',
    backgroundColor: '#F5F9FF',
  },
  orderItemActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
    color: '#333',
    width: 32,
    textAlign: 'center',
  },
  orderInfo: {
    flex: 1,
    marginLeft: SPACING.xs,
  },
  orderCode: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#222' },
  orderName: { fontSize: FONT_SIZE.xs, color: '#888' },
  defaultBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  defaultBadgeText: { fontSize: FONT_SIZE.xs, color: '#1565C0', fontWeight: '700' },
  removeBtn: {
    padding: SPACING.xs,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    color: '#222',
  },
  modalSearch: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: '#fafafa',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  pickerRowSelected: {
    backgroundColor: '#E3F2FD',
  },
  pickerRowChecked: {
    backgroundColor: '#F5F9FF',
  },
  pickerSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    width: 36,
    textAlign: 'center',
  },
  pickerInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  pickerCode: { fontSize: FONT_SIZE.md, fontWeight: '600', color: '#222' },
  pickerName: { fontSize: FONT_SIZE.xs, color: '#888' },
});
