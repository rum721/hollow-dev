import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatHeader } from '../../components/chat/ChatHeader';
import { ChatInput } from '../../components/chat/ChatInput';
import { UserMessage } from '../../components/chat/UserMessage';
import { AIMessage } from '../../components/chat/AIMessage';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { useChatStore } from '../../store/useChatStore';
import { useStreaming } from '../../hooks/useStreaming';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing } from '../../theme';
import type { ChatStackParamList } from '../../types/navigation';
import type { Message } from '../../types/chat';

type RouteType = RouteProp<ChatStackParamList, 'ChatSession'>;
type NavType = NativeStackNavigationProp<ChatStackParamList, 'ChatSession'>;

export function ChatSessionScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavType>();
  const { sessionId } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const { isDesktop, chatMaxWidth } = useResponsive();

  const messages = useChatStore((s) => s.messages[sessionId] ?? []);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingText = useChatStore((s) => s.streamingText);
  const session = useChatStore((s) => s.sessions.find((se) => se.id === sessionId));
  const { sendMessage } = useStreaming();

  const handleSend = (text: string) => {
    sendMessage(sessionId, text);
  };

  const handleVoiceMode = () => {
    navigation.navigate('VoiceMode', { sessionId });
  };

  const displayMessages: (Message | { id: string; role: 'streaming'; content: string })[] = [
    ...messages,
    ...(isStreaming && streamingText
      ? [{ id: 'streaming', role: 'streaming' as const, content: streamingText }]
      : []),
  ];

  const renderMessage = ({ item }: { item: typeof displayMessages[number] }) => {
    if (item.role === 'user') {
      return <UserMessage content={item.content} createdAt={(item as Message).createdAt} />;
    }
    return (
      <AIMessage
        content={item.content}
        createdAt={item.role === 'streaming' ? undefined : (item as Message).createdAt}
        isStreaming={item.role === 'streaming'}
      />
    );
  };

  useEffect(() => {
    if (displayMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [displayMessages.length, streamingText]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ChatHeader
        title={session?.title ?? 'Session'}
        onBack={() => navigation.goBack()}
        onVoiceMode={handleVoiceMode}
      />
      <View style={[styles.messageArea, isDesktop && { alignItems: 'center' }]}>
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messageList,
            isDesktop && { maxWidth: chatMaxWidth, alignSelf: 'center', width: '100%' },
          ]}
          style={{ width: '100%' }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={isStreaming && !streamingText ? <TypingIndicator /> : null}
        />
      </View>
      <View style={[styles.inputArea, isDesktop && styles.inputAreaDesktop]}>
        <View style={isDesktop ? { maxWidth: chatMaxWidth, width: '100%' } : { flex: 1 }}>
          <ChatInput
            onSend={handleSend}
            onMicPress={handleVoiceMode}
            disabled={isStreaming}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messageArea: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  inputArea: {
    flexDirection: 'row',
  },
  inputAreaDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
});
