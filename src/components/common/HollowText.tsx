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
  const useSerif = serif ?? (variant === 'display');

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
    fontSize: fs['2xl'],
    fontFamily: fonts.sansMedium,
    color: colors.textPrimary,
    lineHeight: fs['2xl'] * 1.3,
  },
  subheading: {
    fontSize: fs.xl,
    fontFamily: fonts.sansMedium,
    color: colors.textPrimary,
    lineHeight: fs.xl * 1.4,
  },
  body: {
    fontSize: fs.md + 1,
    fontFamily: fonts.sans,
    color: colors.textPrimary,
    lineHeight: (fs.md + 1) * 1.6,
  },
  caption: {
    fontSize: fs.sm,
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    lineHeight: fs.sm * 1.4,
  },
  label: {
    fontSize: fs.xs,
    fontFamily: fonts.sans,
    color: colors.textMuted,
    lineHeight: fs.xs * 1.4,
  },
});
