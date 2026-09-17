import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { useNetwork } from '../network/NetworkContext';
import { colors, radius, spacing } from '../theme/colors';
import type { ScreenProps } from '../navigation/types';

type Mode = 'online' | 'offline';

export function LoginScreen({ navigation }: ScreenProps<'Login'>): React.JSX.Element {
  const { loginOnline, loginOffline } = useAuth();
  const { isConnected, isKnown } = useNetwork();
  const [mode, setMode] = useState<Mode>('online');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offline = isKnown && !isConnected;

  async function handleOnlineSubmit(): Promise<void> {
    if (!identifier.trim() || !password) {
      setError('Ingresa tu usuario/correo y contraseña.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { needsOfflinePinSetup } = await loginOnline(identifier.trim(), password);
      if (needsOfflinePinSetup) {
        navigation.reset({ index: 0, routes: [{ name: 'OfflinePinSetup', params: { fromLogin: true } }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        setError(
          'No se pudo contactar al servidor. Si ya configuraste un PIN offline en este dispositivo, usa "Acceso offline".',
        );
        setMode('offline');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOfflineSubmit(): Promise<void> {
    if (!employeeCode.trim() || pin.length < 4) {
      setError('Ingresa tu código de empleado y tu PIN (4 a 6 dígitos).');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await loginOffline(employeeCode.trim(), pin);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión sin conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.emoji}>🧼</Text>
          <Text style={styles.title}>Limpieza Trazabilidad</Text>
          <Text style={styles.subtitle}>Control de ingresos y salidas por área</Text>
        </View>

        {offline ? (
          <Banner tone="warning" icon="⚠️" message="Sin conexión. Puedes ingresar con tu PIN offline." />
        ) : null}

        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, mode === 'online' && styles.tabActive]}
            onPress={() => setMode('online')}
          >
            <Text style={[styles.tabText, mode === 'online' && styles.tabTextActive]}>Iniciar sesión</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === 'offline' && styles.tabActive]}
            onPress={() => setMode('offline')}
          >
            <Text style={[styles.tabText, mode === 'offline' && styles.tabTextActive]}>Acceso offline</Text>
          </Pressable>
        </View>

        {error ? <Banner tone="error" icon="✕" message={error} /> : null}

        <Pressable onPress={() => navigation.navigate('ServerSettings')} style={styles.serverLink}>
          <Text style={styles.serverLinkText}>⚙️ Configurar servidor</Text>
        </Pressable>

        {mode === 'online' ? (
          <View style={styles.form}>
            <Text style={styles.label}>Usuario o correo</Text>
            <TextInput
              style={styles.input}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="maria@hospital.local"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              testID="login-identifier"
            />
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              testID="login-password"
            />
            <Button
              label="Ingresar"
              onPress={handleOnlineSubmit}
              loading={loading}
              size="large"
              style={styles.submit}
              testID="login-submit"
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.helpText}>
              Ingresa con tu código de empleado y el PIN que configuraste en este dispositivo. No requiere
              conexión a internet.
            </Text>
            <Text style={styles.label}>Código de empleado</Text>
            <TextInput
              style={styles.input}
              value={employeeCode}
              onChangeText={setEmployeeCode}
              placeholder="EMP-001"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              testID="offline-employee-code"
            />
            <Text style={styles.label}>PIN</Text>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="1234"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              testID="offline-pin"
            />
            <Button
              label="Ingresar sin conexión"
              onPress={handleOfflineSubmit}
              loading={loading}
              size="large"
              variant="secondary"
              style={styles.submit}
              testID="offline-submit"
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emoji: { fontSize: 48, marginBottom: spacing.xs },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textInverted,
  },
  form: {
    gap: spacing.xs,
  },
  helpText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  submit: {
    marginTop: spacing.lg,
  },
  serverLink: {
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  serverLinkText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
