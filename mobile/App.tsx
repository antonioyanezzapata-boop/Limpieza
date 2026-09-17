import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { NetworkProvider } from './src/network/NetworkContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SyncProvider } from './src/sync/SyncContext';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthProvider>
          <SyncProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </SyncProvider>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}
