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
import { useI18n } from '../../i18n';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing } from '../../theme';
import type { ChatStackParamList } from '../../types/navigation';

type RouteType = RouteProp<ChatStackParamList, 'VoiceMode'>;

export function VoiceModeScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { t } = useI18n();
  const { isDesktop } = useResponsive();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const voiceState = useVoiceStore((s) => s.voiceState);
  const sessionSeconds = useVoiceStore((s) => s.sessionSeconds);
  const setVoiceState = useVoiceStore((s) => s.setVoiceState);
  const setSessionSeconds = useVoiceStore((s) => s.setSessionSeconds);
  const reset = useVoiceStore((s) => s.reset);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSessionSeconds(useVoiceStore.getState().sessionSeconds + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      reset();
    };
  }, []);

  const handleMicPress = useCallback(() => {
    if (voiceState === 'idle') {
      setVoiceState('recording');
    } else if (voiceState === 'recording') {
      setVoiceState('processing');
      // In production: stop recording -> ASR -> LLM -> TTS
      setTimeout(() => setVoiceState('idle'), 2000);
    }
  }, [voiceState]);

  const statusText = {
    idle: t('voice.tapToSpeak'),
    recording: t('voice.listening'),
    processing: t('voice.thinking'),
    speaking: t('voice.speaking'),
  }[voiceState];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.inner, isDesktop && styles.innerDesktop]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Feather name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Feather name="type" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <SessionTimer seconds={sessionSeconds} />
        </View>

        <View style={styles.content}>
          <WaveformVisualizer isActive={voiceState === 'recording' || voiceState === 'speaking'} />
        </View>

        <View style={styles.bottom}>
          <HollowText variant="body" color={colors.textSecondary} center>
            {statusText}
          </HollowText>
          <View style={styles.micArea}>
            <MicButton isRecording={voiceState === 'recording'} onPress={handleMicPress} />
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
  bottom: {
    alignItems: 'center',
    paddingBottom: spacing['5xl'],
    gap: spacing.xl,
  },
  micArea: {
    marginTop: spacing.md,
  },
});
