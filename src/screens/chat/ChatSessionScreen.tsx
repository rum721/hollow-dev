import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
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
import { ImageViewer } from '../../components/chat/ImageViewer';
import { HollowText } from '../../components/common/HollowText';
import { useChatStore } from '../../store/useChatStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useMemoryStore } from '../../store/useMemoryStore';
import { getModelInfo } from '../../services/ai/models';
import { useStreaming } from '../../hooks/useStreaming';
import { useResponsive } from '../../hooks/useResponsive';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useI18n } from '../../i18n';
import { summarizeSession } from '../../services/ai/sessionSummarizer';
import { getSummaryBySessionId, insertSummary } from '../../services/storage/summaryRepo';
import { getDailyUsage } from '../../services/ai/rateLimiter';
import { colors, spacing } from '../../theme';
import type { ChatStackParamList } from '../../types/navigation';
import type { Message, ImageAttachment } from '../../types/chat';
import type { ChatMessage } from '../../services/ai/types';

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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [viewerImage, setViewerImage] = useState<ImageAttachment | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(() => {
    setShowCopiedToast(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setShowCopiedToast(false), 1500);
  }, []);
  const isNearBottomRef = useRef(true);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const nearBottom = distanceFromBottom < 300;
    isNearBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom);
  }, []);

  // Check if the current model has an API key configured
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const selectedModel = useSettingsStore((s) => s.selectedModel);
  const modelInfo = getModelInfo(selectedModel);
  const hasApiKey = modelInfo ? Boolean(apiKeys[modelInfo.apiKeyField]) : false;
  // Built-in models are always available — no need to block with ApiKeyGuide
  const showApiKeyGuide = false;

  // Built-in quota warning state
  const [builtInQuotaWarning, setBuiltInQuotaWarning] = useState<string | null>(null);

  const { t } = useI18n();

  useEffect(() => {
    loadMessages(sessionId);
  }, [sessionId]);

  // ── Check built-in model quota when no user key ──
  useEffect(() => {
    if (!hasApiKey) {
      getDailyUsage().then(({ used, limit }) => {
        const remaining = limit - used;
        if (remaining <= 0) {
          setBuiltInQuotaWarning(t('builtin.quotaExhausted'));
        } else if (remaining <= 10) {
          setBuiltInQuotaWarning(t('builtin.quotaWarning', { remaining: String(remaining) }));
        } else {
          setBuiltInQuotaWarning(null);
        }
      });
    } else {
      setBuiltInQuotaWarning(null);
    }
  }, [hasApiKey, messages.length]);

  // ── Session summary generation on leave ──
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const msgs = useChatStore.getState().messages[sessionId] ?? [];
      if (msgs.length >= 4) {
        // Fire-and-forget: generate summary in background
        generateSummaryInBackground(sessionId, msgs);
      }
    });
    return unsubscribe;
  }, [navigation, sessionId]);

  const handleSend = async (text: string, images?: ImageAttachment[]) => {
    const result = await sendMessage(sessionId, text, images);
    if (result?.limitReached) {
      setShowUpgrade(true);
    }
  };

  const handleVoiceMode = () => {
    navigation.navigate('VoiceMode', { sessionId });
  };

  const handleImagePress = useCallback((image: ImageAttachment) => {
    setViewerImage(image);
  }, []);

  const displayMessages: (Message | { id: string; role: 'streaming'; content: string })[] = [
    ...messages,
    ...(isStreaming && streamingText
      ? [{ id: 'streaming', role: 'streaming' as const, content: streamingText }]
      : []),
  ];

  const renderMessage = ({ item }: { item: typeof displayMessages[number] }) => {
    if (item.role === 'user') {
      const msg = item as Message;
      return (
        <UserMessage
          content={msg.content}
          createdAt={msg.createdAt}
          onCopy={handleCopy}
          imageAttachments={msg.imageAttachments}
          onImagePress={handleImagePress}
        />
      );
    }
    return (
      <AIMessage
        content={item.content}
        createdAt={item.role === 'streaming' ? undefined : (item as Message).createdAt}
        isStreaming={item.role === 'streaming'}
        onCopy={handleCopy}
      />
    );
  };

  // Auto-scroll only when user is near bottom (new messages / streaming)
  useEffect(() => {
    if (displayMessages.length > 0 && isNearBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [displayMessages.length, streamingText]);

  // ── Background summary generation ──
  async function generateSummaryInBackground(sid: string, msgs: Message[]) {
    try {
      const existing = await getSummaryBySessionId(sid);
      if (existing) return; // Already summarized

      const settings = useSettingsStore.getState();
      const chatMsgs: ChatMessage[] = msgs.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const result = await summarizeSession(chatMsgs, settings.selectedModel, settings.apiKeys);
      if (result) {
        await insertSummary({
          sessionId: sid,
          summary: result.summary,
          keyTopics: result.keyTopics,
          mood: result.mood,
        });
        useMemoryStore.getState().invalidateCache();
        useMemoryStore.getState().loadAll();
      }
    } catch {
      // Non-fatal: summary generation failure doesn't affect the user
    }
  }

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
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (isNearBottomRef.current) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
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
        {showScrollToBottom && (
          <TouchableOpacity
            style={styles.scrollToBottomBtn}
            onPress={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
              setShowScrollToBottom(false);
              isNearBottomRef.current = true;
            }}
            activeOpacity={0.8}
          >
            <Feather name="chevron-down" size={20} color={colors.amber} />
          </TouchableOpacity>
        )}
      </View>
      {showUpgrade && (
        <UpgradePrompt onDismiss={() => setShowUpgrade(false)} />
      )}
      {builtInQuotaWarning && (
        <View style={styles.quotaBanner}>
          <Feather name="alert-circle" size={14} color={colors.amber} />
          <HollowText variant="caption" color={colors.amber} style={{ marginLeft: 6, flex: 1 }}>
            {builtInQuotaWarning}
          </HollowText>
        </View>
      )}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Feather name="wifi-off" size={14} color={colors.danger} />
          <HollowText variant="caption" color={colors.danger} style={{ marginLeft: 6 }}>
            Network disconnected
          </HollowText>
        </View>
      )}
      {showCopiedToast && (
        <View style={styles.copiedToast}>
          <Feather name="check" size={14} color={colors.amber} />
          <HollowText variant="caption" color={colors.amber} style={{ marginLeft: 6 }}>
            已复制
          </HollowText>
        </View>
      )}
      <View style={[styles.inputArea, { paddingBottom: Platform.OS === 'ios' ? 85 : 65 }, isDesktop && styles.inputAreaDesktop]}>
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
      <ImageViewer
        image={viewerImage}
        visible={viewerImage !== null}
        onClose={() => setViewerImage(null)}
      />
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
  copiedToast: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: Platform.OS === 'ios' ? 150 : 130,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 22, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.amberMuted,
    zIndex: 10,
  },
  scrollToBottomBtn: {
    position: 'absolute',
    right: 20,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.amberMuted,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  quotaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
