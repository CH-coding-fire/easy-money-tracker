import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { ScreenContainer } from '../src/components/ScreenContainer';
import { Card } from '../src/components/Card';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useSettings, useSaveSettings } from '../src/hooks/useSettings';
import { ALL_CURRENCIES, CurrencyInfo } from '../src/constants/currencies';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../src/constants/spacing';
import { logger } from '../src/utils/logger';

const TAG = 'CurrencyTagsScreen';

function CurrencyTagsScreen() {
  const settings = useSettings();
  const saveMutation = useSaveSettings();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? ALL_CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase())
      )
    : ALL_CURRENCIES;

  function setMainCurrency(code: string) {
    logger.info(TAG, 'Set main currency', { code });
    saveMutation.mutate({ ...settings, mainCurrency: code });
  }

  function toggleFrequent(code: string) {
    const freq = [...settings.frequentCurrencies];
    const idx = freq.indexOf(code);
    if (idx === -1) {
      freq.push(code);
    } else {
      freq.splice(idx, 1);
    }
    logger.info(TAG, 'Toggle frequent currency', { code, isFrequent: idx === -1 });
    saveMutation.mutate({ ...settings, frequentCurrencies: freq });
  }

  function toggleSecondary(code: string) {
    const sec = [...settings.secondaryCurrencies];
    const idx = sec.indexOf(code);
    if (idx === -1) {
      sec.push(code);
    } else {
      sec.splice(idx, 1);
    }
    logger.info(TAG, 'Toggle secondary currency', { code, isSecondary: idx === -1 });
    saveMutation.mutate({ ...settings, secondaryCurrencies: sec });
  }

  function renderCurrency({ item }: { item: CurrencyInfo }) {
    const isMain = settings.mainCurrency === item.code;
    const isFreq = settings.frequentCurrencies.includes(item.code);
    const isSec = settings.secondaryCurrencies.includes(item.code);

    return (
      <Card style={[styles.card, isMain && styles.mainCard]}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.symbol}>{item.symbol}</Text>
            <View>
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            {isMain ? (
              <View style={styles.mainBadge}>
                <Text style={styles.mainBadgeText}>Default</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.setMainBtn}
                onPress={() => setMainCurrency(item.code)}
              >
                <Text style={styles.setMainText}>Set Default</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.toggleBtn, isFreq && styles.toggleBtnActive]}
              onPress={() => toggleFrequent(item.code)}
            >
              <Text style={styles.toggleText}>{isFreq ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Currency Settings</Text>
      <Text style={styles.subtitle}>
        Default: {settings.mainCurrency} · Frequent: {settings.frequentCurrencies.join(', ') || 'None'}
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search currencies..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#999"
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={renderCurrency}
        contentContainerStyle={styles.list}
      />
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
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: '#222', marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT_SIZE.sm, color: '#666', marginBottom: SPACING.md },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    backgroundColor: '#fff',
    marginBottom: SPACING.md,
  },
  list: { paddingBottom: SPACING.xxxl },
  card: { marginBottom: SPACING.sm },
  mainCard: { borderWidth: 2, borderColor: '#2196F3' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  symbol: { fontSize: 22, fontWeight: '700', color: '#333', width: 40, textAlign: 'center' },
  code: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#222' },
  name: { fontSize: FONT_SIZE.xs, color: '#888' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  mainBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  mainBadgeText: { fontSize: FONT_SIZE.xs, color: '#1565C0', fontWeight: '700' },
  setMainBtn: {
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  setMainText: { fontSize: FONT_SIZE.xs, color: '#666' },
  toggleBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  toggleBtnActive: { backgroundColor: '#FFF9C4' },
  toggleText: { fontSize: 18 },
});
