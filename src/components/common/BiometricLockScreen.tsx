import React, { useEffect, useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { HollowText } from './HollowText';
import { colors, spacing } from '../../theme';
import { Feather } from '@expo/vector-icons';

interface Props {
  onUnlock: () => void;
}

export function BiometricLockScreen({ onUnlock }: Props) {
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    try {
      setError(null);

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        // No biometric hardware available, unlock directly
        onUnlock();
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        // No biometric credentials enrolled, unlock directly
        onUnlock();
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Hollow',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        onUnlock();
      } else {
        setError('Authentication failed. Tap to retry.');
      }
    } catch (e) {
      setError('Authentication error. Tap to retry.');
    }
  }, [onUnlock]);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  return (
    <View style={styles.container}>
      <Feather name="lock" size={64} color={colors.amber} />
      <HollowText variant="heading" serif style={styles.title}>
        Hollow
      </HollowText>
      <HollowText variant="body" color={colors.textSecondary} style={styles.subtitle}>
        {error || 'Verifying your identity...'}
      </HollowText>
      {error && (
        <TouchableOpacity onPress={authenticate} style={styles.retryButton}>
          <HollowText variant="body" color={colors.amber}>
            Tap to retry
          </HollowText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.xl,
    padding: spacing.md,
  },
});
