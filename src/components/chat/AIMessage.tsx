import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { HollowText } from '../common/HollowText';
import { formatTime } from '../../utils/formatters';

interface Props {
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

export function AIMessage({ content, createdAt, isStreaming }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.accentLine} />
      <View style={styles.content}>
        <HollowText style={styles.text}>
          {content}
          {isStreaming ? '|' : ''}
        </HollowText>
        {createdAt && (
          <HollowText variant="label" color={colors.amber} style={styles.time}>
            {formatTime(createdAt)}
          </HollowText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  accentLine: {
    width: 3,
    backgroundColor: colors.amber,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  text: {
    color: colors.textAI,
    fontSize: 16,
    lineHeight: 26,
  },
  time: {
    marginTop: spacing.xs,
  },
});
