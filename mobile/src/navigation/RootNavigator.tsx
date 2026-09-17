import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme/colors';
import { AreaDetectedScreen } from '../screens/AreaDetectedScreen';
import { ConfirmationScreen } from '../screens/ConfirmationScreen';
import { CurrentActivityScreen } from '../screens/CurrentActivityScreen';
import { EntryExitScreen } from '../screens/EntryExitScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OfflinePinSetupScreen } from '../screens/OfflinePinSetupScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ResultScreen } from '../screens/ResultScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { ServerSettingsScreen } from '../screens/ServerSettingsScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { SyncStatusScreen } from '../screens/SyncStatusScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * All screens are registered unconditionally in a single navigator. Auth-driven
 * redirects (to Login on sign-out, to Home once a stored session is restored on
 * launch) are done imperatively via `navigationRef`, which avoids the race that
 * comes from swapping the navigator's screen list based on auth status. Screens
 * that *initiate* their own transition after an action (e.g. LoginScreen after a
 * successful login) navigate explicitly instead of relying on this effect.
 */
export function RootNavigator(): React.JSX.Element {
  const { status } = useAuth();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  const applyAuthRedirect = () => {
    if (!navigationRef.isReady()) return;
    const currentName = navigationRef.getCurrentRoute()?.name;
    if (status === 'signedOut' && currentName !== 'Login') {
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    } else if (status === 'signedIn' && currentName === 'Splash') {
      navigationRef.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  };

  useEffect(applyAuthRedirect, [status]);

  return (
    <NavigationContainer ref={navigationRef} onReady={applyAuthRedirect}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.textInverted,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Scanner" component={ScannerScreen} options={{ title: 'Escanear área' }} />
        <Stack.Screen
          name="AreaDetected"
          component={AreaDetectedScreen}
          options={{ title: 'Área detectada' }}
        />
        <Stack.Screen name="EntryExit" component={EntryExitScreen} options={{ title: 'Registrar' }} />
        <Stack.Screen
          name="Confirmation"
          component={ConfirmationScreen}
          options={{ title: 'Confirmar' }}
        />
        <Stack.Screen
          name="Result"
          component={ResultScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="CurrentActivity"
          component={CurrentActivityScreen}
          options={{ title: 'Actividad actual' }}
        />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Historial' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
        <Stack.Screen
          name="OfflinePinSetup"
          component={OfflinePinSetupScreen}
          options={{ title: 'PIN offline' }}
        />
        <Stack.Screen
          name="SyncStatus"
          component={SyncStatusScreen}
          options={{ title: 'Estado de sincronización' }}
        />
        <Stack.Screen
          name="ServerSettings"
          component={ServerSettingsScreen}
          options={{ title: 'Servidor' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
