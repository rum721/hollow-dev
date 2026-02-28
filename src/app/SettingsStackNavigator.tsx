import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { SubscriptionScreen } from '../screens/settings/SubscriptionScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/settings/TermsOfServiceScreen';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { colors } from '../theme';
import type { SettingsStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Settings">
        {() => (
          <ErrorBoundary>
            <SettingsScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="Subscription">
        {() => (
          <ErrorBoundary>
            <SubscriptionScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="PrivacyPolicy">
        {() => (
          <ErrorBoundary>
            <PrivacyPolicyScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="TermsOfService">
        {() => (
          <ErrorBoundary>
            <TermsOfServiceScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
