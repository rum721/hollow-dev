import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { ChatHeader } from '../../components/chat/ChatHeader';
import { ChatInput } from '../../components/chat/ChatInput';
import { UserMessage } from '../../components/chat/UserMessage';
import { AIMessage } from '../../components/chat/AIMessage';
import { TypingIndicator } from '../../components/chat/TypingIndicator';
import { UpgradePrompt } from '../../components/chat/UpgradePrompt';
import { ApiKeyGuide } from '../../components/chat/ApiKeyGuide';
import { HollowText } from '../../components/common/HollowText';
import { useChatStore } from '../../store/useChatStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { getModelInfo } from '../../services/ai/models';
import { useStreaming } from '../../hooks/useStreaming';
import { useResponsive } from '../../hooks/useResponsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { colors, spacing } from '../../theme';
import type { ChatStackParamList } from '../../types/navigation';
import type { Message } from '../../types/chat';

type RouteType = RouteProp<ChatStackParamList, 'ChatSession'>;
type NavType = NativeStackNavigationProp<ChatStackParamList, 'ChatSession'>;

const EMPTY_MESSAGES: Message[] = [];

export function ChatSessionScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavType>();
  const { sessionId } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const { isDesktop, chatMaxWidth } = useResponsive();
  const insets = useSafeAreaInsets();

  const messages = useChatStore((s) => s.messages[sessionId] ?? EMPTY_MESSAGES);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const streamingText = useChatStore((s) => s.streamingText);
  const session = useChatStore((s) => s.sessions.find((se) => se.id === sessionId));
  const loadMessages = useChatStore((s) => s.loadMessages);
  const canSendMessage = useSubscriptionStore((s) => s.canSendMessage);
  const { sendMessage, cancelStream } = useStreaming();
  const { isConnected } = useNetworkStatus();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [dismissedApiGuide, setDismissedApiGuide] = useState(false);

  // Check if the current model has an API key configured
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const selectedModel = useSettingsStore((s) => s.selectedModel);
  const modelInfo = getModelInfo(selectedModel);
  const hasApiKey = modelInfo ? Boolean(apiKeys[modelInfo.apiKeyField]) : false;
  const showApiKeyGuide = !hasApiKey && !dismissedApiGuide && messages.length === 0;

  useEffect(() => {
    loadMessages(sessionId);
  }, [sessionId]);

  const handleSend = async (text: string) => {
    const result = await sendMessage(sessionId, text);
    if (result?.limitReached) {
      setShowUpgrade(true);
    }
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
          ListHeaderComponent={showApiKeyGuide ? (
            <ApiKeyGuide
              onGoToSettings={() => navigation.getParent()?.navigate('SettingsTab')}
              onDismiss={() => setDismissedApiGuide(true)}
            />
          ) : null}
          ListFooterComponent={isStreaming && !streamingText ? <TypingIndicator /> : null}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      </View>
      {showUpgrade && (
        <UpgradePrompt onDismiss={() => setShowUpgrade(false)} />
      )}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Feather name="wifi-off" size={14} color={colors.danger} />
          <HollowText variant="caption" color={colors.danger} style={{ marginLeft: 6 }}>
            Network disconnected
          </HollowText>
        </View>
      )}
      <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 16) + 16 }, isDesktop && styles.inputAreaDesktop]}>
        <View style={isDesktop ? { maxWidth: chatMaxWidth, width: '100%' } : { flex: 1 }}>
          <ChatInput
            onSend={handleSend}
            onMicPress={handleVoiceMode}
            onCancel={cancelStream}
            isStreaming={isStreaming}
            disabled={showUpgrade}
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
    // paddingBottom is dynamically set via useSafeAreaInsets
  },
  inputAreaDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
