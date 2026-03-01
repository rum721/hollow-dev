import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WaveformVisualizer } from '../../components/voice/WaveformVisualizer';
import { MicButton } from '../../components/voice/MicButton';
import { SessionTimer } from '../../components/voice/SessionTimer';
import { HollowText } from '../../components/common/HollowText';
import { useVoiceStore } from '../../store/useVoiceStore';
import { useVoicePipeline } from '../../hooks/useVoicePipeline';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useChatStore } from '../../store/useChatStore';
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, borderRadius } from '../../theme';
import type { ChatStackParamList } from '../../types/navigation';

type RouteType = RouteProp<ChatStackParamList, 'VoiceMode'>;

export function VoiceModeScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { sessionId } = route.params;
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice store — for session timer
  const sessionSeconds = useVoiceStore((s) => s.sessionSeconds);
  const setSessionSeconds = useVoiceStore((s) => s.setSessionSeconds);
  const reset = useVoiceStore((s) => s.reset);

  // Check for OpenAI API key
  const openaiKey = useSettingsStore((s) => s.apiKeys.openai_key);

  // Get last AI message for context display
  const messages = useChatStore((s) => s.messages[sessionId] ?? []);
  const lastAiMessage = messages.filter((m) => m.role === 'assistant').pop();

  // Real voice pipeline
  const {
    state: pipelineState,
    transcript,
    aiResponse,
    error,
    startRecording,
    stopRecordingAndProcess,
    cancel,
  } = useVoicePipeline(sessionId);

  // Session timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSessionSeconds(useVoiceStore.getState().sessionSeconds + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancel();
      reset();
    };
  }, []);

  // Mic button handler: tap to start recording, tap again to stop and process
  const handleMicPress = useCallback(() => {
    if (pipelineState === 'idle') {
      startRecording();
    } else if (pipelineState === 'recording') {
      stopRecordingAndProcess();
    } else if (pipelineState === 'speaking') {
      // Tap during playback to stop and return to idle
      cancel();
    }
    // During transcribing/thinking, ignore taps (pipeline is busy)
  }, [pipelineState, startRecording, stopRecordingAndProcess, cancel]);

  // Map pipeline states to status text
  const statusText = (() => {
    if (error) return error;
    switch (pipelineState) {
      case 'idle':
        return t('voice.tapToSpeak');
      case 'recording':
        return t('voice.listening');
      case 'transcribing':
        return t('voice.transcribing');
      case 'thinking':
        return t('voice.thinking');
      case 'speaking':
        return t('voice.speaking');
      default:
        return t('voice.tapToSpeak');
    }
  })();

  // Waveform is active during recording and speaking
  const waveformActive =
    pipelineState === 'recording' || pipelineState === 'speaking';

  // Show transcript when available (during thinking/speaking)
  const showTranscript =
    transcript &&
    (pipelineState === 'thinking' ||
      pipelineState === 'speaking' ||
      (pipelineState === 'idle' && aiResponse));

  // Show AI response when speaking or after speaking completes
  const showAiResponse =
    aiResponse &&
    (pipelineState === 'speaking' ||
      (pipelineState === 'idle' && aiResponse));

  // No API key — show guidance card
  if (!openaiKey) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Feather name="x" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={styles.headerBtn} />
          </View>
          <View style={styles.noKeyContainer}>
            <Feather name="key" size={32} color={colors.amber} />
            <HollowText variant="body" center color={colors.textSecondary} style={styles.noKeyText}>
              {t('voice.needApiKey')}
            </HollowText>
            <TouchableOpacity
              style={styles.noKeyButton}
              onPress={() => {
                navigation.goBack();
                // Navigate to settings after a short delay to let goBack complete
                setTimeout(() => {
                  (navigation as any).navigate('Settings');
                }, 300);
              }}
            >
              <HollowText variant="body" color={colors.amber}>
                {t('voice.goToSettings')}
              </HollowText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Feather name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <SessionTimer seconds={sessionSeconds} />
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Feather name="type" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Show last AI message as context (when not yet showing a new response) */}
          {lastAiMessage && !showAiResponse && pipelineState === 'idle' && !transcript && (
            <View style={styles.contextContainer}>
              <HollowText variant="caption" color={colors.textMuted} numberOfLines={3} center>
                {lastAiMessage.content}
              </HollowText>
            </View>
          )}

          <WaveformVisualizer isActive={waveformActive} />

          {showTranscript && (
            <View style={styles.transcriptContainer}>
              <HollowText variant="caption" color={colors.textSecondary} center>
                {transcript}
              </HollowText>
            </View>
          )}

          {showAiResponse && (
            <View style={styles.responseContainer}>
              <HollowText
                variant="body"
                color={colors.textPrimary}
                center
                numberOfLines={6}
              >
                {aiResponse}
              </HollowText>
            </View>
          )}
        </View>

        <View style={styles.bottom}>
          <HollowText
            variant="body"
            color={error ? colors.danger : colors.textSecondary}
            center
          >
            {statusText}
          </HollowText>
          <View style={styles.micArea}>
            <MicButton
              isRecording={pipelineState === 'recording'}
              onPress={handleMicPress}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
  },
  innerDesktop: {
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  headerBtn: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcriptContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  responseContainer: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  contextContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  noKeyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  noKeyText: {
    marginTop: spacing.sm,
  },
  noKeyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    borderRadius: borderRadius.md,
  },
  bottom: {
    alignItems: 'center',
    paddingBottom: spacing['5xl'],
    gap: spacing.xl,
  },
  micArea: {
    marginTop: spacing.md,
  },
});
