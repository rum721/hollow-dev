import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatSessionScreen } from '../screens/chat/ChatSessionScreen';
import { VoiceModeScreen } from '../screens/voice/VoiceModeScreen';
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
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatSession" component={ChatSessionScreen} />
      <Stack.Screen
        name="VoiceMode"
        component={VoiceModeScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
