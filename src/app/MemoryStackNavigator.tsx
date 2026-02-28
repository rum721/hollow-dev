import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MemoryScreen } from '../screens/memory/MemoryScreen';
import { MemoryEditScreen } from '../screens/memory/MemoryEditScreen';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { colors } from '../theme';
import type { MemoryStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<MemoryStackParamList>();

export function MemoryStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MemoryList">
        {() => (
          <ErrorBoundary>
            <MemoryScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="MemoryEdit">
        {() => (
          <ErrorBoundary>
            <MemoryEditScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
