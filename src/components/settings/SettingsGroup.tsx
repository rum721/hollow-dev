import React from 'react';
import { StyleSheet } from 'react-native';
import { CardContainer } from '../common/CardContainer';
import { HollowText } from '../common/HollowText';
import { colors, spacing } from '../../theme';

interface Props {
  title: string;
  highlighted?: boolean;
  titleColor?: string;
  children: React.ReactNode;
}

export function SettingsGroup({ title, highlighted, titleColor, children }: Props) {
  return (
    <CardContainer highlighted={highlighted} style={styles.group}>
      <HollowText
        variant="subheading"
        serif
        color={titleColor ?? colors.textPrimary}
        style={styles.title}
      >
        {title}
      </HollowText>
      {children}
    </CardContainer>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.md,
  },
});
