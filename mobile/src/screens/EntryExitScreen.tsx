import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { colors, spacing } from '../theme/colors';
import type { ScreenProps } from '../navigation/types';

/**
 * The user always picks ENTRADA/SALIDA explicitly here — this is never inferred
 * automatically from a previous scan, per spec.
 */
export function EntryExitScreen({ navigation, route }: ScreenProps<'EntryExit'>): React.JSX.Element {
  const { area, qrToken } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{area.name}</Text>
      <Text style={styles.subtitle}>¿Qué deseas registrar?</Text>

      <View style={styles.buttons}>
        <Button
          label="ENTRADA"
          variant="success"
          size="large"
          onPress={() => navigation.navigate('Confirmation', { area, qrToken, eventType: 'ENTRY' })}
          testID="select-entry"
        />
        <Button
          label="SALIDA"
          variant="danger"
          size="large"
          onPress={() => navigation.navigate('Confirmation', { area, qrToken, eventType: 'EXIT' })}
          testID="select-exit"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  buttons: {
    gap: spacing.md,
  },
});
