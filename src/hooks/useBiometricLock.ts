import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';

const BACKGROUND_TIMEOUT_MS = 30_000; // 30 seconds

export function useBiometricLock() {
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const [isLocked, setIsLocked] = useState(biometricEnabled);
  const backgroundTimestamp = useRef<number | null>(null);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  useEffect(() => {
    // Lock on initial load if biometric is enabled
    if (biometricEnabled) {
      setIsLocked(true);
    }
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (!biometricEnabled) return;

      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestamp.current = Date.now();
      } else if (nextState === 'active') {
        if (backgroundTimestamp.current) {
          const elapsed = Date.now() - backgroundTimestamp.current;
          if (elapsed > BACKGROUND_TIMEOUT_MS) {
            setIsLocked(true);
          }
          backgroundTimestamp.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [biometricEnabled]);

  return { isLocked, unlock };
}
