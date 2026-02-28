import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatSessionScreen } from '../screens/chat/ChatSessionScreen';
import { VoiceModeScreen } from '../screens/voice/VoiceModeScreen';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { colors } from '../theme';
import type { ChatStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ChatList">
        {() => (
          <ErrorBoundary>
            <ChatListScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen name="ChatSession">
        {() => (
          <ErrorBoundary>
            <ChatSessionScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
      <Stack.Screen
        name="VoiceMode"
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      >
        {() => (
          <ErrorBoundary>
            <VoiceModeScreen />
          </ErrorBoundary>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
