/**
 * Minimal color system. Status colors follow spec section 28:
 * green = success, red = error, yellow = pending sync, blue = info.
 */
export const colors = {
  primary: '#0E4C92',
  primaryDark: '#0A3A70',
  background: '#F4F6F8',
  surface: '#FFFFFF',
  border: '#E1E5EA',
  textPrimary: '#111827',
  textSecondary: '#5B6472',
  textInverted: '#FFFFFF',

  success: '#15803D',
  successBg: '#E6F6EA',
  error: '#B91C1C',
  errorBg: '#FCEBEA',
  warning: '#B45309',
  warningBg: '#FFF4DE',
  info: '#1D4ED8',
  infoBg: '#E8EEFD',

  disabled: '#A0A7B2',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};
