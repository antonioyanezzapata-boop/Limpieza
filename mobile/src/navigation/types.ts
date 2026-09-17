import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AccessEventType, Area } from '../api/types';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
  Scanner: undefined;
  AreaDetected: { qrToken: string; area: Area };
  EntryExit: { qrToken: string; area: Area };
  Confirmation: { qrToken: string; area: Area; eventType: AccessEventType };
  Result: {
    success: boolean;
    message: string;
    /** True when the event was saved to the local offline queue instead of confirmed by the server. */
    queued: boolean;
    area?: Area;
    eventType?: AccessEventType;
    durationSeconds?: number | null;
  };
  CurrentActivity: undefined;
  History: undefined;
  Profile: undefined;
  OfflinePinSetup: { fromLogin: boolean } | undefined;
  SyncStatus: undefined;
  ServerSettings: undefined;
};

export type ScreenProps<Name extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  Name
>;

export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;
