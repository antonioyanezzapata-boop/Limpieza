import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { colors, radius, spacing } from '../theme/colors';
import { formatDuration } from '../utils/time';
import type { ScreenProps } from '../navigation/types';

type Tone = 'success' | 'warning' | 'error';

const TONE_STYLES: Record<Tone, { bg: string; fg: string; icon: string }> = {
  success: { bg: colors.successBg, fg: colors.success, icon: '✓' },
  warning: { bg: colors.warningBg, fg: colors.warning, icon: '🔄' },
  error: { bg: colors.errorBg, fg: colors.error, icon: '✕' },
};

export function ResultScreen({ navigation, route }: ScreenProps<'Result'>): React.JSX.Element {
  const { success, queued, message, area, eventType, durationSeconds } = route.params;
  const tone: Tone = !success ? 'error' : queued ? 'warning' : 'success';
  const t = TONE_STYLES[tone];

  const headline = !success
    ? 'No se pudo completar el registro'
    : queued
      ? 'Registro pendiente de sincronización'
      : eventType === 'ENTRY'
        ? 'Entrada registrada'
        : 'Salida registrada';

  const showDuration = success && !queued && eventType === 'EXIT' && durationSeconds != null;

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.iconCircle, { borderColor: t.fg }]}>
        <Text style={[styles.icon, { color: t.fg }]}>{t.icon}</Text>
      </View>

      <Text style={[styles.headline, { color: t.fg }]}>
        {t.icon} {headline}
      </Text>

      {area ? <Text style={styles.area}>{area.name}</Text> : null}
      <Text style={styles.message}>{message}</Text>

      {showDuration ? (
        <Text style={styles.duration}>Tiempo en área: {formatDuration(durationSeconds)}</Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="IR A INICIO"
          onPress={() => navigation.navigate('Home')}
          size="large"
          style={styles.actionButton}
          testID="result-home"
        />
        {!success ? (
          <Button
            label="Intentar de nuevo"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.actionButton}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 48,
    fontWeight: '900',
  },
  headline: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  area: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  duration: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  actionButton: {
    width: '100%',
  },
});
