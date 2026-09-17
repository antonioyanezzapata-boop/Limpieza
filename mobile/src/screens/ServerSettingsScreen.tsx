import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { getApiBaseUrl, getDefaultApiBaseUrl, resetApiBaseUrl, setApiBaseUrl } from '../config/serverUrl';
import { colors, radius, spacing } from '../theme/colors';
import type { ScreenProps } from '../navigation/types';

/**
 * Lets whoever installs the APK point the app at their own backend without
 * needing a new build. Reachable from Login (before signing in) and from
 * Perfil (to change it later).
 */
export function ServerSettingsScreen({ navigation }: ScreenProps<'ServerSettings'>): React.JSX.Element {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [saved, setSaved] = useState(false);

  async function handleSave(): Promise<void> {
    if (!/^https?:\/\/.+/.test(url.trim())) {
      Alert.alert('URL inválida', 'La dirección debe empezar con http:// o https://');
      return;
    }
    await setApiBaseUrl(url);
    setSaved(true);
  }

  async function handleReset(): Promise<void> {
    await resetApiBaseUrl();
    setUrl(getDefaultApiBaseUrl());
    setSaved(true);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.helpText}>
          Dirección del backend (API) al que se conecta esta app. Pídesela a quien administra el sistema —
          normalmente termina en <Text style={styles.mono}>/api/v1</Text>.
        </Text>

        {saved ? (
          <Banner tone="success" icon="✓" message="Guardado. Los próximos inicios de sesión usarán esta dirección." />
        ) : null}

        <Text style={styles.label}>URL del servidor</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={(t) => {
            setUrl(t);
            setSaved(false);
          }}
          placeholder="https://mi-backend.onrender.com/api/v1"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          testID="server-url-input"
        />

        <Button label="Guardar" onPress={handleSave} size="large" style={styles.button} testID="server-url-save" />
        <Button label="Restablecer valor por defecto" variant="secondary" onPress={handleReset} style={styles.button} />
        <Button label="Volver" variant="secondary" onPress={() => navigation.goBack()} style={styles.button} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.sm },
  helpText: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.sm },
  mono: { fontWeight: '700', color: colors.textPrimary },
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
  button: { marginTop: spacing.sm },
});
