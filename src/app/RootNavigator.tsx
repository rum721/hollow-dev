import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { WelcomeScreen } from '../screens/welcome/WelcomeScreen';
import { OnboardingNicknameScreen } from '../screens/welcome/OnboardingNicknameScreen';
import { OnboardingStyleScreen } from '../screens/welcome/OnboardingStyleScreen';
import { MainTabNavigator } from './MainTabNavigator';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isOnboarded = useAuthStore((s) => s.isOnboarded);

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
          <Stack.Screen name="OnboardingNickname" component={OnboardingNicknameScreen} />
          <Stack.Screen name="OnboardingStyle" component={OnboardingStyleScreen} />
        </>
      ) : (
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
