import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';
import type { QueueItemStatus } from '../db/queueStorage';

const STATUS_CONFIG: Record<QueueItemStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pendiente', bg: colors.warningBg, fg: colors.warning },
  syncing: { label: 'Sincronizando', bg: colors.infoBg, fg: colors.info },
  synced: { label: 'Sincronizado', bg: colors.successBg, fg: colors.success },
  error: { label: 'Error', bg: colors.errorBg, fg: colors.error },
};

export function StatusPill({ status }: { status: QueueItemStatus }): React.JSX.Element {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.text, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
