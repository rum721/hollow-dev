import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';

interface Props {
  children: React.ReactNode;
  highlighted?: boolean;
  style?: ViewStyle;
}

export function CardContainer({ children, highlighted, style }: Props) {
  return (
    <View
      style={[
        styles.card,
        highlighted && styles.highlighted,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  highlighted: {
    borderColor: 'rgba(212, 165, 116, 0.2)',
  },
});
