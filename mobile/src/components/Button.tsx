import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/colors';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Extra-tall touch target for gloved-hand use (main scan/confirm actions). */
  size?: 'large' | 'medium';
}

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: colors.textInverted },
  secondary: { bg: colors.surface, text: colors.primary, border: colors.primary },
  danger: { bg: colors.error, text: colors.textInverted },
  success: { bg: colors.success, text: colors.textInverted },
  ghost: { bg: 'transparent', text: colors.textSecondary },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  testID,
  size = 'medium',
}: ButtonProps): React.JSX.Element {
  const v = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'large' && styles.large,
        {
          backgroundColor: isDisabled ? colors.disabled : v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 2 : 0,
          opacity: pressed && !isDisabled ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <View style={styles.contentRow}>
          <Text style={[styles.label, { color: isDisabled ? colors.textInverted : v.text }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  large: {
    minHeight: 76,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
