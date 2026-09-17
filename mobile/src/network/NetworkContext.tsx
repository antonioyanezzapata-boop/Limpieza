import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface NetworkState {
  /** True once we have a definite answer and it's connected+reachable. Defaults to true (optimistic) until the first NetInfo event arrives. */
  isConnected: boolean;
  /** False only once NetInfo has positively told us we're offline. */
  isKnown: boolean;
}

const NetworkContext = createContext<NetworkState>({ isConnected: true, isKnown: false });

export function NetworkProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = useState<NetworkState>({ isConnected: true, isKnown: false });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const connected = Boolean(netState.isConnected) && netState.isInternetReachable !== false;
      setState({ isConnected: connected, isKnown: true });
    });
    NetInfo.fetch()
      .then((netState) => {
        const connected = Boolean(netState.isConnected) && netState.isInternetReachable !== false;
        setState({ isConnected: connected, isKnown: true });
      })
      .catch(() => {
        // Leave the optimistic default in place; the listener above will correct it.
      });
    return () => unsubscribe();
  }, []);

  return <NetworkContext.Provider value={state}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkState {
  return useContext(NetworkContext);
}
