import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';
import { HollowText } from './HollowText';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'outlined' | 'filled';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function AmberButton({
  title,
  onPress,
  variant = 'outlined',
  disabled,
  loading,
  style,
}: Props) {
  const isFilled = variant === 'filled';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isFilled ? styles.filled : styles.outlined,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={isFilled ? colors.background : colors.amber} />
      ) : (
        <HollowText
          variant="body"
          serif
          color={isFilled ? colors.background : colors.amber}
          style={styles.text}
        >
          {title}
        </HollowText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.amber,
    backgroundColor: colors.transparent,
  },
  filled: {
    backgroundColor: colors.amber,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
