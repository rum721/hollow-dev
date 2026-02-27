import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { HollowText } from '../common/HollowText';
import { formatTime } from '../../utils/formatters';

interface Props {
  content: string;
  createdAt: string;
}

export function UserMessage({ content, createdAt }: Props) {
  return (
    <View style={styles.container}>
      <HollowText style={styles.text}>{content}</HollowText>
      <HollowText variant="label" style={styles.time}>
        {formatTime(createdAt)}
      </HollowText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  text: {
    color: colors.amberLight,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
  },
  time: {
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
});
