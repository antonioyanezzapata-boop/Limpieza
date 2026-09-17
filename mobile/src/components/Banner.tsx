import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';

type Tone = 'info' | 'warning' | 'error' | 'success';

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  info: { bg: colors.infoBg, fg: colors.info },
  warning: { bg: colors.warningBg, fg: colors.warning },
  error: { bg: colors.errorBg, fg: colors.error },
  success: { bg: colors.successBg, fg: colors.success },
};

interface BannerProps {
  tone: Tone;
  message: string;
  icon?: string;
}

export function Banner({ tone, message, icon }: BannerProps): React.JSX.Element {
  const t = TONE_STYLES[tone];
  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.text, { color: t.fg }]}>{message}</Text>
    </View>
  );
}

/** Fixed offline indicator shown across the app whenever there's no connectivity. */
export function OfflineBanner(): React.JSX.Element {
  return <Banner tone="warning" icon="⚠️" message="Sin conexión — trabajando en modo offline" />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
