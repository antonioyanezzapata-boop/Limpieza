import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatusPill } from '../components/StatusPill';
import { useNetwork } from '../network/NetworkContext';
import { useSync } from '../sync/SyncContext';
import { colors, spacing } from '../theme/colors';
import type { QueueItem } from '../db/queueStorage';

export function SyncStatusScreen(): React.JSX.Element {
  const { items, isSyncing, lastError, syncNow } = useSync();
  const { isConnected } = useNetwork();

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <Banner tone="warning" icon="⚠️" message="Sin conexión: la sincronización se reanudará automáticamente." />
      ) : null}
      {lastError ? <Banner tone="error" icon="✕" message={lastError} /> : null}

      <Button
        label="Sincronizar ahora"
        onPress={syncNow}
        loading={isSyncing}
        disabled={!isConnected || items.length === 0}
        size="large"
        testID="sync-now"
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.clientUuid}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No hay registros en la cola local.</Text>}
        renderItem={({ item }) => <QueueRow item={item} />}
      />
    </View>
  );
}

function QueueRow({ item }: { item: QueueItem }): React.JSX.Element {
  return (
    <Card style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.areaName}>{item.areaName}</Text>
        <StatusPill status={item.status} />
      </View>
      <Text style={styles.meta}>
        {item.eventType === 'ENTRY' ? 'Entrada' : 'Salida'} · {new Date(item.createdAt).toLocaleString()}
      </Text>
      {item.errorMessage ? <Text style={styles.error}>{item.errorMessage}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
  row: { gap: 4 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  areaName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSecondary },
  error: { fontSize: 12, color: colors.error, marginTop: 2 },
});
