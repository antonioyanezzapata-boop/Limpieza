import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Card } from '../components/Card';
import { useHistory } from '../hooks/useHistory';
import { colors, radius, spacing } from '../theme/colors';
import { HISTORY_RANGE_LABELS, formatDateTime, formatDuration } from '../utils/time';
import type { HistoryRange, HistorySessionItem } from '../api/types';

const RANGES: HistoryRange[] = ['today', 'yesterday', 'week', 'month'];

export function HistoryScreen(): React.JSX.Element {
  const [range, setRange] = useState<HistoryRange>('today');
  const { data, loading, error } = useHistory(range);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {RANGES.map((r) => (
          <Pressable
            key={r}
            style={[styles.tab, range === r && styles.tabActive]}
            onPress={() => setRange(r)}
            testID={`history-tab-${r}`}
          >
            <Text style={[styles.tabText, range === r && styles.tabTextActive]}>
              {HISTORY_RANGE_LABELS[r]}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Banner tone="warning" icon="⚠️" message={error} /> : null}

      {data ? (
        <Card style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total {HISTORY_RANGE_LABELS[range].toLowerCase()}</Text>
          <Text style={styles.totalValue}>Total: {formatDuration(data.totalSeconds)}</Text>
        </Card>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        <FlatList
          data={data?.sessions ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !error ? (
              <Text style={styles.empty}>No hay sesiones registradas en este período.</Text>
            ) : null
          }
          renderItem={({ item }) => <HistoryRow item={item} />}
        />
      )}
    </View>
  );
}

function HistoryRow({ item }: { item: HistorySessionItem }): React.JSX.Element {
  return (
    <Card style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.areaName}>{item.area.name}</Text>
        <Text
          style={[
            styles.statusBadge,
            item.status === 'COMPLETED' ? styles.statusCompleted : styles.statusOpen,
          ]}
        >
          {item.status === 'COMPLETED' ? 'Completada' : 'Abierta'}
        </Text>
      </View>
      <Text style={styles.rowMeta}>Entrada: {formatDateTime(item.startedAt)}</Text>
      <Text style={styles.rowMeta}>Salida: {formatDateTime(item.finishedAt)}</Text>
      <Text style={styles.rowDuration}>{formatDuration(item.durationSeconds)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: colors.textInverted },
  totalCard: { alignItems: 'center' },
  totalLabel: { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase' },
  totalValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  loader: { marginTop: spacing.xl },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
  row: { gap: 2 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  areaName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  statusCompleted: { backgroundColor: colors.successBg, color: colors.success },
  statusOpen: { backgroundColor: colors.infoBg, color: colors.info },
  rowMeta: { fontSize: 13, color: colors.textSecondary },
  rowDuration: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
});
