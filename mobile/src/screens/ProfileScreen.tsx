import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing } from '../theme/colors';
import type { ScreenProps } from '../navigation/types';

export function ProfileScreen({ navigation }: ScreenProps<'Profile'>): React.JSX.Element {
  const { user, logout, isOfflineSession, hasOfflinePin } = useAuth();

  function handleLogout(): void {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {isOfflineSession ? (
        <Banner tone="info" icon="🔒" message="Sesión offline: algunos datos podrían no estar actualizados." />
      ) : null}

      <Card style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.firstName ?? '?').charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.role}>{roleLabel(user?.role)}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Código de empleado</Text>
          <Text style={styles.infoValue}>{user?.employeeCode}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Correo</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>PIN offline</Text>
          <Text style={styles.infoValue}>{hasOfflinePin ? 'Configurado' : 'No configurado'}</Text>
        </View>
      </Card>

      <Button
        label={hasOfflinePin ? 'Cambiar PIN offline' : 'Configurar PIN offline'}
        variant="secondary"
        disabled={isOfflineSession}
        onPress={() => navigation.navigate('OfflinePinSetup', { fromLogin: false })}
        testID="configure-offline-pin"
      />
      {isOfflineSession ? (
        <Text style={styles.hint}>Necesitas conexión a internet para configurar el PIN offline.</Text>
      ) : null}

      <Button label="Estado de sincronización" variant="secondary" onPress={() => navigation.navigate('SyncStatus')} />

      <Button label="Configurar servidor" variant="secondary" onPress={() => navigation.navigate('ServerSettings')} />

      <Button label="Cerrar sesión" variant="danger" onPress={handleLogout} style={styles.logout} />
    </ScrollView>
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
  scroll: { padding: spacing.lg, gap: spacing.md },
  card: { alignItems: 'center', gap: 4 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { color: colors.textInverted, fontWeight: '800', fontSize: 24 },
  name: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  role: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: spacing.xs,
  },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  logout: { marginTop: spacing.lg },
});
