import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { HollowText } from '../common/HollowText';

interface Props {
  title: string;
  onBack: () => void;
  onVoiceMode: () => void;
}

export function ChatHeader({ title, onBack, onVoiceMode }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xs }]}>
      <TouchableOpacity onPress={onBack} style={styles.iconBtn} hitSlop={8}>
        <Feather name="arrow-left" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <HollowText variant="body" serif style={styles.title}>
        {title}
      </HollowText>
      <TouchableOpacity onPress={onVoiceMode} style={styles.iconBtn} hitSlop={8}>
        <Feather name="mic" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  title: {
    fontSize: 16,
  },
});
