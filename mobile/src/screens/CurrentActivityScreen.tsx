import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { findCachedTokenForAreaId } from '../db/areaCache';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useCurrentSessions } from '../hooks/useCurrentSessions';
import { colors, spacing } from '../theme/colors';
import { formatDuration, formatTime } from '../utils/time';
import type { CurrentSessionItem } from '../api/types';
import type { ScreenProps } from '../navigation/types';

export function CurrentActivityScreen({ navigation }: ScreenProps<'CurrentActivity'>): React.JSX.Element {
  const { sessions, fetchedAt, loading, error, refetch } = useCurrentSessions();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleRegisterExit(session: CurrentSessionItem): Promise<void> {
    const cached = await findCachedTokenForAreaId(session.area.id);
    if (cached) {
      navigation.navigate('Confirmation', { area: cached.area, qrToken: cached.qrToken, eventType: 'EXIT' });
    } else {
      // We don't have a cached QR token for this area on this device yet — fall back to scanning.
      navigation.navigate('Scanner');
    }
  }

  function liveElapsed(session: CurrentSessionItem): number {
    if (!fetchedAt) return session.elapsedSeconds;
    const deltaSeconds = Math.floor((Date.now() - fetchedAt) / 1000);
    return session.elapsedSeconds + Math.max(0, deltaSeconds);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
    >
      {error ? <Banner tone="warning" icon="⚠️" message={error} /> : null}

      {!loading && !error && sessions.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No hay actividad abierta</Text>
          <Text style={styles.emptyText}>Escanea un área para registrar una entrada.</Text>
        </Card>
      ) : (
        sessions.map((session) => (
          <Card key={session.sessionId} style={styles.card}>
            <Text style={styles.areaName}>{session.area.name}</Text>
            <Text style={styles.areaMeta}>{session.area.floor}</Text>
            <View style={styles.row}>
              <Text style={styles.metaLabel}>Entrada</Text>
              <Text style={styles.metaValue}>{formatTime(session.startedAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.metaLabel}>Tiempo transcurrido</Text>
              <Text style={styles.elapsed} key={tick}>
                {formatDuration(liveElapsed(session))}
              </Text>
            </View>
            <Button
              label="REGISTRAR SALIDA"
              variant="danger"
              onPress={() => handleRegisterExit(session)}
              style={styles.exitButton}
              testID={`register-exit-${session.sessionId}`}
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    gap: spacing.xs,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  areaName: { fontSize: 19, fontWeight: '800', color: colors.textPrimary },
  areaMeta: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metaLabel: { fontSize: 14, color: colors.textSecondary },
  metaValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  elapsed: { fontSize: 16, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  exitButton: { marginTop: spacing.md },
});
