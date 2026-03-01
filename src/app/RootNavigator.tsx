import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { LaunchScreen } from '../screens/welcome/LaunchScreen';
import { WelcomeScreen } from '../screens/welcome/WelcomeScreen';
import { OnboardingPrivacyScreen } from '../screens/welcome/OnboardingPrivacyScreen';
import { OnboardingNicknameScreen } from '../screens/welcome/OnboardingNicknameScreen';
import { OnboardingStyleScreen } from '../screens/welcome/OnboardingStyleScreen';
import { OnboardingProfileScreen } from '../screens/welcome/OnboardingProfileScreen';
import { QuickProfileScreen } from '../screens/welcome/QuickProfileScreen';
import { MemoryImportScreen } from '../screens/settings/MemoryImportScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { runAutoDestruct } from '../services/storage/autoDestruct';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isOnboarded = useAuthStore((s) => s.isOnboarded);
  const autoDestructRan = useRef(false);

  useEffect(() => {
    if (isOnboarded && !autoDestructRan.current) {
      autoDestructRan.current = true;
      runAutoDestruct();
    }
  }, [isOnboarded]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      {!isOnboarded ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="OnboardingPrivacy" component={OnboardingPrivacyScreen} />
          <Stack.Screen name="OnboardingNickname" component={OnboardingNicknameScreen} />
          <Stack.Screen name="OnboardingStyle" component={OnboardingStyleScreen} />
          <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
          <Stack.Screen name="QuickProfile" component={QuickProfileScreen} />
          <Stack.Screen name="OnboardingImport" component={MemoryImportScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Launch" component={LaunchScreen} />
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
}
