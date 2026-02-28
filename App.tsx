import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/app/RootNavigator';
import { ResponsiveLayout } from './src/components/common/ResponsiveLayout';
import { BiometricLockScreen } from './src/components/common/BiometricLockScreen';
import { useAppFonts } from './src/hooks/useFonts';
import { useBiometricLock } from './src/hooks/useBiometricLock';
import { useAuthStore } from './src/store/useAuthStore';
import { useSettingsStore } from './src/store/useSettingsStore';
import { useChatStore } from './src/store/useChatStore';
import { useMemoryStore } from './src/store/useMemoryStore';
import { useSubscriptionStore } from './src/store/useSubscriptionStore';
import { initEncryption } from './src/services/storage/encryption';
import { colors } from './src/theme';
import { fonts } from './src/theme/typography';

function AppContent() {
  const { isLocked, unlock } = useBiometricLock();

  if (isLocked) {
    return <BiometricLockScreen onUnlock={unlock} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ResponsiveLayout>
          <NavigationContainer
            theme={{
              dark: true,
              colors: {
                primary: colors.amber,
                background: colors.background,
                card: colors.background,
                text: colors.textPrimary,
                border: colors.border,
                notification: colors.amber,
              },
              fonts: {
                regular: { fontFamily: fonts.sans, fontWeight: '400' },
                medium: { fontFamily: fonts.sansMedium, fontWeight: '500' },
                bold: { fontFamily: fonts.sansMedium, fontWeight: '700' },
                heavy: { fontFamily: fonts.sansMedium, fontWeight: '800' },
              },
            }}
          >
            <RootNavigator />
          </NavigationContainer>
        </ResponsiveLayout>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const fontsLoaded = useAppFonts();
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    async function init() {
      // Initialize encryption key before any DB operations that need decrypt
      await initEncryption();

      await Promise.all([
        useAuthStore.getState().loadAuth(),
        useSettingsStore.getState().loadSettings(),
        useChatStore.getState().loadSessions(),
        useMemoryStore.getState().loadMemories(),
        useSubscriptionStore.getState().loadSubscription(),
      ]);
      setDataReady(true);
    }
    init();
  }, []);

  if (!fontsLoaded || !dataReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.amber} />
      </View>
    );
  }

  return <AppContent />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
