import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HollowText } from '../common/HollowText';
import { colors, spacing, borderRadius } from '../../theme';
import { formatSessionTimer } from '../../utils/formatters';

interface Props {
  seconds: number;
}

export function SessionTimer({ seconds }: Props) {
  return (
    <View style={styles.container}>
      <HollowText variant="caption" color={colors.textSecondary}>
        {formatSessionTimer(seconds)}
      </HollowText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
