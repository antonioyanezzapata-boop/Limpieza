import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { colors, radius, spacing } from '../theme/colors';
import type { ScreenProps } from '../navigation/types';

export function OfflinePinSetupScreen({ navigation, route }: ScreenProps<'OfflinePinSetup'>): React.JSX.Element {
  const fromLogin = route.params?.fromLogin ?? false;
  const { setOfflinePin } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (!currentPassword) {
      setError('Ingresa tu contraseña actual para confirmar.');
      return;
    }
    if (pin.length < 4 || pin.length > 6) {
      setError('El PIN debe tener entre 4 y 6 dígitos.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Los PIN ingresados no coinciden.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await setOfflinePin(currentPassword, pin);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo configurar el PIN offline.');
    } finally {
      setLoading(false);
    }
  }

  function goHome(): void {
    if (fromLogin) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      navigation.goBack();
    }
  }

  if (success) {
    return (
      <View style={styles.container}>
        <Banner tone="success" icon="✓" message="PIN offline configurado correctamente." />
        <Text style={styles.helpText}>
          Ya puedes iniciar sesión sin conexión con tu código de empleado y este PIN.
        </Text>
        <Button label="Continuar" onPress={goHome} size="large" style={styles.submit} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Configura tu PIN offline</Text>
        <Text style={styles.helpText}>
          Este PIN te permitirá iniciar sesión y seguir registrando entradas/salidas aunque no tengas
          conexión a internet. Se guarda cifrado únicamente en este dispositivo.
        </Text>

        {error ? <Banner tone="error" icon="✕" message={error} /> : null}

        <Text style={styles.label}>Contraseña actual</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Nuevo PIN (4-6 dígitos)</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          placeholder="1234"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Confirmar PIN</Text>
        <TextInput
          style={styles.input}
          value={confirmPin}
          onChangeText={(t) => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          placeholder="1234"
          placeholderTextColor={colors.textSecondary}
        />

        <Button label="Guardar PIN" onPress={handleSubmit} loading={loading} size="large" style={styles.submit} />
        {fromLogin ? (
          <Button label="Configurar más tarde" variant="ghost" onPress={goHome} />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  helpText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.sm },
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
  submit: { marginTop: spacing.lg },
});
