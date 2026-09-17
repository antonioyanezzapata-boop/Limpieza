import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/colors';

export function SplashScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🧼</Text>
      <Text style={styles.title}>Limpieza Trazabilidad</Text>
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textInverted,
  },
  spinner: {
    marginTop: spacing.lg,
  },
});
