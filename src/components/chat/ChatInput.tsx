import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../theme';
import { useI18n } from '../../i18n';

interface Props {
  onSend: (text: string) => void;
  onMicPress: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onMicPress, disabled }: Props) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.7, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(212, 165, 116, ${glowOpacity.value})`,
  }));

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSend(trimmed);
      setText('');
    }
  };

  return (
    <Animated.View style={[styles.container, glowStyle]}>
      <TouchableOpacity onPress={onMicPress} style={styles.iconBtn}>
        <Feather name="mic" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={t('chat.placeholder')}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.amber}
        multiline
        maxLength={2000}
        editable={!disabled}
      />
      <TouchableOpacity
        onPress={handleSend}
        style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
        disabled={!text.trim() || disabled}
      >
        <Feather name="send" size={18} color={text.trim() ? colors.background : colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  iconBtn: {
    padding: spacing.sm,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceLight,
  },
});
