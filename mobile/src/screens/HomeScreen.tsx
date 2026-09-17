import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Banner, OfflineBanner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useCurrentSessions } from '../hooks/useCurrentSessions';
import { useNetwork } from '../network/NetworkContext';
import { useSync } from '../sync/SyncContext';
import { colors, radius, spacing } from '../theme/colors';
import { formatTime } from '../utils/time';
import type { ScreenProps } from '../navigation/types';

export function HomeScreen({ navigation }: ScreenProps<'Home'>): React.JSX.Element {
  const { user, isOfflineSession, accountBlocked } = useAuth();
  const { isConnected, isKnown } = useNetwork();
  const { sessions, loading, error } = useCurrentSessions();
  const { pendingCount } = useSync();

  const offline = isKnown && !isConnected;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Bienvenido, {user?.firstName ?? ''}</Text>
          <Text style={styles.role}>{roleLabel(user?.role)}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Profile')} style={styles.avatar} testID="go-profile">
          <Text style={styles.avatarText}>{(user?.firstName ?? '?').charAt(0).toUpperCase()}</Text>
        </Pressable>
      </View>

      {offline ? <OfflineBanner /> : null}
      {isOfflineSession ? (
        <Banner tone="info" icon="🔒" message="Sesión offline activa: los registros se guardan localmente." />
      ) : null}
      {accountBlocked ? (
        <Banner
          tone="error"
          icon="✕"
          message="Tu cuenta aparece inactiva. No se pueden registrar nuevos movimientos hasta reconectar."
        />
      ) : null}
      {pendingCount > 0 ? (
        <Pressable onPress={() => navigation.navigate('SyncStatus')}>
          <Banner tone="warning" icon="🔄" message={`${pendingCount} registro(s) pendientes de sincronizar`} />
        </Pressable>
      ) : null}

      <Card style={styles.activityCard}>
        <Text style={styles.sectionTitle}>Actividad actual</Text>
        {loading ? (
          <Text style={styles.muted}>Cargando…</Text>
        ) : error ? (
          <Text style={styles.muted}>{error}</Text>
        ) : sessions.length === 0 ? (
          <Text style={styles.muted}>No hay actividad abierta</Text>
        ) : (
          <View style={styles.sessionList}>
            {sessions.map((s) => (
              <View key={s.sessionId} style={styles.sessionRow}>
                <View style={styles.sessionDot} />
                <View style={styles.flex1}>
                  <Text style={styles.sessionArea}>{s.area.name}</Text>
                  <Text style={styles.sessionMeta}>
                    {s.area.floor} · desde las {formatTime(s.startedAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {sessions.length > 0 ? (
          <Pressable onPress={() => navigation.navigate('CurrentActivity')} style={styles.linkRow}>
            <Text style={styles.link}>Ver actividad actual →</Text>
          </Pressable>
        ) : null}
      </Card>

      <Button
        label="ESCANEAR ÁREA"
        onPress={() => navigation.navigate('Scanner')}
        size="large"
        disabled={accountBlocked}
        style={styles.scanButton}
        testID="scan-button"
      />

      <View style={styles.quickLinks}>
        <QuickLink label="Historial" icon="🗂️" onPress={() => navigation.navigate('History')} />
        <QuickLink label="Sincronización" icon="🔄" onPress={() => navigation.navigate('SyncStatus')} />
        <QuickLink label="Perfil" icon="👤" onPress={() => navigation.navigate('Profile')} />
      </View>
    </ScrollView>
  );
}

function QuickLink({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable style={styles.quickLink} onPress={onPress}>
      <Text style={styles.quickLinkIcon}>{icon}</Text>
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </Pressable>
  );
}

function roleLabel(role?: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'SUPERVISOR':
      return 'Supervisor';
    case 'CLEANING_STAFF':
      return 'Personal de limpieza';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  role: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textInverted, fontWeight: '800', fontSize: 18 },
  activityCard: { gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  muted: { color: colors.textSecondary, fontSize: 14 },
  sessionList: { gap: spacing.sm },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sessionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  flex1: { flex: 1 },
  sessionArea: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  sessionMeta: { fontSize: 13, color: colors.textSecondary },
  linkRow: { marginTop: spacing.xs },
  link: { color: colors.primary, fontWeight: '700' },
  scanButton: { marginTop: spacing.sm },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickLink: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  quickLinkIcon: { fontSize: 22 },
  quickLinkLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
});
