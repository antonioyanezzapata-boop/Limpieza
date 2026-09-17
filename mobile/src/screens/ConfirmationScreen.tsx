import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../api/client';
import { createAccessEvent } from '../api/endpoints';
import type { AccessEventRequest } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { enqueueEvent } from '../db/queueStorage';
import { useNetwork } from '../network/NetworkContext';
import { useSync } from '../sync/SyncContext';
import { colors, spacing } from '../theme/colors';
import { getDeviceId } from '../utils/device';
import { generateUuid } from '../utils/uuid';
import type { ScreenProps } from '../navigation/types';

export function ConfirmationScreen({ navigation, route }: ScreenProps<'Confirmation'>): React.JSX.Element {
  const { area, qrToken, eventType } = route.params;
  const { isConnected } = useNetwork();
  const { accountBlocked } = useAuth();
  const { refresh: refreshQueue, syncNow } = useSync();
  const [now, setNow] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function queueAndFinish(clientUuid: string, body: AccessEventRequest): Promise<void> {
    await enqueueEvent({ clientUuid, areaName: area.name, eventType, payload: body });
    await refreshQueue();
    navigation.replace('Result', {
      success: true,
      queued: true,
      message: 'Registro pendiente de sincronización',
      area,
      eventType,
    });
  }

  async function handleConfirm(): Promise<void> {
    if (accountBlocked) {
      navigation.replace('Result', {
        success: false,
        queued: false,
        message: 'Tu cuenta aparece inactiva. Reconéctate para poder registrar movimientos.',
        area,
        eventType,
      });
      return;
    }

    setSubmitting(true);
    const clientUuid = generateUuid();
    const deviceId = await getDeviceId();
    const body: AccessEventRequest = {
      qrToken,
      eventType,
      deviceId,
      deviceTimestamp: new Date().toISOString(),
      clientUuid,
    };

    if (!isConnected) {
      await queueAndFinish(clientUuid, body);
      setSubmitting(false);
      return;
    }

    try {
      const res = await createAccessEvent(body);
      setSubmitting(false);
      navigation.replace('Result', {
        success: true,
        queued: false,
        message: eventType === 'ENTRY' ? 'Entrada registrada' : 'Salida registrada',
        area,
        eventType,
        durationSeconds: res.session.durationSeconds ?? null,
      });
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        await queueAndFinish(clientUuid, body);
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      const message = err instanceof ApiError ? err.message : 'No se pudo registrar el movimiento.';
      navigation.replace('Result', { success: false, queued: false, message, area, eventType });
      return;
    }

    // Opportunistic: if there were older queued items, try to flush them too.
    syncNow();
  }

  return (
    <View style={styles.container}>
      {accountBlocked ? (
        <Banner tone="error" icon="✕" message="Cuenta inactiva: no se pueden registrar movimientos." />
      ) : !isConnected ? (
        <Banner tone="warning" icon="⚠️" message="Sin conexión: el registro se guardará para sincronizarse luego." />
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.label}>Área</Text>
        <Text style={styles.value}>{area.name}</Text>

        <Text style={styles.label}>Acción</Text>
        <Text style={[styles.value, eventType === 'ENTRY' ? styles.entryColor : styles.exitColor]}>
          {eventType === 'ENTRY' ? 'ENTRADA' : 'SALIDA'}
        </Text>

        <Text style={styles.label}>Hora actual</Text>
        <Text style={styles.time}>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
      </Card>

      <Button
        label={eventType === 'ENTRY' ? 'CONFIRMAR ENTRADA' : 'CONFIRMAR SALIDA'}
        onPress={handleConfirm}
        loading={submitting}
        size="large"
        variant={eventType === 'ENTRY' ? 'success' : 'danger'}
        disabled={accountBlocked}
        testID="confirm-button"
      />
      <Button label="Cancelar" variant="ghost" onPress={() => navigation.navigate('Home')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  entryColor: { color: colors.success },
  exitColor: { color: colors.error },
  time: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
