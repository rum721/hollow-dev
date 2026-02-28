import { useCallback, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useMemoryStore } from '../store/useMemoryStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { sendChatMessage } from '../services/ai/aiRouter';
import { getEffectiveLocale } from '../i18n';
import * as voiceService from '../services/voice/voiceService';
import type { ChatMessage } from '../services/ai/types';

export type VoicePipelineState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'speaking';

export function useVoicePipeline(sessionId: string) {
  const [state, setState] = useState<VoicePipelineState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const soundRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setAiResponse('');
      await voiceService.startRecording();
      setState('recording');
    } catch (e: any) {
      setError(e.message || 'Failed to start recording');
    }
  }, []);

  const stopRecordingAndProcess = useCallback(async () => {
    try {
      // Step 0: Stop the recording and get the audio URI
      setState('transcribing');
      const audioUri = await voiceService.stopRecording();
      if (!audioUri) {
        setState('idle');
        return;
      }

      const settings = useSettingsStore.getState();
      const openaiKey = settings.apiKeys.openai_key || '';

      if (!openaiKey) {
        setError('OpenAI API key required for voice mode');
        setState('idle');
        return;
      }

      // Step 1: Transcribe audio via Whisper (pass language setting for accuracy)
      const langSetting = settings.language; // 'auto' | 'en' | 'zh'
      const text = await voiceService.transcribeAudio(
        audioUri,
        { openaiApiKey: openaiKey },
        langSetting === 'auto' ? undefined : langSetting,
      );
      setTranscript(text);

      if (!text.trim()) {
        setState('idle');
        return;
      }

      // Step 2: Send transcribed text to AI (same logic as useStreaming)
      setState('thinking');
      const { addUserMessage, finalizeAssistantMessage } =
        useChatStore.getState();
      const { getRelevantContext } = useMemoryStore.getState();
      const subscription = useSubscriptionStore.getState();

      if (!subscription.canSendMessage()) {
        setError('Daily message limit reached');
        setState('idle');
        return;
      }

      addUserMessage(sessionId, text);
      subscription.incrementUsage();

      const allMessages = useChatStore.getState().messages[sessionId] ?? [];
      const chatMessages: ChatMessage[] = allMessages.slice(-20).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      const recentUserMessages = chatMessages
        .filter((m) => m.role === 'user')
        .slice(-3)
        .map((m) => m.content);

      let fullResponse = '';

      await sendChatMessage(
        chatMessages,
        {
          selectedModel: settings.selectedModel,
          apiKeys: settings.apiKeys,
          nickname: settings.nickname,
          conversationStyle: settings.conversationStyle,
          responseStyleValue: settings.responseStyleValue,
          memoryContext: getRelevantContext(recentUserMessages),
          locale: getEffectiveLocale(settings.language),
          store: true,
        },
        {
          onToken: (token: string) => {
            fullResponse += token;
          },
          onComplete: (response: string) => {
            fullResponse = response || fullResponse;
            finalizeAssistantMessage(sessionId, fullResponse);
          },
          onError: (err: Error) => {
            finalizeAssistantMessage(sessionId, err.message);
          },
        },
      );

      setAiResponse(fullResponse);

      // Step 3: TTS — synthesize and play the AI response
      setState('speaking');
      try {
        const sound = await voiceService.synthesizeSpeech(fullResponse, {
          openaiApiKey: openaiKey,
        });
        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setState('idle');
            sound.unloadAsync();
            soundRef.current = null;
          }
        });

        await sound.playAsync();
      } catch (ttsError: any) {
        // TTS failed, but the text response was already saved — just go idle
        console.warn('TTS failed:', ttsError.message);
        setState('idle');
      }
    } catch (e: any) {
      setError(e.message || 'Voice pipeline error');
      setState('idle');
    }
  }, [sessionId]);

  const cancel = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    voiceService.cleanup();
    setState('idle');
  }, []);

  return {
    state,
    transcript,
    aiResponse,
    error,
    startRecording,
    stopRecordingAndProcess,
    cancel,
  };
}
