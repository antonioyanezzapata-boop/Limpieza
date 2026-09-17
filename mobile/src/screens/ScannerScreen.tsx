import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../api/client';
import { resolveAreaForToken } from '../api/resolveArea';
import { Banner } from '../components/Banner';
import { Button } from '../components/Button';
import { useNetwork } from '../network/NetworkContext';
import { colors, radius, spacing } from '../theme/colors';
import type { ScreenProps } from '../navigation/types';

export function ScannerScreen({ navigation }: ScreenProps<'Scanner'>): React.JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const { isConnected } = useNetwork();
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Prevents firing resolveAreaForToken multiple times for the same scan burst.
  const handledRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (handledRef.current || resolving) return;
      handledRef.current = true;
      setResolving(true);
      setError(null);
      try {
        const { area } = await resolveAreaForToken(result.data, isConnected);
        navigation.replace('AreaDetected', { qrToken: result.data, area });
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'No se pudo identificar el área escaneada.';
        setError(message);
        // Allow scanning again after showing the error.
        setTimeout(() => {
          handledRef.current = false;
        }, 1200);
      } finally {
        setResolving(false);
      }
    },
    [isConnected, navigation, resolving],
  );

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          Se necesita acceso a la cámara para escanear los códigos QR de las áreas.
        </Text>
        <Button label="Permitir cámara" onPress={requestPermission} style={styles.permissionButton} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Apunta la cámara al código QR del área</Text>
      </View>
      {!isConnected ? (
        <View style={styles.banner}>
          <Banner tone="warning" icon="⚠️" message="Sin conexión: solo se reconocerán áreas ya escaneadas antes." />
        </View>
      ) : null}
      {error ? (
        <View style={styles.banner}>
          <Banner tone="error" icon="✕" message={error} />
        </View>
      ) : null}
      {resolving ? (
        <View style={styles.banner}>
          <Banner tone="info" icon="⏳" message="Identificando área…" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  permissionText: { fontSize: 16, textAlign: 'center', color: colors.textPrimary },
  permissionButton: { alignSelf: 'stretch' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  frame: {
    width: 250,
    height: 250,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.textInverted,
  },
  hint: {
    color: colors.textInverted,
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  banner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xl,
  },
});
