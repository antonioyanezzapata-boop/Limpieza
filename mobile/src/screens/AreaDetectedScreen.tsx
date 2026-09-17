import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing } from '../theme/colors';
import type { ScreenProps } from '../navigation/types';

export function AreaDetectedScreen({ navigation, route }: ScreenProps<'AreaDetected'>): React.JSX.Element {
  const { area, qrToken } = route.params;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.checkmark}>✓</Text>
        <Text style={styles.areaName}>{area.name}</Text>
        <Text style={styles.areaMeta}>
          {area.floor}
          {area.zone ? ` · ${area.zone}` : ''}
        </Text>
        <Text style={styles.areaCode}>Código: {area.code}</Text>
      </Card>

      <Button
        label="CONTINUAR"
        onPress={() => navigation.navigate('EntryExit', { qrToken, area })}
        size="large"
        style={styles.continueButton}
        testID="area-continue"
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
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkmark: {
    fontSize: 40,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  areaName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  areaMeta: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  areaCode: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  continueButton: {
    marginTop: spacing.md,
  },
});
