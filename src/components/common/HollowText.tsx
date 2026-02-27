import React from 'react';
import { Text, StyleSheet, TextStyle, TextProps } from 'react-native';
import { colors, fonts, fontSize as fs } from '../../theme';

interface Props extends TextProps {
  variant?: 'display' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';
  color?: string;
  serif?: boolean;
  center?: boolean;
}

export function HollowText({
  variant = 'body',
  color,
  serif,
  center,
  style,
  ...props
}: Props) {
  const variantStyle = variantStyles[variant];
  const useSerif = serif ?? (variant === 'display' || variant === 'heading');

  return (
    <Text
      style={[
        variantStyle,
        useSerif && { fontFamily: fonts.serifSemiBold },
        color ? { color } : undefined,
        center && { textAlign: 'center' },
        style,
      ]}
      {...props}
    />
  );
}

const variantStyles = StyleSheet.create({
  display: {
    fontSize: fs['5xl'],
    fontFamily: fonts.serifBold,
    color: colors.amber,
    lineHeight: fs['5xl'] * 1.2,
  },
  heading: {
    fontSize: fs['3xl'],
    fontFamily: fonts.serifSemiBold,
    color: colors.textPrimary,
    lineHeight: fs['3xl'] * 1.2,
  },
  subheading: {
    fontSize: fs.xl,
    color: colors.textPrimary,
    lineHeight: fs.xl * 1.4,
  },
  body: {
    fontSize: fs.md,
    color: colors.textPrimary,
    lineHeight: fs.md * 1.6,
  },
  caption: {
    fontSize: fs.sm,
    color: colors.textSecondary,
    lineHeight: fs.sm * 1.4,
  },
  label: {
    fontSize: fs.xs,
    color: colors.textMuted,
    lineHeight: fs.xs * 1.4,
  },
});
