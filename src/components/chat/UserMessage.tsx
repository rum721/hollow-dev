import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from '../../theme';
import { HollowText } from '../common/HollowText';
import { formatTime } from '../../utils/formatters';

interface Props {
  content: string;
  createdAt: string;
  onCopy?: () => void;
}

export function UserMessage({ content, createdAt, onCopy }: Props) {
  const handleLongPress = async () => {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCopy?.();
  };

  return (
    <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.8} style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{content}</Text>
      </View>
      <HollowText variant="label" style={styles.time}>
        {formatTime(createdAt)}
      </HollowText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  bubble: {
    backgroundColor: 'rgba(212, 165, 116, 0.12)',
    borderRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: '85%',
  },
  text: {
    color: colors.amberLight,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  time: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 11,
  },
});
