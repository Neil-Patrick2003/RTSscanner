import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/** Nothing to subscribe to — the snapshot only differs between server and client. */
const noopSubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * `useSyncExternalStore` gives us the hydration flag without a state-setting effect.
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  const hasHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  return hasHydrated ? colorScheme : 'light';
}
